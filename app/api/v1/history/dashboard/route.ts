import { NextRequest } from "next/server";

import { getHistoryDashboard } from "@/server/history";
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
| GET /api/v1/history/dashboard?startDate=&endDate=
|--------------------------------------------------------------------------
|
| Menggabungkan summary + chart + revenueByUser + userMenuSales +
| topProducts dalam SATU response, cocok dipakai saat pertama kali
| screen "History" dibuka di Expo -- hemat round-trip dibanding
| manggil 5 endpoint terpisah.
|
| Response shape:
| {
|   summary: HistorySummary,
|   lineChart: HistoryLineChartItem[],
|   userRevenue: HistoryUserRevenueItem[],
|   userMenuSales: HistoryUserMenuSalesItem[],
|   topProducts: HistoryTopProductItem[]
| }
|
*/

export async function GET(request: NextRequest) {
    try {
        await requireRoleApi("ADMIN");

        const filters = parseHistoryFilters(request);

        const dashboard = await getHistoryDashboard(filters);

        return apiSuccess(dashboard);
    } catch (error) {
        return handleApiError(error);
    }
}