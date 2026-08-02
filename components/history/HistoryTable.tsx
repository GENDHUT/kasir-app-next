"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2, Printer, Search, X } from "lucide-react";

import type {
    HistoryOrder,
    HistoryOrdersResult,
} from "@/server/history";

import { getHistoryOrders } from "@/server/history";

import { ReceiptDialog } from "@/components/receipt-dialog";
import type {
    ReceiptOrder,
    ReceiptPaymentMethod,
} from "@/lib/struk/receipt-types";

interface HistoryTableProps {
    orders: HistoryOrder[];
    pagination: HistoryOrdersResult["pagination"];
}

// Jeda debounce sebelum search dikirim ke server, biar gak nembak
// request tiap satu huruf diketik.
const SEARCH_DEBOUNCE_MS = 400;


/*
|--------------------------------------------------------------------------
| NORMALIZE PAYMENT METHOD
|--------------------------------------------------------------------------
|
| HistoryOrder.paymentMethod bertipe `string | null` (longgar, apa adanya
| dari DB), sedangkan ReceiptOrder.paymentMethod perlu union literal yang
| ketat. Fungsi ini memastikan nilainya benar-benar salah satu method
| yang dikenal, kalau tidak dikenal fallback ke null.
|
*/

const KNOWN_PAYMENT_METHODS: ReceiptPaymentMethod[] = [
    "CASH",
    "QRIS",
    "TRANSFER",
    "DEBIT",
    "CREDIT",
    "OTHER",
];

function toReceiptPaymentMethod(
    value: string | null
): ReceiptPaymentMethod {
    if (
        value &&
        (KNOWN_PAYMENT_METHODS as string[]).includes(value)
    ) {
        return value as ReceiptPaymentMethod;
    }

    return null;
}


/*
|--------------------------------------------------------------------------
| MAP HISTORY ORDER -> RECEIPT ORDER
|--------------------------------------------------------------------------
|
| Memetakan HistoryOrder (dari @/server/history) ke bentuk ReceiptOrder
| generik yang dipakai ReceiptDialog untuk preview & cetak struk.
|
*/

function mapHistoryOrderToReceiptOrder(
    order: HistoryOrder
): ReceiptOrder {
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
            id: item.id,
            menuName: item.menuName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        paymentMethod: toReceiptPaymentMethod(order.paymentMethod),
        paidAmount: order.paidAmount,
        changeAmount: order.changeAmount,
        cashierName: order.user.name,
        notes: order.notes,
        completedAt:
            order.completedAt ??
            order.cancelledAt ??
            order.createdAt,
    };
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
    orders: initialOrders,
    pagination: initialPagination,
}: HistoryTableProps) {
    const [orders, setOrders] = useState(initialOrders);

    const [pagination, setPagination] = useState(initialPagination);

    const [searchInput, setSearchInput] = useState("");

    const [isLoading, setIsLoading] = useState(false);

    const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(
        null
    );

    const [receiptOpen, setReceiptOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Halaman/limit awal ini bisa berubah kalau parent (server component)
    // refetch data dari luar (misal habis filter tanggal di halaman lain).
    useEffect(() => {
        setOrders(initialOrders);
        setPagination(initialPagination);
    }, [initialOrders, initialPagination]);


    /*
    |--------------------------------------------------------------------------
    | FETCH ORDERS (SEARCH & PAGINATION, SERVER-SIDE)
    |--------------------------------------------------------------------------
    */

    async function fetchOrders(page: number, search: string) {
        setIsLoading(true);

        try {
            const result = await getHistoryOrders({
                page,
                limit: pagination.limit,
                search: search.trim() || undefined,
            });

            setOrders(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error(
                "Gagal memuat riwayat pesanan:",
                error
            );
        } finally {
            setIsLoading(false);
        }
    }

    function handleSearchChange(value: string) {
        setSearchInput(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            fetchOrders(1, value);
        }, SEARCH_DEBOUNCE_MS);
    }

    function handleClearSearch() {
        setSearchInput("");

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        fetchOrders(1, "");
    }

    function handlePreviousPage() {
        if (!pagination.hasPreviousPage || isLoading) {
            return;
        }

        fetchOrders(pagination.page - 1, searchInput);
    }

    function handleNextPage() {
        if (!pagination.hasNextPage || isLoading) {
            return;
        }

        fetchOrders(pagination.page + 1, searchInput);
    }

    function handleRowClick(order: HistoryOrder) {
        setReceiptOrder(mapHistoryOrderToReceiptOrder(order));
        setReceiptOpen(true);
    }

    return (
        <>
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

                    <div className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <input
                            type="text"
                            value={searchInput}
                            onChange={(event) =>
                                handleSearchChange(event.target.value)
                            }
                            placeholder="Cari nomor pesanan, nama, atau username..."
                            className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                        />

                        {searchInput && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                </div>

                <div className="relative overflow-hidden rounded-xl border bg-card">

                    {isLoading && (
                        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 border-b bg-background/90 py-2 text-xs text-muted-foreground backdrop-blur-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Memuat data...
                        </div>
                    )}

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[980px] text-sm">

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

                                    <th className="px-4 py-3 text-center font-medium">
                                        Struk
                                    </th>

                                </tr>
                            </thead>

                            <tbody className={`divide-y transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}>

                                {orders.length === 0 ? (

                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            {searchInput
                                                ? `Tidak ada hasil untuk "${searchInput}".`
                                                : "Belum ada riwayat pesanan."}
                                        </td>
                                    </tr>

                                ) : (

                                    orders.map((currentOrder) => (

                                        <tr
                                            key={currentOrder.id}
                                            onClick={() => handleRowClick(currentOrder)}
                                            className="cursor-pointer transition hover:bg-muted/30"
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

                                            <td className="px-4 py-4 text-center">

                                                <button
                                                    type="button"
                                                    title="Cetak struk"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleRowClick(currentOrder);
                                                    }}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-muted"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>

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
                                onClick={handlePreviousPage}
                                disabled={!pagination.hasPreviousPage || isLoading}
                                className="rounded-lg border px-3 py-2 text-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            >
                                Sebelumnya
                            </button>

                            <button
                                onClick={handleNextPage}
                                disabled={!pagination.hasNextPage || isLoading}
                                className="rounded-lg border px-3 py-2 text-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            >
                                Berikutnya
                            </button>

                        </div>

                    </div>

                </div>

            </div>

            <ReceiptDialog
                order={receiptOrder}
                open={receiptOpen}
                onOpenChange={setReceiptOpen}
            />
        </>
    );
}