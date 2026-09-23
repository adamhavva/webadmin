import { prisma } from "@/lib/db";
import type { Prisma } from "../../../prisma/generated/client";
import type { OrderReportQuery } from "./order-report.validator";

// ============================================================
// Types (exports)
// ============================================================

export type OrderReportRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  completedAt: string | null;
  channel: "ONLINE" | "OFFLINE";
  status: string;
  customerName: string;
  customerPhone: string | null;
  baristaName: string | null;
  baristaPhone: string | null;
  deliveryAddress: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  productDetail: string;
  totalItems: number;
  paymentMethodCode: string | null;
  paymentMethodName: string | null;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  feeBaristaAmount: number;
  feePaymentAmount: number;
  total: number;
  modal: number;
  grossProfit: number;
  netProfit: number;
  margin: number | null;
  profitStatus: "profit" | "rugi" | "breakeven" | "unknown";
  deliveryNote: string | null;
  cancelReason: string | null;
};

export type OrderReportSummary = {
  totalRevenue: number;
  totalModal: number;
  grossProfit: number;
  netProfit: number;
  totalTrx: number;
  avgOrderValue: number;
  totalJarakKm: number;
  avgDurasiMinutes: number;
  totalCancelled: number;
  totalQty: number;
  avgMargin: number | null;
};

export type BreakdownPayment = {
  methodCode: string;
  methodName: string;
  count: number;
  revenue: number;
  modal: number;
  profit: number;
  margin: number | null;
};

export type BreakdownProduct = {
  productId: string;
  productName: string;
  qty: number;
  orderCount: number;
  revenue: number;
  modal: number;
  profit: number;
  margin: number | null;
};

export type BreakdownBarista = {
  baristaId: string;
  baristaName: string;
  trx: number;
  revenue: number;
  profit: number;
  avgJarakKm: number | null;
  avgDurasiMinutes: number | null;
};

export type BreakdownChannel = {
  channel: "ONLINE" | "OFFLINE";
  count: number;
  revenue: number;
  percentage: number;
};

// ============================================================
// MAIN — getOrderReport
// ============================================================

export async function getOrderReport(query: OrderReportQuery) {
  const where: Prisma.OrderWhereInput = {};

  if (query.status !== "all") where.status = query.status as any;
  if (query.channel !== "all") where.channel = query.channel;
  if (query.paymentMethodCode) where.paymentMethodCode = query.paymentMethodCode;
  if (query.baristaId) where.baristaId = query.baristaId;
  if (query.customerId) where.customerId = query.customerId;

  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      { customerName: { contains: query.search, mode: "insensitive" } },
      { customerPhone: { contains: query.search } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      charges: true,
      barista: { select: { id: true, name: true, phone: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  const productIds = new Set<string>();
  for (const o of orders) for (const it of o.items) productIds.add(it.productId);

  const costHistories =
    productIds.size > 0
      ? await prisma.productCostHistory.findMany({
          where: { productId: { in: [...productIds] } },
          orderBy: { createdAt: "desc" },
          select: { productId: true, hpp: true, createdAt: true },
        })
      : [];

  const costMap = new Map<string, Array<{ hpp: number; createdAt: Date }>>();
  for (const c of costHistories) {
    if (!costMap.has(c.productId)) costMap.set(c.productId, []);
    costMap.get(c.productId)!.push({
      hpp: Number(c.hpp),
      createdAt: c.createdAt,
    });
  }

  function getHppAtTime(productId: string, at: Date): number | null {
    const list = costMap.get(productId) ?? [];
    for (const h of list) {
      if (h.createdAt <= at) return h.hpp;
    }
    return null;
  }

  const rows: OrderReportRow[] = orders.map((o) => {
    const subtotal = Number(o.subtotal);
    const total = Number(o.total);
    const feePayment = Number(o.paymentFeeAmount);

    let taxAmount = 0;
    let feeBarista = 0;
    for (const c of o.charges) {
      if (c.settingKey === "tax") taxAmount += Number(c.amount);
      else if (c.settingKey === "fee_barista") feeBarista += Number(c.amount);
    }

    let modal = 0;
    let modalMissing = false;
    for (const it of o.items) {
      const hpp = getHppAtTime(it.productId, o.createdAt);
      if (hpp === null) {
        modalMissing = true;
        continue;
      }
      modal += hpp * it.quantity;
    }

    const grossProfit = subtotal - modal;
    const netProfit = grossProfit - feeBarista;
    const margin = subtotal > 0 ? (grossProfit / subtotal) * 100 : null;

    let profitStatus: OrderReportRow["profitStatus"] = "unknown";
    if (modalMissing && modal === 0) profitStatus = "unknown";
    else if (grossProfit > 0) profitStatus = "profit";
    else if (grossProfit < 0) profitStatus = "rugi";
    else profitStatus = "breakeven";

    const durationMinutes =
      o.acceptedAt && o.completedAt
        ? Math.round(
            (o.completedAt.getTime() - o.acceptedAt.getTime()) / 60000
          )
        : null;

    const productDetail = o.items
      .map((it) => `${it.productName} ×${it.quantity}`)
      .join(", ");
    const totalItems = o.items.reduce((s, it) => s + it.quantity, 0);

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
      channel: o.channel as "ONLINE" | "OFFLINE",
      status: o.status,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      baristaName: o.barista?.name ?? null,
      baristaPhone: o.barista?.phone ?? null,
      deliveryAddress: o.deliveryAddress,
      distanceKm: o.distanceKm,
      durationMinutes,
      productDetail,
      totalItems,
      paymentMethodCode: o.paymentMethodCode,
      paymentMethodName: o.paymentMethodName,
      paymentStatus: o.paymentStatus,
      subtotal,
      taxAmount,
      feeBaristaAmount: feeBarista,
      feePaymentAmount: feePayment,
      total,
      modal,
      grossProfit,
      netProfit,
      margin,
      profitStatus,
      deliveryNote: o.deliveryNote,
      cancelReason: o.cancelReason,
    };
  });

  const paidCompleted = rows.filter(
    (r) => r.status === "COMPLETED" && r.paymentStatus === "PAID"
  );

  const totalRevenue = paidCompleted.reduce((s, r) => s + r.total, 0);
  const totalModal = paidCompleted.reduce((s, r) => s + r.modal, 0);
  const grossProfit = paidCompleted.reduce((s, r) => s + r.grossProfit, 0);
  const netProfit = paidCompleted.reduce((s, r) => s + r.netProfit, 0);
  const totalQty = paidCompleted.reduce((s, r) => s + r.totalItems, 0);
  const totalTrx = paidCompleted.length;
  const avgOrderValue = totalTrx > 0 ? totalRevenue / totalTrx : 0;

  const withDistance = paidCompleted.filter((r) => r.distanceKm !== null);
  const totalJarakKm = withDistance.reduce(
    (s, r) => s + (r.distanceKm ?? 0),
    0
  );

  const withDuration = paidCompleted.filter(
    (r) => r.durationMinutes !== null
  );
  const avgDurasiMinutes =
    withDuration.length > 0
      ? withDuration.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) /
        withDuration.length
      : 0;

  const margins = paidCompleted
    .map((r) => r.margin)
    .filter((m): m is number => m !== null);
  const avgMargin =
    margins.length > 0 ? margins.reduce((s, m) => s + m, 0) / margins.length : null;

  const totalCancelled = rows.filter((r) => r.status === "CANCELLED").length;

  const summary: OrderReportSummary = {
    totalRevenue,
    totalModal,
    grossProfit,
    netProfit,
    totalTrx,
    avgOrderValue,
    totalJarakKm,
    avgDurasiMinutes: isNaN(avgDurasiMinutes) ? 0 : avgDurasiMinutes,
    totalCancelled,
    totalQty,
    avgMargin: avgMargin && !isNaN(avgMargin) ? avgMargin : null,
  };

  // Breakdown payment
  const byMethodMap = new Map<string, BreakdownPayment>();
  for (const r of paidCompleted) {
    const key = r.paymentMethodCode ?? "UNKNOWN";
    const cur = byMethodMap.get(key) ?? {
      methodCode: key,
      methodName: r.paymentMethodName ?? "Unknown",
      count: 0,
      revenue: 0,
      modal: 0,
      profit: 0,
      margin: null,
    };
    cur.count += 1;
    cur.revenue += r.total;
    cur.modal += r.modal;
    cur.profit += r.grossProfit;
    byMethodMap.set(key, cur);
  }
  const byPayment: BreakdownPayment[] = [...byMethodMap.values()]
    .map((p) => ({
      ...p,
      margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Breakdown product
  const byProductMap = new Map<
    string,
    {
      name: string;
      qty: number;
      orders: Set<string>;
      revenue: number;
      modal: number;
    }
  >();
  for (const o of orders) {
    if (o.status !== "COMPLETED" || o.paymentStatus !== "PAID") continue;
    for (const it of o.items) {
      const hpp = getHppAtTime(it.productId, o.createdAt) ?? 0;
      const cur = byProductMap.get(it.productId) ?? {
        name: it.productName,
        qty: 0,
        orders: new Set<string>(),
        revenue: 0,
        modal: 0,
      };
      cur.qty += it.quantity;
      cur.orders.add(o.id);
      cur.revenue += Number(it.subtotal);
      cur.modal += hpp * it.quantity;
      byProductMap.set(it.productId, cur);
    }
  }
  const byProduct: BreakdownProduct[] = [...byProductMap.entries()]
    .map(([productId, v]) => ({
      productId,
      productName: v.name,
      qty: v.qty,
      orderCount: v.orders.size,
      revenue: v.revenue,
      modal: v.modal,
      profit: v.revenue - v.modal,
      margin:
        v.revenue > 0 ? ((v.revenue - v.modal) / v.revenue) * 100 : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  // Breakdown barista
  const byBaristaMap = new Map<
    string,
    {
      name: string;
      trx: number;
      revenue: number;
      profit: number;
      jarakArr: number[];
      durasiArr: number[];
    }
  >();
  for (const o of orders) {
    if (o.status !== "COMPLETED" || o.paymentStatus !== "PAID") continue;
    if (!o.baristaId) continue;
    const r = rows.find((x) => x.id === o.id)!;
    const cur = byBaristaMap.get(o.baristaId) ?? {
      name: o.barista?.name ?? "Unknown",
      trx: 0,
      revenue: 0,
      profit: 0,
      jarakArr: [],
      durasiArr: [],
    };
    cur.trx += 1;
    cur.revenue += r.total;
    cur.profit += r.grossProfit;
    if (r.distanceKm !== null) cur.jarakArr.push(r.distanceKm);
    if (r.durationMinutes !== null) cur.durasiArr.push(r.durationMinutes);
    byBaristaMap.set(o.baristaId, cur);
  }
  const byBarista: BreakdownBarista[] = [...byBaristaMap.entries()]
    .map(([baristaId, v]) => ({
      baristaId,
      baristaName: v.name,
      trx: v.trx,
      revenue: v.revenue,
      profit: v.profit,
      avgJarakKm:
        v.jarakArr.length > 0
          ? v.jarakArr.reduce((s, x) => s + x, 0) / v.jarakArr.length
          : null,
      avgDurasiMinutes:
        v.durasiArr.length > 0
          ? v.durasiArr.reduce((s, x) => s + x, 0) / v.durasiArr.length
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Breakdown channel
  const byChannel: BreakdownChannel[] = (
    ["ONLINE", "OFFLINE"] as const
  ).map((ch) => {
    const items = paidCompleted.filter((r) => r.channel === ch);
    const rev = items.reduce((s, r) => s + r.total, 0);
    return {
      channel: ch,
      count: items.length,
      revenue: rev,
      percentage: totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0,
    };
  });

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / query.limit) || 1;
  const start = (query.page - 1) * query.limit;
  const paginatedRows = rows.slice(start, start + query.limit);

  return {
    items: paginatedRows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: totalRows,
      totalPages,
    },
    summary,
    breakdown: {
      byPayment,
      byProduct,
      byBarista,
      byChannel,
    },
  };
}

// ============================================================
// Full (tanpa pagination) — untuk export
// ============================================================

export async function getOrderReportFull(query: OrderReportQuery) {
  return getOrderReport({ ...query, page: 1, limit: 10000 });
}