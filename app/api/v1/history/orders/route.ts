import { NextRequest } from "next/server";

import { getHistoryOrders } from "@/server/history";
import { requireRoleApi } from "@/server/helper/api-auth";
import {
    parseHistoryFilters,
    parseHistoryPagination,
} from "@/lib/api/history-filters";
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
| GET /api/v1/history/orders?page=1&limit=10&search=&startDate=&endDate=
|--------------------------------------------------------------------------
|
| Response:
| {
|   success: true,
|   data: {
|     data: HistoryOrder[],
|     pagination: { page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage }
|   }
| }
|
*/

export async function GET(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN");

        const dateFilters = parseHistoryFilters(request);
        const { page, limit, search } = parseHistoryPagination(request);

        const result = await getHistoryOrders({
            page,
            limit,
            search,
            ...dateFilters,
        });

        return apiSuccess(result);
    } catch (error) {
        return handleApiError(error);
    }
}