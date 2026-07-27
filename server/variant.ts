"use server";

import {
    asc,
    eq,
    sql,
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
| GET VARIANTS
|--------------------------------------------------------------------------
|
| Mengambil semua master variant.
|
| Contoh:
|
| Small
| Medium
| Large
|
| Data ini digunakan oleh:
|
| - VariantList
| - MenuForm
| - AddVariantDialog
| - Pemilih variant
|
|--------------------------------------------------------------------------
*/

export const getVariants = async () => {
    try {
        return await db.query.variant.findMany({
            orderBy: [
                asc(variant.name),
            ],
        });
    } catch (error) {
        console.error(
            "getVariants error:",
            error
        );

        return [];
    }
};

/*
|--------------------------------------------------------------------------
| GET VARIANT BY ID
|--------------------------------------------------------------------------
*/

export const getVariantById = async (
    id: string
) => {
    try {
        if (!id) {
            return null;
        }

        const result =
            await db.query.variant.findFirst({
                where: eq(
                    variant.id,
                    id
                ),
            });

        return result ?? null;
    } catch (error) {
        console.error(
            "getVariantById error:",
            error
        );

        return null;
    }
};

/*
|--------------------------------------------------------------------------
| GET VARIANTS WITH USAGE
|--------------------------------------------------------------------------
|
| Mengambil semua master variant sekaligus jumlah
| menu yang menggunakan variant tersebut.
|
| Contoh hasil:
|
| Small
| digunakan oleh 5 menu
|
| Medium
| digunakan oleh 3 menu
|
| Digunakan untuk UI admin agar dapat mengetahui
| variant yang masih digunakan.
|
|--------------------------------------------------------------------------
*/

export const getVariantsWithUsage = async () => {
    try {
        const result = await db
            .select({
                id: variant.id,
                name: variant.name,
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt,
                usageCount: sql<number>`
                    count(distinct ${menuVariant.menuId})
                `,
            })
            .from(variant)
            .leftJoin(
                menuVariant,
                eq(
                    variant.id,
                    menuVariant.variantId
                )
            )
            .groupBy(
                variant.id
            )
            .orderBy(
                asc(variant.name)
            );

        return result;
    } catch (error) {
        console.error(
            "getVariantsWithUsage error:",
            error
        );

        return [];
    }
};

/*
|--------------------------------------------------------------------------
| GET MENU VARIANTS FOR REUSE
|--------------------------------------------------------------------------
|
| Mengambil semua kombinasi MenuVariant yang pernah
| dibuat oleh admin.
|
| Contoh:
|
| Thai Tea
|   Small  -> 7000
|
| Kopi Susu
|   Small  -> 8000
|
| Es Teh
|   Small  -> 5000
|
| Data ini dapat digunakan ketika admin membuat
| menu baru.
|
| Admin dapat melihat:
|
| Small - Rp7.000
| Small - Rp8.000
| Small - Rp5.000
|
| Kemudian memilih salah satunya.
|
| Penting:
|
| Fungsi ini tidak mengubah master Variant.
|
| Variant tetap:
|
| Small
|
| Sedangkan harga tetap merupakan konfigurasi
| MenuVariant.
|
|--------------------------------------------------------------------------
*/

export const getMenuVariantsForReuse = async () => {
    try {
        const result =
            await db.query.menuVariant.findMany({
                with: {
                    variant: true,
                    menu: {
                        columns: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: [
                    asc(menuVariant.variantId),
                    asc(menuVariant.price),
                ],
            });

        return result;
    } catch (error) {
        console.error(
            "getMenuVariantsForReuse error:",
            error
        );

        return [];
    }
};

/*
|--------------------------------------------------------------------------
| GET MENU VARIANT BY VARIANT ID
|--------------------------------------------------------------------------
|
| Mengambil semua konfigurasi harga dari sebuah master
| variant.
|
| Contoh:
|
| Variant:
| Small
|
| Hasil:
|
| Small - Thai Tea - 7000
| Small - Kopi Susu - 8000
| Small - Es Teh - 5000
|
|--------------------------------------------------------------------------
*/

export const getMenuVariantsByVariantId = async (
    variantId: string
) => {
    try {
        if (!variantId) {
            return [];
        }

        return await db.query.menuVariant.findMany({
            where: eq(
                menuVariant.variantId,
                variantId
            ),
            with: {
                variant: true,
                menu: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                asc(menuVariant.price),
            ],
        });
    } catch (error) {
        console.error(
            "getMenuVariantsByVariantId error:",
            error
        );

        return [];
    }
};

/*
|--------------------------------------------------------------------------
| CREATE VARIANT
|--------------------------------------------------------------------------
|
| Membuat master variant baru.
|
| Contoh:
|
| Small
| Medium
| Large
|
| Harga TIDAK disimpan di sini.
|
|--------------------------------------------------------------------------
*/

export const createVariant = async (
    name: string
) => {
    try {
        await requireAdmin();

        const cleanName =
            name.trim();

        /*
        |----------------------------------------------------------------------
        | VALIDASI NAMA
        |----------------------------------------------------------------------
        */

        if (!cleanName) {
            return {
                success: false,
                message:
                    "Nama variant wajib diisi.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CEK DUPLIKAT
        |----------------------------------------------------------------------
        */

        const allVariants =
            await db.query.variant.findMany({
                columns: {
                    id: true,
                    name: true,
                },
            });

        const exists =
            allVariants.some(
                (item) =>
                    item.name
                        .trim()
                        .toLowerCase() ===
                    cleanName.toLowerCase()
            );

        if (exists) {
            return {
                success: false,
                message:
                    "Variant dengan nama tersebut sudah ada.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | INSERT
        |----------------------------------------------------------------------
        */

        const [
            created,
        ] = await db
            .insert(variant)
            .values({
                id:
                    crypto.randomUUID(),

                name:
                    cleanName,
            })
            .returning();

        if (!created) {
            return {
                success: false,
                message:
                    "Gagal membuat variant.",
            };
        }

        return {
            success: true,
            message:
                "Variant berhasil dibuat.",
            data:
                created,
        };
    } catch (error) {
        console.error(
            "createVariant error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal membuat variant.",
        };
    }
};

/*
|--------------------------------------------------------------------------
| CREATE MULTIPLE VARIANTS
|--------------------------------------------------------------------------
|
| Membuat beberapa master variant sekaligus.
|
|--------------------------------------------------------------------------
*/

export const createVariants = async (
    names: string[]
) => {
    try {
        await requireAdmin();

        /*
        |----------------------------------------------------------------------
        | VALIDASI INPUT
        |----------------------------------------------------------------------
        */

        if (
            !Array.isArray(names) ||
            names.length === 0
        ) {
            return {
                success: false,
                message:
                    "Minimal satu variant harus diisi.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CLEAN INPUT
        |----------------------------------------------------------------------
        */

        const cleanedNames =
            names
                .map(
                    (name) =>
                        name.trim()
                )
                .filter(
                    (name) =>
                        name.length > 0
                );

        if (
            cleanedNames.length === 0
        ) {
            return {
                success: false,
                message:
                    "Minimal satu variant harus diisi.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | HAPUS DUPLIKAT INPUT
        |----------------------------------------------------------------------
        */

        const uniqueNames: string[] =
            [];

        const inputNameSet =
            new Set<string>();

        for (
            const name
            of cleanedNames
        ) {
            const normalizedName =
                name.toLowerCase();

            if (
                inputNameSet.has(
                    normalizedName
                )
            ) {
                continue;
            }

            inputNameSet.add(
                normalizedName
            );

            uniqueNames.push(
                name
            );
        }

        /*
        |----------------------------------------------------------------------
        | AMBIL VARIANT EXISTING
        |----------------------------------------------------------------------
        */

        const existingVariants =
            await db.query.variant.findMany({
                columns: {
                    id: true,
                    name: true,
                },
            });

        const existingNameSet =
            new Set(
                existingVariants.map(
                    (item) =>
                        item.name
                            .trim()
                            .toLowerCase()
                )
            );

        /*
        |----------------------------------------------------------------------
        | FILTER VARIANT BARU
        |----------------------------------------------------------------------
        */

        const newNames =
            uniqueNames.filter(
                (name) =>
                    !existingNameSet.has(
                        name.toLowerCase()
                    )
            );

        /*
        |----------------------------------------------------------------------
        | SEMUA SUDAH ADA
        |----------------------------------------------------------------------
        */

        if (
            newNames.length === 0
        ) {
            return {
                success: false,
                message:
                    "Semua variant yang dimasukkan sudah tersedia.",
                data: [],
            };
        }

        /*
        |----------------------------------------------------------------------
        | INSERT BULK
        |----------------------------------------------------------------------
        */

        const createdVariants =
            await db
                .insert(variant)
                .values(
                    newNames.map(
                        (name) => ({
                            id:
                                crypto.randomUUID(),

                            name,
                        })
                    )
                )
                .returning();

        return {
            success: true,
            message:
                `${createdVariants.length} variant berhasil ditambahkan.`,
            data:
                createdVariants,
        };
    } catch (error) {
        console.error(
            "createVariants error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal menambahkan variant.",
        };
    }
};

/*
|--------------------------------------------------------------------------
| UPDATE VARIANT
|--------------------------------------------------------------------------
|
| Mengubah nama master variant.
|
| Contoh:
|
| Small -> Kecil
|
| Perubahan ini akan terlihat pada seluruh MenuVariant
| yang menggunakan master variant tersebut.
|
| Namun untuk HISTORY transaksi:
|
| Jangan mengambil nama langsung dari master variant.
|
| History nanti harus menyimpan snapshot:
|
| variantNameSnapshot
|
| sehingga transaksi lama tetap:
|
| Small
|
| walaupun master variant sekarang menjadi:
|
| Kecil
|
|--------------------------------------------------------------------------
*/

export const updateVariant = async (
    id: string,
    name: string
) => {
    try {
        await requireAdmin();

        /*
        |----------------------------------------------------------------------
        | VALIDASI ID
        |----------------------------------------------------------------------
        */

        if (!id) {
            return {
                success: false,
                message:
                    "ID variant tidak valid.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CEK EXISTING
        |----------------------------------------------------------------------
        */

        const existingVariant =
            await db.query.variant.findFirst({
                where: eq(
                    variant.id,
                    id
                ),
            });

        if (!existingVariant) {
            return {
                success: false,
                message:
                    "Variant tidak ditemukan.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CLEAN NAME
        |----------------------------------------------------------------------
        */

        const cleanName =
            name.trim();

        if (!cleanName) {
            return {
                success: false,
                message:
                    "Nama variant wajib diisi.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CEK DUPLIKAT
        |----------------------------------------------------------------------
        */

        const allVariants =
            await db.query.variant.findMany({
                columns: {
                    id: true,
                    name: true,
                },
            });

        const exists =
            allVariants.some(
                (item) =>
                    item.id !== id &&
                    item.name
                        .trim()
                        .toLowerCase() ===
                    cleanName.toLowerCase()
            );

        if (exists) {
            return {
                success: false,
                message:
                    "Variant dengan nama tersebut sudah ada.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | UPDATE
        |----------------------------------------------------------------------
        */

        const [
            updated,
        ] = await db
            .update(variant)
            .set({
                name:
                    cleanName,

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    variant.id,
                    id
                )
            )
            .returning();

        if (!updated) {
            return {
                success: false,
                message:
                    "Variant tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Variant berhasil diperbarui.",
            data:
                updated,
        };
    } catch (error) {
        console.error(
            "updateVariant error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal memperbarui variant.",
        };
    }
};

/*
|--------------------------------------------------------------------------
| DELETE VARIANT
|--------------------------------------------------------------------------
|
| Variant yang masih digunakan oleh MenuVariant
| tidak boleh dihapus.
|
| Ini menjaga integritas database.
|
| Jika variant tidak ingin digunakan lagi,
| lebih baik nanti kita tambahkan:
|
| available
|
| pada tabel variant.
|
|--------------------------------------------------------------------------
*/

export const deleteVariant = async (
    id: string
) => {
    try {
        await requireAdmin();

        /*
        |----------------------------------------------------------------------
        | VALIDASI ID
        |----------------------------------------------------------------------
        */

        if (!id) {
            return {
                success: false,
                message:
                    "ID variant tidak valid.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CEK EXISTING
        |----------------------------------------------------------------------
        */

        const existingVariant =
            await db.query.variant.findFirst({
                where: eq(
                    variant.id,
                    id
                ),
            });

        if (!existingVariant) {
            return {
                success: false,
                message:
                    "Variant tidak ditemukan.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | CEK PENGGUNAAN
        |----------------------------------------------------------------------
        */

        const usage =
            await db.query.menuVariant.findFirst({
                where: eq(
                    menuVariant.variantId,
                    id
                ),
                columns: {
                    id: true,
                    menuId: true,
                },
            });

        if (usage) {
            return {
                success: false,
                message:
                    "Variant tidak dapat dihapus karena masih digunakan oleh menu. Nonaktifkan variant jika sudah tidak ingin digunakan.",
            };
        }

        /*
        |----------------------------------------------------------------------
        | DELETE
        |----------------------------------------------------------------------
        */

        const [
            deleted,
        ] = await db
            .delete(variant)
            .where(
                eq(
                    variant.id,
                    id
                )
            )
            .returning();

        if (!deleted) {
            return {
                success: false,
                message:
                    "Variant tidak ditemukan.",
            };
        }

        return {
            success: true,
            message:
                "Variant berhasil dihapus.",
            data:
                deleted,
        };
    } catch (error) {
        console.error(
            "deleteVariant error:",
            error
        );

        return {
            success: false,
            message:
                "Gagal menghapus variant.",
        };
    }
};