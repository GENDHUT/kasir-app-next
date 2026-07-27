"use client";

import { FormEvent, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CategorySearch } from "./category-search";
import { VariantList, SelectedVariant } from "./variant-list";
import type { Category, Variant } from "@/db/schema";
import { createMenu } from "@/server/menu";

/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface Props {
    categories: Category[];
    variants: Variant[];
    onSuccess?: () => void;
}

/*
|--------------------------------------------------------------------------
| MENU FORM
|--------------------------------------------------------------------------
*/

export function MenuForm({
    categories,
    variants,
    onSuccess,
}: Props) {
    /*
    |--------------------------------------------------------------------------
    | FORM REF
    |--------------------------------------------------------------------------
    */

    const formRef = useRef<HTMLFormElement>(null);

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(
        null
    );

    /*
    |--------------------------------------------------------------------------
    | MENU DATA
    |--------------------------------------------------------------------------
    */

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [available, setAvailable] = useState(true);

    /*
    |--------------------------------------------------------------------------
    | IMAGE
    |--------------------------------------------------------------------------
    */

    const [imageFile, setImageFile] = useState<File | null>(null);

    /*
    |--------------------------------------------------------------------------
    | MENU VARIANTS
    |--------------------------------------------------------------------------
    */

    const [menuVariants, setMenuVariants] = useState<SelectedVariant[]>([]);

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    const [loading, setLoading] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | IMAGE CHANGE
    |--------------------------------------------------------------------------
    */

    function handleImageChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0] ?? null;

        setImageFile(file);
    }

    /*
    |--------------------------------------------------------------------------
    | RESET FORM
    |--------------------------------------------------------------------------
    */

    function resetForm() {
        setSelectedCategory(null);
        setName("");
        setDescription("");
        setAvailable(true);
        setImageFile(null);
        setMenuVariants([]);

        formRef.current?.reset();
    }

    /*
    |--------------------------------------------------------------------------
    | SUBMIT
    |--------------------------------------------------------------------------
    */

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        /*
        |--------------------------------------------------------------------------
        | CATEGORY VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!selectedCategory) {
            alert("Silakan pilih kategori menu.");
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | NAME VALIDATION
        |--------------------------------------------------------------------------
        */

        const cleanName = name.trim();

        if (!cleanName) {
            alert("Nama menu wajib diisi.");
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | VARIANT VALIDATION
        |--------------------------------------------------------------------------
        */

        if (menuVariants.length === 0) {
            alert("Tambahkan minimal satu variant.");
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | PRICE VALIDATION
        |--------------------------------------------------------------------------
        */

        const invalidVariant = menuVariants.find((item) => {
            const numericPrice = Number(item.price);

            return (
                !Number.isFinite(numericPrice) ||
                numericPrice <= 0
            );
        });

        if (invalidVariant) {
            alert("Semua variant harus memiliki harga lebih dari 0.");
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | DUPLICATE VARIANT VALIDATION
        |--------------------------------------------------------------------------
        |
        | Satu master variant tidak boleh digunakan
        | dua kali dalam satu menu.
        |
        |--------------------------------------------------------------------------
        */

        const variantIds = menuVariants.map(
            (item) => item.variantId
        );

        const uniqueVariantIds = new Set(variantIds);

        if (uniqueVariantIds.size !== variantIds.length) {
            alert(
                "Variant yang sama tidak boleh ditambahkan lebih dari satu kali."
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE MENU
        |--------------------------------------------------------------------------
        */

        try {
            setLoading(true);

            /*
            |--------------------------------------------------------------------------
            | CREATE NATIVE FORMDATA
            |--------------------------------------------------------------------------
            |
            | Server Action createMenu menerima:
            |
            | createMenu(formData: FormData)
            |
            |--------------------------------------------------------------------------
            */

            const formData = new FormData();

            /*
            |--------------------------------------------------------------------------
            | CATEGORY
            |--------------------------------------------------------------------------
            */

            formData.append(
                "categoryId",
                selectedCategory.id
            );

            /*
            |--------------------------------------------------------------------------
            | NAME
            |--------------------------------------------------------------------------
            */

            formData.append(
                "name",
                cleanName
            );

            /*
            |--------------------------------------------------------------------------
            | DESCRIPTION
            |--------------------------------------------------------------------------
            */

            formData.append(
                "description",
                description.trim()
            );

            /*
            |--------------------------------------------------------------------------
            | AVAILABLE
            |--------------------------------------------------------------------------
            */

            formData.append(
                "available",
                String(available)
            );

            /*
            |--------------------------------------------------------------------------
            | IMAGE
            |--------------------------------------------------------------------------
            |
            | Jika user memilih gambar, File asli
            | akan dikirim ke Server Action.
            |--------------------------------------------------------------------------
            */

            if (imageFile) {
                formData.append(
                    "image",
                    imageFile
                );
            }

            /*
            |--------------------------------------------------------------------------
            | VARIANTS
            |--------------------------------------------------------------------------
            |
            | Server Action membaca variants
            | sebagai JSON string.
            |--------------------------------------------------------------------------
            */

            formData.append(
                "variants",
                JSON.stringify(
                    menuVariants.map((item, index) => ({
                        variantId: item.variantId,
                        price: Number(item.price),
                        available: Boolean(item.available),
                        sortOrder: index,
                    }))
                )
            );

            /*
            |--------------------------------------------------------------------------
            | DEBUG
            |--------------------------------------------------------------------------
            */

            console.log(
                "Mengirim data menu..."
            );

            /*
            |--------------------------------------------------------------------------
            | CREATE MENU
            |--------------------------------------------------------------------------
            */

            const result = await createMenu(
                formData
            );

            /*
            |--------------------------------------------------------------------------
            | HANDLE ERROR
            |--------------------------------------------------------------------------
            */

            if (!result.success) {
                alert(
                    result.error ??
                    "Gagal membuat menu."
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            alert(
                "Menu berhasil dibuat."
            );

            /*
            |--------------------------------------------------------------------------
            | RESET FORM
            |--------------------------------------------------------------------------
            */

            resetForm();

            /*
            |--------------------------------------------------------------------------
            | CALLBACK SUCCESS
            |--------------------------------------------------------------------------
            |
            | Memberitahu AddMenuDialog bahwa menu berhasil dibuat.
            |
            | AddMenuDialog kemudian dapat menutup dialog.
            |
            |--------------------------------------------------------------------------
            */

            onSuccess?.();

        } catch (error) {
            console.error(
                "create menu error:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat membuat menu."
            );

        } finally {
            setLoading(false);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {/* ================================================================
                CATEGORY
            ================================================================ */}

            <div className="space-y-2">
                <Label>
                    Kategori
                </Label>

                <CategorySearch
                    categories={categories}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                />
            </div>

            {/* ================================================================
                NAME
            ================================================================ */}

            <div className="space-y-2">
                <Label>
                    Nama Menu
                </Label>

                <Input
                    placeholder="Contoh: Thai Tea"
                    value={name}
                    disabled={loading}
                    onChange={(event) =>
                        setName(
                            event.target.value
                        )
                    }
                />
            </div>

            {/* ================================================================
                DESCRIPTION
            ================================================================ */}

            <div className="space-y-2">
                <Label>
                    Deskripsi
                </Label>

                <Textarea
                    placeholder="Deskripsi menu..."
                    value={description}
                    disabled={loading}
                    onChange={(event) =>
                        setDescription(
                            event.target.value
                        )
                    }
                />
            </div>

            {/* ================================================================
                IMAGE
            ================================================================ */}

            <div className="space-y-2">
                <Label>
                    Gambar Menu
                </Label>

                <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={loading}
                    onChange={handleImageChange}
                />

                {imageFile && (
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            File dipilih:{" "}
                            {imageFile.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                            Ukuran:{" "}
                            {(
                                imageFile.size /
                                1024 /
                                1024
                            ).toFixed(2)}{" "}
                            MB
                        </p>
                    </div>
                )}
            </div>

            {/* ================================================================
                MENU STATUS
            ================================================================ */}

            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <Label>
                        Status Menu
                    </Label>

                    <p className="text-sm text-muted-foreground">
                        Menu tersedia untuk kasir.
                    </p>
                </div>

                <Switch
                    checked={available}
                    onCheckedChange={setAvailable}
                    disabled={loading}
                />
            </div>

            {/* ================================================================
                MENU VARIANTS
            ================================================================ */}

            <VariantList
                masterVariants={variants}
                selectedVariants={menuVariants}
                onChange={setMenuVariants}
            />

            {/* ================================================================
                BUTTON
            ================================================================ */}

            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={resetForm}
                >
                    Batal
                </Button>

                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Menyimpan..."
                        : "Simpan Menu"}
                </Button>
            </div>
        </form>
    );
}
