import { NextRequest } from "next/server";

import { cancelOrder } from "@/server/pesanan";
import { requireRoleApi } from "@/server/helper/api-auth";
import {
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
| POST /api/v1/orders/:id/cancel
|--------------------------------------------------------------------------
*/

export async function POST(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const { id } = await params;

        const result = await cancelOrder(id);

        return apiSuccess(result);
    } catch (error) {
        return handleApiError(error);
    }
}