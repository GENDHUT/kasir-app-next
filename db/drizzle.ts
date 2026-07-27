import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { schema } from "./schema";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL tidak ditemukan di environment variables.");
}

const client = postgres(connectionString, {
    prepare: false,
});

export const db = drizzle(client, {
    schema,
});