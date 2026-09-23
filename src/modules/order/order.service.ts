import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type {
  CancelOrderInput,
  CompleteOrderInput,
  CreateOrderInput,
  ListOrderQuery,
  PreviewOrderInput,
  RejectOrderInput,
  UpdateOrderStatusInput,
} from "./order.validator";
import {
  broadcastOrderToBaristas,
  findNearestBaristasWithStock,
  removeOrderFromAllPools,
  updateOrderTrackingFirebase,
} from "./order.assignment.service";
import {
  computeCharges,
  computePaymentFee,
  generateOrderNumber,
} from "./order.charge.service";

// ============================================================
// Validation helper
// ============================================================

async function validateAndComputeItems(
  items: Array<{ productId: string; quantity: number; notes?: string }>
) {
  const productIds = items.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw ApiError.unprocessable(
      "Produk tidak boleh duplikat. Gabungkan jadi satu baris."
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const p = productMap.get(it.productId);
    if (!p) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: produk tidak ditemukan`
      );
    }
    if (!p.isActive) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: produk "${p.name}" sedang tidak aktif`
      );
    }
    if (it.quantity <= 0) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: quantity harus lebih dari 0`
      );
    }
  }

  const computedItems = items.map((it) => {
    const p = productMap.get(it.productId)!;
    const unitPrice = Number(p.sellingPrice);
    const subtotal = unitPrice * it.quantity;
    return {
      productId: p.id,
      productName: p.name,
      quantity: it.quantity,
      unitPrice,
      subtotal,
      notes: it.notes,
    };
  });

  const subtotal = computedItems.reduce((s, it) => s + it.subtotal, 0);

  return { computedItems, subtotal };
}

// ============================================================
// Preview — hitung harga tanpa buat order
// ============================================================

export async function previewOrder(input: PreviewOrderInput) {
  const { computedItems, subtotal } = await validateAndComputeItems(
    input.items
  );

  const { charges, chargesTotal } = await computeCharges(subtotal);
  const payment = await computePaymentFee(
    input.paymentMethodCode,
    subtotal
  );

  const deliveryFee = 0;
  const total =
    subtotal + chargesTotal + payment.feeAmount + deliveryFee;

  return {
    items: computedItems,
    subtotal,
    charges,
    chargesTotal,
    paymentMethod: payment.method,
    paymentFeeAmount: payment.feeAmount,
    deliveryFee,
    total,
    paymentProvider: payment.method.provider,
    paymentChannel:
      payment.method.provider === "CASH" ? "COD" : "PREPAID",
  };
}

// ============================================================
// Create Order
// ============================================================

export async function createOrder(input: CreateOrderInput) {
  const isOffline = input.channel === "OFFLINE";

  // Validasi alamat untuk order online
  if (
    !isOffline &&
    (!input.deliveryAddress ||
      input.deliveryLatitude === undefined ||
      input.deliveryLongitude === undefined)
  ) {
    throw ApiError.unprocessable(
      "Alamat + koordinat wajib diisi untuk order online"
    );
  }

  // Hitung item + subtotal
  const { computedItems, subtotal } = await validateAndComputeItems(
    input.items
  );

  // Charge dari Setting
  const { charges, chargesTotal } = await computeCharges(subtotal);

  // Payment method fee
  const paymentInfo = await computePaymentFee(
    input.paymentMethodCode,
    subtotal
  );

  const isCOD = paymentInfo.method.provider === "CASH";
  const deliveryFee = 0;
  const total =
    subtotal + chargesTotal + paymentInfo.feeAmount + deliveryFee;

  const orderNumber = await generateOrderNumber();

  const paymentChannel = isCOD ? "COD" : "PREPAID";

  // Initial status
  const initialStatus = isOffline
    ? "COMPLETED"
    : isCOD
      ? "SEARCHING"
      : "PENDING";

  // Transaction
  const result = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          channel: input.channel,
          customerId: input.customerId ?? null,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress ?? null,
          deliveryLatitude: input.deliveryLatitude ?? null,
          deliveryLongitude: input.deliveryLongitude ?? null,
          deliveryNote: input.deliveryNote ?? null,

          status: initialStatus,

          subtotal,
          chargesTotal,
          deliveryFee,
          total,

          // Payment
          paymentStatus: isOffline ? "PAID" : "PENDING",
          paymentProvider: paymentInfo.method.provider,
          paymentChannel,
          paymentMethodCode: paymentInfo.method.code,
          paymentMethodName: paymentInfo.method.name,
          paymentMethodGroup: paymentInfo.method.displayGroup,
          paymentFeeAmount: paymentInfo.feeAmount,
          dokuPaymentMethod: paymentInfo.method.dokuChannelCode,

          // Offline → langsung selesai + paid
          ...(isOffline
            ? {
                completedAt: new Date(),
                actualDeliveryAt: new Date(),
                paidAt: new Date(),
              }
            : {}),
        },
      });

      // Items
      await tx.orderItem.createMany({
        data: computedItems.map((it) => ({
          orderId: order.id,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
          notes: it.notes ?? null,
        })),
      });

      // Charges (snapshot)
      if (charges.length > 0) {
        await tx.orderCharge.createMany({
          data: charges.map((c) => ({
            orderId: order.id,
            settingKey: c.settingKey,
            settingName: c.settingName,
            type: c.type,
            rateValue: c.rateValue,
            amount: c.amount,
            sortOrder: c.sortOrder,
          })),
        });
      }

      // Status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: initialStatus,
          note: isOffline
            ? "Order offline (cash) langsung selesai"
            : isCOD
              ? "Order dibuat, mencari barista"
              : "Order dibuat, menunggu pembayaran",
        },
      });

      // Payment log
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          provider: paymentInfo.method.provider,
          methodCode: paymentInfo.method.code,
          methodName: paymentInfo.method.name,
          methodGroup: paymentInfo.method.displayGroup,
          methodFeeAmount: paymentInfo.feeAmount,
          status: isOffline ? "PAID" : "PENDING",
          paidAt: isOffline ? new Date() : null,
          dokuChannelCode: paymentInfo.method.dokuChannelCode,
        },
      });

      return order;
    },
    { timeout: 30000 }
  );

  // Trigger assignment (fire-and-forget) untuk COD online
  if (!isOffline && isCOD) {
    void assignOrderToBaristas(result.id).catch((err) => {
      console.error("[order] assignment failed:", err);
    });
  }

  return {
    success: true,
    orderId: result.id,
    orderNumber: result.orderNumber,
    status: result.status,
    paymentStatus: result.paymentStatus,
    paymentChannel: result.paymentChannel,
    paymentMethod: {
      code: paymentInfo.method.code,
      name: paymentInfo.method.name,
      provider: paymentInfo.method.provider,
    },
    subtotal,
    chargesTotal,
    paymentFeeAmount: paymentInfo.feeAmount,
    deliveryFee,
    total,
  };
}

// ============================================================
// Assign Order to Baristas (dipanggil fire-and-forget)
// ============================================================

export async function assignOrderToBaristas(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");
  if (order.status !== "SEARCHING") return;

  const items = order.items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity,
  }));

  const candidates = await findNearestBaristasWithStock({
    customerLatitude: order.deliveryLatitude ?? 0,
    customerLongitude: order.deliveryLongitude ?? 0,
    items,
    radiusKm: 5,
    limit: 3,
  });

  if (candidates.length === 0) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "SEARCHING",
        note: "Tidak ada barista tersedia dalam radius 5 km",
      },
    });
    return { success: false, message: "Tidak ada barista tersedia" };
  }

  const nearest = candidates[0];

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "ASSIGNED",
      baristaId: nearest.baristaId,
      assignedAt: new Date(),
      distanceKm: nearest.distanceKm,
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: "ASSIGNED",
      note: `Ditugaskan ke ${nearest.baristaName} (${nearest.distanceKm.toFixed(2)} km)`,
    },
  });

  await broadcastOrderToBaristas({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerLatitude: order.deliveryLatitude ?? 0,
    customerLongitude: order.deliveryLongitude ?? 0,
    items: order.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
    })),
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    baristaIds: candidates.map((c) => c.baristaId),
    expiresInMs: 30000,
  });

  await updateOrderTrackingFirebase(order.id, {
    status: "ASSIGNED",
    baristaId: nearest.baristaId,
    baristaName: nearest.baristaName,
    baristaLatitude: nearest.latitude,
    baristaLongitude: nearest.longitude,
  });

  return {
    success: true,
    assignedTo: nearest.baristaName,
    distanceKm: nearest.distanceKm,
    candidatesCount: candidates.length,
  };
}

// ============================================================
// Accept Order (barista)
// ============================================================

export async function acceptOrder(orderId: string, baristaId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");

  if (order.baristaId !== baristaId) {
    throw ApiError.forbidden(
      "Anda bukan barista yang ditugaskan untuk order ini"
    );
  }

  if (order.status !== "ASSIGNED") {
    throw ApiError.unprocessable(
      `Order tidak dalam status ASSIGNED (sekarang: ${order.status})`
    );
  }

  // Cek stok cukup
  const stocks = await prisma.baristaStock.findMany({
    where: {
      baristaId,
      productId: { in: order.items.map((i) => i.productId) },
    },
  });
  const stockMap = new Map(
    stocks.map((s) => [s.productId, s.quantity])
  );

  for (const item of order.items) {
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      throw ApiError.unprocessable(
        `Stok "${item.productName}" tidak cukup. Dimiliki: ${available}, butuh: ${item.quantity}`
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "ACCEPTED",
        actorId: baristaId,
        actorRole: "BARISTA",
        note: "Barista menerima order",
      },
    });

    return o;
  });

  await removeOrderFromAllPools(orderId, [baristaId]);

  await updateOrderTrackingFirebase(orderId, {
    status: "ACCEPTED",
    baristaId,
  });

  return {
    success: true,
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
  };
}

// ============================================================
// Reject Order (barista)
// ============================================================

export async function rejectOrder(
  orderId: string,
  baristaId: string,
  input: RejectOrderInput
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");

  if (order.baristaId !== baristaId) {
    throw ApiError.forbidden("Anda bukan barista order ini");
  }

  if (order.status !== "ASSIGNED") {
    throw ApiError.unprocessable(
      `Order tidak dalam status ASSIGNED (sekarang: ${order.status})`
    );
  }

  // Cari barista lain
  const candidates = await findNearestBaristasWithStock({
    customerLatitude: order.deliveryLatitude ?? 0,
    customerLongitude: order.deliveryLongitude ?? 0,
    items: order.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
    })),
    radiusKm: 5,
    limit: 5,
    excludeBaristaIds: [baristaId],
  });

  if (candidates.length === 0) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: "ASSIGNED",
        actorId: baristaId,
        actorRole: "BARISTA",
        note: `Barista reject: ${input.reason ?? "tanpa alasan"}. Tidak ada barista lain.`,
      },
    });

    return {
      success: true,
      message: "Tidak ada barista lain tersedia",
      newBaristaId: null,
    };
  }

  const next = candidates[0];

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        baristaId: next.baristaId,
        assignedAt: new Date(),
        distanceKm: next.distanceKm,
        reassignCount: { increment: 1 },
        reassignedAt: new Date(),
        reassignReason: "LAINNYA",
        reassignNote: input.reason ?? null,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: "ASSIGNED",
        actorId: baristaId,
        actorRole: "BARISTA",
        note: `Reassign ke ${next.baristaName} (${next.distanceKm.toFixed(2)} km). Alasan: ${input.reason ?? "-"}`,
      },
    });
  });

  await broadcastOrderToBaristas({
    orderId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerLatitude: order.deliveryLatitude ?? 0,
    customerLongitude: order.deliveryLongitude ?? 0,
    items: order.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
    })),
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    baristaIds: candidates.map((c) => c.baristaId),
  });

  return {
    success: true,
    newBaristaId: next.baristaId,
    newBaristaName: next.baristaName,
  };
}

// ============================================================
// Update Status (barista: DELIVERING, ARRIVED)
// ============================================================

export async function updateOrderStatus(
  orderId: string,
  baristaId: string,
  input: UpdateOrderStatusInput
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, baristaId: true },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");

  if (order.baristaId !== baristaId) {
    throw ApiError.forbidden("Anda bukan barista order ini");
  }

  const allowedTransitions: Record<string, string[]> = {
    ACCEPTED: ["DELIVERING"],
    DELIVERING: ["ARRIVED"],
  };

  const allowed = allowedTransitions[order.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw ApiError.unprocessable(
      `Tidak bisa ubah dari ${order.status} ke ${input.status}`
    );
  }

  const updateData: Prisma.OrderUpdateInput = {
    status: input.status,
  };

  if (input.status === "DELIVERING") {
    updateData.deliveringAt = new Date();
  } else if (input.status === "ARRIVED") {
    updateData.arrivedAt = new Date();
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: input.status,
        actorId: baristaId,
        actorRole: "BARISTA",
        note: input.note ?? null,
      },
    });
  });

  await updateOrderTrackingFirebase(orderId, {
    status: input.status,
  });

  return { success: true, orderId, status: input.status };
}

// ============================================================
// Complete Order (customer / barista / admin)
// ============================================================

export async function completeOrder(
  orderId: string,
  input: CompleteOrderInput
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");

  if (order.status !== "ARRIVED" && order.status !== "DELIVERING") {
    throw ApiError.unprocessable(
      `Order tidak bisa diselesaikan dari status ${order.status}`
    );
  }

  if (!order.baristaId) {
    throw ApiError.unprocessable("Order tidak punya barista");
  }

  const baristaId = order.baristaId;

  await prisma.$transaction(
    async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualDeliveryAt: new Date(),
          ...(order.paymentChannel === "COD"
            ? { paymentStatus: "PAID", paidAt: new Date() }
            : {}),
        },
      });

      // Update payment log kalau COD
      if (order.paymentChannel === "COD") {
        await tx.payment.update({
          where: { orderId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }

      // Kurangi BaristaStock + log
      for (const item of order.items) {
        const stock = await tx.baristaStock.findUnique({
          where: {
            baristaId_productId: {
              baristaId,
              productId: item.productId,
            },
          },
        });

        if (!stock || stock.quantity < item.quantity) {
          throw ApiError.unprocessable(
            `Stok "${item.productName}" tidak cukup`
          );
        }

        const newQty = stock.quantity - item.quantity;

        await tx.baristaStock.update({
          where: { id: stock.id },
          data: { quantity: newQty },
        });

        await tx.baristaStockMovement.create({
          data: {
            baristaId,
            productId: item.productId,
            type: "SOLD",
            quantity: -item.quantity,
            balanceAfter: newQty,
            orderId,
            note: `Terjual via order ${order.orderNumber}`,
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "COMPLETED",
          note: input.note ?? "Order selesai",
        },
      });
    },
    { timeout: 30000 }
  );

  await updateOrderTrackingFirebase(orderId, {
    status: "COMPLETED",
  });

  return {
    success: true,
    orderId,
    orderNumber: order.orderNumber,
    status: "COMPLETED",
  };
}

// ============================================================
// Cancel Order
// ============================================================

export async function cancelOrder(
  orderId: string,
  input: CancelOrderInput,
  actorId?: string,
  actorRole?: "ADMIN" | "BARISTA" | "CUSTOMER"
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");

  const cancellable = ["PENDING", "SEARCHING", "ASSIGNED", "ACCEPTED"];
  if (!cancellable.includes(order.status)) {
    throw ApiError.unprocessable(
      `Order tidak bisa dibatalkan dari status ${order.status}`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: input.reason,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: "CANCELLED",
        actorId: actorId ?? null,
        actorRole: actorRole ?? null,
        note: input.reason,
      },
    });
  });

  if (order.baristaId) {
    await removeOrderFromAllPools(orderId, [order.baristaId]);
  }

  await updateOrderTrackingFirebase(orderId, {
    status: "CANCELLED",
  });

  return { success: true, orderId, status: "CANCELLED" };
}

// ============================================================
// List Orders
// ============================================================

export async function listOrders(query: ListOrderQuery) {
  const where: Prisma.OrderWhereInput = {};

  if (query.customerId) where.customerId = query.customerId;
  if (query.baristaId) where.baristaId = query.baristaId;
  if (query.status !== "all") where.status = query.status as any;
  if (query.channel !== "all") where.channel = query.channel;

  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      {
        customerName: { contains: query.search, mode: "insensitive" },
      },
      { customerPhone: { contains: query.search } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      include: {
        barista: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        _count: { select: { items: true, charges: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: items.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      channel: o.channel,
      status: o.status,
      customerId: o.customerId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      baristaId: o.baristaId,
      baristaName: o.barista?.name ?? null,
      baristaPhone: o.barista?.phone ?? null,
      deliveryAddress: o.deliveryAddress,
      subtotal: Number(o.subtotal),
      chargesTotal: Number(o.chargesTotal),
      paymentFeeAmount: Number(o.paymentFeeAmount),
      deliveryFee: Number(o.deliveryFee),
      total: Number(o.total),
      paymentStatus: o.paymentStatus,
      paymentProvider: o.paymentProvider,
      paymentChannel: o.paymentChannel,
      paymentMethodCode: o.paymentMethodCode,
      paymentMethodName: o.paymentMethodName,
      distanceKm: o.distanceKm,
      itemCount: o._count.items,
      createdAt: o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
      cancelledAt: o.cancelledAt?.toISOString() ?? null,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

// ============================================================
// Get Order Detail
// ============================================================

export async function getOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      charges: { orderBy: { sortOrder: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      payment: true,
      customer: { select: { id: true, name: true, phone: true } },
      barista: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!order) throw ApiError.notFound("Order tidak ditemukan");

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    channel: order.channel,
    status: order.status,

    customer: {
      id: order.customerId,
      name: order.customerName,
      phone: order.customerPhone,
    },
    barista: order.barista
      ? {
          id: order.barista.id,
          name: order.barista.name,
          phone: order.barista.phone,
        }
      : null,

    deliveryAddress: order.deliveryAddress,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    deliveryNote: order.deliveryNote,
    distanceKm: order.distanceKm,

    items: order.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      notes: it.notes,
    })),

    charges: order.charges.map((c) => ({
      id: c.id,
      settingKey: c.settingKey,
      settingName: c.settingName,
      type: c.type,
      rateValue: Number(c.rateValue),
      amount: Number(c.amount),
      sortOrder: c.sortOrder,
    })),

    subtotal: Number(order.subtotal),
    chargesTotal: Number(order.chargesTotal),
    paymentFeeAmount: Number(order.paymentFeeAmount),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),

    payment: {
      status: order.paymentStatus,
      provider: order.paymentProvider,
      channel: order.paymentChannel,
      methodCode: order.paymentMethodCode,
      methodName: order.paymentMethodName,
      methodGroup: order.paymentMethodGroup,
      feeAmount: Number(order.paymentFeeAmount),
      paidAt: order.paidAt?.toISOString() ?? null,
      dokuInvoiceNumber: order.dokuInvoiceNumber,
      dokuPaymentUrl: order.dokuPaymentUrl,
      dokuPaymentMethod: order.dokuPaymentMethod,
      dokuPaidAt: order.dokuPaidAt?.toISOString() ?? null,
      dokuExpiredAt: order.dokuExpiredAt?.toISOString() ?? null,
    },

    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      status: h.status,
      note: h.note,
      actorId: h.actorId,
      actorRole: h.actorRole,
      createdAt: h.createdAt.toISOString(),
    })),

    timing: {
      createdAt: order.createdAt.toISOString(),
      assignedAt: order.assignedAt?.toISOString() ?? null,
      acceptedAt: order.acceptedAt?.toISOString() ?? null,
      deliveringAt: order.deliveringAt?.toISOString() ?? null,
      arrivedAt: order.arrivedAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      cancelReason: order.cancelReason,
      estimatedDeliveryAt:
        order.estimatedDeliveryAt?.toISOString() ?? null,
      actualDeliveryAt: order.actualDeliveryAt?.toISOString() ?? null,
    },
  };
}

// ============================================================
// Get Available Orders (barista)
// ============================================================

export async function getAvailableOrdersForBarista(baristaId: string) {
  const orders = await prisma.order.findMany({
    where: {
      baristaId,
      status: {
        in: ["ASSIGNED", "ACCEPTED", "DELIVERING", "ARRIVED"],
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      _count: { select: { items: true } },
    },
  });

  return {
    items: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryAddress: o.deliveryAddress,
      deliveryLatitude: o.deliveryLatitude,
      deliveryLongitude: o.deliveryLongitude,
      distanceKm: o.distanceKm,
      total: Number(o.total),
      paymentChannel: o.paymentChannel,
      paymentStatus: o.paymentStatus,
      paymentMethodName: o.paymentMethodName,
      items: o.items.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
      createdAt: o.createdAt.toISOString(),
    })),
  };
}