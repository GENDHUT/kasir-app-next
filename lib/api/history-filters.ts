import { NextRequest } from "next/server";

export interface ParsedHistoryFilters {
    startDate?: Date;
    endDate?: Date;
}

/*
|--------------------------------------------------------------------------
| PARSE DATE FILTERS FROM QUERY STRING
|--------------------------------------------------------------------------
|
| Query yang didukung:
|
| ?startDate=2026-01-01
| ?endDate=2026-01-31
|
| Format bebas asal bisa di-parse oleh `new Date()`, contoh ISO string
| paling aman: "2026-01-01" atau "2026-01-01T00:00:00.000Z".
|
| Jika tidak dikirim atau invalid, field diabaikan (undefined) --
| artinya query history tidak difilter tanggal.
|
*/

export function parseHistoryFilters(
    request: NextRequest
): ParsedHistoryFilters {
    const startDateParam = request.nextUrl.searchParams.get("startDate");
    const endDateParam = request.nextUrl.searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    return {
        startDate:
            startDate && !Number.isNaN(startDate.getTime())
                ? startDate
                : undefined,

        endDate:
            endDate && !Number.isNaN(endDate.getTime())
                ? endDate
                : undefined,
    };
}

/*
|--------------------------------------------------------------------------
| PARSE PAGINATION FROM QUERY STRING
|--------------------------------------------------------------------------
|
| ?page=1&limit=10&search=budi
|
*/

export function parseHistoryPagination(request: NextRequest) {
    const pageParam = request.nextUrl.searchParams.get("page");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    const page = pageParam ? Number(pageParam) : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;

    return {
        page: page && Number.isFinite(page) ? page : undefined,
        limit: limit && Number.isFinite(limit) ? limit : undefined,
        search,
    };
}