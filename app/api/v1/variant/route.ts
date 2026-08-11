import { NextRequest } from "next/server";

import { createVariants, getVariants } from "@/server/variant";
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

export async function GET() {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const variants = await getVariants();

        return apiSuccess(variants);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/variant
|--------------------------------------------------------------------------
|
| Body JSON: { "names": ["Small", "Medium", "Large"] }
|
| createVariants() sudah requireAdmin() sendiri di dalamnya.
|
*/

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);

        if (!body?.names || !Array.isArray(body.names)) {
            return apiError("Field 'names' (array of string) wajib diisi.", 422);
        }

        const result = await createVariants(body.names);

        if (!result.success) {
            return apiSuccess(result, 422);
        }

        return apiSuccess(result.data, 201);
    } catch (error) {
        return handleApiError(error);
    }
}