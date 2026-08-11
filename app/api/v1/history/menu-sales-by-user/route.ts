import { NextRequest } from "next/server";

import { getHistoryUserMenuSales } from "@/server/history";
import { requireRoleApi } from "@/server/helper/api-auth";
import { parseHistoryFilters } from "@/lib/api/history-filters";
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
| GET /api/v1/history/menu-sales-by-user?startDate=&endDate=
|--------------------------------------------------------------------------
*/

export async function GET(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN");

        const filters = parseHistoryFilters(request);

        const data = await getHistoryUserMenuSales(filters);

        return apiSuccess(data);
    } catch (error) {
        return handleApiError(error);
    }
}