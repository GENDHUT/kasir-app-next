"use client";

import { useEffect, useState } from "react";

import {
    AlertTriangle,
    Loader2,
    Printer,
    Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    ReceiptOrder,
    STORE_INFO,
    formatCurrency,
    formatReceiptDate,
    getPaymentMethodLabel,
} from "@/lib/struk/receipt-types";

import {
    isWebBluetoothSupported,
    printCanvasReceipt,
} from "@/lib/struk/thermal-printer";

import { renderReceiptCanvas } from "@/lib/struk/receipt-canvas";


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface ReceiptDialogProps {
    order: ReceiptOrder | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type PrintStatus = "idle" | "connecting" | "printing" | "success" | "error";


/*
|--------------------------------------------------------------------------
| RECEIPT DIALOG
|--------------------------------------------------------------------------
*/

export function ReceiptDialog({
    order,
    open,
    onOpenChange,
}: ReceiptDialogProps) {
    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [showLogo, setShowLogo] = useState(false);

    const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const bluetoothSupported = isWebBluetoothSupported();


    /*
    |--------------------------------------------------------------------------
    | RESET ON OPEN
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (open) {
            setPrintStatus("idle");
            setErrorMessage(null);
        }
    }, [open, order?.id]);


    /*
    |--------------------------------------------------------------------------
    | HANDLE PRINT
    |--------------------------------------------------------------------------
    */

    async function handlePrint() {
        if (!order) {
            return;
        }

        try {
            setErrorMessage(null);
            setPrintStatus("connecting");

            const canvas = await renderReceiptCanvas(order, {
                showLogo,
                logoUrl: STORE_INFO.logoUrl,
            });

            setPrintStatus("printing");

            await printCanvasReceipt(canvas);

            setPrintStatus("success");
        } catch (error) {
            setPrintStatus("error");
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Gagal mencetak struk. Pastikan printer sudah menyala dan dalam jangkauan Bluetooth."
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    if (!order) {
        return null;
    }

    const isBusy =
        printStatus === "connecting" || printStatus === "printing";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="
                    flex flex-col gap-0 overflow-hidden p-0
                    max-sm:inset-0 max-sm:top-0 max-sm:left-0
                    max-sm:h-[100dvh] max-sm:max-h-[100dvh]
                    max-sm:w-full max-sm:max-w-full
                    max-sm:translate-x-0 max-sm:translate-y-0
                    max-sm:rounded-none max-sm:border-0
                    sm:max-h-[88vh] sm:max-w-sm sm:rounded-2xl
                "
            >
                {/* ==========================================================
                    HEADER
                =========================================================== */}

                <DialogHeader className="shrink-0 border-b px-4 py-4 text-left sm:px-6 sm:py-5">
                    <DialogTitle className="text-lg sm:text-xl">
                        Struk Pembayaran
                    </DialogTitle>

                    <DialogDescription className="text-xs sm:text-sm">
                        Pesanan{" "}
                        <span className="font-semibold text-foreground">
                            {order.orderNumber}
                        </span>
                    </DialogDescription>
                </DialogHeader>


                {/* ==========================================================
                    CONTENT
                =========================================================== */}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20">
                    <div className="space-y-4 p-4 sm:p-6">
                        {/* ==================================================
                            RECEIPT PREVIEW
                        =================================================== */}

                        <div className="mx-auto w-full max-w-[300px] rounded-lg border bg-white p-4 font-mono text-black shadow-sm">
                            {showLogo && (
                                <div className="mb-2 flex justify-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/20">
                                        <Store className="h-6 w-6" />
                                    </div>
                                </div>
                            )}

                            <p className="text-center text-sm font-bold uppercase leading-snug">
                                {STORE_INFO.name}
                            </p>

                            <p className="text-center text-[11px] leading-snug">
                                {STORE_INFO.address}
                            </p>

                            <p className="text-center text-[11px] leading-snug">
                                {STORE_INFO.phone}
                            </p>

                            <div className="my-3 border-t border-dashed border-black/40" />

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between gap-2">
                                    <span>No</span>
                                    <span className="text-right">
                                        {order.orderNumber}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span>Tanggal</span>
                                    <span className="text-right">
                                        {formatReceiptDate(order.completedAt)}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span>Kasir</span>
                                    <span className="text-right">
                                        {order.cashierName || "-"}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span>Pembayaran</span>
                                    <span className="text-right">
                                        {getPaymentMethodLabel(order.paymentMethod)}
                                    </span>
                                </div>
                            </div>

                            <div className="my-3 border-t border-dashed border-black/40" />

                            <div className="space-y-2 text-[11px]">
                                {order.items.map((item) => (
                                    <div key={item.id}>
                                        <p className="font-semibold leading-snug">
                                            {item.menuName}
                                            {item.variantName && (
                                                <span className="font-normal">
                                                    {" "}({item.variantName})
                                                </span>
                                            )}
                                        </p>

                                        <p className="text-right leading-snug">
                                            {formatCurrency(item.unitPrice)} x{item.quantity}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="my-3 border-t border-dashed border-black/40" />

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between gap-2">
                                    <span>Total Pesanan</span>
                                    <span>{formatCurrency(order.subtotal)}</span>
                                </div>

                                {order.discount > 0 && (
                                    <div className="flex justify-between gap-2">
                                        <span>Diskon</span>
                                        <span>-{formatCurrency(order.discount)}</span>
                                    </div>
                                )}

                                {order.tax > 0 && (
                                    <div className="flex justify-between gap-2">
                                        <span>Pajak</span>
                                        <span>{formatCurrency(order.tax)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between gap-2 font-bold">
                                    <span>Total</span>
                                    <span>{formatCurrency(order.total)}</span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span>Bayar</span>
                                    <span>{formatCurrency(order.paidAmount)}</span>
                                </div>

                                {order.changeAmount > 0 && (
                                    <div className="flex justify-between gap-2">
                                        <span>Kembali</span>
                                        <span>{formatCurrency(order.changeAmount)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="my-3 border-t border-dashed border-black/40" />

                            <p className="text-center text-[11px] leading-snug">
                                INSTAGRAM {STORE_INFO.instagram.toUpperCase()}
                            </p>

                            <p className="text-center text-[11px] leading-snug">
                                {STORE_INFO.footerNote}
                            </p>
                        </div>


                        {/* ==================================================
                            LOGO TOGGLE
                        =================================================== */}

                        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                            <span className="text-sm font-medium">
                                Cantumkan Logo di Struk
                            </span>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={showLogo}
                                disabled={isBusy}
                                onClick={() => setShowLogo((value) => !value)}
                                className={`
                                    relative h-6 w-11 shrink-0 rounded-full transition
                                    ${showLogo ? "bg-primary" : "bg-muted-foreground/30"}
                                `}
                            >
                                <span
                                    className={`
                                        absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                                        ${showLogo ? "translate-x-[22px]" : "translate-x-0.5"}
                                    `}
                                />
                            </button>
                        </div>


                        {/* ==================================================
                            BLUETOOTH WARNING
                        =================================================== */}

                        {!bluetoothSupported && (
                            <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                <p>
                                    Browser ini tidak mendukung cetak Bluetooth.
                                    Gunakan Chrome/Edge di desktop atau Android.
                                </p>
                            </div>
                        )}


                        {/* ==================================================
                            PRINT STATUS
                        =================================================== */}

                        {printStatus === "success" && (
                            <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-xs text-green-700 sm:text-sm">
                                Struk berhasil dikirim ke printer.
                            </div>
                        )}

                        {printStatus === "error" && errorMessage && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive sm:text-sm">
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
                        disabled={isBusy}
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Tutup
                    </Button>

                    <Button
                        type="button"
                        disabled={isBusy || !bluetoothSupported}
                        onClick={handlePrint}
                        className="w-full bg-red-500 hover:bg-red-600 sm:w-auto"
                    >
                        {isBusy ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {printStatus === "connecting"
                                    ? "Menghubungkan..."
                                    : "Mencetak..."}
                            </>
                        ) : (
                            <>
                                <Printer className="mr-2 h-4 w-4" />
                                Cetak Struk (58mm)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}