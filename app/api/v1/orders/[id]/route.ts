import { NextRequest } from "next/server";

import {
    deleteOrder,
    getOrderById,
    updateOrder,
    type UpdateOrderInput,
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
| GET /api/v1/orders/:id
|--------------------------------------------------------------------------
|
| getOrderById() sudah punya pengecekan akses sendiri:
| EMPLOYEE hanya bisa lihat pesanan miliknya.
|
*/

export async function GET(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const { id } = await params;

        const order = await getOrderById(id);

        return apiSuccess(order);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| PATCH /api/v1/orders/:id
|--------------------------------------------------------------------------
|
| Update pesanan PENDING (tambah/kurangi item, ubah diskon/pajak/catatan).
|
| Body JSON sama seperti POST /api/v1/orders, tapi semua field opsional.
|
*/

export async function PATCH(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const { id } = await params;

        const body = (await request.json().catch(() => null)) as
            | UpdateOrderInput
            | null;

        if (!body) {
            return apiError("Body request tidak valid.", 422);
        }

        const result = await updateOrder(id, body);

        return apiSuccess(result);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/v1/orders/:id
|--------------------------------------------------------------------------
|
| Hapus permanen. ADMIN only (dicek di dalam deleteOrder juga).
|
*/

export async function DELETE(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN");

        const { id } = await params;

        const result = await deleteOrder(id);

        return apiSuccess(result);
    } catch (error) {
        return handleApiError(error);
    }
}   