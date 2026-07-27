"use server";

import { db } from "@/db/drizzle";
import { category } from "@/db/schema";

import {
    asc,
    eq,
    sql,
} from "drizzle-orm";


/*
|--------------------------------------------------------------------------
| GET ALL CATEGORY
|--------------------------------------------------------------------------
*/

export async function getCategories() {
    const result = await db
        .select()
        .from(category)
        .orderBy(
            asc(category.name)
        );

    return result;
}


/*
|--------------------------------------------------------------------------
| CREATE CATEGORY
|--------------------------------------------------------------------------
*/

export async function createCategory(
    name: string
) {
    /*
    |--------------------------------------------------------------------------
    | CLEAN CATEGORY NAME
    |--------------------------------------------------------------------------
    */

    const cleanName = name.trim();


    /*
    |--------------------------------------------------------------------------
    | VALIDATE EMPTY NAME
    |--------------------------------------------------------------------------
    */

    if (!cleanName) {
        return {
            error: "Nama kategori wajib diisi",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE CATEGORY
    |--------------------------------------------------------------------------
    |
    | LOWER() membuat pengecekan tidak sensitif terhadap huruf besar/kecil.
    |
    | Contoh:
    |
    | Minuman
    | minuman
    | MINUMAN
    | MiNuMaN
    |
    | Semua dianggap kategori yang sama.
    |
    |--------------------------------------------------------------------------
    */

    const existing = await db
        .select()
        .from(category)
        .where(
            eq(
                sql`LOWER(${category.name})`,
                cleanName.toLowerCase()
            )
        )
        .limit(1);


    /*
    |--------------------------------------------------------------------------
    | PREVENT DUPLICATE
    |--------------------------------------------------------------------------
    */

    if (existing.length > 0) {
        return {
            error: "Kategori sudah ada",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE CATEGORY
    |--------------------------------------------------------------------------
    */

    const result = await db
        .insert(category)
        .values({
            id: crypto.randomUUID(),
            name: cleanName,
        })
        .returning();


    /*
    |--------------------------------------------------------------------------
    | RETURN RESULT
    |--------------------------------------------------------------------------
    */

    return {
        data: result[0],
    };
}