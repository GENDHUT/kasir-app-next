import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "./drizzle";
import { user } from "./schema";

import { auth } from "@/lib/auth";

async function seed() {
    console.log("🌱 Start seeding...");

    const email = process.env.ADMIN_EMAIL!;

    const admin = await db.query.user.findFirst({
        where: eq(user.email, email),
    });

    if (admin) {
        console.log("✅ Admin already exists.");
        process.exit(0);
    }

    console.log("👤 Creating admin account...");

    await auth.api.signUpEmail({
        body: {
            name: process.env.ADMIN_NAME!,
            email: process.env.ADMIN_EMAIL!,
            password: process.env.ADMIN_PASSWORD!,
            username: process.env.ADMIN_USERNAME!,
        },
    });

    await db
        .update(user)
        .set({
            role: "ADMIN",
        })
        .where(eq(user.email, email));

    console.log("✅ Admin created successfully.");

    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});