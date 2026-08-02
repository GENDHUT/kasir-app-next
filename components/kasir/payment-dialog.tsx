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

export interface PaymentCompleteDetails {
    paidAmount: number;
    changeAmount: number;
}

interface PaymentDialogProps {
    order: PaymentOrder | null;
    open: boolean;
    qrisImageUrl?: string;
    onOpenChange: (open: boolean) => void;
    /**
     * Dipanggil setelah pembayaran berhasil disimpan ke database.
     * `details` berisi nominal yang dibayarkan & kembalian, supaya parent
     * bisa menyimpannya sendiri (misalnya untuk membangun struk nanti).
     *
     * PaymentDialog TIDAK menampilkan struk / receipt sama sekali --
     * itu tanggung jawab parent (mis. PendingOrderTable).
     */
    onPaymentComplete?: (
        paymentMethod: "CASH" | "QRIS",
        details: PaymentCompleteDetails
    ) => void;
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

            onPaymentComplete?.("CASH", {
                paidAmount: numericPaidAmount,
                changeAmount,
            });

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

            onPaymentComplete?.("QRIS", {
                paidAmount: order.total,
                changeAmount: 0,
            });

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
    | QUICK CASH AMOUNT OPTIONS
    |--------------------------------------------------------------------------
    */

    const quickAmountOptions = order
        ? [
            order.total,
            Math.ceil(order.total / 10000) * 10000,
            Math.ceil(order.total / 50000) * 50000,
            Math.ceil(order.total / 100000) * 100000,
        ].filter(
            (amount, index, array) => array.indexOf(amount) === index
        )
        : [];


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
            <DialogContent
                className="
                    flex flex-col gap-0 overflow-hidden p-0
                    max-sm:inset-0 max-sm:top-0 max-sm:left-0
                    max-sm:h-[100dvh] max-sm:max-h-[100dvh]
                    max-sm:w-full max-sm:max-w-full
                    max-sm:translate-x-0 max-sm:translate-y-0
                    max-sm:rounded-none max-sm:border-0
                    sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl
                "
            >
                {/* ==========================================================
                    HEADER
                =========================================================== */}

                <DialogHeader className="shrink-0 border-b px-4 py-4 text-left sm:px-6 sm:py-5">
                    <DialogTitle className="text-lg sm:text-xl">
                        Pembayaran Pesanan
                    </DialogTitle>

                    <DialogDescription className="text-xs sm:text-sm">
                        Selesaikan pembayaran untuk pesanan{" "}
                        <span className="font-semibold text-foreground">
                            {order.orderNumber}
                        </span>
                    </DialogDescription>
                </DialogHeader>


                {/* ==========================================================
                    CONTENT
                =========================================================== */}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
                        {/* ==================================================
                            ORDER SUMMARY
                        =================================================== */}

                        <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
                                <span className="text-xs text-muted-foreground sm:text-sm">
                                    Total Pembayaran
                                </span>

                                <span className="text-lg font-bold sm:text-xl">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-start justify-between gap-3 text-xs sm:text-sm"
                                    >
                                        <p className="min-w-0 flex-1 break-words font-medium">
                                            <span className="text-muted-foreground">
                                                {item.quantity}x
                                            </span>{" "}
                                            {item.menuName}

                                            {item.variantName && (
                                                <span className="text-muted-foreground">
                                                    {" "}({item.variantName})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* ==================================================
                            PAYMENT METHOD
                        =================================================== */}

                        <div className="space-y-2 sm:space-y-3">
                            <Label className="text-xs sm:text-sm">
                                Metode Pembayaran
                            </Label>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                                        flex min-h-20 flex-col items-center
                                        justify-center gap-1.5 rounded-xl border
                                        p-3 text-xs font-medium transition
                                        active:scale-[0.98]
                                        hover:bg-muted
                                        sm:min-h-24 sm:gap-2 sm:p-4 sm:text-sm
                                        ${paymentMethod === "CASH"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border"
                                        }
                                    `}
                                >
                                    <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />

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
                                        flex min-h-20 flex-col items-center
                                        justify-center gap-1.5 rounded-xl border
                                        p-3 text-xs font-medium transition
                                        active:scale-[0.98]
                                        hover:bg-muted
                                        sm:min-h-24 sm:gap-2 sm:p-4 sm:text-sm
                                        ${paymentMethod === "QRIS"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border"
                                        }
                                    `}
                                >
                                    <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />

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
                            <div className="space-y-4 sm:space-y-5">
                                {/* ==========================================
                                    CASH INPUT
                                =========================================== */}

                                <div className="space-y-2">
                                    <Label htmlFor="paidAmount" className="text-xs sm:text-sm">
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
                                            className="h-11 pl-10 text-base font-semibold sm:h-12 sm:text-lg"
                                        />
                                    </div>
                                </div>


                                {/* ==========================================
                                    QUICK AMOUNT
                                =========================================== */}

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {quickAmountOptions.map((amount) => (
                                        <Button
                                            key={amount}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isProcessing}
                                            onClick={() =>
                                                handleQuickAmount(amount)
                                            }
                                            className="h-9 w-full px-2 text-xs sm:text-sm"
                                        >
                                            {formatCurrency(amount)}
                                        </Button>
                                    ))}
                                </div>


                                {/* ==========================================
                                    PAYMENT CALCULATION
                                =========================================== */}

                                <div className="rounded-xl border bg-muted/30">
                                    <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
                                        <span className="text-xs text-muted-foreground sm:text-sm">
                                            Total
                                        </span>

                                        <span className="text-sm font-semibold sm:text-base">
                                            {formatCurrency(order.total)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
                                        <span className="text-xs text-muted-foreground sm:text-sm">
                                            Kembalian
                                        </span>

                                        <span
                                            className={`
                                                text-sm font-bold sm:text-base
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
                            <div className="space-y-4 sm:space-y-5">
                                {/* ==========================================
                                    QRIS TITLE
                                =========================================== */}

                                <div className="flex items-start gap-2">
                                    <QrCode className="mt-0.5 h-5 w-5 shrink-0" />

                                    <div>
                                        <h3 className="text-sm font-semibold sm:text-base">
                                            Scan QRIS
                                        </h3>

                                        <p className="text-xs text-muted-foreground sm:text-sm">
                                            Scan kode QR menggunakan aplikasi
                                            pembayaran pelanggan.
                                        </p>
                                    </div>
                                </div>


                                {/* ==========================================
                                    QRIS IMAGE
                                =========================================== */}

                                <div className="flex w-full items-center justify-center rounded-xl border bg-white p-3 shadow-sm sm:p-4">
                                    <img
                                        src={qrisImageUrl}
                                        alt="QRIS Pembayaran"
                                        className="block h-auto w-full max-w-[260px] object-contain sm:max-w-[360px]"
                                    />
                                </div>


                                {/* ==========================================
                                    QRIS INSTRUCTION
                                =========================================== */}

                                <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
                                    <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                        Silakan scan QRIS di atas menggunakan
                                        aplikasi pembayaran pelanggan.
                                        Pastikan nominal pembayaran sesuai
                                        dengan total pesanan.
                                    </p>
                                </div>


                                {/* ==========================================
                                    QRIS WARNING
                                =========================================== */}

                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            <QrCode className="h-5 w-5 text-amber-600" />
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold sm:text-sm">
                                                Konfirmasi Pembayaran
                                            </p>

                                            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
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
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive sm:px-4 sm:py-3 sm:text-sm">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>


                {/* ==========================================================
                    FOOTER
                =========================================================== */}

                <DialogFooter
                    className="
                        shrink-0 flex-col-reverse gap-2 border-t
                        bg-muted/20 px-4 py-3
                        sm:flex-row sm:justify-end sm:gap-2 sm:px-6 sm:py-4
                    "
                >
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
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
                            className="w-full sm:w-auto"
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
                            className="w-full sm:w-auto"
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