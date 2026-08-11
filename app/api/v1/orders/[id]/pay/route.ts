import { NextRequest } from "next/server";

import {
    completeCashPayment,
    completeQrisPayment,
} from "@/server/pesanan";
import { requireRoleApi } from "@/server/helper/api-auth";
import {
    apiError,
    apiSuccess,
    handleApiError,
    optionsResponse,
} from "@/lib/api/response";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function OPTIONS() {
    return optionsResponse();
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/orders/:id/pay
|--------------------------------------------------------------------------
|
| Body JSON untuk CASH:
| { "method": "CASH", "paidAmount": 50000 }
|
| Body JSON untuk QRIS:
| { "method": "QRIS" }
|
*/

export async function POST(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const { id } = await params;

        const body = await request.json().catch(() => null);

        if (!body?.method || !["CASH", "QRIS"].includes(body.method)) {
            return apiError("Field 'method' harus CASH atau QRIS.", 422);
        }

        if (body.method === "CASH") {
            if (typeof body.paidAmount !== "number") {
                return apiError(
                    "Field 'paidAmount' (number) wajib diisi untuk pembayaran CASH.",
                    422
                );
            }

            const result = await completeCashPayment(id, body.paidAmount);

            return apiSuccess(result);
        }

        const result = await completeQrisPayment(id);

        return apiSuccess(result);
    } catch (error) {
        return handleApiError(error);
    }
}