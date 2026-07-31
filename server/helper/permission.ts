import { redirect } from "next/navigation";

import {
    getCurrentUser,
    getSessionUser,
} from "@/server/users";

export type Role = "ADMIN" | "EMPLOYEE";


/*
|--------------------------------------------------------------------------
| REQUIRE ROLE
|--------------------------------------------------------------------------
|
| Memastikan user memiliki salah satu role
| yang diizinkan untuk mengakses halaman.
|
| Jika role tidak sesuai:
|
| redirect("/");
|
|--------------------------------------------------------------------------
*/

export async function requireRole(...roles: Role[]) {
    const user = await getCurrentUser();

    if (!roles.includes(user.role)) {
        redirect("/");
    }

    return user;
}


/*
|--------------------------------------------------------------------------
| REQUIRE ADMIN
|--------------------------------------------------------------------------
|
| Memastikan user yang sedang login adalah ADMIN.
|
| Jika bukan ADMIN:
|
| throw Error
|
|--------------------------------------------------------------------------
*/

export const requireAdmin = async () => {
    const currentUser = await getCurrentUser();

    if (currentUser.role !== "ADMIN") {
        throw new Error("Anda tidak memiliki akses.");
    }

    return currentUser;
};


/*
|--------------------------------------------------------------------------
| REDIRECT IF AUTHENTICATED
|--------------------------------------------------------------------------
|
| Jika user sudah login:
|
| redirect("/dashboard");
|
|--------------------------------------------------------------------------
*/

export async function redirectIfAuthenticated() {
    const user = await getSessionUser();

    if (user) {
        redirect("/dashboard");
    }
}


/*
|--------------------------------------------------------------------------
| GET CURRENT USER ROLE
|--------------------------------------------------------------------------
|
| Mengambil role user yang sedang login.
|
| Digunakan untuk kebutuhan UI seperti Sidebar.
|
| ADMIN:
| - Menu Admin tampil
| - Menu Kasir tampil
|
| EMPLOYEE:
| - Menu Admin disembunyikan
| - Menu Kasir tetap tampil
|
|--------------------------------------------------------------------------
*/

export async function getCurrentUserRole(): Promise<Role> {
    const user = await getCurrentUser();

    return user.role;
}