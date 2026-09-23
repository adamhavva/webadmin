"use client";

// ============================================================
// Types
// ============================================================

export type ReportFilterParams = {
  productId?: string;
  isActive?: "all" | "true" | "false";
  dateFrom?: string;
  dateTo?: string;
};

type ColumnDef = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
};

type BuildSheetArgs<T> = {
  workbook: import("exceljs").Workbook;
  sheetName: string;
  columns: ColumnDef[];
  rows: T[];
  rowMapper: (row: T, index: number) => Record<string, unknown>;
};

// ============================================================
// Fetch helper
// ============================================================

async function fetchReport<T>(
  path: string,
  filter: ReportFilterParams
): Promise<T> {
  const params = new URLSearchParams();
  if (filter.productId) params.set("productId", filter.productId);
  if (filter.isActive) params.set("isActive", filter.isActive);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);

  const res = await fetch(`/api/reports/products/${path}?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Gagal memuat ${path}`);
  }
  return json.data as T;
}

// ============================================================
// Format helpers
// ============================================================

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const mo = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const mi = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${day}/${mo}/${y} ${h}:${mi}`;
}

// ============================================================
// Sheet builder
// ============================================================

function buildSheet<T>({
  workbook,
  sheetName,
  columns,
  rows,
  rowMapper,
}: BuildSheetArgs<T>) {
  const ws = workbook.addWorksheet(sheetName);

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  ws.addRows(rows.map((r, i) => rowMapper(r, i)));

  // Header style
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;

  // Border semua cell
  ws.eachRow((row, rowIndex) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
      if (rowIndex > 1) {
        cell.alignment = { vertical: "middle" };
      }
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

  return ws;
}

// ============================================================
// Export xlsx multi-sheet
// ============================================================

export async function exportProductsReportExcel(
  filter: ReportFilterParams,
  meta: {
    filterLabel: { product: string; status: string; period: string };
  }
) {
  const ExcelJS = (await import("exceljs")).default;

  const [master, batches, productions, costHistory, margin] =
    await Promise.all([
      fetchReport<any>("master", filter),
      fetchReport<any>("batches", filter),
      fetchReport<any>("productions", filter),
      fetchReport<any>("cost-history", filter),
      fetchReport<any>("margin", filter),
    ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ASCEND WebAdmin";
  wb.created = new Date();

  // ============================================================
  // Sheet 0: Info Laporan
  // ============================================================
  const wsInfo = wb.addWorksheet("Info Laporan");
  wsInfo.columns = [
    { header: "Item", key: "item", width: 30 },
    { header: "Nilai", key: "value", width: 50 },
  ];
  wsInfo.addRows([
    { item: "Laporan", value: "Laporan Produk & HPP — ASCEND" },
    { item: "Dibuat", value: fmtDateTime(new Date().toISOString()) + " WIB" },
    { item: "Filter Produk", value: meta.filterLabel.product },
    { item: "Filter Status", value: meta.filterLabel.status },
    { item: "Filter Periode", value: meta.filterLabel.period },
    { item: "", value: "" },
    { item: "Total Produk", value: master.summary.totalProducts },
    { item: "Produk Aktif", value: master.summary.activeProducts },
    { item: "Produk Rugi", value: master.summary.rugiCount },
    { item: "Total Nilai Stok", value: master.summary.totalStockValue },
    {
      item: "Total Nilai Produksi",
      value: master.summary.totalProductionValue,
    },
    { item: "", value: "" },
    { item: "Total Batch", value: batches.summary.totalBatches },
    { item: "Total Sisa Stok", value: batches.summary.totalRemaining },
    { item: "Total Nilai Sisa", value: batches.summary.totalValue },
    { item: "", value: "" },
    { item: "Total Produksi", value: productions.summary.totalProductions },
    { item: "Total Output", value: productions.summary.totalOutput },
    { item: "Total Biaya Produksi", value: productions.summary.totalCost },
    { item: "", value: "" },
    { item: "Total Pencatatan HPP", value: costHistory.summary.totalEntries },
    { item: "HPP Naik", value: costHistory.summary.upCount },
    { item: "HPP Turun", value: costHistory.summary.downCount },
  ]);
  const infoHeader = wsInfo.getRow(1);
  infoHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  infoHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };

  const CURRENCY_FMT = "#,##0";
  const NUMBER_FMT = "#,##0";
  const PCT_FMT = '0.0"%"';

  // ============================================================
  // Sheet 1: Master Produk
  // ============================================================
  buildSheet({
    workbook: wb,
    sheetName: "Master Produk",
    columns: [
      { header: "No", key: "no", width: 5 },
      { header: "Produk", key: "name", width: 25 },
      { header: "Status", key: "status", width: 10 },
      { header: "Harga Jual", key: "selling", width: 13, numFmt: CURRENCY_FMT },
      { header: "HPP Terakhir", key: "hppLatest", width: 13, numFmt: CURRENCY_FMT },
      { header: "HPP Avg", key: "hppAvg", width: 13, numFmt: CURRENCY_FMT },
      { header: "HPP Min", key: "hppMin", width: 13, numFmt: CURRENCY_FMT },
      { header: "HPP Max", key: "hppMax", width: 13, numFmt: CURRENCY_FMT },
      { header: "Margin Terakhir (%)", key: "mLatest", width: 17, numFmt: PCT_FMT },
      { header: "Margin Avg (%)", key: "mAvg", width: 13, numFmt: PCT_FMT },
      { header: "Stok Jadi", key: "stock", width: 11, numFmt: NUMBER_FMT },
      { header: "Batch Aktif", key: "bActive", width: 11 },
      { header: "Total Batch", key: "bTotal", width: 11 },
      { header: "Total Produksi", key: "pCount", width: 13 },
      { header: "Total Output", key: "pOutput", width: 12, numFmt: NUMBER_FMT },
      { header: "Total Nilai Stok", key: "vStock", width: 15, numFmt: CURRENCY_FMT },
      { header: "Total Nilai Produksi", key: "vProd", width: 17, numFmt: CURRENCY_FMT },
      { header: "Produksi Terakhir", key: "lastProd", width: 18 },
    ],
    rows: master.items as any[],
    rowMapper: (r: any, i: number) => ({
      no: i + 1,
      name: r.name,
      status: r.isActive ? "Aktif" : "Nonaktif",
      selling: r.sellingPrice,
      hppLatest: r.hppLatest ?? "",
      hppAvg: r.hppAvg ?? "",
      hppMin: r.hppMin ?? "",
      hppMax: r.hppMax ?? "",
      mLatest: r.marginLatest ?? "",
      mAvg: r.marginAvg ?? "",
      stock: r.stockFinished,
      bActive: r.batchActive,
      bTotal: r.batchTotal,
      pCount: r.productionCount,
      pOutput: r.productionTotalOutput,
      vStock: r.totalValueStock,
      vProd: r.totalValueProduction,
      lastProd: fmtDateTime(r.lastProductionAt),
    }),
  });

  // ============================================================
  // Sheet 2: Batch Produk Jadi
  // ============================================================
  buildSheet({
    workbook: wb,
    sheetName: "Batch Produk Jadi",
    columns: [
      { header: "No", key: "no", width: 5 },
      { header: "Batch Code", key: "batchCode", width: 18 },
      { header: "Produk", key: "productName", width: 25 },
      { header: "Production ID", key: "productionId", width: 28 },
      { header: "Tanggal Produksi", key: "productionAt", width: 18 },
      { header: "Qty Awal", key: "qty", width: 11, numFmt: NUMBER_FMT },
      { header: "Sisa", key: "rem", width: 11, numFmt: NUMBER_FMT },
      { header: "Terpakai", key: "cons", width: 11, numFmt: NUMBER_FMT },
      { header: "% Terpakai", key: "consPct", width: 12, numFmt: PCT_FMT },
      { header: "HPP / Unit", key: "unitCost", width: 13, numFmt: CURRENCY_FMT },
      { header: "Total Cost", key: "totalCost", width: 15, numFmt: CURRENCY_FMT },
      { header: "Nilai Sisa", key: "remValue", width: 15, numFmt: CURRENCY_FMT },
      { header: "Status", key: "status", width: 12 },
    ],
    rows: batches.items as any[],
    rowMapper: (r: any, i: number) => ({
      no: i + 1,
      batchCode: r.batchCode,
      productName: r.productName,
      productionId: r.productionId,
      productionAt: fmtDateTime(r.productionAt),
      qty: r.quantity,
      rem: r.remainingQuantity,
      cons: r.consumed,
      consPct: r.consumedPct,
      unitCost: r.unitCost,
      totalCost: r.totalCost,
      remValue: r.remainingValue,
      status:
        r.status === "empty"
          ? "Habis"
          : r.status === "low"
            ? "Rendah"
            : "Tersedia",
    }),
  });

  // ============================================================
  // Sheet 3: Riwayat Produksi
  // ============================================================
  buildSheet({
    workbook: wb,
    sheetName: "Riwayat Produksi",
    columns: [
      { header: "No", key: "no", width: 5 },
      { header: "Tanggal", key: "createdAt", width: 18 },
      { header: "Produk", key: "productName", width: 25 },
      { header: "Batch Code", key: "batchCode", width: 18 },
      { header: "Output", key: "output", width: 10, numFmt: NUMBER_FMT },
      { header: "Komponen", key: "componentCount", width: 11 },
      { header: "Total Biaya", key: "totalCost", width: 15, numFmt: CURRENCY_FMT },
      { header: "HPP / Unit", key: "unitCost", width: 13, numFmt: CURRENCY_FMT },
      { header: "Komponen Detail", key: "componentSummary", width: 55 },
    ],
    rows: productions.items as any[],
    rowMapper: (r: any, i: number) => ({
      no: i + 1,
      createdAt: fmtDateTime(r.createdAt),
      productName: r.productName,
      batchCode: r.batchCode ?? "",
      output: r.outputQuantity,
      componentCount: r.componentCount,
      totalCost: r.totalCost,
      unitCost: r.unitCost,
      componentSummary: r.componentSummary,
    }),
  });

  // ============================================================
  // Sheet 4: Riwayat HPP
  // ============================================================
  buildSheet({
    workbook: wb,
    sheetName: "Riwayat HPP",
    columns: [
      { header: "No", key: "no", width: 5 },
      { header: "Tanggal", key: "createdAt", width: 18 },
      { header: "Produk", key: "productName", width: 25 },
      { header: "HPP", key: "hpp", width: 13, numFmt: CURRENCY_FMT },
      { header: "Delta", key: "delta", width: 13, numFmt: CURRENCY_FMT },
      { header: "Delta (%)", key: "deltaPct", width: 11, numFmt: PCT_FMT },
      { header: "Harga Jual", key: "selling", width: 13, numFmt: CURRENCY_FMT },
      { header: "Profit / Unit", key: "profit", width: 13, numFmt: CURRENCY_FMT },
      { header: "Margin (%)", key: "margin", width: 11, numFmt: PCT_FMT },
      { header: "Status", key: "status", width: 11 },
    ],
    rows: costHistory.items as any[],
    rowMapper: (r: any, i: number) => ({
      no: i + 1,
      createdAt: fmtDateTime(r.createdAt),
      productName: r.productName,
      hpp: r.hpp,
      delta: r.delta ?? "",
      deltaPct: r.deltaPct ?? "",
      selling: r.sellingPrice,
      profit: r.profitPerUnit,
      margin: r.margin ?? "",
      status:
        r.status === "first"
          ? "Pertama"
          : r.status === "up"
            ? "Naik"
            : r.status === "down"
              ? "Turun"
              : "Sama",
    }),
  });

  // ============================================================
  // Sheet 5: Analisis Margin
  // ============================================================
  buildSheet({
    workbook: wb,
    sheetName: "Analisis Margin",
    columns: [
      { header: "No", key: "no", width: 5 },
      { header: "Produk", key: "productName", width: 25 },
      { header: "Status", key: "status", width: 10 },
      { header: "Harga Jual", key: "selling", width: 13, numFmt: CURRENCY_FMT },
      { header: "HPP Terakhir", key: "hpp", width: 13, numFmt: CURRENCY_FMT },
      { header: "Profit / Unit", key: "profit", width: 13, numFmt: CURRENCY_FMT },
      { header: "Margin (%)", key: "margin", width: 11, numFmt: PCT_FMT },
      { header: "Kategori", key: "category", width: 12 },
      { header: "Rekomendasi Harga", key: "rec", width: 17, numFmt: CURRENCY_FMT },
    ],
    rows: margin.items as any[],
    rowMapper: (r: any, i: number) => ({
      no: i + 1,
      productName: r.productName,
      status: r.isActive ? "Aktif" : "Nonaktif",
      selling: r.sellingPrice,
      hpp: r.hppLatest ?? "",
      profit: r.profitPerUnit ?? "",
      margin: r.margin ?? "",
      category:
        r.category === "sehat"
          ? "Sehat"
          : r.category === "sedang"
            ? "Sedang"
            : r.category === "rendah"
              ? "Rendah"
              : r.category === "rugi"
                ? "Rugi"
                : "—",
      rec: r.recommendedPrice ?? "",
    }),
  });

  // ============================================================
  // Download
  // ============================================================
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const today = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-produk-${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}