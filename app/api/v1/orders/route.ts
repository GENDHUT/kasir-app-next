import { NextRequest } from "next/server";

import {
    createOrder,
    getCompletedOrders,
    getOrderHistory,
    getPendingOrders,
    type CreateOrderInput,
} from "@/server/pesanan";
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
| GET /api/v1/orders?status=pending|completed|history
|--------------------------------------------------------------------------
|
| status=pending   -> pesanan aktif (kasir bikin ini terus)
| status=completed -> pesanan selesai (EMPLOYEE hanya lihat miliknya sendiri)
| status=history   -> COMPLETED + CANCELLED, ADMIN only
|
| Default (tanpa query): pending.
|
*/

export async function GET(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const status = request.nextUrl.searchParams.get("status") ?? "pending";

        let orders;

        switch (status) {
            case "completed":
                orders = await getCompletedOrders();
                break;

            case "history":
                await requireRoleApi("ADMIN");
                orders = await getOrderHistory();
                break;

            case "pending":
            default:
                orders = await getPendingOrders();
                break;
        }

        return apiSuccess(orders);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/orders
|--------------------------------------------------------------------------
|
| Membuat pesanan baru (kasir). ADMIN / EMPLOYEE.
|
| Body JSON:
| {
|   "items": [
|     { "menuId": "...", "menuVariantId": "...", "quantity": 2 }
|   ],
|   "discount": 0,
|   "tax": 0,
|   "notes": "tanpa gula"
| }
|
*/

export async function POST(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const body = (await request.json().catch(() => null)) as
            | CreateOrderInput
            | null;

        if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
            return apiError("Field 'items' wajib diisi minimal 1 item.", 422);
        }

        const result = await createOrder(body);

        return apiSuccess(result, 201);
    } catch (error) {
        return handleApiError(error);
    }
}