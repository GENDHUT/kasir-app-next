import { NextRequest } from "next/server";

import { createMenu, getMenus } from "@/server/menu";
import { requireRoleApi } from "@/server/helper/api-auth";
import {
    apiSuccess,
    handleApiError,
    optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
    return optionsResponse();
}

/*
|--------------------------------------------------------------------------
| GET /api/v1/menu
|--------------------------------------------------------------------------
|
| List semua menu beserta kategori & variant-nya.
| Bisa diakses ADMIN maupun EMPLOYEE (kasir perlu lihat menu).
|
*/

export async function GET() {
    try {
        await requireRoleApi("ADMIN", "EMPLOYEE");

        const menus = await getMenus();

        return apiSuccess(menus);
    } catch (error) {
        return handleApiError(error);
    }
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/menu
|--------------------------------------------------------------------------
|
| Membuat menu baru. ADMIN only.
|
| Body: multipart/form-data, field sama persis dengan yang dipakai
| MenuForm di web:
|
| categoryId   (string)
| name         (string)
| description  (string)
| available    ("true" | "false")
| image        (File, optional)
| variants     (JSON string dari array {variantId, price, available, sortOrder})
|
| Dari Expo, gunakan FormData + fetch biasa (lihat contoh di akhir chat).
|
*/

export async function POST(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN");

        const formData = await request.formData();

        const result = await createMenu(formData);

        if (!result.success) {
            return apiSuccess(result, 422);
        }

        return apiSuccess(result.data, 201);
    } catch (error) {
        return handleApiError(error);
    }
}