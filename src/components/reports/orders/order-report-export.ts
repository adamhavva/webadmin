"use client";

import type {
  OrderReportRow,
  OrderReportSummary,
  BreakdownPayment,
  BreakdownProduct,
  BreakdownBarista,
  BreakdownChannel,
} from "@/modules/report/order-report.service";

// ============================================================
// Types
// ============================================================

type ExportMeta = {
  filterLabel: {
    status: string;
    channel: string;
    payment: string;
    period: string;
  };
};

// ============================================================
// Helpers
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

const CURRENCY = "#,##0";
const PCT = '0.0"%"';
const NUM = "#,##0";

// ============================================================
// Main export
// ============================================================

export async function exportOrderReport(
  rows: OrderReportRow[],
  summary: OrderReportSummary,
  breakdown: {
    byPayment: BreakdownPayment[];
    byProduct: BreakdownProduct[];
    byBarista: BreakdownBarista[];
    byChannel: BreakdownChannel[];
  },
  meta: ExportMeta
) {
  const ExcelJS = (await import("exceljs")).default;

  const wb = new ExcelJS.Workbook();
  wb.creator = "ASCEND WebAdmin";
  wb.created = new Date();

  // ============================================================
  // Sheet 1: Info Laporan
  // ============================================================
  const ws1 = wb.addWorksheet("Info Laporan");
  ws1.columns = [
    { header: "Item", key: "item", width: 30 },
    { header: "Nilai", key: "value", width: 50 },
  ];
  ws1.addRows([
    { item: "Laporan", value: "Laporan Order — ASCEND" },
    { item: "Dibuat", value: fmtDateTime(new Date().toISOString()) + " WIB" },
    { item: "Filter Status", value: meta.filterLabel.status },
    { item: "Filter Channel", value: meta.filterLabel.channel },
    { item: "Filter Payment", value: meta.filterLabel.payment },
    { item: "Filter Periode", value: meta.filterLabel.period },
    { item: "", value: "" },
    { item: "Total Revenue", value: summary.totalRevenue },
    { item: "Total Modal", value: summary.totalModal },
    { item: "Gross Profit", value: summary.grossProfit },
    { item: "Net Profit", value: summary.netProfit },
    { item: "Total Transaksi", value: summary.totalTrx },
    { item: "Avg Order Value", value: summary.avgOrderValue },
    { item: "Total Qty Terjual", value: summary.totalQty },
    { item: "Total Jarak (km)", value: summary.totalJarakKm },
    { item: "Avg Durasi (menit)", value: summary.avgDurasiMinutes },
    { item: "Total Cancelled", value: summary.totalCancelled },
  ]);
  const h1 = ws1.getRow(1);
  h1.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h1.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };

  // ============================================================
  // Sheet 2: Summary & Breakdown
  // ============================================================
  const ws2 = wb.addWorksheet("Summary");
  ws2.columns = [
    { header: "Metric", key: "a", width: 30 },
    { header: "Value", key: "b", width: 20 },
    { header: "Extra", key: "c", width: 20 },
  ];

  const addSection = (title: string) => {
    const row = ws2.addRow([title, "", ""]);
    row.font = { bold: true, color: { argb: "FF1F2937" } };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
  };

  ws2.addRow(["METRICS", "", ""]).font = { bold: true };
  ws2.addRow(["Total Revenue", summary.totalRevenue, ""]);
  ws2.addRow(["Total Modal", summary.totalModal, ""]);
  ws2.addRow(["Gross Profit", summary.grossProfit, ""]);
  ws2.addRow(["Net Profit", summary.netProfit, ""]);
  ws2.addRow(["Total Transaksi", summary.totalTrx, ""]);
  ws2.addRow(["Avg Order Value", summary.avgOrderValue, ""]);
  ws2.addRow(["Total Qty", summary.totalQty, ""]);
  ws2.addRow(["Total Jarak (km)", summary.totalJarakKm, ""]);
  ws2.addRow(["Avg Durasi (menit)", summary.avgDurasiMinutes, ""]);
  ws2.addRow(["Total Cancelled", summary.totalCancelled, ""]);

  ws2.addRow(["", "", ""]);
  addSection("BY PAYMENT METHOD");
  ws2.addRow(["Method", "Trx", "Revenue"]);
  ws2.addRow(["", "", ""]);
  for (const p of breakdown.byPayment) {
    ws2.addRow([p.methodName, p.count, p.revenue]);
  }

  ws2.addRow(["", "", ""]);
  addSection("BY CHANNEL");
  ws2.addRow(["Channel", "Trx", "Revenue"]);
  for (const c of breakdown.byChannel) {
    ws2.addRow([c.channel, c.count, c.revenue]);
  }

  ws2.addRow(["", "", ""]);
  addSection("TOP BARISTA");
  ws2.addRow(["Barista", "Trx", "Revenue"]);
  for (const b of breakdown.byBarista) {
    ws2.addRow([b.baristaName, b.trx, b.revenue]);
  }

  // ============================================================
  // Sheet 3: Detail Transaksi
  // ============================================================
  const ws3 = wb.addWorksheet("Detail Transaksi");
  ws3.columns = [
    { header: "Order #", key: "a", width: 20 },
    { header: "Tanggal Order", key: "b", width: 18 },
    { header: "Tanggal Selesai", key: "c", width: 18 },
    { header: "Channel", key: "d", width: 10 },
    { header: "Status", key: "e", width: 12 },
    { header: "Customer", key: "f", width: 20 },
    { header: "Phone Customer", key: "g", width: 15 },
    { header: "Barista", key: "h", width: 20 },
    { header: "Phone Barista", key: "i", width: 15 },
    { header: "Alamat", key: "j", width: 40 },
    { header: "Jarak (km)", key: "k", width: 12, style: { numFmt: "0.00" } },
    { header: "Durasi (menit)", key: "l", width: 14 },
    { header: "Produk", key: "m", width: 40 },
    { header: "Total Qty", key: "n", width: 10 },
    { header: "Payment Method", key: "o", width: 20 },
    { header: "Payment Status", key: "p", width: 14 },
    { header: "Subtotal", key: "q", width: 14, style: { numFmt: CURRENCY } },
    { header: "Tax", key: "r", width: 12, style: { numFmt: CURRENCY } },
    { header: "Fee Barista", key: "s", width: 12, style: { numFmt: CURRENCY } },
    { header: "Fee Payment", key: "t", width: 12, style: { numFmt: CURRENCY } },
    { header: "Total", key: "u", width: 14, style: { numFmt: CURRENCY } },
    { header: "Modal (HPP)", key: "v", width: 14, style: { numFmt: CURRENCY } },
    { header: "Gross Profit", key: "w", width: 14, style: { numFmt: CURRENCY } },
    { header: "Net Profit", key: "x", width: 14, style: { numFmt: CURRENCY } },
    { header: "Margin (%)", key: "y", width: 11, style: { numFmt: PCT } },
    { header: "Catatan", key: "z", width: 30 },
    { header: "Cancel Reason", key: "aa", width: 30 },
  ];

  ws3.addRows(
    rows.map((r) => ({
      a: r.orderNumber,
      b: fmtDateTime(r.createdAt),
      c: fmtDateTime(r.completedAt),
      d: r.channel,
      e: r.status,
      f: r.customerName,
      g: r.customerPhone ?? "",
      h: r.baristaName ?? "",
      i: r.baristaPhone ?? "",
      j: r.deliveryAddress ?? "",
      k: r.distanceKm ?? "",
      l: r.durationMinutes ?? "",
      m: r.productDetail,
      n: r.totalItems,
      o: r.paymentMethodName ?? "",
      p: r.paymentStatus,
      q: r.subtotal,
      r: r.taxAmount,
      s: r.feeBaristaAmount,
      t: r.feePaymentAmount,
      u: r.total,
      v: r.modal,
      w: r.grossProfit,
      x: r.netProfit,
      y: r.margin ?? "",
      z: r.deliveryNote ?? "",
      aa: r.cancelReason ?? "",
    }))
  );

  // ============================================================
  // Sheet 4: By Product
  // ============================================================
  const ws4 = wb.addWorksheet("By Product");
  ws4.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Produk", key: "name", width: 30 },
    { header: "Qty Terjual", key: "qty", width: 12, style: { numFmt: NUM } },
    { header: "Order Count", key: "oc", width: 12 },
    { header: "Revenue", key: "rev", width: 15, style: { numFmt: CURRENCY } },
    { header: "Modal", key: "modal", width: 15, style: { numFmt: CURRENCY } },
    { header: "Profit", key: "profit", width: 15, style: { numFmt: CURRENCY } },
    { header: "Margin (%)", key: "margin", width: 12, style: { numFmt: PCT } },
  ];
  ws4.addRows(
    breakdown.byProduct.map((p, i) => ({
      no: i + 1,
      name: p.productName,
      qty: p.qty,
      oc: p.orderCount,
      rev: p.revenue,
      modal: p.modal,
      profit: p.profit,
      margin: p.margin ?? "",
    }))
  );

  // Header style untuk semua sheet (kecuali ws1)
  [ws2, ws3, ws4].forEach((ws) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
  });

  // ============================================================
  // Download
  // ============================================================
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-order-${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}