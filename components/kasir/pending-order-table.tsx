"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    PaymentDialog,
    type PaymentCompleteDetails,
} from "./payment-dialog";

import {
    EditOrderButton,
    type EditOrder,
} from "./edit-order-button";

import { deleteOrder } from "@/server/pesanan";

import { ReceiptDialog } from "@/components/receipt-dialog";
import type { ReceiptOrder } from "@/lib/struk/receipt-types";


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export interface PendingOrderItem {
    id: string;
    menuId: string;
    menuVariantId: string;
    menuName: string;
    variantName?: string | null;
    quantity: number;
    price: number;
}

export interface PendingOrder {
    id: string;
    orderNumber: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
    items: PendingOrderItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
}

/*
|--------------------------------------------------------------------------
| PAYMENT METHOD
|--------------------------------------------------------------------------
*/

type PaymentMethod = "CASH" | "QRIS";

/*
|--------------------------------------------------------------------------
| COMPLETED PAYMENT INFO (client-side only)
|--------------------------------------------------------------------------
|
| Disimpan sementara di state setelah pembayaran berhasil, supaya saat
| barisnya di-klik kita bisa langsung membangun ReceiptOrder tanpa perlu
| fetch ulang ke server.
|
*/

interface CompletedPaymentInfo extends PaymentCompleteDetails {
    paymentMethod: PaymentMethod;
}


/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface PendingOrderTableProps {
    orders: PendingOrder[];
    menus: any[];
    qrisImageUrl?: string;
    /** Nama kasir yang sedang login, ditampilkan di struk. */
    cashierName?: string;
    onEdit?: (order: PendingOrder) => void;
    onPaymentComplete?: (
        order: PendingOrder,
        paymentMethod: PaymentMethod
    ) => void;
}


/*
|--------------------------------------------------------------------------
| BUILD RECEIPT ORDER
|--------------------------------------------------------------------------
|
| Memetakan PendingOrder + info pembayaran menjadi ReceiptOrder (bentuk
| data generik yang dipakai ReceiptDialog untuk preview & cetak struk).
|
*/

function buildReceiptOrder(
    order: PendingOrder,
    payment: CompletedPaymentInfo & { cashierName: string }
): ReceiptOrder {
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
            id: item.id,
            menuName: item.menuName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        paymentMethod: payment.paymentMethod,
        paidAmount: payment.paidAmount,
        changeAmount: payment.changeAmount,
        cashierName: payment.cashierName,
        notes: order.notes,
        completedAt: new Date(),
    };
}


/*
|--------------------------------------------------------------------------
| PENDING ORDER TABLE
|--------------------------------------------------------------------------
*/

export function PendingOrderTable({
    orders,
    menus,
    qrisImageUrl = "/qris-toko.png",
    cashierName = "Kasir",
    onEdit,
    onPaymentComplete,
}: PendingOrderTableProps) {
    /*
    |--------------------------------------------------------------------------
    | ROUTER
    |--------------------------------------------------------------------------
    */

    const router = useRouter();

    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);

    const [deleteOrderData, setDeleteOrderData] = useState<PendingOrder | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | LOCAL ORDERS (OPTIMISTIC LIST)
    |--------------------------------------------------------------------------
    |
    | Disinkronkan dari prop `orders`, tapi barisnya TIDAK langsung hilang
    | begitu pembayaran berhasil -- baris tetap tampil (dengan status
    | selesai) sampai struknya benar-benar ditutup, baru dibuang.
    |
    */

    const [localOrders, setLocalOrders] = useState<PendingOrder[]>(orders);

    useEffect(() => {
        setLocalOrders(orders);
    }, [orders]);

    /*
    |--------------------------------------------------------------------------
    | COMPLETED PAYMENTS MAP
    |--------------------------------------------------------------------------
    |
    | orderId -> info pembayaran. Selama entrinya masih ada di sini,
    | baris pesanan itu dianggap "selesai, tapi belum pernah dicetak" --
    | 3 tombol aksi diganti badge, dan barisnya bisa diklik untuk
    | membuka struk (hanya berlaku 1 kali).
    |
    */

    const [completedPayments, setCompletedPayments] = useState<
        Record<string, CompletedPaymentInfo>
    >({});

    /*
    |--------------------------------------------------------------------------
    | RECEIPT DIALOG STATE
    |--------------------------------------------------------------------------
    */

    const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null);

    const [receiptOpen, setReceiptOpen] = useState(false);

    const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);


    /*
    |--------------------------------------------------------------------------
    | PAYMENT
    |--------------------------------------------------------------------------
    */

    function handlePayment(order: PendingOrder) {
        setSelectedOrder(order);
    }

    function handlePaymentComplete(
        paymentMethod: PaymentMethod,
        details: PaymentCompleteDetails
    ) {
        if (!selectedOrder) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | TANDAI SEBAGAI SELESAI (BUKAN LANGSUNG DIHAPUS)
        |--------------------------------------------------------------------------
        |
        | Pesanan sudah COMPLETED di database (PaymentDialog sudah
        | memanggil completeCashPayment / completeQrisPayment). Barisnya
        | tetap tampil di tabel supaya kasir bisa klik untuk cetak struk
        | -- baru dibuang setelah dialog struk ditutup.
        |
        */

        setCompletedPayments((current) => ({
            ...current,
            [selectedOrder.id]: {
                paymentMethod,
                ...details,
            },
        }));

        onPaymentComplete?.(selectedOrder, paymentMethod);

        // PaymentDialog sudah memanggil onOpenChange(false) sendiri,
        // tapi kita bersihkan juga di sini untuk jaga-jaga.
        setSelectedOrder(null);
    }


    /*
    |--------------------------------------------------------------------------
    | OPEN RECEIPT (klik baris yang sudah selesai)
    |--------------------------------------------------------------------------
    */

    function handleOpenReceipt(order: PendingOrder) {
        const paymentInfo = completedPayments[order.id];

        if (!paymentInfo) {
            return;
        }

        setReceiptOrder(
            buildReceiptOrder(order, {
                ...paymentInfo,
                cashierName,
            })
        );

        setReceiptOrderId(order.id);
        setReceiptOpen(true);
    }


    /*
    |--------------------------------------------------------------------------
    | RECEIPT CLOSED -> BUANG BARIS (HANYA BISA 1X PRINT DI SINI)
    |--------------------------------------------------------------------------
    |
    | Setelah struk ditutup (baik karena sudah dicetak atau dibatalkan),
    | baris pesanan itu dibuang dari tabel. Kalau butuh cetak ulang,
    | itu ditangani halaman lain (riwayat transaksi), bukan di sini.
    |
    */

    function handleReceiptOpenChange(value: boolean) {
        setReceiptOpen(value);

        if (value || !receiptOrderId) {
            return;
        }

        const closedOrderId = receiptOrderId;

        setLocalOrders((currentOrders) =>
            currentOrders.filter((order) => order.id !== closedOrderId)
        );

        setCompletedPayments((current) => {
            const next = { ...current };
            delete next[closedOrderId];
            return next;
        });

        setReceiptOrder(null);
        setReceiptOrderId(null);

        // Sinkronisasi lunak ke server di belakang layar (tidak
        // mengganggu UI karena baris sudah dibuang secara lokal duluan).
        router.refresh();
    }


    /*
    |--------------------------------------------------------------------------
    | EDIT
    |--------------------------------------------------------------------------
    */

    function handleEdit(order: PendingOrder) {
        onEdit?.(order);
    }


    /*
    |--------------------------------------------------------------------------
    | DELETE ORDER
    |--------------------------------------------------------------------------
    |
    | Menghapus pesanan secara permanen dari database.
    |
    | deleteOrder() hanya dapat dilakukan oleh ADMIN
    | berdasarkan server action di pesanan.ts.
    |
    */

    async function handleDeleteOrder() {
        if (!deleteOrderData) {
            return;
        }

        try {
            setIsDeleting(true);

            await deleteOrder(deleteOrderData.id);

            setLocalOrders((currentOrders) =>
                currentOrders.filter(
                    (order) => order.id !== deleteOrderData.id
                )
            );

            setDeleteOrderData(null);

            router.refresh();
        } catch (error) {
            console.error("Gagal menghapus pesanan:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Gagal menghapus pesanan."
            );
        } finally {
            setIsDeleting(false);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | FORMAT CURRENCY
    |--------------------------------------------------------------------------
    */

    function formatCurrency(value: number) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(Number(value) || 0);
    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        {/* ==================================================
                            TABLE HEADER
                        =================================================== */}

                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">
                                    No
                                </TableHead>

                                <TableHead className="min-w-[160px]">
                                    No. Pesanan
                                </TableHead>

                                <TableHead className="min-w-[180px]">
                                    Dibuat Oleh
                                </TableHead>

                                <TableHead className="min-w-[280px]">
                                    Pesanan
                                </TableHead>

                                <TableHead className="min-w-[250px]">
                                    Catatan
                                </TableHead>

                                <TableHead className="min-w-[130px] text-right">
                                    Total
                                </TableHead>

                                <TableHead className="min-w-[300px] text-center">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>


                        {/* ==================================================
                            TABLE BODY
                        =================================================== */}

                        <TableBody>
                            {localOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Wallet className="h-8 w-8 text-muted-foreground" />

                                            <p className="font-medium">
                                                Tidak ada pesanan pending
                                            </p>

                                            <p className="text-sm text-muted-foreground">
                                                Semua pesanan sudah diselesaikan.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                localOrders.map((order, index) => {
                                    const paymentInfo = completedPayments[order.id];
                                    const isCompleted = Boolean(paymentInfo);

                                    return (
                                        <TableRow
                                            key={order.id}
                                            onClick={
                                                isCompleted
                                                    ? () => handleOpenReceipt(order)
                                                    : undefined
                                            }
                                            className={
                                                isCompleted
                                                    ? "cursor-pointer bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-950/20"
                                                    : undefined
                                            }
                                        >
                                            {/* ==================================
                                                NO
                                            =================================== */}

                                            <TableCell>
                                                {index + 1}
                                            </TableCell>


                                            {/* ==================================
                                                ORDER NUMBER
                                            =================================== */}

                                            <TableCell className="font-semibold">
                                                {order.orderNumber}
                                            </TableCell>


                                            {/* ==================================
                                                USER / CASHIER
                                            =================================== */}

                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {order.user?.name ?? "Tidak diketahui"}
                                                    </span>

                                                    <span className="text-xs text-muted-foreground">
                                                        {order.user?.email ?? "-"}
                                                    </span>
                                                </div>
                                            </TableCell>


                                            {/* ==================================
                                                ORDER ITEMS
                                            =================================== */}

                                            <TableCell>
                                                <div className="max-w-md space-y-2">
                                                    {order.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center gap-2 text-sm"
                                                        >
                                                            <span className="font-semibold">
                                                                {item.quantity}x
                                                            </span>

                                                            <span>
                                                                {item.menuName}
                                                            </span>

                                                            {item.variantName && (
                                                                <span className="text-muted-foreground">
                                                                    ({item.variantName})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>


                                            {/* ==================================
                                                NOTES
                                            =================================== */}

                                            <TableCell>
                                                {order.notes ? (
                                                    <div className="max-w-[250px]">
                                                        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                                            {order.notes}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm italic text-muted-foreground">
                                                        Tidak ada catatan
                                                    </span>
                                                )}
                                            </TableCell>


                                            {/* ==================================
                                                TOTAL
                                            =================================== */}

                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(order.total)}
                                            </TableCell>


                                            {/* ==================================
                                                ACTION
                                            =================================== */}

                                            <TableCell>
                                                {isCompleted ? (
                                                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
                                                        <Check className="h-4 w-4" />
                                                        Selesai &mdash; klik untuk cetak struk
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-2">
                                                        {/* ==================================
                                                            EDIT
                                                        =================================== */}

                                                        <EditOrderButton
                                                            order={order as EditOrder}
                                                            menus={menus}
                                                            onSuccess={() => {
                                                                router.refresh();
                                                            }}
                                                        />


                                                        {/* ==================================
                                                            DELETE
                                                        =================================== */}

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setDeleteOrderData(order);
                                                            }}
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Hapus
                                                        </Button>


                                                        {/* ==================================
                                                            PAYMENT
                                                        =================================== */}

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handlePayment(order);
                                                            }}
                                                        >
                                                            <Wallet className="mr-2 h-4 w-4" />
                                                            Pembayaran
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>


            {/* ==============================================================
                PAYMENT DIALOG
            ============================================================== */}

            <PaymentDialog
                order={selectedOrder}
                open={Boolean(selectedOrder)}
                qrisImageUrl={qrisImageUrl}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedOrder(null);
                    }
                }}
                onPaymentComplete={handlePaymentComplete}
            />


            {/* ==============================================================
                RECEIPT DIALOG (klik baris "Selesai" -- hanya 1x)
            ============================================================== */}

            <ReceiptDialog
                order={receiptOrder}
                open={receiptOpen}
                onOpenChange={handleReceiptOpenChange}
            />


            {/* ==============================================================
                DELETE CONFIRMATION
            ============================================================== */}

            <AlertDialog
                open={Boolean(deleteOrderData)}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setDeleteOrderData(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Hapus Pesanan?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            Pesanan{" "}
                            <span className="font-semibold text-foreground">
                                {deleteOrderData?.orderNumber}
                            </span>{" "}
                            akan dihapus secara permanen dari database dan tidak
                            dapat dikembalikan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Tidak
                        </AlertDialogCancel>

                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                            onClick={handleDeleteOrder}
                        >
                            {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}