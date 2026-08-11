import { NextResponse } from "next/server";

import { ApiError } from "@/server/helper/api-auth";

/*
|--------------------------------------------------------------------------
| CORS HEADERS
|--------------------------------------------------------------------------
|
| "*" dipakai sementara untuk development. Setelah domain API production
| fix, ganti dengan origin spesifik (atau biarkan "*" karena mobile app
| native tidak terikat CORS browser, CORS ini murni relevan kalau ada
| Expo Web / testing dari browser).
|
*/

export const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
    "Access-Control-Allow-Credentials": "true",
};

export function apiSuccess(data: unknown, status = 200) {
    return NextResponse.json(
        { success: true, data },
        { status, headers: CORS_HEADERS }
    );
}

export function apiError(message: string, status = 400) {
    return NextResponse.json(
        { success: false, error: message },
        { status, headers: CORS_HEADERS }
    );
}

export function handleApiError(error: unknown) {
    console.error("[API ERROR]", error);

    if (error instanceof ApiError) {
        return apiError(error.message, error.status);
    }

    if (error instanceof Error) {
        return apiError(error.message, 400);
    }

    return apiError("Terjadi kesalahan pada server.", 500);
}

export function optionsResponse() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}