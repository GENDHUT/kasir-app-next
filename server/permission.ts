import { redirect } from "next/navigation";
import { getCurrentUser, getSessionUser } from "@/server/users";

type Role = "ADMIN" | "EMPLOYEE";

export async function requireRole(...roles: Role[]) {
    const user = await getCurrentUser();

    if (!roles.includes(user.role)) {
        redirect("/");
    }

    return user;
}

export async function redirectIfAuthenticated() {
    const user = await getSessionUser();

    if (user) {
        redirect("/dashboard");
    }
}

