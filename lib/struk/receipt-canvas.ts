import {
    ReceiptOrder,
    STORE_INFO,
    formatCurrency,
    formatReceiptDate,
    getPaymentMethodLabel,
} from "./receipt-types";


/*
|--------------------------------------------------------------------------
| RECEIPT CANVAS RENDERER
|--------------------------------------------------------------------------
|
| Render struk ke <canvas> khusus untuk dicetak ke printer thermal 58mm.
| Ini TERPISAH dari preview HTML di layar (ReceiptDialog) supaya hasil
| cetak bisa diatur presisi per-pixel sesuai lebar kertas printer
| (384 dot = 58mm kertas thermal pada umumnya).
|
*/

const CANVAS_WIDTH = 384;
const PADDING_X = 18;
const CONTENT_WIDTH = CANVAS_WIDTH - PADDING_X * 2;
const SCRATCH_HEIGHT = 3000; // tinggi sementara untuk pass pengukuran

const FONT_TITLE = "bold 26px 'Courier New', monospace";
const FONT_NORMAL = "20px 'Courier New', monospace";
const FONT_BOLD = "bold 20px 'Courier New', monospace";
const FONT_SMALL = "16px 'Courier New', monospace";


/*
|--------------------------------------------------------------------------
| PUBLIC API
|--------------------------------------------------------------------------
*/

export async function renderReceiptCanvas(
    order: ReceiptOrder,
    options?: { showLogo?: boolean; logoUrl?: string }
): Promise<HTMLCanvasElement> {
    const logoImage =
        options?.showLogo && options?.logoUrl
            ? await loadImageSafe(options.logoUrl)
            : null;

    // Pass 1: gambar di canvas tinggi sementara, cuma buat ukur tinggi asli.
    const scratchCanvas = document.createElement("canvas");
    scratchCanvas.width = CANVAS_WIDTH;
    scratchCanvas.height = SCRATCH_HEIGHT;

    const scratchCtx = scratchCanvas.getContext("2d");

    if (!scratchCtx) {
        throw new Error("Canvas 2D context tidak tersedia di browser ini.");
    }

    const measuredHeight = paint(scratchCtx, order, logoImage);

    // Pass 2: gambar ulang di canvas final dengan tinggi yang pas.
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = CANVAS_WIDTH;
    finalCanvas.height = measuredHeight;

    const finalCtx = finalCanvas.getContext("2d");

    if (!finalCtx) {
        throw new Error("Canvas 2D context tidak tersedia di browser ini.");
    }

    paint(finalCtx, order, logoImage);

    return finalCanvas;
}


/*
|--------------------------------------------------------------------------
| IMAGE LOADER (SAFE, WON'T THROW)
|--------------------------------------------------------------------------
*/

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();

        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;

        // Kalau logo gagal/lambat dimuat, tetap lanjut cetak tanpa logo.
        setTimeout(() => resolve(null), 3000);
    });
}


/*
|--------------------------------------------------------------------------
| MAIN PAINT FUNCTION
|--------------------------------------------------------------------------
|
| Dipanggil 2x (measure + final) dengan urutan gambar yang identik,
| supaya tinggi yang diukur di pass 1 selalu akurat untuk pass 2.
|
*/

function paint(
    ctx: CanvasRenderingContext2D,
    order: ReceiptOrder,
    logoImage: HTMLImageElement | null
): number {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, ctx.canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "top";

    let y = 18;

    // LOGO
    if (logoImage) {
        const logoSize = 56;
        ctx.drawImage(
            logoImage,
            (CANVAS_WIDTH - logoSize) / 2,
            y,
            logoSize,
            logoSize
        );
        y += logoSize + 10;
    }

    // NAMA TOKO
    ctx.font = FONT_TITLE;
    y = drawWrappedCenteredText(ctx, STORE_INFO.name.toUpperCase(), y, 30) + 4;

    // ALAMAT & TELEPON
    ctx.font = FONT_SMALL;
    y = drawWrappedCenteredText(ctx, STORE_INFO.address, y, 20) + 2;
    y = drawWrappedCenteredText(ctx, STORE_INFO.phone, y, 20) + 10;

    y = drawDashedLine(ctx, y);

    // META INFO
    ctx.font = FONT_NORMAL;
    y = drawRow(ctx, "No", order.orderNumber, y);
    y = drawRow(ctx, "Tanggal", formatReceiptDate(order.completedAt), y);
    y = drawRow(ctx, "Kasir", order.cashierName || "-", y);
    y = drawRow(
        ctx,
        "Pembayaran",
        getPaymentMethodLabel(order.paymentMethod),
        y
    );

    y += 6;
    y = drawDashedLine(ctx, y);

    // ITEMS
    for (const item of order.items) {
        const itemLabel =
            item.variantName && item.variantName.trim().length > 0
                ? `${item.menuName} (${item.variantName})`
                : item.menuName;

        ctx.font = FONT_BOLD;
        y = drawWrappedText(ctx, itemLabel, PADDING_X, y, CONTENT_WIDTH, 22);

        ctx.font = FONT_SMALL;
        const qtyPriceLine = `${formatCurrency(item.unitPrice)} x${item.quantity}`;
        y = drawRightAlignedText(ctx, qtyPriceLine, y, 20) + 4;
    }

    y += 4;
    y = drawDashedLine(ctx, y);

    // TOTALS
    ctx.font = FONT_NORMAL;
    y = drawRow(ctx, "Total Pesanan", formatCurrency(order.subtotal), y);

    if (order.discount > 0) {
        y = drawRow(ctx, "Diskon", `-${formatCurrency(order.discount)}`, y);
    }

    if (order.tax > 0) {
        y = drawRow(ctx, "Pajak", formatCurrency(order.tax), y);
    }

    ctx.font = FONT_BOLD;
    y = drawRow(ctx, "Total", formatCurrency(order.total), y);

    ctx.font = FONT_NORMAL;
    y = drawRow(ctx, "Bayar", formatCurrency(order.paidAmount), y);

    if (order.changeAmount > 0) {
        y = drawRow(ctx, "Kembali", formatCurrency(order.changeAmount), y);
    }

    y += 6;
    y = drawDashedLine(ctx, y);

    // FOOTER
    ctx.font = FONT_SMALL;
    y = drawWrappedCenteredText(
        ctx,
        `INSTAGRAM ${STORE_INFO.instagram.toUpperCase()}`,
        y,
        20
    ) + 4;

    y = drawWrappedCenteredText(ctx, STORE_INFO.footerNote, y, 20) + 18;

    return y;
}


/*
|--------------------------------------------------------------------------
| DRAW HELPERS
|--------------------------------------------------------------------------
*/

function drawDashedLine(ctx: CanvasRenderingContext2D, y: number): number {
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(PADDING_X, y);
    ctx.lineTo(CANVAS_WIDTH - PADDING_X, y);
    ctx.stroke();

    ctx.restore();

    return y + 10;
}

function drawRow(
    ctx: CanvasRenderingContext2D,
    label: string,
    value: string,
    y: number
): number {
    const lineHeight = 22;

    ctx.textAlign = "left";
    ctx.fillText(label, PADDING_X, y);

    ctx.textAlign = "right";
    ctx.fillText(value, CANVAS_WIDTH - PADDING_X, y);

    ctx.textAlign = "left";

    return y + lineHeight;
}

function drawRightAlignedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    y: number,
    lineHeight: number
): number {
    ctx.textAlign = "right";
    ctx.fillText(text, CANVAS_WIDTH - PADDING_X, y);
    ctx.textAlign = "left";

    return y + lineHeight;
}

function drawWrappedCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    y: number,
    lineHeight: number
): number {
    const lines = wrapText(ctx, text, CONTENT_WIDTH);
    let cursorY = y;

    ctx.textAlign = "center";

    for (const line of lines) {
        ctx.fillText(line, CANVAS_WIDTH / 2, cursorY);
        cursorY += lineHeight;
    }

    ctx.textAlign = "left";

    return cursorY;
}

function drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): number {
    const lines = wrapText(ctx, text, maxWidth);
    let cursorY = y;

    for (const line of lines) {
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
    }

    return cursorY;
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;

        if (ctx.measureText(candidate).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = candidate;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [""];
}