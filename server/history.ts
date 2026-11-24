"use server";

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { order, orderItem, user } from "@/db/schema";
import { requireRole } from "@/server/helper/permission";


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/


export interface HistoryPaginationInput {
    page?: number;
    limit?: number;
    search?: string;
}


export interface HistoryDateFilterInput {
    startDate?: Date;
    endDate?: Date;
}

export interface HistoryPeriodOption {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
}

export interface HistoryPeriodOptionsResult {
    periods: HistoryPeriodOption[];
    defaultPeriodId: string;
}


export interface HistoryQueryInput extends HistoryPaginationInput {
    startDate?: Date;
    endDate?: Date;
}


export interface HistorySummary {
    totalRevenue: number;
    totalTransactions: number;
    topMenus: {
        menuName: string;
        quantity: number;
        revenue: number;
    }[];
    topUser: {
        userId: string;
        userName: string;
        username: string;
        revenue: number;
        transactions: number;
    } | null;
}

export interface RevenueChartData {
    date: string;
    revenue: number;
    transactions: number;
}

export interface HistoryLineChartItem {
    date: string;
    revenue: number;
    transactions: number;
}


export interface HistoryUserRevenueItem {
    userId: string;
    userName: string;
    username: string;
    revenue: number;
    percentage: number;
}


export interface HistoryUserMenuSalesItem {
    userId: string;
    userName: string;
    username: string;
    quantity: number;
    percentage: number;
}


export interface HistoryTopProductItem {
    menuName: string;
    quantity: number;
    revenue: number;
    percentage: number;
}


export interface HistoryOrderItem {
    id: string;
    menuName: string;
    variantName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
}


export interface HistoryOrder {
    id: string;
    orderNumber: string;
    status: "COMPLETED" | "CANCELLED";
    paymentMethod: string | null;
    paymentStatus: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount: number;
    changeAmount: number;
    notes: string | null;
    createdAt: Date;
    completedAt: Date | null;
    cancelledAt: Date | null;
    user: {
        id: string;
        name: string;
        username: string;
        email: string;
    };
    items: HistoryOrderItem[];
}


export interface HistoryOrdersResult {
    data: HistoryOrder[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}


/*
|--------------------------------------------------------------------------
| INTERNAL HELPERS
|--------------------------------------------------------------------------
*/


function normalizePagination(
    page?: number,
    limit?: number
) {
    const normalizedPage = Math.max(
        1,
        Math.floor(page ?? 1)
    );

    const normalizedLimit = Math.min(
        100,
        Math.max(
            1,
            Math.floor(limit ?? 10)
        )
    );

    return {
        page: normalizedPage,
        limit: normalizedLimit,
        offset:
            (normalizedPage - 1) *
            normalizedLimit,
    };
}


function createDateConditions(
    startDate?: Date,
    endDate?: Date
) {
    const conditions = [
        sql`${order.status} IN ('COMPLETED', 'CANCELLED')`,
    ];

    if (startDate) {
        conditions.push(
            sql`${order.createdAt} >= ${sql.param(
                startDate,
                order.createdAt
            )}`
        );
    }

    if (endDate) {
        conditions.push(
            sql`${order.createdAt} <= ${sql.param(
                endDate,
                order.createdAt
            )}`
        );
    }

    return conditions;
}


function createCompletedDateConditions(
    startDate?: Date,
    endDate?: Date
) {
    const conditions = [
        eq(order.status, "COMPLETED"),
    ];

    const transactionDate = sql`
        COALESCE(
            ${order.completedAt},
            ${order.createdAt}
        )
    `;

    if (startDate) {
        conditions.push(
            sql`${transactionDate} >= ${sql.param(
                startDate,
                order.completedAt
            )}`
        );
    }

    if (endDate) {
        conditions.push(
            sql`${transactionDate} <= ${sql.param(
                endDate,
                order.completedAt
            )}`
        );
    }

    return conditions;
}


function calculatePercentage(
    value: number,
    total: number
) {
    if (
        total <= 0 ||
        value <= 0
    ) {
        return 0;
    }

    return Number(
        (
            (value / total) *
            100
        ).toFixed(2)
    );
}

function formatDateKeyUTC(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getJakartaDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const get = (type: string) =>
        Number(parts.find((part) => part.type === type)?.value);

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
    };
}

function formatPeriodDate(dateKey: string) {
    const [year, month, day] = dateKey.split("-").map(Number);

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Periode berjalan dimulai tanggal 14 dan berakhir tanggal 13
 * bulan berikutnya. Jika transaksi pertama terjadi sebelum tanggal 14,
 * periode awal aplikasi dibuat dari tanggal 1 sampai 13 bulan tersebut.
 */
export async function getHistoryPeriodOptions(): Promise<HistoryPeriodOptionsResult> {
    await requireRole("ADMIN");

    const [{ earliestDate }] = await db
        .select({
            earliestDate: sql<Date | null>`min(${order.createdAt})`,
        })
        .from(order);

    const today = getJakartaDateParts();
    const currentPeriodStart = new Date(
        Date.UTC(today.year, today.month - 1, 14)
    );

    if (today.day < 14) {
        currentPeriodStart.setUTCMonth(currentPeriodStart.getUTCMonth() - 1);
    }

    const earliest = earliestDate ? new Date(earliestDate) : currentPeriodStart;
    const earliestParts = getJakartaDateParts(earliest);
    const earliestDateKey = formatDateKeyUTC(
        new Date(Date.UTC(earliestParts.year, earliestParts.month - 1, earliestParts.day))
    );
    const currentStartKey = formatDateKeyUTC(currentPeriodStart);

    let cursor: Date;
    const periods: HistoryPeriodOption[] = [];

    // Periode awal 1-13 hanya dibuat jika transaksi pertama memang
    // berada sebelum tanggal 14 dan terjadi sebelum periode berjalan.
    if (
        earliestDate &&
        earliestParts.day < 14 &&
        earliestDateKey < currentStartKey
    ) {
        const partialStart = new Date(
            Date.UTC(earliestParts.year, earliestParts.month - 1, 1)
        );
        const partialEnd = new Date(
            Date.UTC(earliestParts.year, earliestParts.month - 1, 13)
        );

        const startDate = formatDateKeyUTC(partialStart);
        const endDate = formatDateKeyUTC(partialEnd);

        periods.push({
            id: startDate,
            label: `Periode awal · ${formatPeriodDate(startDate)} – ${formatPeriodDate(endDate)}`,
            startDate,
            endDate,
        });

        cursor = new Date(
            Date.UTC(earliestParts.year, earliestParts.month - 1, 14)
        );
    } else if (earliestDateKey > currentStartKey) {
        // Jika data pertama berada pada periode aktif, mulai dari periode aktif.
        cursor = new Date(currentPeriodStart);
    } else {
        cursor = new Date(
            Date.UTC(earliestParts.year, earliestParts.month - 1, 14)
        );
    }

    while (cursor.getTime() <= currentPeriodStart.getTime()) {
        const startDate = formatDateKeyUTC(cursor);
        const endDate = formatDateKeyUTC(
            new Date(
                Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 13)
            )
        );

        periods.push({
            id: startDate,
            label: `${formatPeriodDate(startDate)} – ${formatPeriodDate(endDate)}`,
            startDate,
            endDate,
        });

        cursor = new Date(
            Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 14)
        );
    }

    if (periods.length === 0) {
        const startDate = formatDateKeyUTC(currentPeriodStart);
        const endDate = formatDateKeyUTC(
            new Date(
                Date.UTC(
                    currentPeriodStart.getUTCFullYear(),
                    currentPeriodStart.getUTCMonth() + 1,
                    13
                )
            )
        );

        periods.push({
            id: startDate,
            label: `${formatPeriodDate(startDate)} – ${formatPeriodDate(endDate)}`,
            startDate,
            endDate,
        });
    }

    const defaultPeriodId = periods.some((period) => period.id === currentStartKey)
        ? currentStartKey
        : periods[periods.length - 1].id;

    return {
        periods: periods.reverse(),
        defaultPeriodId,
    };
}


/*
|--------------------------------------------------------------------------
| GET HISTORY SUMMARY
|--------------------------------------------------------------------------
|
| Digunakan untuk:
|
| 1. Total Pendapatan
| 2. Total Transaksi
| 3. 3 Menu Paling Laris
| 4. User Paling Laris
|
| Hanya COMPLETED yang dihitung.
|
|--------------------------------------------------------------------------
*/


export async function getHistorySummary(
    filters?: HistoryDateFilterInput
): Promise<HistorySummary> {

    await requireRole("ADMIN");


    const completedOrders =
        await db.query.order.findMany({
            where: and(
                ...createCompletedDateConditions(
                    filters?.startDate,
                    filters?.endDate
                )
            ),
            with: {
                user: true,
                items: true,
            },
        });


    const totalRevenue =
        completedOrders.reduce(
            (
                total,
                currentOrder
            ) =>
                total +
                Number(
                    currentOrder.total || 0
                ),
            0
        );


    const totalTransactions =
        completedOrders.length;


    const menuMap =
        new Map<
            string,
            {
                menuName: string;
                quantity: number;
                revenue: number;
            }
        >();


    const userMap =
        new Map<
            string,
            {
                userId: string;
                userName: string;
                username: string;
                revenue: number;
                transactions: number;
            }
        >();


    for (
        const currentOrder
        of completedOrders
    ) {

        const currentUser =
            currentOrder.user;


        const existingUser =
            userMap.get(
                currentUser.id
            );


        if (existingUser) {

            existingUser.revenue +=
                Number(
                    currentOrder.total || 0
                );

            existingUser.transactions +=
                1;

        } else {

            userMap.set(
                currentUser.id,
                {
                    userId:
                        currentUser.id,

                    userName:
                        currentUser.name,

                    username:
                        currentUser.username,

                    revenue:
                        Number(
                            currentOrder.total || 0
                        ),

                    transactions:
                        1,
                }
            );

        }


        for (
            const item
            of currentOrder.items
        ) {

            const existingMenu =
                menuMap.get(
                    item.menuName
                );


            if (existingMenu) {

                existingMenu.quantity +=
                    Number(
                        item.quantity || 0
                    );

                existingMenu.revenue +=
                    Number(
                        item.subtotal || 0
                    );

            } else {

                menuMap.set(
                    item.menuName,
                    {
                        menuName:
                            item.menuName,

                        quantity:
                            Number(
                                item.quantity || 0
                            ),

                        revenue:
                            Number(
                                item.subtotal || 0
                            ),
                    }
                );

            }

        }

    }


    const topMenus =
        Array.from(
            menuMap.values()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.quantity -
                    a.quantity
            )
            .slice(
                0,
                3
            );


    const topUser =
        Array.from(
            userMap.values()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.revenue -
                    a.revenue
            )[0] ??
        null;


    return {
        totalRevenue,
        totalTransactions,
        topMenus,
        topUser,
    };
}


/*
|--------------------------------------------------------------------------
| GET HISTORY LINE CHART
|--------------------------------------------------------------------------
|
| Line Chart:
|
| X = Tanggal
| Y = Pendapatan + Transaksi
|
|--------------------------------------------------------------------------
*/


export async function getHistoryLineChart(
    filters?: HistoryDateFilterInput
): Promise<HistoryLineChartItem[]> {

    await requireRole("ADMIN");


    const completedOrders =
        await db.query.order.findMany({
            where: and(
                ...createCompletedDateConditions(
                    filters?.startDate,
                    filters?.endDate
                )
            ),
            columns: {
                total: true,
                completedAt: true,
                createdAt: true,
            },
            orderBy: [
                ascDateOrder()
            ],
        });


    const dailyMap =
        new Map<
            string,
            {
                date: string;
                revenue: number;
                transactions: number;
            }
        >();


    for (
        const currentOrder
        of completedOrders
    ) {

        const transactionDate =
            currentOrder.completedAt ??
            currentOrder.createdAt;


        const dateParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date(transactionDate));

        const date = `${dateParts.find((part) => part.type === "year")?.value}-${dateParts.find((part) => part.type === "month")?.value}-${dateParts.find((part) => part.type === "day")?.value}`;


        const existing =
            dailyMap.get(
                date
            );


        if (existing) {

            existing.revenue +=
                Number(
                    currentOrder.total || 0
                );

            existing.transactions +=
                1;

        } else {

            dailyMap.set(
                date,
                {
                    date,
                    revenue:
                        Number(
                            currentOrder.total || 0
                        ),
                    transactions:
                        1,
                }
            );

        }

    }


    return Array.from(
        dailyMap.values()
    ).sort(
        (
            a,
            b
        ) =>
            a.date.localeCompare(
                b.date
            )
    );
}

export async function getRevenueChart(
    days: number = 30
): Promise<RevenueChartData[]> {
    await requireRole("ADMIN");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await db.query.order.findMany({
        where: and(
            eq(order.status, "COMPLETED"),
            sql`${order.completedAt} >= ${startDate}`
        ),
        orderBy: [asc(order.completedAt)],
    });

    const map = new Map<
        string,
        RevenueChartData
    >();

    for (const currentOrder of orders) {
        const date = (
            currentOrder.completedAt ??
            currentOrder.createdAt
        )
            .toISOString()
            .split("T")[0];

        const existing = map.get(date);

        if (existing) {
            existing.revenue += Number(currentOrder.total);
            existing.transactions += 1;
        } else {
            map.set(date, {
                date,
                revenue: Number(currentOrder.total),
                transactions: 1,
            });
        }
    }

    return Array.from(map.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
    );
}


/*
|--------------------------------------------------------------------------
| GET USER REVENUE PIE CHART
|--------------------------------------------------------------------------
|
| Pie Chart:
| User berdasarkan total pendapatan.
|
|--------------------------------------------------------------------------
*/


export async function getHistoryUserRevenue(
    filters?: HistoryDateFilterInput
): Promise<HistoryUserRevenueItem[]> {

    await requireRole("ADMIN");


    const completedOrders =
        await db.query.order.findMany({
            where: and(
                ...createCompletedDateConditions(
                    filters?.startDate,
                    filters?.endDate
                )
            ),
            with: {
                user: true,
            },
        });


    const userMap =
        new Map<
            string,
            {
                userId: string;
                userName: string;
                username: string;
                revenue: number;
            }
        >();


    for (
        const currentOrder
        of completedOrders
    ) {

        const currentUser =
            currentOrder.user;


        const revenue =
            Number(
                currentOrder.total || 0
            );


        const existing =
            userMap.get(
                currentUser.id
            );


        if (existing) {

            existing.revenue +=
                revenue;

        } else {

            userMap.set(
                currentUser.id,
                {
                    userId:
                        currentUser.id,

                    userName:
                        currentUser.name,

                    username:
                        currentUser.username,

                    revenue,
                }
            );

        }

    }


    const totalRevenue =
        Array.from(
            userMap.values()
        )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.revenue,
                0
            );


    return Array.from(
        userMap.values()
    )
        .map(
            (
                item
            ) => ({
                ...item,

                percentage:
                    calculatePercentage(
                        item.revenue,
                        totalRevenue
                    ),
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.revenue -
                a.revenue
        );
}


/*
|--------------------------------------------------------------------------
| GET USER MENU SALES PIE CHART
|--------------------------------------------------------------------------
|
| Pie Chart:
| User berdasarkan jumlah produk/menu yang terjual.
|
|--------------------------------------------------------------------------
*/


export async function getHistoryUserMenuSales(
    filters?: HistoryDateFilterInput
): Promise<HistoryUserMenuSalesItem[]> {

    await requireRole("ADMIN");


    const completedOrders =
        await db.query.order.findMany({
            where: and(
                ...createCompletedDateConditions(
                    filters?.startDate,
                    filters?.endDate
                )
            ),
            with: {
                user: true,
                items: true,
            },
        });


    const userMap =
        new Map<
            string,
            {
                userId: string;
                userName: string;
                username: string;
                quantity: number;
            }
        >();


    for (
        const currentOrder
        of completedOrders
    ) {

        const currentUser =
            currentOrder.user;


        const totalQuantity =
            currentOrder.items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.quantity || 0
                    ),
                0
            );


        const existing =
            userMap.get(
                currentUser.id
            );


        if (existing) {

            existing.quantity +=
                totalQuantity;

        } else {

            userMap.set(
                currentUser.id,
                {
                    userId:
                        currentUser.id,

                    userName:
                        currentUser.name,

                    username:
                        currentUser.username,

                    quantity:
                        totalQuantity,
                }
            );

        }

    }


    const totalQuantity =
        Array.from(
            userMap.values()
        )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.quantity,
                0
            );


    return Array.from(
        userMap.values()
    )
        .map(
            (
                item
            ) => ({
                ...item,

                percentage:
                    calculatePercentage(
                        item.quantity,
                        totalQuantity
                    ),
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.quantity -
                a.quantity
        );
}


/*
|--------------------------------------------------------------------------
| GET TOP PRODUCTS
|--------------------------------------------------------------------------
|
| Produk terlaris:
|
| - Nama menu
| - Jumlah terjual
| - Persentase
| - Pendapatan
|
|--------------------------------------------------------------------------
*/


export async function getHistoryTopProducts(
    filters?: HistoryDateFilterInput
): Promise<HistoryTopProductItem[]> {

    await requireRole("ADMIN");


    const completedOrders =
        await db.query.order.findMany({
            where: and(
                ...createCompletedDateConditions(
                    filters?.startDate,
                    filters?.endDate
                )
            ),
            with: {
                items: true,
            },
        });


    const productMap =
        new Map<
            string,
            {
                menuName: string;
                quantity: number;
                revenue: number;
            }
        >();


    for (
        const currentOrder
        of completedOrders
    ) {

        for (
            const item
            of currentOrder.items
        ) {

            const existing =
                productMap.get(
                    item.menuName
                );


            if (existing) {

                existing.quantity +=
                    Number(
                        item.quantity || 0
                    );

                existing.revenue +=
                    Number(
                        item.subtotal || 0
                    );

            } else {

                productMap.set(
                    item.menuName,
                    {
                        menuName:
                            item.menuName,

                        quantity:
                            Number(
                                item.quantity || 0
                            ),

                        revenue:
                            Number(
                                item.subtotal || 0
                            ),
                    }
                );

            }

        }

    }


    const totalQuantity =
        Array.from(
            productMap.values()
        )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.quantity,
                0
            );


    return Array.from(
        productMap.values()
    )
        .map(
            (
                item
            ) => ({
                ...item,

                percentage:
                    calculatePercentage(
                        item.quantity,
                        totalQuantity
                    ),
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.quantity -
                a.quantity
        );
}


/*
|--------------------------------------------------------------------------
| GET HISTORY ORDERS
|--------------------------------------------------------------------------
|
| History Table:
|
| Search:
| - Nama user
| - Username
| - Email
| - Nomor order
|
| Status:
| - COMPLETED
| - CANCELLED
|
| Pagination:
| Server-side.
|
|--------------------------------------------------------------------------
*/


export async function getHistoryOrders(
    input?: HistoryQueryInput
): Promise<HistoryOrdersResult> {

    await requireRole("ADMIN");


    const {
        page,
        limit,
        offset,
    } =
        normalizePagination(
            input?.page,
            input?.limit
        );


    const search =
        input?.search?.trim();


    const dateConditions =
        createDateConditions(
            input?.startDate,
            input?.endDate
        );


    const searchCondition =
        search
            ? or(
                ilike(
                    order.orderNumber,
                    `%${ search }% `
                ),
                ilike(
                    user.name,
                    `%${ search }% `
                ),
                ilike(
                    user.username,
                    `%${ search }% `
                ),
                ilike(
                    user.email,
                    `%${ search }% `
                )
            )
            : undefined;


    const whereCondition =
        searchCondition
            ? and(
                ...dateConditions,
                searchCondition
            )
            : and(
                ...dateConditions
            );


    const countResult =
        await db
            .select({
                count:
                    sql<number>`count(*)`,
            })
            .from(order)
            .leftJoin(
                user,
                eq(
                    order.userId,
                    user.id
                )
            )
            .where(
                whereCondition
            );


    const totalItems =
        Number(
            countResult[0]?.count ??
            0
        );


    const orders =
        await db.query.order.findMany({
            where:
                searchCondition
                    ? and(
                        ...dateConditions,
                        searchCondition
                    )
                    : and(
                        ...dateConditions
                    ),

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

            orderBy: [
                desc(
                    order.createdAt
                ),
            ],

            limit,

            offset,
        });


    const totalPages =
        Math.ceil(
            totalItems /
            limit
        );


    return {
        data:
            orders as HistoryOrder[],

        pagination: {
            page,
            limit,
            totalItems,
            totalPages,

            hasNextPage:
                page <
                totalPages,

            hasPreviousPage:
                page >
                1,
        },
    };
}


/*
|--------------------------------------------------------------------------
| GET HISTORY ORDER BY ID
|--------------------------------------------------------------------------
|
| Digunakan ketika user membuka detail transaksi.
|
|--------------------------------------------------------------------------
*/


export async function getHistoryOrderById(
    orderId: string
): Promise<HistoryOrder> {

    await requireRole("ADMIN");


    const selectedOrder =
        await db.query.order.findFirst({
            where: and(
                eq(
                    order.id,
                    orderId
                ),
                sql`${ order.status } IN('COMPLETED', 'CANCELLED')`
            ),

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
        throw new Error(
            "History pesanan tidak ditemukan."
        );
    }


    return selectedOrder as HistoryOrder;
}


/*
|--------------------------------------------------------------------------
| GET COMPLETE HISTORY DASHBOARD
|--------------------------------------------------------------------------
|
| Mengambil semua data utama halaman /pesanan.
|
| Cocok digunakan ketika halaman pertama kali dibuka.
|
|--------------------------------------------------------------------------
*/


export async function getHistoryDashboard(
    filters?: HistoryDateFilterInput
) {

    await requireRole("ADMIN");


    const [
        summary,
        lineChart,
        userRevenue,
        userMenuSales,
        topProducts,
    ] =
        await Promise.all([
            getHistorySummary(
                filters
            ),

            getHistoryLineChart(
                filters
            ),

            getHistoryUserRevenue(
                filters
            ),

            getHistoryUserMenuSales(
                filters
            ),

            getHistoryTopProducts(
                filters
            ),
        ]);


    return {
        summary,
        lineChart,
        userRevenue,
        userMenuSales,
        topProducts,
    };
}


/*
|--------------------------------------------------------------------------
| GET HISTORY PDF DATA
|--------------------------------------------------------------------------
|
| Data khusus untuk kebutuhan PDF.
|
| Fungsi ini BELUM membuat file PDF.
|
| Fungsi ini menyediakan data lengkap yang nantinya
| dapat digunakan oleh generator PDF.
|
| Filter:
| - Search user
| - Search username
| - Search email
| - Search order number
| - Date range
|
|--------------------------------------------------------------------------
*/


export async function getHistoryPdfData(
    filters?: HistoryDateFilterInput,
    period?: {
        label: string;
        startDate?: string;
        endDate?: string;
    }
) {
    await requireRole("ADMIN");

    const [
        summary,
        userRevenue,
        topProducts,
    ] = await Promise.all([
        getHistorySummary(filters),
        getHistoryUserRevenue(filters),
        getHistoryTopProducts(filters),
    ]);

    return {
        periodLabel: period?.label ?? "Semua Periode",
        periodStart: period?.startDate,
        periodEnd: period?.endDate,

        totalOrders: summary.totalTransactions,

        totalRevenue: summary.totalRevenue,

        users: userRevenue.map((item) => ({
            userId: item.userId,

            userName: item.userName,

            totalOrders:
                summary.topUser?.userId === item.userId
                    ? summary.topUser.transactions
                    : 0,

            totalRevenue: item.revenue,
        })),

        topMenus: topProducts.map((item, index) => ({
            menuId: String(index + 1),

            menuName: item.menuName,

            totalQuantity: item.quantity,

            totalRevenue: item.revenue,
        })),
    };
}


/*
|--------------------------------------------------------------------------
| INTERNAL DATE ORDER HELPER
|--------------------------------------------------------------------------
|
| Digunakan untuk menjaga sorting line chart berdasarkan tanggal.
|
|--------------------------------------------------------------------------
*/


function ascDateOrder() {
    return sql`${ order.completedAt } ASC`;
}

