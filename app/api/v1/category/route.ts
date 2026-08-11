import { NextRequest } from "next/server";

import { createCategory, getCategories } from "@/server/category";
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

        const categories = await getCategories();

        return apiSuccess(categories);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/category
|--------------------------------------------------------------------------
|
| Body JSON: { "name": "Minuman" }
|
| Catatan: createCategory() di server/category.ts saat ini TIDAK
| melakukan requireAdmin() sendiri, jadi kita jaga di sini.
|
*/

export async function POST(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN");

        const body = await request.json().catch(() => null);

        if (!body?.name || typeof body.name !== "string") {
            return apiError("Field 'name' wajib diisi.", 422);
        }

        const result = await createCategory(body.name);

        if (result.error) {
            return apiError(result.error, 422);
        }

        return apiSuccess(result.data, 201);
    } catch (error) {
        return handleApiError(error);
    }
}