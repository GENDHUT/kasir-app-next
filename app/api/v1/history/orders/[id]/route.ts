import { NextRequest } from "next/server";

import { getHistoryOrderById } from "@/server/history";
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
| GET /api/v1/history/orders/:id
|--------------------------------------------------------------------------
*/

export async function GET(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN");

        const { id } = await params;

        const order = await getHistoryOrderById(id);

        return apiSuccess(order);
    } catch (error) {
        return handleApiError(error);
    }
}