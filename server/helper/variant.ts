/*
|--------------------------------------------------------------------------
| Normalize Variant Name
|--------------------------------------------------------------------------
|
| Membersihkan input user agar:
|
| " small "
| "SMALL"
| "small"
|
| menjadi format konsisten
|
|--------------------------------------------------------------------------
*/

export function normalizeVariantName(
    name: string
) {

    return name
        .trim()
        .toLowerCase();

}



/*
|--------------------------------------------------------------------------
| Format Variant Name
|--------------------------------------------------------------------------
|
| Mengubah tampilan menjadi Title Case
|
| small
| SMALL
|
| menjadi:
|
| Small
|
|--------------------------------------------------------------------------
*/

export function formatVariantName(
    name: string
) {

    return name
        .trim()
        .toLowerCase()
        .replace(
            /\b\w/g,
            (char) => char.toUpperCase()
        );

}