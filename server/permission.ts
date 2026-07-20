import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/users";

type Role = "ADMIN" | "EMPLOYEE";

export async function requireRole(...roles: Role[]) {
    const user = await getCurrentUser();

    if (!roles.includes(user.role)) {
        redirect("/");
    }

    return user;
}