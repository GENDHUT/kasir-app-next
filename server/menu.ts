"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { category, menu, menuVariant, variant } from "@/db/schema";
import { requireAdmin } from "@/server/helper/permission";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface MenuVariantInput {
    variantId: string;
    price: number;
    available: boolean;
    sortOrder: number;
}

/*
|--------------------------------------------------------------------------
| IMAGE CONFIGURATION
|--------------------------------------------------------------------------
*/

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

const LOCAL_UPLOAD_DIRECTORY = path.join(
    process.cwd(),
    "public",
    "menus"
);

const LOCAL_IMAGE_URL_PREFIX = "/menus/";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
*/

function isLocalEnvironment() {
    return process.env.NODE_ENV !== "production";
}

/*
|--------------------------------------------------------------------------
| PARSE BOOLEAN
|--------------------------------------------------------------------------
*/

function parseBoolean(
    value: FormDataEntryValue | null
): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }

    return false;
}

/*
|--------------------------------------------------------------------------
| PARSE VARIANT AVAILABLE
|--------------------------------------------------------------------------
*/

function parseVariantAvailable(
    value: unknown
): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }

    return false;
}

/*
|--------------------------------------------------------------------------
| PARSE VARIANTS
|--------------------------------------------------------------------------
*/

function parseVariants(
    value: FormDataEntryValue | null
): MenuVariantInput[] {
    if (!value || typeof value !== "string") {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(
            (item: unknown, index: number) => {
                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return {
                        variantId: "",
                        price: NaN,
                        available: false,
                        sortOrder: index,
                    };
                }

                const data = item as {
                    variantId?: unknown;
                    price?: unknown;
                    available?: unknown;
                    sortOrder?: unknown;
                };

                const parsedSortOrder = Number(
                    data.sortOrder
                );

                return {
                    variantId:
                        typeof data.variantId === "string"
                            ? data.variantId
                            : "",

                    price: Number(data.price),

                    available:
                        parseVariantAvailable(
                            data.available
                        ),

                    sortOrder:
                        Number.isFinite(
                            parsedSortOrder
                        ) &&
                            parsedSortOrder >= 0
                            ? parsedSortOrder
                            : index,
                };
            }
        );
    } catch (error) {
        console.error(
            "Gagal membaca variants:",
            error
        );

        return [];
    }
}

/*
|--------------------------------------------------------------------------
| VALIDATE CATEGORY
|--------------------------------------------------------------------------
*/

async function validateCategory(
    categoryId: string
) {
    if (!categoryId) {
        return {
            valid: false,
            error: "Kategori menu wajib dipilih.",
        };
    }

    const existingCategory =
        await db.query.category.findFirst({
            where: eq(
                category.id,
                categoryId
            ),
            columns: {
                id: true,
            },
        });

    if (!existingCategory) {
        return {
            valid: false,
            error:
                "Kategori yang dipilih tidak ditemukan.",
        };
    }

    return {
        valid: true,
    };
}

/*
|--------------------------------------------------------------------------
| VALIDATE VARIANTS
|--------------------------------------------------------------------------
*/

async function validateVariants(
    variants: MenuVariantInput[]
) {
    if (variants.length === 0) {
        return {
            valid: false,
            error:
                "Menu harus memiliki minimal satu variant.",
        };
    }

    const variantIds = variants.map(
        (item) => item.variantId
    );

    /*
    |--------------------------------------------------------------------------
    | CHECK EMPTY VARIANT ID
    |--------------------------------------------------------------------------
    */

    if (
        variantIds.some(
            (id) => !id
        )
    ) {
        return {
            valid: false,
            error: "Variant tidak valid.",
        };
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE VARIANT
    |--------------------------------------------------------------------------
    */

    const uniqueVariantIds =
        new Set(variantIds);

    if (
        uniqueVariantIds.size !==
        variantIds.length
    ) {
        return {
            valid: false,
            error:
                "Variant yang sama tidak boleh ditambahkan lebih dari satu kali.",
        };
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK PRICE & SORT ORDER
    |--------------------------------------------------------------------------
    */

    for (const item of variants) {
        if (
            !Number.isFinite(item.price) ||
            item.price <= 0
        ) {
            return {
                valid: false,
                error:
                    "Harga variant harus lebih dari 0.",
            };
        }

        if (
            !Number.isFinite(
                item.sortOrder
            ) ||
            item.sortOrder < 0
        ) {
            return {
                valid: false,
                error:
                    "Urutan variant tidak valid.",
            };
        }
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK VARIANT EXISTENCE
    |--------------------------------------------------------------------------
    */

    const existingVariants =
        await db.query.variant.findMany({
            where: inArray(
                variant.id,
                variantIds
            ),
            columns: {
                id: true,
            },
        });

    if (
        existingVariants.length !==
        variantIds.length
    ) {
        return {
            valid: false,
            error:
                "Salah satu variant tidak ditemukan.",
        };
    }

    return {
        valid: true,
    };
}

/*
|--------------------------------------------------------------------------
| GET LOCAL IMAGE FILE PATH
|--------------------------------------------------------------------------
*/

function getLocalImageFilePath(
    imageUrl: string
) {
    const fileName =
        path.basename(imageUrl);

    return path.join(
        LOCAL_UPLOAD_DIRECTORY,
        fileName
    );
}

/*
|--------------------------------------------------------------------------
| DELETE LOCAL IMAGE
|--------------------------------------------------------------------------
*/

async function deleteLocalImage(
    imageUrl?: string | null
) {
    if (
        !imageUrl ||
        !imageUrl.startsWith(
            LOCAL_IMAGE_URL_PREFIX
        )
    ) {
        return;
    }

    try {
        const filePath =
            getLocalImageFilePath(
                imageUrl
            );

        await unlink(filePath);
    } catch (error: unknown) {
        const fileError =
            error as {
                code?: string;
            };

        if (
            fileError.code !==
            "ENOENT"
        ) {
            console.error(
                "Gagal menghapus gambar lokal:",
                error
            );
        }
    }
}

/*
|--------------------------------------------------------------------------
| SAVE LOCAL IMAGE
|--------------------------------------------------------------------------
*/

async function saveLocalImage(
    file: File
) {
    /*
    |--------------------------------------------------------------------------
    | VALIDATE FILE TYPE
    |--------------------------------------------------------------------------
    */

    if (
        !ALLOWED_IMAGE_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE FILE SIZE
    |--------------------------------------------------------------------------
    */

    if (
        file.size >
        MAX_IMAGE_SIZE
    ) {
        throw new Error(
            "Ukuran gambar maksimal 5 MB."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE DIRECTORY
    |--------------------------------------------------------------------------
    */

    await mkdir(
        LOCAL_UPLOAD_DIRECTORY,
        {
            recursive: true,
        }
    );

    /*
    |--------------------------------------------------------------------------
    | EXTENSION
    |--------------------------------------------------------------------------
    */

    const extensionMap: Record<
        string,
        string
    > = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    };

    const extension =
        extensionMap[file.type];

    if (!extension) {
        throw new Error(
            "Ekstensi gambar tidak valid."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE FILE NAME
    |--------------------------------------------------------------------------
    */

    const fileName =
        `${crypto.randomUUID()}${extension}`;

    const filePath =
        path.join(
            LOCAL_UPLOAD_DIRECTORY,
            fileName
        );

    /*
    |--------------------------------------------------------------------------
    | WRITE FILE
    |--------------------------------------------------------------------------
    */

    const bytes =
        await file.arrayBuffer();

    const buffer =
        Buffer.from(bytes);

    await writeFile(
        filePath,
        buffer
    );

    return {
        filePath,

        imageUrl:
            `${LOCAL_IMAGE_URL_PREFIX}${fileName}`,
    };
}

/*
|--------------------------------------------------------------------------
| SAVE IMAGE
|--------------------------------------------------------------------------
*/

async function saveImage(
    file: File
) {
    /*
    |--------------------------------------------------------------------------
    | LOCAL DEVELOPMENT
    |--------------------------------------------------------------------------
    */

    if (
        isLocalEnvironment()
    ) {
        return saveLocalImage(
            file
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCTION
    |--------------------------------------------------------------------------
    |
    | Untuk production nanti sebaiknya
    | menggunakan Cloudinary, Vercel Blob,
    | S3, atau storage lainnya.
    |
    |--------------------------------------------------------------------------
    */

    return {
        filePath: null,
        imageUrl: null,
    };
}

/*
|--------------------------------------------------------------------------
| CREATE MENU
|--------------------------------------------------------------------------
|
| CREATE MENU TIDAK MENGGUNAKAN TRANSACTION
|
| Karena aplikasi menggunakan neon-http.
| neon-http tidak mendukung db.transaction().
|
|--------------------------------------------------------------------------
*/

export const createMenu = async (
    formData: FormData
) => {
    let uploadedImagePath:
        string | null = null;

    try {
        /*
        |--------------------------------------------------------------------------
        | AUTHORIZATION
        |--------------------------------------------------------------------------
        */

        await requireAdmin();

        /*
        |--------------------------------------------------------------------------
        | GET FORM DATA
        |--------------------------------------------------------------------------
        */

        const categoryId =
            formData.get(
                "categoryId"
            );

        const name =
            formData.get(
                "name"
            );

        const description =
            formData.get(
                "description"
            );

        const available =
            parseBoolean(
                formData.get(
                    "available"
                )
            );

        const image =
            formData.get(
                "image"
            );

        const variants =
            parseVariants(
                formData.get(
                    "variants"
                )
            );

        /*
        |--------------------------------------------------------------------------
        | VALIDATE CATEGORY
        |--------------------------------------------------------------------------
        */

        if (
            !categoryId ||
            typeof categoryId !==
            "string"
        ) {
            return {
                success: false,
                error:
                    "Kategori menu wajib dipilih.",
            };
        }

        const categoryValidation =
            await validateCategory(
                categoryId
            );

        if (
            !categoryValidation.valid
        ) {
            return {
                success: false,
                error:
                    categoryValidation.error,
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE NAME
        |--------------------------------------------------------------------------
        */

        if (
            !name ||
            typeof name !==
            "string" ||
            !name.trim()
        ) {
            return {
                success: false,
                error:
                    "Nama menu wajib diisi.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE VARIANTS
        |--------------------------------------------------------------------------
        */

        const variantValidation =
            await validateVariants(
                variants
            );

        if (
            !variantValidation.valid
        ) {
            return {
                success: false,
                error:
                    variantValidation.error,
            };
        }

        /*
        |--------------------------------------------------------------------------
        | IMAGE
        |--------------------------------------------------------------------------
        */

        let imageUrl:
            string | null = null;

        if (
            image instanceof File &&
            image.size > 0
        ) {
            const uploaded =
                await saveImage(
                    image
                );

            uploadedImagePath =
                uploaded.filePath;

            imageUrl =
                uploaded.imageUrl;
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE MENU
        |--------------------------------------------------------------------------
        */

        const [createdMenu] =
            await db
                .insert(menu)
                .values({
                    id:
                        crypto.randomUUID(),

                    categoryId,

                    name:
                        name.trim(),

                    description:
                        typeof description ===
                            "string" &&
                            description.trim()
                            ? description.trim()
                            : null,

                    imageUrl,

                    available,
                })
                .returning();

        if (
            !createdMenu
        ) {
            throw new Error(
                "Gagal membuat menu."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE MENU VARIANTS
        |--------------------------------------------------------------------------
        */

        await db
            .insert(menuVariant)
            .values(
                variants.map(
                    (
                        item,
                        index
                    ) => ({
                        id:
                            crypto.randomUUID(),

                        menuId:
                            createdMenu.id,

                        variantId:
                            item.variantId,

                        price:
                            Math.round(
                                item.price
                            ),

                        available:
                            item.available,

                        sortOrder:
                            index,
                    })
                )
            );

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        return {
            success: true,

            message:
                "Menu berhasil dibuat.",

            data:
                createdMenu,
        };
    } catch (error) {
        console.error(
            "createMenu error:",
            error
        );

        /*
        |--------------------------------------------------------------------------
        | CLEANUP IMAGE
        |--------------------------------------------------------------------------
        */

        if (
            uploadedImagePath
        ) {
            try {
                await unlink(
                    uploadedImagePath
                );
            } catch (
            deleteError
            ) {
                console.error(
                    "Gagal menghapus gambar setelah create menu gagal:",
                    deleteError
                );
            }
        }

        return {
            success: false,

            error:
                error instanceof Error
                    ? error.message
                    : "Gagal membuat menu.",
        };
    }
};

/*
|--------------------------------------------------------------------------
| GET MENUS
|--------------------------------------------------------------------------
*/

export const getMenus =
    async () => {
        try {
            return await db.query.menu.findMany(
                {
                    with: {
                        category: true,

                        menuVariants: {
                            with: {
                                variant: true,
                            },

                            orderBy: [
                                asc(
                                    menuVariant.sortOrder
                                ),
                            ],
                        },
                    },

                    orderBy: [
                        asc(
                            menu.name
                        ),
                    ],
                }
            );
        } catch (error) {
            console.error(
                "getMenus error:",
                error
            );

            return [];
        }
    };

/*
|--------------------------------------------------------------------------
| GET MENU BY ID
|--------------------------------------------------------------------------
*/

export const getMenuById =
    async (
        id: string
    ) => {
        try {
            if (!id) {
                return null;
            }

            const result =
                await db.query.menu.findFirst(
                    {
                        where: eq(
                            menu.id,
                            id
                        ),

                        with: {
                            category: true,

                            menuVariants: {
                                with: {
                                    variant: true,
                                },

                                orderBy: [
                                    asc(
                                        menuVariant.sortOrder
                                    ),
                                ],
                            },
                        },
                    }
                );

            return (
                result ??
                null
            );
        } catch (error) {
            console.error(
                "getMenuById error:",
                error
            );

            return null;
        }
    };

/*
|--------------------------------------------------------------------------
| UPDATE MENU
|--------------------------------------------------------------------------
|
| PERUBAHAN PENTING:
|
| 1. Menu di-update.
|
| 2. MenuVariant yang masih ada di form:
|    -> UPDATE harga
|    -> UPDATE available
|    -> UPDATE sortOrder
|
| 3. MenuVariant baru:
|    -> INSERT
|
| 4. MenuVariant yang DIHAPUS dari form:
|    -> TIDAK DIHAPUS DARI DATABASE
|    -> available = false
|
| Tujuannya:
|
| Data master tetap terjaga.
| Variant lama tidak hilang secara permanen.
| History transaksi di masa depan tetap aman.
|
|--------------------------------------------------------------------------
*/

export const updateMenu =
    async (
        id: string,
        formData: FormData
    ) => {
        let uploadedImagePath:
            string | null = null;

        try {
            /*
            |--------------------------------------------------------------------------
            | AUTHORIZATION
            |--------------------------------------------------------------------------
            */

            await requireAdmin();

            /*
            |--------------------------------------------------------------------------
            | VALIDATE ID
            |--------------------------------------------------------------------------
            */

            if (!id) {
                return {
                    success: false,
                    error:
                        "ID menu tidak valid.",
                };
            }

            /*
            |--------------------------------------------------------------------------
            | GET EXISTING MENU
            |--------------------------------------------------------------------------
            */

            const existingMenu =
                await db.query.menu.findFirst(
                    {
                        where: eq(
                            menu.id,
                            id
                        ),
                    }
                );

            if (
                !existingMenu
            ) {
                return {
                    success: false,
                    error:
                        "Menu tidak ditemukan.",
                };
            }

            /*
            |--------------------------------------------------------------------------
            | GET FORM DATA
            |--------------------------------------------------------------------------
            */

            const categoryId =
                formData.get(
                    "categoryId"
                );

            const name =
                formData.get(
                    "name"
                );

            const description =
                formData.get(
                    "description"
                );

            const available =
                parseBoolean(
                    formData.get(
                        "available"
                    )
                );

            const image =
                formData.get(
                    "image"
                );

            const variants =
                parseVariants(
                    formData.get(
                        "variants"
                    )
                );

            /*
            |--------------------------------------------------------------------------
            | VALIDATE CATEGORY
            |--------------------------------------------------------------------------
            */

            if (
                !categoryId ||
                typeof categoryId !==
                "string"
            ) {
                return {
                    success: false,
                    error:
                        "Kategori menu wajib dipilih.",
                };
            }

            const categoryValidation =
                await validateCategory(
                    categoryId
                );

            if (
                !categoryValidation.valid
            ) {
                return {
                    success: false,
                    error:
                        categoryValidation.error,
                };
            }

            /*
            |--------------------------------------------------------------------------
            | VALIDATE NAME
            |--------------------------------------------------------------------------
            */

            if (
                !name ||
                typeof name !==
                "string" ||
                !name.trim()
            ) {
                return {
                    success: false,
                    error:
                        "Nama menu wajib diisi.",
                };
            }

            /*
            |--------------------------------------------------------------------------
            | VALIDATE VARIANTS
            |--------------------------------------------------------------------------
            */

            const variantValidation =
                await validateVariants(
                    variants
                );

            if (
                !variantValidation.valid
            ) {
                return {
                    success: false,
                    error:
                        variantValidation.error,
                };
            }

            /*
            |--------------------------------------------------------------------------
            | IMAGE
            |--------------------------------------------------------------------------
            */

            let imageUrl =
                existingMenu.imageUrl;

            let newImageUploaded =
                false;

            if (
                image instanceof File &&
                image.size > 0
            ) {
                const uploaded =
                    await saveImage(
                        image
                    );

                uploadedImagePath =
                    uploaded.filePath;

                /*
                |--------------------------------------------------------------------------
                | HANYA GANTI IMAGE URL
                | JIKA STORAGE MENGEMBALIKAN URL
                |--------------------------------------------------------------------------
                */

                if (
                    uploaded.imageUrl
                ) {
                    imageUrl =
                        uploaded.imageUrl;

                    newImageUploaded =
                        true;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | UPDATE MENU
            |--------------------------------------------------------------------------
            */

            const [updatedMenu] =
                await db
                    .update(menu)
                    .set({
                        categoryId,

                        name:
                            name.trim(),

                        description:
                            typeof description ===
                                "string" &&
                                description.trim()
                                ? description.trim()
                                : null,

                        imageUrl,

                        available,

                        updatedAt:
                            new Date(),
                    })
                    .where(
                        eq(
                            menu.id,
                            id
                        )
                    )
                    .returning();

            if (
                !updatedMenu
            ) {
                throw new Error(
                    "Gagal memperbarui menu."
                );
            }

            /*
            |--------------------------------------------------------------------------
            | GET EXISTING MENU VARIANTS
            |--------------------------------------------------------------------------
            */

            const existingMenuVariants =
                await db.query.menuVariant.findMany(
                    {
                        where:
                            eq(
                                menuVariant.menuId,
                                id
                            ),
                    }
                );

            /*
            |--------------------------------------------------------------------------
            | EXISTING VARIANT MAP
            |--------------------------------------------------------------------------
            */

            const existingVariantMap =
                new Map(
                    existingMenuVariants.map(
                        (
                            item
                        ) => [
                                item.variantId,
                                item,
                            ]
                    )
                );

            /*
            |--------------------------------------------------------------------------
            | INCOMING VARIANT IDS
            |--------------------------------------------------------------------------
            */

            const incomingVariantIds =
                new Set(
                    variants.map(
                        (
                            item
                        ) =>
                            item.variantId
                    )
                );

            /*
            |--------------------------------------------------------------------------
            | SOFT DISABLE REMOVED VARIANTS
            |--------------------------------------------------------------------------
            |
            | Variant yang tidak lagi dipilih
            | pada form edit tidak dihapus.
            |
            | Kita hanya mengubah:
            |
            | available = false
            |
            |--------------------------------------------------------------------------
            */

            const removedVariants =
                existingMenuVariants.filter(
                    (
                        item
                    ) =>
                        !incomingVariantIds.has(
                            item.variantId
                        )
                );

            for (
                const removedVariant
                of removedVariants
            ) {
                await db
                    .update(
                        menuVariant
                    )
                    .set({
                        available:
                            false,

                        updatedAt:
                            new Date(),
                    })
                    .where(
                        eq(
                            menuVariant.id,
                            removedVariant.id
                        )
                    );
            }

            /*
            |--------------------------------------------------------------------------
            | UPDATE OR INSERT VARIANTS
            |--------------------------------------------------------------------------
            */

            for (
                let index = 0;
                index <
                variants.length;
                index++
            ) {
                const item =
                    variants[index];

                /*
                |--------------------------------------------------------------------------
                | SAFETY CHECK
                |--------------------------------------------------------------------------
                */

                if (
                    !item
                ) {
                    continue;
                }

                const existingVariant =
                    existingVariantMap.get(
                        item.variantId
                    );

                /*
                |--------------------------------------------------------------------------
                | EXISTING VARIANT
                |--------------------------------------------------------------------------
                */

                if (
                    existingVariant
                ) {
                    await db
                        .update(
                            menuVariant
                        )
                        .set({
                            price:
                                Math.round(
                                    item.price
                                ),

                            available:
                                item.available,

                            sortOrder:
                                index,

                            updatedAt:
                                new Date(),
                        })
                        .where(
                            eq(
                                menuVariant.id,
                                existingVariant.id
                            )
                        );

                    continue;
                }

                /*
                |--------------------------------------------------------------------------
                | NEW VARIANT
                |--------------------------------------------------------------------------
                */

                await db
                    .insert(
                        menuVariant
                    )
                    .values({
                        id:
                            crypto.randomUUID(),

                        menuId:
                            id,

                        variantId:
                            item.variantId,

                        price:
                            Math.round(
                                item.price
                            ),

                        available:
                            item.available,

                        sortOrder:
                            index,
                    });
            }

            /*
            |--------------------------------------------------------------------------
            | DELETE OLD IMAGE
            |--------------------------------------------------------------------------
            |
            | Hanya hapus gambar lama setelah:
            |
            | 1. Gambar baru berhasil disimpan.
            | 2. Data menu berhasil diperbarui.
            |
            |--------------------------------------------------------------------------
            */

            if (
                newImageUploaded &&
                existingMenu.imageUrl &&
                existingMenu.imageUrl !==
                imageUrl
            ) {
                await deleteLocalImage(
                    existingMenu.imageUrl
                );
            }

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            return {
                success: true,

                message:
                    "Menu berhasil diperbarui.",

                data:
                    updatedMenu,
            };
        } catch (error) {
            console.error(
                "updateMenu error:",
                error
            );

            /*
            |--------------------------------------------------------------------------
            | CLEANUP NEW IMAGE
            |--------------------------------------------------------------------------
            */

            if (
                uploadedImagePath
            ) {
                try {
                    await unlink(
                        uploadedImagePath
                    );
                } catch (
                deleteError
                ) {
                    console.error(
                        "Gagal menghapus gambar baru:",
                        deleteError
                    );
                }
            }

            return {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memperbarui menu.",
            };
        }
    };

/*
|--------------------------------------------------------------------------
| UPDATE MENU AVAILABLE
|--------------------------------------------------------------------------
|
| Digunakan untuk:
|
| Menu tersedia:
| available = true
|
| Menu tidak dijual:
| available = false
|
| Data menu tetap ada.
|
|--------------------------------------------------------------------------
*/

export const updateMenuAvailable =
    async (
        id: string,
        available: boolean
    ) => {
        try {
            await requireAdmin();

            if (!id) {
                return {
                    success: false,
                    message:
                        "ID menu tidak valid.",
                };
            }

            const [updated] =
                await db
                    .update(menu)
                    .set({
                        available,

                        updatedAt:
                            new Date(),
                    })
                    .where(
                        eq(
                            menu.id,
                            id
                        )
                    )
                    .returning();

            if (
                !updated
            ) {
                return {
                    success: false,
                    message:
                        "Menu tidak ditemukan.",
                };
            }

            return {
                success: true,

                message:
                    "Status menu berhasil diperbarui.",

                data:
                    updated,
            };
        } catch (error) {
            console.error(
                "updateMenuAvailable error:",
                error
            );

            return {
                success: false,

                message:
                    "Gagal memperbarui status menu.",
            };
        }
    };

/*
|--------------------------------------------------------------------------
| DELETE MENU
|--------------------------------------------------------------------------
|
| CATATAN:
|
| Fitur ini tetap tersedia.
|
| Namun untuk sistem POS yang sudah memiliki
| history transaksi, saya menyarankan menggunakan
| updateMenuAvailable(id, false)
| daripada deleteMenu().
|
| Karena delete permanen dapat membuat data master
| hilang dan nantinya dapat menyulitkan analisis
| atau relasi data lama.
|
|--------------------------------------------------------------------------
*/

export const deleteMenu =
    async (
        id: string
    ) => {
        try {
            await requireAdmin();

            if (!id) {
                return {
                    success: false,
                    message:
                        "ID menu tidak valid.",
                };
            }

            const existingMenu =
                await db.query.menu.findFirst(
                    {
                        where: eq(
                            menu.id,
                            id
                        ),
                    }
                );

            if (
                !existingMenu
            ) {
                return {
                    success: false,
                    message:
                        "Menu tidak ditemukan.",
                };
            }

            const [deleted] =
                await db
                    .delete(menu)
                    .where(
                        eq(
                            menu.id,
                            id
                        )
                    )
                    .returning();

            if (
                !deleted
            ) {
                return {
                    success: false,
                    message:
                        "Menu tidak ditemukan.",
                };
            }

            /*
            |--------------------------------------------------------------------------
            | DELETE LOCAL IMAGE
            |--------------------------------------------------------------------------
            */

            if (
                deleted.imageUrl
            ) {
                await deleteLocalImage(
                    deleted.imageUrl
                );
            }

            return {
                success: true,

                message:
                    "Menu berhasil dihapus.",

                data:
                    deleted,
            };
        } catch (error) {
            console.error(
                "deleteMenu error:",
                error
            );

            return {
                success: false,

                message:
                    "Gagal menghapus menu.",
            };
        }
    };