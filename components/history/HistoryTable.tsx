"use client";

import type {
    HistoryOrder,
    HistoryOrdersResult,
} from "@/server/history";

interface HistoryTableProps {
    orders: HistoryOrder[];
    pagination: HistoryOrdersResult["pagination"];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(date: Date | string | null) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(date));
}

export default function HistoryTable({
    orders,
    pagination,
}: HistoryTableProps) {
    return (
        <div className="space-y-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                    <h2 className="text-lg font-semibold">
                        Riwayat Pesanan
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Menampilkan seluruh riwayat transaksi.
                    </p>
                </div>

                {/* Search akan dibuat server-side nanti */}

                <div className="relative w-full sm:w-80">
                    <input
                        type="text"
                        disabled
                        placeholder="Search (coming soon)"
                        className="h-10 w-full rounded-lg border bg-muted px-3 text-sm opacity-70"
                    />
                </div>

            </div>

            <div className="overflow-hidden rounded-xl border bg-card">

                <div className="overflow-x-auto">

                    <table className="w-full min-w-[900px] text-sm">

                        <thead className="border-b bg-muted/50">
                            <tr>

                                <th className="px-4 py-3 text-left font-medium">
                                    Pesanan
                                </th>

                                <th className="px-4 py-3 text-left font-medium">
                                    User
                                </th>

                                <th className="px-4 py-3 text-left font-medium">
                                    Produk
                                </th>

                                <th className="px-4 py-3 text-left font-medium">
                                    Pembayaran
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                    Total
                                </th>

                                <th className="px-4 py-3 text-left font-medium">
                                    Status
                                </th>

                                <th className="px-4 py-3 text-left font-medium">
                                    Tanggal
                                </th>

                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {orders.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        Belum ada riwayat pesanan.
                                    </td>
                                </tr>

                            ) : (

                                orders.map((currentOrder) => (

                                    <tr
                                        key={currentOrder.id}
                                        className="transition hover:bg-muted/30"
                                    >

                                        <td className="px-4 py-4">

                                            <div className="font-medium">
                                                {currentOrder.orderNumber}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                {currentOrder.items.length} jenis menu
                                            </div>

                                        </td>

                                        <td className="px-4 py-4">

                                            <div className="font-medium">
                                                {currentOrder.user.name}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                @{currentOrder.user.username}
                                            </div>

                                        </td>

                                        <td className="px-4 py-4">

                                            <div className="max-w-[240px] space-y-1">

                                                {currentOrder.items
                                                    .slice(0, 3)
                                                    .map((item) => (

                                                        <div
                                                            key={item.id}
                                                            className="text-xs"
                                                        >

                                                            <span className="font-medium">
                                                                {item.menuName}
                                                            </span>

                                                            {" "}
                                                            {item.variantName}

                                                            {" × "}

                                                            {item.quantity}

                                                        </div>

                                                    ))}

                                                {currentOrder.items.length > 3 && (

                                                    <div className="text-xs text-muted-foreground">
                                                        +{currentOrder.items.length - 3} menu lainnya
                                                    </div>

                                                )}

                                            </div>

                                        </td>

                                        <td className="px-4 py-4">

                                            <div className="font-medium">
                                                {currentOrder.paymentMethod ?? "-"}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                {currentOrder.paymentStatus}
                                            </div>

                                        </td>

                                        <td className="px-4 py-4 text-right font-semibold">
                                            {formatCurrency(Number(currentOrder.total))}
                                        </td>

                                        <td className="px-4 py-4">

                                            <span
                                                className={
                                                    currentOrder.status === "COMPLETED"
                                                        ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                                                        : "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                                                }
                                            >
                                                {currentOrder.status}
                                            </span>

                                        </td>

                                        <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">

                                            {formatDate(
                                                currentOrder.completedAt ??
                                                currentOrder.cancelledAt ??
                                                currentOrder.createdAt
                                            )}

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

                <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                    <p className="text-sm text-muted-foreground">
                        Halaman{" "}
                        <span className="font-medium text-foreground">
                            {pagination.page}
                        </span>{" "}
                        dari{" "}
                        <span className="font-medium text-foreground">
                            {pagination.totalPages}
                        </span>{" "}
                        • Total{" "}
                        <span className="font-medium text-foreground">
                            {pagination.totalItems}
                        </span>{" "}
                        transaksi
                    </p>

                    <div className="flex items-center gap-2">

                        <button
                            disabled={!pagination.hasPreviousPage}
                            className="rounded-lg border px-3 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
                        >
                            Sebelumnya
                        </button>

                        <button
                            disabled={!pagination.hasNextPage}
                            className="rounded-lg border px-3 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
                        >
                            Berikutnya
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}