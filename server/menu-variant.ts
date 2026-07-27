"use server";

import {
    and,
    asc,
    eq,
} from "drizzle-orm";

import {
    db,
} from "@/db/drizzle";

import {
    menu,
    menuVariant,
    variant,
} from "@/db/schema";

import {
    requireAdmin,
} from "@/server/helper/permission";


/*
|--------------------------------------------------------------------------
| GET MENU VARIANTS
|--------------------------------------------------------------------------
|
| Mengambil semua variant yang digunakan oleh sebuah menu.
|
*/

export const getMenuVariants = async (
    menuId: string
) => {
    try {
        if (!menuId) {
            return [];
        }

        return await db.query.menuVariant.findMany({
            where: eq(
                menuVariant.menuId,
                menuId
            ),
            with: {
                variant: true,
            },
            orderBy: [
                asc(
                    menuVariant.sortOrder
                ),
            ],
        });
    }
    catch (error) {
        console.error(
            "getMenuVariants error:",
            error
        );

        return [];
    }
};


/*
|--------------------------------------------------------------------------
| GET MENU VARIANT BY ID
|--------------------------------------------------------------------------
|
| Mengambil satu konfigurasi variant menu.
|
*/

export const getMenuVariantById = async (
    id: string
) => {
    try {
        if (!id) {
            return null;
        }

        const result =
            await db.query.menuVariant.findFirst({
                where: eq(
                    menuVariant.id,
                    id
                ),
                with: {
                    variant: true,
                    menu: true,
                },
            });

        return result ?? null;
    }
    catch (error) {
        console.error(
            "getMenuVariantById error:",
            error
        );

        return null;
    }
};


/*
|--------------------------------------------------------------------------
| CREATE MENU VARIANT
|--------------------------------------------------------------------------
|
| Menambahkan master variant ke sebuah menu
| dengan harga khusus untuk menu tersebut.
|
| Contoh:
|
| Small
|
| Thai Tea
| -> Small = 7000
|
| Coffee
| -> Small = 5000
|
*/

export const createMenuVariant = async (
    menuId: string,
    variantId: string,
    price: number,
    available = true,
    sortOrder = 0
) => {
    try {
        await requireAdmin();

        /*
        |--------------------------------------------------------------------------
        | VALIDATE MENU ID
        |--------------------------------------------------------------------------
        */

        if (!menuId) {
            return {
                success: false,
                message:
                    "ID menu tidak valid.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE VARIANT ID
        |--------------------------------------------------------------------------
        */

        if (!variantId) {
            return {
                success: false,
                message:
                    "ID variant tidak valid.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE PRICE
        |--------------------------------------------------------------------------
        */

        if (
            !Number.isFinite(price) ||
            price <= 0
        ) {
            return {
                success: false,
                message:
                    "Harga variant harus lebih dari 0.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE MENU
        |--------------------------------------------------------------------------
        */

        const existingMenu =
            await db.query.menu.findFirst({
                where: eq(
                    menu.id,
                    menuId
                ),
                columns: {
                    id: true,
                },
            });

        if (!existingMenu) {
            return {
                success: false,
                message:
                    "Menu tidak ditemukan.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE VARIANT
        |--------------------------------------------------------------------------
        */

        const existingVariant =
            await db.query.variant.findFirst({
                where: eq(
                    variant.id,
                    variantId
                ),
                columns: {
                    id: true,
                },
            });

        if (!existingVariant) {
            return {
                success: false,
                message:
                    "Variant tidak ditemukan.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK DUPLICATE
        |--------------------------------------------------------------------------
        */

        const exists =
            await db.query.menuVariant.findFirst({
                where: and(
                    eq(
                        menuVariant.menuId,
                        menuId
                    ),
                    eq(
                        menuVariant.variantId,
                        variantId
                    )
                ),
                columns: {
                    id: true,
                },
            });

        if (exists) {
            return {
                success: false,
                message:
                    "Variant sudah digunakan pada menu ini.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | INSERT
        |--------------------------------------------------------------------------
        */

        const [
            created,
        ] = await db
            .insert(menuVariant)
            .values({
                id:
                    crypto.randomUUID(),

                menuId,

                variantId,

                price:
                    Math.round(price),

                available,

                sortOrder:
                    Math.max(
                        0,
                        Math.floor(sortOrder)
                    ),
            })
            .returning();

        if (!created) {
            return {
                success: false,
                message:
                    "Gagal menambahkan variant menu.",
            };
        }

        return {
            success: true,
            message:
                "Variant menu berhasil ditambahkan.",
            data:
                created,
        };
    }
    catch (error) {
        console.error(
            "createMenuVariant error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal menambahkan variant menu.",
        };
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE MENU VARIANT
|--------------------------------------------------------------------------
|
| Mengubah konfigurasi variant pada sebuah menu.
|
| Yang dapat diubah:
| - Harga
| - Status available
| - Urutan
|
*/

export const updateMenuVariant = async (
    id: string,
    price: number,
    available: boolean,
    sortOrder: number
) => {
    try {
        await requireAdmin();

        /*
        |--------------------------------------------------------------------------
        | VALIDATE ID
        |--------------------------------------------------------------------------
        */

        if (!id) {
            return {
                success: false,
                message:
                    "ID menu variant tidak valid.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE PRICE
        |--------------------------------------------------------------------------
        */

        if (
            !Number.isFinite(price) ||
            price <= 0
        ) {
            return {
                success: false,
                message:
                    "Harga variant harus lebih dari 0.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | UPDATE
        |--------------------------------------------------------------------------
        */

        const [
            updated,
        ] = await db
            .update(menuVariant)
            .set({
                price:
                    Math.round(price),

                available,

                sortOrder:
                    Math.max(
                        0,
                        Math.floor(sortOrder)
                    ),

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    menuVariant.id,
                    id
                )
            )
            .returning();

        if (!updated) {
            return {
                success: false,
                message:
                    "Variant menu tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Variant menu berhasil diperbarui.",
            data:
                updated,
        };
    }
    catch (error) {
        console.error(
            "updateMenuVariant error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal memperbarui variant menu.",
        };
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE PRICE
|--------------------------------------------------------------------------
*/

export const updateMenuVariantPrice = async (
    id: string,
    price: number
) => {
    try {
        await requireAdmin();

        if (!id) {
            return {
                success: false,
                message:
                    "ID menu variant tidak valid.",
            };
        }

        if (
            !Number.isFinite(price) ||
            price <= 0
        ) {
            return {
                success: false,
                message:
                    "Harga variant harus lebih dari 0.",
            };
        }

        const [
            updated,
        ] = await db
            .update(menuVariant)
            .set({
                price:
                    Math.round(price),

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    menuVariant.id,
                    id
                )
            )
            .returning();

        if (!updated) {
            return {
                success: false,
                message:
                    "Variant menu tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Harga variant berhasil diperbarui.",
            data:
                updated,
        };
    }
    catch (error) {
        console.error(
            "updateMenuVariantPrice error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal memperbarui harga.",
        };
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE AVAILABLE
|--------------------------------------------------------------------------
*/

export const updateMenuVariantAvailable = async (
    id: string,
    available: boolean
) => {
    try {
        await requireAdmin();

        if (!id) {
            return {
                success: false,
                message:
                    "ID menu variant tidak valid.",
            };
        }

        const [
            updated,
        ] = await db
            .update(menuVariant)
            .set({
                available,

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    menuVariant.id,
                    id
                )
            )
            .returning();

        if (!updated) {
            return {
                success: false,
                message:
                    "Variant menu tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Status variant berhasil diperbarui.",
            data:
                updated,
        };
    }
    catch (error) {
        console.error(
            "updateMenuVariantAvailable error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal memperbarui status variant.",
        };
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE SORT ORDER
|--------------------------------------------------------------------------
*/

export const updateMenuVariantSortOrder = async (
    id: string,
    sortOrder: number
) => {
    try {
        await requireAdmin();

        if (!id) {
            return {
                success: false,
                message:
                    "ID menu variant tidak valid.",
            };
        }

        if (
            !Number.isFinite(sortOrder) ||
            sortOrder < 0
        ) {
            return {
                success: false,
                message:
                    "Urutan variant tidak valid.",
            };
        }

        const [
            updated,
        ] = await db
            .update(menuVariant)
            .set({
                sortOrder:
                    Math.floor(sortOrder),

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    menuVariant.id,
                    id
                )
            )
            .returning();

        if (!updated) {
            return {
                success: false,
                message:
                    "Variant menu tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Urutan variant berhasil diperbarui.",
            data:
                updated,
        };
    }
    catch (error) {
        console.error(
            "updateMenuVariantSortOrder error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal memperbarui urutan variant.",
        };
    }
};


/*
|--------------------------------------------------------------------------
| DELETE MENU VARIANT
|--------------------------------------------------------------------------
*/

export const deleteMenuVariant = async (
    id: string
) => {
    try {
        await requireAdmin();

        if (!id) {
            return {
                success: false,
                message:
                    "ID menu variant tidak valid.",
            };
        }

        const [
            deleted,
        ] = await db
            .delete(menuVariant)
            .where(
                eq(
                    menuVariant.id,
                    id
                )
            )
            .returning();

        if (!deleted) {
            return {
                success: false,
                message:
                    "Variant menu tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Variant menu berhasil dihapus.",
            data:
                deleted,
        };
    }
    catch (error) {
        console.error(
            "deleteMenuVariant error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal menghapus variant menu.",
        };
    }
};