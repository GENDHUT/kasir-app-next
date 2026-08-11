import { NextRequest } from "next/server";

import {
    deleteMenu,
    getMenuById,
    updateMenu,
} from "@/server/menu";
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
| GET /api/v1/menu/:id
|--------------------------------------------------------------------------
*/

export async function GET(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const { id } = await params;

        const menuData = await getMenuById(id);

        if (!menuData) {
            return apiError("Menu tidak ditemukan.", 404);
        }

        return apiSuccess(menuData);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| PATCH /api/v1/menu/:id
|--------------------------------------------------------------------------
|
| Update menu. ADMIN only. Body sama seperti POST (multipart/form-data).
|
*/

export async function PATCH(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN");

        const { id } = await params;

        const formData = await request.formData();

        const result = await updateMenu(id, formData);

        if (!result.success) {
            return apiSuccess(result, 422);
        }

        return apiSuccess(result.data);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/v1/menu/:id
|--------------------------------------------------------------------------
*/

export async function DELETE(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        await requireRoleApi("ADMIN");

        const { id } = await params;

        const result = await deleteMenu(id);

        if (!result.success) {
            return apiSuccess(result, 422);
        }

        return apiSuccess(result.data);
    } catch (error) {
        return handleApiError(error);
    }
}