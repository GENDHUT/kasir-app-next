"use client";

import { useState } from "react";
import { Trash2, Wallet } from "lucide-react";

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

import { PaymentDialog } from "./payment-dialog";

import {
    EditOrderButton,
    type EditOrder,
} from "./edit-order-button";

import { deleteOrder } from "@/server/pesanan";


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
| PROPS
|--------------------------------------------------------------------------
*/

interface PendingOrderTableProps {
    orders: PendingOrder[];
    menus: any[];
    qrisImageUrl?: string;
    onEdit?: (order: PendingOrder) => void;
    onPaymentComplete?: (
        order: PendingOrder,
        paymentMethod: "CASH" | "QRIS"
    ) => void;
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
    onEdit,
    onPaymentComplete,
}: PendingOrderTableProps) {
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
    | PAYMENT
    |--------------------------------------------------------------------------
    */

    function handlePayment(order: PendingOrder) {
        setSelectedOrder(order);
    }

    function handlePaymentComplete(paymentMethod: "CASH" | "QRIS") {
        if (!selectedOrder) {
            return;
        }

        onPaymentComplete?.(selectedOrder, paymentMethod);

        setSelectedOrder(null);
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

            setDeleteOrderData(null);

            window.location.reload();
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
                            {orders.length === 0 ? (
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
                                orders.map((order, index) => (
                                    <TableRow key={order.id}>
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
                                            <div className="flex justify-center gap-2">
                                                {/* ==================================
                                                    EDIT
                                                =================================== */}

                                                <EditOrderButton
                                                    order={order as EditOrder}
                                                    menus={menus}
                                                    onSuccess={() => {
                                                        window.location.reload();
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
                                                    onClick={() => setDeleteOrderData(order)}
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
                                                    onClick={() => handlePayment(order)}
                                                >
                                                    <Wallet className="mr-2 h-4 w-4" />
                                                    Pembayaran
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
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