"use client";

import * as React from "react";
import {
  Boxes,
  Coffee,
  Download,
  Factory,
  Loader2,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ReportFilter,
  formatFilterLabels,
  type ReportFilterValue,
} from "@/components/reports/report-filter";
import { MasterProductsTab } from "@/components/reports/tabs/master-products-tab";
import { BatchesTab } from "@/components/reports/tabs/batches-tab";
import { ProductionsTab } from "@/components/reports/tabs/productions-tab";
import { CostHistoryTab } from "@/components/reports/tabs/cost-history-tab";
import { MarginTab } from "@/components/reports/tabs/margin-tab";
import { exportProductsReportExcel } from "@/components/reports/report-export";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type TabKey = "master" | "batches" | "productions" | "cost-history" | "margin";

type TabMeta = {
  key: TabKey;
  label: string;
  path: string; // endpoint
  icon: React.ReactNode;
  hideDate: boolean; // snapshot tabs
};

// ============================================================
// Constants
// ============================================================

const TABS: TabMeta[] = [
  {
    key: "master",
    label: "Master Produk",
    path: "master",
    icon: <Coffee className="size-4" />,
    hideDate: true,
  },
  {
    key: "batches",
    label: "Batch Produk Jadi",
    path: "batches",
    icon: <Boxes className="size-4" />,
    hideDate: false,
  },
  {
    key: "productions",
    label: "Riwayat Produksi",
    path: "productions",
    icon: <Factory className="size-4" />,
    hideDate: false,
  },
  {
    key: "cost-history",
    label: "Riwayat HPP",
    path: "cost-history",
    icon: <TrendingUp className="size-4" />,
    hideDate: false,
  },
  {
    key: "margin",
    label: "Analisis Margin",
    path: "margin",
    icon: <TrendingUp className="size-4" />,
    hideDate: true,
  },
];

// ============================================================
// Main
// ============================================================

export function ReportPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("master");

  const [filter, setFilter] = React.useState<ReportFilterValue>({
    productId: "",
    isActive: "all",
    dateFrom: "",
    dateTo: "",
  });

  const [products, setProducts] = React.useState<
    Array<{ id: string; name: string }>
  >([]);

  // Data per tab
  const [dataByTab, setDataByTab] = React.useState<
    Partial<Record<TabKey, any>>
  >({});
  const [loadingByTab, setLoadingByTab] = React.useState<
    Partial<Record<TabKey, boolean>>
  >({});
  const [errorByTab, setErrorByTab] = React.useState<
    Partial<Record<TabKey, string | null>>
  >({});

  // Export dialog
  const [exportOpen, setExportOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // ---------- Load produk (untuk dropdown) ----------
  React.useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(
          "/api/inventory/products?limit=100&page=1",
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setProducts(json.data.items.map((p: any) => ({
            id: p.id,
            name: p.name,
          })));
        }
      } catch {
        // silent
      }
    }
    void loadProducts();
  }, []);

  // ---------- Fetch tab data ----------
  const fetchTab = React.useCallback(
    async (tabKey: TabKey) => {
      const tab = TABS.find((t) => t.key === tabKey);
      if (!tab) return;

      try {
        setLoadingByTab((p) => ({ ...p, [tabKey]: true }));
        setErrorByTab((p) => ({ ...p, [tabKey]: null }));

        const params = new URLSearchParams();
        if (filter.productId) params.set("productId", filter.productId);
        params.set("isActive", filter.isActive);
        if (!tab.hideDate) {
          if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
          if (filter.dateTo) params.set("dateTo", filter.dateTo);
        }

        const res = await fetch(
          `/api/reports/products/${tab.path}?${params}`,
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Gagal memuat data");
        }

        setDataByTab((p) => ({ ...p, [tabKey]: json.data }));
      } catch (err) {
        setErrorByTab((p) => ({
          ...p,
          [tabKey]: err instanceof Error ? err.message : "Gagal memuat",
        }));
      } finally {
        setLoadingByTab((p) => ({ ...p, [tabKey]: false }));
      }
    },
    [filter]
  );

  // Fetch saat filter/tab berubah
  React.useEffect(() => {
    void fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  // ---------- Export ----------
  async function handleExport() {
    try {
      setIsExporting(true);
      setExportError(null);

      const activeTabMeta = TABS.find((t) => t.key === activeTab);
      const labels = formatFilterLabels(
        filter,
        products,
        activeTabMeta?.hideDate ?? false
      );

      // Untuk export, selalu pakai periode lengkap (kalau tab date-related)
      // Info laporan akan tampilkan filter saat ini
      await exportProductsReportExcel(
        {
          productId: filter.productId || undefined,
          isActive: filter.isActive,
          dateFrom: filter.dateFrom || undefined,
          dateTo: filter.dateTo || undefined,
        },
        {
          filterLabel: {
            product: labels.product,
            status: labels.status,
            period:
              labels.period === "Snapshot (tanpa periode)" &&
              activeTabMeta?.hideDate
                ? "Semua periode (snapshot saat ini)"
                : labels.period,
          },
        }
      );

      setExportOpen(false);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Gagal export."
      );
    } finally {
      setIsExporting(false);
    }
  }

  const activeTabMeta = TABS.find((t) => t.key === activeTab);
  const currentData = dataByTab[activeTab] ?? null;
  const isLoading = loadingByTab[activeTab] ?? false;
  const error = errorByTab[activeTab] ?? null;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Laporan Produk & HPP
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analisis lengkap produk, batch, produksi, dan HPP.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              setExportError(null);
              setExportOpen(true);
            }}
          >
            <Download className="mr-2 size-4" />
            Export Excel
          </Button>
        </div>

        {/* Filter */}
        <ReportFilter
          value={filter}
          onChange={setFilter}
          products={products}
          hideDate={activeTabMeta?.hideDate ?? false}
        />

        {/* Tabs Card */}
        <Card className="overflow-hidden">
          {/* Tab navigation */}
          <div className="flex flex-wrap border-b">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === t.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <CardContent className="p-0">
            {activeTab === "master" && (
              <MasterProductsTab
                data={currentData}
                isLoading={isLoading}
                error={error}
                onRetry={() => void fetchTab("master")}
              />
            )}
            {activeTab === "batches" && (
              <BatchesTab
                data={currentData}
                isLoading={isLoading}
                error={error}
                onRetry={() => void fetchTab("batches")}
              />
            )}
            {activeTab === "productions" && (
              <ProductionsTab
                data={currentData}
                isLoading={isLoading}
                error={error}
                onRetry={() => void fetchTab("productions")}
              />
            )}
            {activeTab === "cost-history" && (
              <CostHistoryTab
                data={currentData}
                isLoading={isLoading}
                error={error}
                onRetry={() => void fetchTab("cost-history")}
              />
            )}
            {activeTab === "margin" && (
              <MarginTab
                data={currentData}
                isLoading={isLoading}
                error={error}
                onRetry={() => void fetchTab("margin")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export dialog */}
      <Dialog
        open={exportOpen}
        onOpenChange={(open) => {
          if (!isExporting) setExportOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Laporan Excel?</DialogTitle>
            <DialogDescription>
              File .xlsx akan berisi <strong>6 sheet</strong>: Info Laporan,
              Master Produk, Batch Produk Jadi, Riwayat Produksi, Riwayat HPP,
              dan Analisis Margin.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <p className="mb-2 font-medium">Filter yang akan diterapkan:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                Produk:{" "}
                <strong className="text-foreground">
                  {filter.productId
                    ? products.find((p) => p.id === filter.productId)?.name ??
                      "—"
                    : "Semua"}
                </strong>
              </li>
              <li>
                Status:{" "}
                <strong className="text-foreground">
                  {filter.isActive === "all"
                    ? "Semua"
                    : filter.isActive === "true"
                      ? "Aktif"
                      : "Nonaktif"}
                </strong>
              </li>
              <li>
                Periode:{" "}
                <strong className="text-foreground">
                  {filter.dateFrom || filter.dateTo
                    ? `${filter.dateFrom || "∞"} — ${filter.dateTo || "∞"}`
                    : "Semua periode"}
                </strong>
              </li>
            </ul>
          </div>

          {exportError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {exportError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportOpen(false)}
              disabled={isExporting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Mengexport...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}