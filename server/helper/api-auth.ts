import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

export type ApiRole = "ADMIN" | "EMPLOYEE";

/*
|--------------------------------------------------------------------------
| API ERROR
|--------------------------------------------------------------------------
|
| Dipakai untuk melempar error dengan status code HTTP yang jelas,
| supaya bisa ditangkap oleh handleApiError() dan diubah jadi
| response JSON yang konsisten.
|
*/

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}

/*
|--------------------------------------------------------------------------
| GET CURRENT USER (API VERSION)
|--------------------------------------------------------------------------
|
| Berbeda dari getCurrentUser() di server/users.ts:
|
| - TIDAK melakukan redirect().
| - Melempar ApiError(401) jika belum login.
|
| Session dibaca dari cookie/header request (better-auth otomatis
| membaca dari `headers()`). Untuk mobile (Expo), cookie ini nanti
| disimpan & dikirim otomatis oleh @better-auth/expo saat sudah
| diintegrasikan.
|
*/

export async function getCurrentUserApi() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new ApiError(401, "Anda belum login.");
    }

    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
    });

    if (!currentUser) {
        throw new ApiError(401, "User tidak ditemukan.");
    }

    return currentUser;
}

/*
|--------------------------------------------------------------------------
| REQUIRE ROLE (API VERSION)
|--------------------------------------------------------------------------
*/

export async function requireRoleApi(...roles: ApiRole[]) {
    const currentUser = await getCurrentUserApi();

    if (!roles.includes(currentUser.role as ApiRole)) {
        throw new ApiError(403, "Anda tidak memiliki akses untuk aksi ini.");
    }

    return currentUser;
}

export async function requireAdminApi() {
    return requireRoleApi("ADMIN");
}