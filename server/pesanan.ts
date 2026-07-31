"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import {
    menu,
    menuVariant,
    order,
    orderItem,
    variant,
    type NewOrder,
    type NewOrderItem,
} from "@/db/schema";
import { getCurrentUser } from "@/server/users";
import { requireRole } from "@/server/helper/permission";


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| CREATE ORDER NUMBER
|--------------------------------------------------------------------------
*/

function generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const time = String(Date.now()).slice(-6);

    return `ORD-${year}${month}${day}-${time}`;
}


/*
|--------------------------------------------------------------------------
| GET ALL ORDERS
|--------------------------------------------------------------------------
| ADMIN ONLY
|
| Mengambil semua pesanan dari semua status.
|--------------------------------------------------------------------------
*/

export async function getOrders() {
    await requireRole("ADMIN");

    const orders = await db.query.order.findMany({
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

    return orders;
}


/*
|--------------------------------------------------------------------------
| GET CURRENT USER ORDERS
|--------------------------------------------------------------------------
| ADMIN / EMPLOYEE
|
| Mengambil semua pesanan milik user yang sedang login.
|--------------------------------------------------------------------------
*/

export async function getMyOrders() {
    const currentUser = await getCurrentUser();

    const orders = await db.query.order.findMany({
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

    return orders;
}


/*
|--------------------------------------------------------------------------
| GET PENDING ORDERS
|--------------------------------------------------------------------------
| ADMIN:
| Semua pending order.
|
| EMPLOYEE:
| Hanya pending order miliknya sendiri.
|--------------------------------------------------------------------------
*/

export async function getPendingOrders() {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser.role === "ADMIN";

    const whereCondition = isAdmin
        ? eq(order.status, "PENDING")
        : and(
            eq(order.status, "PENDING"),
            eq(order.userId, currentUser.id)
        );

    const orders = await db.query.order.findMany({
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

    return orders;
}


/*
|--------------------------------------------------------------------------
| GET COMPLETED ORDERS
|--------------------------------------------------------------------------
| ADMIN:
| Melihat semua pesanan COMPLETED dari ADMIN maupun EMPLOYEE.
|
| EMPLOYEE:
| Melihat hanya pesanan COMPLETED miliknya sendiri.
|
| Gunakan fungsi ini untuk history pribadi jika diperlukan.
|--------------------------------------------------------------------------
*/

export async function getCompletedOrders() {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser.role === "ADMIN";

    const whereCondition = isAdmin
        ? eq(order.status, "COMPLETED")
        : and(
            eq(order.status, "COMPLETED"),
            eq(order.userId, currentUser.id)
        );

    const orders = await db.query.order.findMany({
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

    return orders;
}


/*
|--------------------------------------------------------------------------
| GET ORDER HISTORY
|--------------------------------------------------------------------------
| ADMIN:
| Melihat semua history transaksi dari ADMIN maupun EMPLOYEE.
|
| History:
| - COMPLETED
| - CANCELLED
|
| Fungsi ini cocok untuk halaman:
| /pesanan
|--------------------------------------------------------------------------
*/

export async function getOrderHistory() {
    await requireRole("ADMIN");

    const orders = await db.query.order.findMany({
        where: sql`${order.status} IN ('COMPLETED', 'CANCELLED')`,
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

    return orders;
}


/*
|--------------------------------------------------------------------------
| GET ORDER BY ID
|--------------------------------------------------------------------------
| ADMIN:
| Dapat melihat semua pesanan.
|
| EMPLOYEE:
| Hanya dapat melihat pesanan miliknya.
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| VALIDATE ORDER ITEMS
|--------------------------------------------------------------------------
*/

async function validateOrderItems(items: CreateOrderItemInput[]) {
    if (!items || items.length === 0) {
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
            with: {
                variant: true,
            },
        });

        if (!menuVariantData) {
            throw new Error(`Variant untuk menu "${menuData.name}" tidak ditemukan.`);
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


/*
|--------------------------------------------------------------------------
| CREATE ORDER
|--------------------------------------------------------------------------
*/

export async function createOrder(input: CreateOrderInput) {
    const currentUser = await requireRole("ADMIN", "EMPLOYEE");

    const validatedItems = await validateOrderItems(input.items);

    const discount = Math.max(0, input.discount ?? 0);
    const tax = Math.max(0, input.tax ?? 0);

    const subtotal = validatedItems.reduce(
        (total, item) => total + item.subtotal,
        0
    );

    const total = Math.max(
        0,
        subtotal - discount + tax
    );

    const newOrderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();

    const newOrder: NewOrder = {
        id: newOrderId,
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

    const newOrderItems: NewOrderItem[] = validatedItems.map((item) => ({
        id: crypto.randomUUID(),
        orderId: newOrderId,
        menuId: item.menuId,
        menuVariantId: item.menuVariantId,
        variantId: item.variantId,
        menuName: item.menuName,
        variantName: item.variantName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
    }));

    await db.transaction(async (tx) => {
        await tx.insert(order).values(newOrder);
        await tx.insert(orderItem).values(newOrderItems);
    });

    return {
        success: true,
        orderId: newOrderId,
        orderNumber,
        total,
    };
}


/*
|--------------------------------------------------------------------------
| UPDATE PENDING ORDER
|--------------------------------------------------------------------------
*/

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
            await tx.delete(orderItem).where(
                eq(orderItem.orderId, orderId)
            );

            const updatedItems: NewOrderItem[] = validatedItems.map((item) => ({
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

            await tx.insert(orderItem).values(updatedItems);
        }

        await tx.update(order)
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


/*
|--------------------------------------------------------------------------
| CANCEL ORDER
|--------------------------------------------------------------------------
| PENDING -> CANCELLED
|
| Pesanan tidak dihapus dari database.
|--------------------------------------------------------------------------
*/

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
        throw new Error("Anda tidak memiliki akses untuk membatalkan pesanan ini.");
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error("Hanya pesanan pending yang dapat dibatalkan.");
    }

    await db.update(order)
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


/*
|--------------------------------------------------------------------------
| COMPLETE CASH PAYMENT
|--------------------------------------------------------------------------
| PENDING -> COMPLETED
|--------------------------------------------------------------------------
*/

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
        throw new Error("Anda tidak memiliki akses untuk menyelesaikan pesanan ini.");
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error("Pesanan ini sudah tidak berstatus pending.");
    }

    if (paidAmount < existingOrder.total) {
        throw new Error("Jumlah pembayaran kurang dari total pesanan.");
    }

    const changeAmount = paidAmount - existingOrder.total;

    await db.update(order)
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


/*
|--------------------------------------------------------------------------
| COMPLETE QRIS PAYMENT
|--------------------------------------------------------------------------
| PENDING -> COMPLETED
|--------------------------------------------------------------------------
*/

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
        throw new Error("Anda tidak memiliki akses untuk menyelesaikan pesanan ini.");
    }

    if (existingOrder.status !== "PENDING") {
        throw new Error("Pesanan ini sudah tidak berstatus pending.");
    }

    await db.update(order)
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


/*
|--------------------------------------------------------------------------
| GET ORDER STATISTICS
|--------------------------------------------------------------------------
| ADMIN ONLY
|
| Digunakan untuk dashboard history /pesanan.
|
| Data:
| - Total completed order
| - Total cancelled order
| - Total revenue
| - Cash transaction
| - QRIS transaction
| - Daily revenue
| - Daily transaction
|--------------------------------------------------------------------------
*/

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
        (total, currentOrder) => total + Number(currentOrder.total || 0),
        0
    );

    const totalCash = completedOrders
        .filter((currentOrder) => currentOrder.paymentMethod === "CASH")
        .reduce(
            (total, currentOrder) => total + Number(currentOrder.total || 0),
            0
        );

    const totalQris = completedOrders
        .filter((currentOrder) => currentOrder.paymentMethod === "QRIS")
        .reduce(
            (total, currentOrder) => total + Number(currentOrder.total || 0),
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
            ? new Date(currentOrder.completedAt).toISOString().split("T")[0]
            : new Date(currentOrder.createdAt).toISOString().split("T")[0];

        const existing = dailyMap.get(date);

        if (existing) {
            existing.revenue += Number(currentOrder.total || 0);
            existing.orders += 1;
        } else {
            dailyMap.set(date, {
                date,
                revenue: Number(currentOrder.total || 0),
                orders: 1,
            });
        }
    }

    const dailyRevenue = Array.from(dailyMap.values()).sort(
        (a, b) => a.date.localeCompare(b.date)
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


/*
|--------------------------------------------------------------------------
| DELETE ORDER
|--------------------------------------------------------------------------
| ADMIN ONLY
|
| Menghapus pesanan secara permanen.
|
| Digunakan untuk kebutuhan administratif.
|--------------------------------------------------------------------------
*/

export async function deleteOrder(orderId: string) {
    await requireRole("ADMIN");

    const existingOrder = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!existingOrder) {
        throw new Error("Pesanan tidak ditemukan.");
    }

    await db.delete(order).where(
        eq(order.id, orderId)
    );

    return {
        success: true,
        message: "Pesanan berhasil dihapus.",
    };
}