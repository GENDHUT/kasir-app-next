import { NextRequest } from "next/server";

import { syncOfflineOrder } from "@/server/pesanan";
import { requireRoleApi } from "@/server/helper/api-auth";
import {
    apiError,
    apiSuccess,
    handleApiError,
    optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
    return optionsResponse();
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/orders/sync
|--------------------------------------------------------------------------
|
| Body JSON:
| {
|   "items": [{ "menuId": "...", "menuVariantId": "...", "quantity": 2 }],
|   "discount": 0,
|   "tax": 0,
|   "notes": "...",
|   "paymentMethod": "CASH" | "QRIS",
|   "paidAmount": 25000,
|   "createdAt": "2026-08-14T05:00:00.000Z",
|   "completedAt": "2026-08-14T05:10:00.000Z",
|   "clientOrderId": "local_xxxxx"
| }
|
| Dipakai untuk mengirim pesanan yang dibuat & dibayar saat mobile app
| offline. Order langsung dibuat dengan status COMPLETED, dan waktu
| createdAt/completedAt mengikuti nilai yang dikirim client (waktu asli
| transaksi terjadi), bukan waktu request ini diterima server.
|
*/

export async function POST(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const body = await request.json().catch(() => null);

        if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
            return apiError("Field 'items' wajib diisi minimal 1 item.", 422);
        }

        if (!body.paymentMethod || !["CASH", "QRIS"].includes(body.paymentMethod)) {
            return apiError("Field 'paymentMethod' harus CASH atau QRIS.", 422);
        }

        if (typeof body.paidAmount !== "number") {
            return apiError("Field 'paidAmount' (number) wajib diisi.", 422);
        }

        if (!body.createdAt || !body.completedAt) {
            return apiError("Field 'createdAt' dan 'completedAt' wajib diisi.", 422);
        }

        const result = await syncOfflineOrder(body);

        return apiSuccess(result, 201);
    } catch (error) {
        return handleApiError(error);
    }
}