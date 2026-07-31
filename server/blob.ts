import { del, put } from "@vercel/blob";

/*
|--------------------------------------------------------------------------
| IMAGE CONFIG
|--------------------------------------------------------------------------
*/

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

/*
|--------------------------------------------------------------------------
| VALIDATE IMAGE
|--------------------------------------------------------------------------
*/

function validateImage(file: File) {
    if (!(file instanceof File)) {
        throw new Error("File gambar tidak valid.");
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(
            "Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF."
        );
    }

    if (file.size > MAX_IMAGE_SIZE) {
        throw new Error("Ukuran gambar maksimal 5 MB.");
    }
}

/*
|--------------------------------------------------------------------------
| GET EXTENSION
|--------------------------------------------------------------------------
*/

function getExtension(file: File) {
    const extensionMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    };

    const extension = extensionMap[file.type];

    if (!extension) {
        throw new Error("Ekstensi gambar tidak valid.");
    }

    return extension;
}

/*
|--------------------------------------------------------------------------
| GENERATE FILE NAME
|--------------------------------------------------------------------------
*/

function generateFileName(
    folder: string,
    file: File
) {
    const extension = getExtension(file);

    return `${folder}/${crypto.randomUUID()}${extension}`;
}

/*
|--------------------------------------------------------------------------
| UPLOAD IMAGE
|--------------------------------------------------------------------------
|
| folder:
|
| menus
| category
| profile
| store
| dll
|
|--------------------------------------------------------------------------
*/

export async function uploadImage(
    file: File,
    folder: string
) {
    validateImage(file);

    const pathname = generateFileName(folder, file);

    const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false,
    });

    return {
        imageUrl: blob.url,
        pathname: blob.pathname,
    };
}

/*
|--------------------------------------------------------------------------
| DELETE IMAGE
|--------------------------------------------------------------------------
*/

export async function deleteImage(
    imageUrl?: string | null
) {
    if (!imageUrl) {
        return;
    }

    try {
        await del(imageUrl);
    } catch (error) {
        console.error(
            "Gagal menghapus gambar dari Blob:",
            error
        );
    }
}

/*
|--------------------------------------------------------------------------
| REPLACE IMAGE
|--------------------------------------------------------------------------
|
| Upload baru
| Hapus lama
|
|--------------------------------------------------------------------------
*/

export async function replaceImage(
    file: File,
    oldImageUrl?: string | null,
    folder = "menus"
) {
    const uploaded = await uploadImage(
        file,
        folder
    );

    if (
        oldImageUrl &&
        oldImageUrl !== uploaded.imageUrl
    ) {
        await deleteImage(oldImageUrl);
    }

    return uploaded;
}