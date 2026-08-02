"use client";

/*
|--------------------------------------------------------------------------
| THERMAL PRINTER (WEB BLUETOOTH, ESC/POS, 58MM)
|--------------------------------------------------------------------------
|
| Cara kerja singkat:
|
| 1. Browser minta izin connect ke printer via Web Bluetooth. Ini HANYA
|    jalan di Chrome/Edge (desktop & Android). Safari/iOS tidak didukung.
| 2. Struk sudah di-render ke <canvas> di luar file ini (lihat
|    receipt-canvas.ts) supaya layout persis dengan preview di layar.
| 3. Canvas diubah jadi bitmap hitam-putih, lalu di-encode ke perintah
|    ESC/POS "GS v 0" (raster image) yang dipahami hampir semua printer
|    thermal 58mm generik.
| 4. Data dikirim ke printer per-chunk kecil karena ada batas ukuran
|    paket Bluetooth Low Energy (GATT write).
|
| PENTING SOAL UUID:
| PRINTER_SERVICE_UUID / PRINTER_CHARACTERISTIC_UUID di bawah adalah UUID
| paling umum dipakai printer thermal 58mm generik (banyak dipakai printer
| clone GP/Goojprt/Zjiang dsb — merek yang biasa dijual di marketplace
| sebagai "printer bluetooth thermal 58mm"). Kalau printer kamu ternyata
| tidak mau connect, cek UUID service printer kamu (bisa pakai app
| "nRF Connect" di Android untuk scan BLE), lalu ganti 2 konstanta di
| bawah ini.
|
*/

declare global {
    interface Navigator {
        bluetooth: any;
    }
}

const PRINTER_SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

// Batas aman ukuran satu kali kirim data ke printer via BLE.
const CHUNK_SIZE = 180;

// Jeda antar chunk supaya buffer printer tidak overflow / struk jadi bergaris.
const CHUNK_DELAY_MS = 12;

let cachedDevice: any = null;
let cachedCharacteristic: any = null;


/*
|--------------------------------------------------------------------------
| SUPPORT CHECK
|--------------------------------------------------------------------------
*/

export function isWebBluetoothSupported() {
    return (
        typeof navigator !== "undefined" &&
        typeof navigator.bluetooth !== "undefined"
    );
}


/*
|--------------------------------------------------------------------------
| CONNECT / DISCONNECT
|--------------------------------------------------------------------------
*/

export interface PrinterConnection {
    device: any;
    characteristic: any;
}

export async function connectPrinter(): Promise<PrinterConnection> {
    if (!isWebBluetoothSupported()) {
        throw new Error(
            "Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge di desktop atau Android."
        );
    }

    // Reuse koneksi yang masih aktif dalam sesi ini biar tidak perlu
    // pilih device berulang kali tiap mau cetak.
    if (cachedDevice?.gatt?.connected && cachedCharacteristic) {
        return {
            device: cachedDevice,
            characteristic: cachedCharacteristic,
        };
    }

    const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [PRINTER_SERVICE_UUID] }],
        optionalServices: [PRINTER_SERVICE_UUID],
    });

    if (!device.gatt) {
        throw new Error("Perangkat yang dipilih tidak mendukung GATT server.");
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(
        PRINTER_CHARACTERISTIC_UUID
    );

    device.addEventListener("gattserverdisconnected", () => {
        cachedDevice = null;
        cachedCharacteristic = null;
    });

    cachedDevice = device;
    cachedCharacteristic = characteristic;

    return { device, characteristic };
}

export function disconnectPrinter() {
    cachedDevice?.gatt?.disconnect();
    cachedDevice = null;
    cachedCharacteristic = null;
}

export function getConnectedPrinterName(): string | null {
    if (cachedDevice?.gatt?.connected) {
        return cachedDevice.name ?? "Printer";
    }

    return null;
}


/*
|--------------------------------------------------------------------------
| CANVAS -> ESC/POS RASTER BYTES
|--------------------------------------------------------------------------
*/

function canvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Tidak bisa membaca canvas struk.");
    }

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);

    const bytesPerRow = Math.ceil(width / 8);

    const header = new Uint8Array([
        0x1d,
        0x76,
        0x30,
        0x00, // GS v 0, mode normal (tanpa scaling)
        bytesPerRow & 0xff,
        (bytesPerRow >> 8) & 0xff,
        height & 0xff,
        (height >> 8) & 0xff,
    ]);

    const raster = new Uint8Array(bytesPerRow * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;

            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];
            const alpha = imageData.data[index + 3];

            const luminance = (r + g + b) / 3;
            const isDark = alpha > 128 && luminance < 160;

            if (isDark) {
                const byteIndex = y * bytesPerRow + (x >> 3);
                raster[byteIndex] |= 0x80 >> (x % 8);
            }
        }
    }

    const result = new Uint8Array(header.length + raster.length);
    result.set(header, 0);
    result.set(raster, header.length);

    return result;
}

const ESC_INIT = new Uint8Array([0x1b, 0x40]); // ESC @ -> reset printer

// Feed beberapa baris. Baris terakhir (GS V 0) full-cut, hanya berefek
// kalau printer punya auto-cutter. Kalau tidak punya, printer akan
// mengabaikan perintah ini dengan aman.
const FEED_AND_CUT = new Uint8Array([
    0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00,
]);


/*
|--------------------------------------------------------------------------
| WRITE TO PRINTER (CHUNKED)
|--------------------------------------------------------------------------
*/

async function writeInChunks(characteristic: any, data: Uint8Array) {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE);

        if (typeof characteristic.writeValueWithoutResponse === "function") {
            await characteristic.writeValueWithoutResponse(chunk);
        } else {
            await characteristic.writeValue(chunk);
        }

        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    }
}


/*
|--------------------------------------------------------------------------
| PRINT
|--------------------------------------------------------------------------
*/

export async function printCanvasReceipt(
    canvas: HTMLCanvasElement,
    options?: { cutPaper?: boolean }
) {
    const { characteristic } = await connectPrinter();

    const raster = canvasToEscPosRaster(canvas);

    await writeInChunks(characteristic, ESC_INIT);
    await writeInChunks(characteristic, raster);

    if (options?.cutPaper !== false) {
        await writeInChunks(characteristic, FEED_AND_CUT);
    }
}