import { NextRequest } from "next/server";

import { updateMenuAvailable } from "@/server/menu";
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
| PATCH /api/v1/menu/:id/available
|--------------------------------------------------------------------------
|
| Body JSON: { "available": true | false }
|
*/

export async function PATCH(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN");

        const { id } = await params;

        const body = await request.json().catch(() => null);

        if (!body || typeof body.available !== "boolean") {
            return apiError("Field 'available' (boolean) wajib diisi.", 422);
        }

        const result = await updateMenuAvailable(id, body.available);

        if (!result.success) {
            return apiSuccess(result, 422);
        }

        return apiSuccess(result.data);
    } catch (error) {
        return handleApiError(error);
    }
}