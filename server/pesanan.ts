"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import {
    menu,
    menuVariant,
    order,
    orderItem,
    type NewOrder,
    type NewOrderItem,
} from "@/db/schema";
import { getCurrentUser } from "@/server/users";
import { requireRole } from "@/server/helper/permission";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface CreateOrderItemInput {
    menuId: string;
    menuVariantId: string;
    quantity: number;
}

export interface CreateOrderInput {
    items: CreateOrderItemInput[];
    discount?: number;
    tax?: number;
    notes?: string;
}

export interface UpdateOrderInput {
    items?: CreateOrderItemInput[];
    discount?: number;
    tax?: number;
    notes?: string;
}

export interface SyncOrderInput {
    items: CreateOrderItemInput[];
    discount?: number;
    tax?: number;
    notes?: string;
    paymentMethod: "CASH" | "QRIS";
    paidAmount: number;
    changeAmount?: number;
    createdAt: string;
    completedAt: string;
    clientOrderId?: string;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function generateOrderNumber(referenceDate: Date = new Date()): string {
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
    const day = String(referenceDate.getDate()).padStart(2, "0");
    const time = String(referenceDate.getTime()).slice(-6);

    return `ORD - ${ year }${ month }${ day } -${ time } `;
}

async function validateOrderItems(items: CreateOrderItemInput[]) {
    if (!items?.length) {
        throw new Error("Pesanan harus memiliki minimal satu menu.");
    }

    const validatedItems = [];

    for (const item of items) {
        if (!item.menuId || !item.menuVariantId) {
            throw new Error("Menu dan variant harus dipilih.");
        }

        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            throw new Error("Jumlah menu harus lebih dari 0.");
        }

        const menuData = await db.query.menu.findFirst({
            where: eq(menu.id, item.menuId),
        });

        if (!menuData) {
            throw new Error("Menu tidak ditemukan.");
        }

        if (!menuData.available) {
            throw new Error(`Menu "${menuData.name}" sedang tidak tersedia.`);
        }

        const menuVariantData = await db.query.menuVariant.findFirst({
            where: and(
                eq(menuVariant.id, item.menuVariantId),
                eq(menuVariant.menuId, item.menuId)
            ),
            with: { variant: true },
        });

        if (!menuVariantData) {
            throw new Error(
                `Variant untuk menu "${menuData.name}" tidak ditemukan.`
            );
        }

        if (!menuVariantData.available) {
            throw new Error(
                `Variant "${menuVariantData.variant.name}" untuk menu "${menuData.name}" sedang tidak tersedia.`
            );
        }

        validatedItems.push({
            menuId: menuData.id,
            menuVariantId: menuVariantData.id,
            variantId: menuVariantData.variantId,
            menuName: menuData.name,
            variantName: menuVariantData.variant.name,
            unitPrice: menuVariantData.price,
            quantity: item.quantity,
            subtotal: menuVariantData.price * item.quantity,
        });
    }

    return validatedItems;
}

function calculateTotals(
    items: Awaited<ReturnType<typeof validateOrderItems>>,
    discount = 0,
    tax = 0
) {
    const subtotal = items.reduce(
        (total, item) => total + item.subtotal,
        0
    );

    const safeDiscount = Math.max(0, discount);
    const safeTax = Math.max(0, tax);
    const total = Math.max(0, subtotal - safeDiscount + safeTax);

    return {
        subtotal,
        discount: safeDiscount,
        tax: safeTax,
        total,
    };
}

function buildOrderItems(
    orderId: string,
    items: Awaited<ReturnType<typeof validateOrderItems>>
): NewOrderItem[] {
    return items.map((item) => ({
        id: crypto.randomUUID(),
        orderId,
        menuId: item.menuId,
        menuVariantId: item.menuVariantId,
        variantId: item.variantId,
        menuName: item.menuName,
        variantName: item.variantName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
    }));
}

/* -------------------------------------------------------------------------- */
/* GET ORDERS                                                                 */
/* -------------------------------------------------------------------------- */

export async function getOrders() {
    await requireRole("ADMIN");

    return db.query.order.findMany({
        with: {
            user: true,
            items: {
                with: {
                    menu: true,
                    menuVariant: true,
                    variant: true,
                },
            },
        },
        orderBy: [desc(order.createdAt)],
    });
}

export async function getMyOrders() {
    const currentUser = await getCurrentUser();

    return db.query.order.findMany({
        where: eq(order.userId, currentUser.id),
        with: {
            user: true,
            items: {
                with: {
                    menu: true,
                    menuVariant: true,
                    variant: true,
                },
            },
        },
        orderBy: [desc(order.createdAt)],
    });
}

export async function getPendingOrders() {
    const currentUser = await getCurrentUser();
    const whereCondition =
        currentUser.role === "ADMIN"
            ? eq(order.status, "PENDING")
            : and(
                  eq(order.status, "PENDING"),
                  eq(order.userId, currentUser.id)
              );

    return db.query.order.findMany({
        where: whereCondition,
        with: {
            user: true,
            items: {
                with: {
                    menu: true,
                    menuVariant: true,
                    variant: true,
                },
            },
        },
        orderBy: [desc(order.createdAt)],
    });
}

export async function getCompletedOrders() {
    const currentUser = await getCurrentUser();
    const whereCondition =
        currentUser.role === "ADMIN"
            ? eq(order.status, "COMPLETED")
            : and(
                  eq(order.status, "COMPLETED"),
                  eq(order.userId, currentUser.id)
              );

    return db.query.order.findMany({
        where: whereCondition,
        with: {
            user: true,
            items: {
                with: {
                    menu: true,
                    menuVariant: true,
                    variant: true,
                },
            },
        },
        orderBy: [desc(order.completedAt)],
    });
}

export async function getOrderHistory() {
    await requireRole("ADMIN");

    return db.query.order.findMany({
        where: sql`${ order.status } IN('COMPLETED', 'CANCELLED')`,
        with: {
            user: true,
            items: {
                with: {
                    menu: true,
                    menuVariant: true,
                    variant: true,
                },
            },
        },
        orderBy: [desc(order.createdAt)],
    });
}

export async function getOrderById(orderId: string) {
    const currentUser = await getCurrentUser();

    const selectedOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
        with: {
            user: true,
            items: {
                with: {
                    menu: true,
                    menuVariant: true,
                    variant: true,
                },
            },
        },
    });

    if (!selectedOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    if (
        currentUser.role !== "ADMIN" &&
        selectedOrder.userId !== currentUser.id
    ) {
        throw new Error("Anda tidak memiliki akses ke pesanan ini.");
    }

    return selectedOrder;
}

/* -------------------------------------------------------------------------- */
/* CREATE ORDER                                                               */
/* -------------------------------------------------------------------------- */

export async function createOrder(input: CreateOrderInput) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");
    const validatedItems = await validateOrderItems(input.items);

    const { subtotal, discount, tax, total } = calculateTotals(
        validatedItems,
        input.discount ?? 0,
        input.tax ?? 0
    );

    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();

    const newOrder: NewOrder = {
        id: orderId,
        orderNumber,
        userId: currentUser.id,
        status: "PENDING",
        paymentMethod: null,
        paymentStatus: "UNPAID",
        subtotal,
        discount,
        tax,
        total,
        paidAmount: 0,
        changeAmount: 0,
        notes: input.notes ?? null,
    };

    const newOrderItems = buildOrderItems(orderId, validatedItems);

    await db.transaction(async (tx) => {
        await tx.insert(order).values(newOrder);
        await tx.insert(orderItem).values(newOrderItems);
    });

    return {
        success: true,
        orderId,
        orderNumber,
        total,
    };
}

/* -------------------------------------------------------------------------- */
/* UPDATE ORDER                                                               */
/* -------------------------------------------------------------------------- */

export async function updateOrder(
    orderId: string,
    input: UpdateOrderInput
) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");

    const existingOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!existingOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    if (
        currentUser.role !== "ADMIN" &&
        existingOrder.userId !== currentUser.id
    ) {
        throw new Error("Anda tidak memiliki akses untuk mengubah pesanan ini.");
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error("Hanya pesanan pending yang dapat diubah.");
    }

    const validatedItems = input.items
        ? await validateOrderItems(input.items)
        : null;

    const discount = Math.max(
        0,
        input.discount ?? existingOrder.discount
    );

    const tax = Math.max(
        0,
        input.tax ?? existingOrder.tax
    );

    const subtotal = validatedItems
        ? validatedItems.reduce(
              (total, item) => total + item.subtotal,
              0
          )
        : existingOrder.subtotal;

    const total = Math.max(
        0,
        subtotal - discount + tax
    );

    await db.transaction(async (tx) => {
        if (validatedItems) {
            await tx
                .delete(orderItem)
                .where(eq(orderItem.orderId, orderId));

            await tx
                .insert(orderItem)
                .values(buildOrderItems(orderId, validatedItems));
        }

        await tx
            .update(order)
            .set({
                subtotal,
                discount,
                tax,
                total,
                notes: input.notes ?? existingOrder.notes,
                updatedAt: new Date(),
            })
            .where(eq(order.id, orderId));
    });

    return {
        success: true,
        orderId,
        total,
    };
}

/* -------------------------------------------------------------------------- */
/* CANCEL ORDER                                                               */
/* -------------------------------------------------------------------------- */

export async function cancelOrder(orderId: string) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");

    const existingOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!existingOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    if (
        currentUser.role !== "ADMIN" &&
        existingOrder.userId !== currentUser.id
    ) {
        throw new Error(
            "Anda tidak memiliki akses untuk membatalkan pesanan ini."
        );
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error(
            "Hanya pesanan pending yang dapat dibatalkan."
        );
    }

    await db
        .update(order)
        .set({
            status: "CANCELLED",
            paymentStatus: "UNPAID",
            cancelledAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(order.id, orderId));

    return {
        success: true,
        message: "Pesanan berhasil dibatalkan.",
    };
}

/* -------------------------------------------------------------------------- */
/* COMPLETE CASH PAYMENT                                                      */
/* -------------------------------------------------------------------------- */

export async function completeCashPayment(
    orderId: string,
    paidAmount: number
) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");

    const existingOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!existingOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    if (
        currentUser.role !== "ADMIN" &&
        existingOrder.userId !== currentUser.id
    ) {
        throw new Error(
            "Anda tidak memiliki akses untuk menyelesaikan pesanan ini."
        );
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error(
            "Pesanan ini sudah tidak berstatus pending."
        );
    }

    if (
        typeof paidAmount !== "number" ||
        !Number.isFinite(paidAmount) ||
        paidAmount < existingOrder.total
    ) {
        throw new Error(
            "Jumlah pembayaran kurang dari total pesanan."
        );
    }

    const changeAmount = paidAmount - existingOrder.total;

    await db
        .update(order)
        .set({
            status: "COMPLETED",
            paymentMethod: "CASH",
            paymentStatus: "PAID",
            paidAmount,
            changeAmount,
            completedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(order.id, orderId));

    return {
        success: true,
        changeAmount,
    };
}

/* -------------------------------------------------------------------------- */
/* COMPLETE QRIS PAYMENT                                                      */
/* -------------------------------------------------------------------------- */

export async function completeQrisPayment(orderId: string) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");

    const existingOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!existingOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    if (
        currentUser.role !== "ADMIN" &&
        existingOrder.userId !== currentUser.id
    ) {
        throw new Error(
            "Anda tidak memiliki akses untuk menyelesaikan pesanan ini."
        );
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error(
            "Pesanan ini sudah tidak berstatus pending."
        );
    }

    await db
        .update(order)
        .set({
            status: "COMPLETED",
            paymentMethod: "QRIS",
            paymentStatus: "PAID",
            paidAmount: existingOrder.total,
            changeAmount: 0,
            completedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(order.id, orderId));

    return {
        success: true,
        message: "Pembayaran QRIS berhasil diselesaikan.",
    };
}

/* -------------------------------------------------------------------------- */
/* SYNC OFFLINE ORDER                                                         */
/* -------------------------------------------------------------------------- */

export async function syncOfflineOrder(input: SyncOrderInput) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");

    if (
        input.paymentMethod !== "CASH" &&
        input.paymentMethod !== "QRIS"
    ) {
        throw new Error("Metode pembayaran tidak valid.");
    }

    if (
        typeof input.paidAmount !== "number" ||
        !Number.isFinite(input.paidAmount) ||
        input.paidAmount < 0
    ) {
        throw new Error("Jumlah pembayaran tidak valid.");
    }

    const createdAt = new Date(input.createdAt);
    const completedAt = new Date(input.completedAt);

    if (
        Number.isNaN(createdAt.getTime()) ||
        Number.isNaN(completedAt.getTime())
    ) {
        throw new Error("Waktu pesanan tidak valid.");
    }

    const now = new Date();
    const fiveMinutesAhead =
        now.getTime() + 5 * 60 * 1000;

    if (createdAt.getTime() > fiveMinutesAhead) {
        throw new Error(
            "Waktu pesanan tidak valid (terdeteksi di masa depan)."
        );
    }

    if (completedAt.getTime() < createdAt.getTime()) {
        throw new Error(
            "Waktu selesai tidak boleh sebelum waktu pesanan dibuat."
        );
    }

    const validatedItems = await validateOrderItems(input.items);

    const { subtotal, discount, tax, total } = calculateTotals(
        validatedItems,
        input.discount ?? 0,
        input.tax ?? 0
    );

    if (input.paidAmount < total) {
        throw new Error(
            "Jumlah pembayaran kurang dari total pesanan."
        );
    }

    // Jangan percaya changeAmount dari client.
    const changeAmount = Math.max(
        0,
        input.paidAmount - total
    );

    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber(createdAt);

    const newOrder: NewOrder = {
        id: orderId,
        orderNumber,
        userId: currentUser.id,
        status: "COMPLETED",
        paymentMethod: input.paymentMethod,
        paymentStatus: "PAID",
        subtotal,
        discount,
        tax,
        total,
        paidAmount: input.paidAmount,
        changeAmount,
        notes: input.notes ?? null,
        createdAt,
        updatedAt: now,
        completedAt,
    };

    const newOrderItems = buildOrderItems(
        orderId,
        validatedItems
    );

    await db.transaction(async (tx) => {
        await tx.insert(order).values(newOrder);
        await tx.insert(orderItem).values(newOrderItems);
    });

    return {
        success: true,
        orderId,
        orderNumber,
        total,
        clientOrderId: input.clientOrderId ?? null,
    };
}

/* -------------------------------------------------------------------------- */
/* ORDER STATISTICS                                                           */
/* -------------------------------------------------------------------------- */

export async function getOrderStatistics() {
    await requireRole("ADMIN");

    const completedOrders = await db.query.order.findMany({
        where: eq(order.status, "COMPLETED"),
        with: {
            items: true,
            user: true,
        },
        orderBy: [desc(order.completedAt)],
    });

    const cancelledOrders = await db.query.order.findMany({
        where: eq(order.status, "CANCELLED"),
        with: {
            user: true,
        },
        orderBy: [desc(order.cancelledAt)],
    });

    const totalRevenue = completedOrders.reduce(
        (total, currentOrder) =>
            total + Number(currentOrder.total || 0),
        0
    );

    const totalCash = completedOrders
        .filter(
            (currentOrder) =>
                currentOrder.paymentMethod === "CASH"
        )
        .reduce(
            (total, currentOrder) =>
                total + Number(currentOrder.total || 0),
            0
        );

    const totalQris = completedOrders
        .filter(
            (currentOrder) =>
                currentOrder.paymentMethod === "QRIS"
        )
        .reduce(
            (total, currentOrder) =>
                total + Number(currentOrder.total || 0),
            0
        );

    const dailyMap = new Map<
        string,
        {
            date: string;
            revenue: number;
            orders: number;
        }
    >();

    for (const currentOrder of completedOrders) {
        const date = currentOrder.completedAt
            ? new Date(currentOrder.completedAt)
                  .toISOString()
                  .split("T")[0]
            : new Date(currentOrder.createdAt)
                  .toISOString()
                  .split("T")[0];

        const existing = dailyMap.get(date);

        if (existing) {
            existing.revenue += Number(
                currentOrder.total || 0
            );
            existing.orders += 1;
        } else {
            dailyMap.set(date, {
                date,
                revenue: Number(
                    currentOrder.total || 0
                ),
                orders: 1,
            });
        }
    }

    const dailyRevenue = Array.from(
        dailyMap.values()
    ).sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    return {
        totalOrders: completedOrders.length,
        totalCancelled: cancelledOrders.length,
        totalRevenue,
        totalCash,
        totalQris,
        dailyRevenue,
    };
}

/* -------------------------------------------------------------------------- */
/* DELETE ORDER                                                               */
/* -------------------------------------------------------------------------- */

export async function deleteOrder(orderId: string) {
    await requireRole("ADMIN");

    const existingOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!existingOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    await db
        .delete(order)
        .where(eq(order.id, orderId));

    return {
        success: true,
        message: "Pesanan berhasil dihapus.",
    };
}
