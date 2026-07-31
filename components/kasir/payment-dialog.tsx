"use client";

import { useEffect, useState } from "react";

import {
    Check,
    CreditCard,
    Loader2,
    QrCode,
    Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    completeCashPayment,
    completeQrisPayment,
} from "@/server/pesanan";


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export interface PaymentOrderItem {
    id: string;
    menuName: string;
    variantName?: string | null;
    quantity: number;
    price: number;
}

export interface PaymentOrder {
    id: string;
    orderNumber: string;
    items: PaymentOrderItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
}

interface PaymentDialogProps {
    order: PaymentOrder | null;
    open: boolean;
    qrisImageUrl?: string;
    onOpenChange: (open: boolean) => void;
    onPaymentComplete?: (paymentMethod: "CASH" | "QRIS") => void;
}


/*
|--------------------------------------------------------------------------
| PAYMENT METHOD
|--------------------------------------------------------------------------
*/

type PaymentMethod = "CASH" | "QRIS";


/*
|--------------------------------------------------------------------------
| PAYMENT DIALOG
|--------------------------------------------------------------------------
*/

export function PaymentDialog({
    order,
    open,
    qrisImageUrl = "/qris.webp",
    onOpenChange,
    onPaymentComplete,
}: PaymentDialogProps) {
    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

    const [paidAmount, setPaidAmount] = useState("");

    const [isProcessing, setIsProcessing] = useState(false);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);


    /*
    |--------------------------------------------------------------------------
    | RESET PAYMENT FORM
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (open) {
            setPaymentMethod("CASH");
            setPaidAmount("");
            setErrorMessage(null);
            setIsProcessing(false);
        }
    }, [open, order?.id]);


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
    | PAYMENT AMOUNT
    |--------------------------------------------------------------------------
    */

    const numericPaidAmount = Number(paidAmount) || 0;

    const changeAmount = Math.max(
        0,
        numericPaidAmount - (order?.total ?? 0)
    );

    const isCashPaymentValid =
        numericPaidAmount >= (order?.total ?? 0);


    /*
    |--------------------------------------------------------------------------
    | HANDLE PAYMENT METHOD
    |--------------------------------------------------------------------------
    */

    function handlePaymentMethodChange(method: PaymentMethod) {
        setPaymentMethod(method);
        setErrorMessage(null);
    }


    /*
    |--------------------------------------------------------------------------
    | HANDLE CASH INPUT
    |--------------------------------------------------------------------------
    */

    function handlePaidAmountChange(value: string) {
        const cleanValue = value.replace(/[^0-9]/g, "");

        setPaidAmount(cleanValue);
        setErrorMessage(null);
    }


    /*
    |--------------------------------------------------------------------------
    | QUICK CASH AMOUNT
    |--------------------------------------------------------------------------
    */

    function handleQuickAmount(amount: number) {
        setPaidAmount(String(amount));
        setErrorMessage(null);
    }


    /*
    |--------------------------------------------------------------------------
    | COMPLETE CASH PAYMENT
    |--------------------------------------------------------------------------
    */

    async function handleCashPayment() {
        if (!order) {
            return;
        }

        if (!numericPaidAmount || numericPaidAmount < order.total) {
            setErrorMessage(
                "Nominal pembayaran kurang dari total pesanan."
            );

            return;
        }

        try {
            setIsProcessing(true);
            setErrorMessage(null);

            await completeCashPayment(
                order.id,
                numericPaidAmount
            );

            onPaymentComplete?.("CASH");
            onOpenChange(false);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Pembayaran tunai gagal diproses."
            );
        } finally {
            setIsProcessing(false);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | COMPLETE QRIS PAYMENT
    |--------------------------------------------------------------------------
    */

    async function handleQrisPayment() {
        if (!order) {
            return;
        }

        try {
            setIsProcessing(true);
            setErrorMessage(null);

            await completeQrisPayment(order.id);

            onPaymentComplete?.("QRIS");
            onOpenChange(false);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Pembayaran QRIS gagal diproses."
            );
        } finally {
            setIsProcessing(false);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | HANDLE DIALOG CHANGE
    |--------------------------------------------------------------------------
    */

    function handleDialogChange(value: boolean) {
        if (isProcessing) {
            return;
        }

        onOpenChange(value);
    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    if (!order) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onOpenChange={handleDialogChange}
        >
            <DialogContent className="max-w-lg overflow-hidden p-0">
                {/* ==========================================================
                    HEADER
                =========================================================== */}

                <DialogHeader className="border-b px-6 py-5">
                    <DialogTitle className="text-xl">
                        Pembayaran Pesanan
                    </DialogTitle>

                    <DialogDescription>
                        Selesaikan pembayaran untuk pesanan{" "}
                        <span className="font-semibold text-foreground">
                            {order.orderNumber}
                        </span>
                    </DialogDescription>
                </DialogHeader>


                {/* ==========================================================
                    CONTENT
                =========================================================== */}

                <div className="max-h-[70vh] overflow-y-auto">
                    <div className="space-y-6 p-6">
                        {/* ==================================================
                            ORDER SUMMARY
                        =================================================== */}

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Total Pembayaran
                                </span>

                                <span className="text-xl font-bold">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {item.quantity} x {item.menuName}

                                                {item.variantName && (
                                                    <span className="text-muted-foreground">
                                                        {" "}({item.variantName})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* ==================================================
                            PAYMENT METHOD
                        =================================================== */}

                        <div className="space-y-3">
                            <Label>
                                Metode Pembayaran
                            </Label>

                            <div className="grid grid-cols-2 gap-3">
                                {/* ==========================================
                                    CASH
                                =========================================== */}

                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() =>
                                        handlePaymentMethodChange("CASH")
                                    }
                                    className={`
                                        flex min-h-24 flex-col items-center
                                        justify-center gap-2 rounded-xl border
                                        p-4 text-sm font-medium transition
                                        hover:bg-muted
                                        ${paymentMethod === "CASH"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border"
                                        }
                                    `}
                                >
                                    <Wallet className="h-6 w-6" />

                                    <span>
                                        Tunai
                                    </span>
                                </button>


                                {/* ==========================================
                                    QRIS
                                =========================================== */}

                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() =>
                                        handlePaymentMethodChange("QRIS")
                                    }
                                    className={`
                                        flex min-h-24 flex-col items-center
                                        justify-center gap-2 rounded-xl border
                                        p-4 text-sm font-medium transition
                                        hover:bg-muted
                                        ${paymentMethod === "QRIS"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border"
                                        }
                                    `}
                                >
                                    <QrCode className="h-6 w-6" />

                                    <span>
                                        QRIS
                                    </span>
                                </button>
                            </div>
                        </div>


                        {/* ==================================================
                            CASH PAYMENT
                        =================================================== */}

                        {paymentMethod === "CASH" && (
                            <div className="space-y-5">
                                {/* ==========================================
                                    CASH INPUT
                                =========================================== */}

                                <div className="space-y-2">
                                    <Label htmlFor="paidAmount">
                                        Uang Diterima
                                    </Label>

                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            Rp
                                        </span>

                                        <Input
                                            id="paidAmount"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Masukkan nominal uang"
                                            value={paidAmount}
                                            onChange={(event) =>
                                                handlePaidAmountChange(
                                                    event.target.value
                                                )
                                            }
                                            disabled={isProcessing}
                                            className="h-12 pl-10 text-lg font-semibold"
                                        />
                                    </div>
                                </div>


                                {/* ==========================================
                                    QUICK AMOUNT
                                =========================================== */}

                                <div className="flex flex-wrap gap-2">
                                    {[
                                        order.total,
                                        Math.ceil(order.total / 10000) * 10000,
                                        Math.ceil(order.total / 50000) * 50000,
                                        Math.ceil(order.total / 100000) * 100000,
                                    ]
                                        .filter(
                                            (amount, index, array) =>
                                                array.indexOf(amount) === index
                                        )
                                        .map((amount) => (
                                            <Button
                                                key={amount}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isProcessing}
                                                onClick={() =>
                                                    handleQuickAmount(amount)
                                                }
                                            >
                                                {formatCurrency(amount)}
                                            </Button>
                                        ))}
                                </div>


                                {/* ==========================================
                                    PAYMENT CALCULATION
                                =========================================== */}

                                <div className="rounded-xl border bg-muted/30">
                                    <div className="flex items-center justify-between border-b px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Total
                                        </span>

                                        <span className="font-semibold">
                                            {formatCurrency(order.total)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Kembalian
                                        </span>

                                        <span
                                            className={`
                                                font-bold
                                                ${isCashPaymentValid
                                                    ? "text-green-600"
                                                    : "text-muted-foreground"
                                                }
                                            `}
                                        >
                                            {formatCurrency(changeAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* ==================================================
                            QRIS PAYMENT
                        =================================================== */}

                        {paymentMethod === "QRIS" && (
                            <div className="space-y-5">
                                {/* ==========================================
                                    QRIS TITLE
                                =========================================== */}

                                <div className="flex items-center gap-2">
                                    <QrCode className="h-5 w-5" />

                                    <div>
                                        <h3 className="font-semibold">
                                            Scan QRIS
                                        </h3>

                                        <p className="text-sm text-muted-foreground">
                                            Scan kode QR menggunakan aplikasi
                                            pembayaran pelanggan.
                                        </p>
                                    </div>
                                </div>


                                {/* ==========================================
                                    QRIS IMAGE
                                =========================================== */}

                                <div className="flex w-full items-center justify-center rounded-xl border bg-white p-4 shadow-sm">
                                    <img
                                        src={qrisImageUrl}
                                        alt="QRIS Pembayaran"
                                        className="block h-auto w-full max-w-[360px] object-contain"
                                    />
                                </div>


                                {/* ==========================================
                                    QRIS INSTRUCTION
                                =========================================== */}

                                <div className="rounded-xl border bg-muted/30 p-4">
                                    <p className="text-center text-sm leading-relaxed text-muted-foreground">
                                        Silakan scan QRIS di atas menggunakan
                                        aplikasi pembayaran pelanggan.
                                        Pastikan nominal pembayaran sesuai
                                        dengan total pesanan.
                                    </p>
                                </div>


                                {/* ==========================================
                                    QRIS WARNING
                                =========================================== */}

                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            <QrCode className="h-5 w-5 text-amber-600" />
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold">
                                                Konfirmasi Pembayaran
                                            </p>

                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Pastikan pembayaran sudah
                                                berhasil diterima sebelum
                                                menekan tombol konfirmasi
                                                pembayaran.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* ==================================================
                            ERROR
                        =================================================== */}

                        {errorMessage && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>


                {/* ==========================================================
                    FOOTER
                =========================================================== */}

                <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => onOpenChange(false)}
                    >
                        Batal
                    </Button>

                    {paymentMethod === "CASH" ? (
                        <Button
                            type="button"
                            disabled={
                                !isCashPaymentValid ||
                                isProcessing
                            }
                            onClick={handleCashPayment}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Bayar & Selesaikan
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleQrisPayment}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Konfirmasi Pembayaran
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}