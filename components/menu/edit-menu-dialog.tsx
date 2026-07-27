"use client";

import { useEffect, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    getCategories,
} from "@/server/category";

import {
    getVariants,
    getMenuVariantsForReuse,
} from "@/server/variant";

import {
    getMenuById,
} from "@/server/menu";

import {
    EditMenuForm,
} from "./edit-menu-form";

import type {
    ReusableMenuVariant,
} from "./edit-menu-variant-list";

import type {
    Category,
    Menu,
    Variant,
} from "@/db/schema";


/*
|--------------------------------------------------------------------------
| MENU WITH RELATIONS
|--------------------------------------------------------------------------
|
| Data menu yang digunakan oleh halaman edit.
|
| Relasi:
|
| menu
| ├── category
| │
| └── menuVariants
|     └── variant
|
|--------------------------------------------------------------------------
*/

interface MenuWithRelations extends Menu {
    category: Category;
    menuVariants: Array<{
        id: string;
        menuId: string;
        variantId: string;
        price: number;
        available: boolean;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        variant: Variant;
    }>;
}


/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface Props {
    menuId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}


/*
|--------------------------------------------------------------------------
| EDIT MENU DIALOG
|--------------------------------------------------------------------------
*/

export function EditMenuDialog({
    menuId,
    open,
    onOpenChange,
}: Props) {

    /*
    |--------------------------------------------------------------------------
    | MENU
    |--------------------------------------------------------------------------
    */

    const [
        menu,
        setMenu,
    ] = useState<MenuWithRelations | null>(null);


    /*
    |--------------------------------------------------------------------------
    | CATEGORIES
    |--------------------------------------------------------------------------
    */

    const [
        categories,
        setCategories,
    ] = useState<Category[]>([]);


    /*
    |--------------------------------------------------------------------------
    | MASTER VARIANTS
    |--------------------------------------------------------------------------
    |
    | Semua master variant yang tersedia.
    |
    | Contoh:
    |
    | Small
    | Medium
    | Large
    |
    |--------------------------------------------------------------------------
    */

    const [
        variants,
        setVariants,
    ] = useState<Variant[]>([]);


    /*
    |--------------------------------------------------------------------------
    | REUSABLE MENU VARIANTS
    |--------------------------------------------------------------------------
    |
    | Berisi kombinasi:
    |
    | Variant + Harga + Menu asal
    |
    | Contoh:
    |
    | Thai Tea
    | Small - Rp7.000
    |
    | Kopi Susu
    | Small - Rp8.000
    |
    | Es Teh
    | Small - Rp5.000
    |
    | Data ini digunakan oleh:
    |
    | EditMenuVariantList
    |
    | untuk fitur:
    |
    | "Gunakan Variant yang Sudah Ada"
    |
    |--------------------------------------------------------------------------
    */

    const [
        reusableMenuVariants,
        setReusableMenuVariants,
    ] = useState<ReusableMenuVariant[]>([]);


    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    const [
        loading,
        setLoading,
    ] = useState(false);


    /*
    |--------------------------------------------------------------------------
    | LOAD DATA
    |--------------------------------------------------------------------------
    */

    async function loadData() {
        try {
            setLoading(true);

            /*
            |--------------------------------------------------------------------------
            | AMBIL SEMUA DATA YANG DIBUTUHKAN
            |--------------------------------------------------------------------------
            |
            | Semua request dijalankan secara paralel.
            |
            | 1. getMenuById
            |    Mengambil data menu yang sedang diedit.
            |
            | 2. getCategories
            |    Mengambil semua kategori.
            |
            | 3. getVariants
            |    Mengambil semua master variant.
            |
            | 4. getMenuVariantsForReuse
            |    Mengambil semua kombinasi MenuVariant
            |    yang dapat digunakan kembali.
            |
            |--------------------------------------------------------------------------
            */

            const [
                menuData,
                categoryData,
                variantData,
                reusableMenuVariantData,
            ] = await Promise.all([
                getMenuById(menuId),
                getCategories(),
                getVariants(),
                getMenuVariantsForReuse(),
            ]);


            /*
            |--------------------------------------------------------------------------
            | SET MENU
            |--------------------------------------------------------------------------
            */

            setMenu(
                menuData as MenuWithRelations | null
            );


            /*
            |--------------------------------------------------------------------------
            | SET CATEGORIES
            |--------------------------------------------------------------------------
            */

            setCategories(
                categoryData
            );


            /*
            |--------------------------------------------------------------------------
            | SET MASTER VARIANTS
            |--------------------------------------------------------------------------
            */

            setVariants(
                variantData
            );


            /*
            |--------------------------------------------------------------------------
            | SET REUSABLE MENU VARIANTS
            |--------------------------------------------------------------------------
            */

            setReusableMenuVariants(
                reusableMenuVariantData
            );

        } catch (error) {
            console.error(
                "Gagal mengambil data edit menu:",
                error
            );

            alert(
                "Gagal mengambil data menu."
            );

        } finally {
            setLoading(false);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | LOAD WHEN DIALOG OPEN
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        /*
        |--------------------------------------------------------------------------
        | JANGAN LOAD JIKA DIALOG TERTUTUP
        |--------------------------------------------------------------------------
        */

        if (!open || !menuId) {
            return;
        }


        /*
        |--------------------------------------------------------------------------
        | LOAD DATA
        |--------------------------------------------------------------------------
        */

        loadData();

    }, [
        open,
        menuId,
    ]);


    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    |
    | Setelah menu berhasil diperbarui:
    |
    | 1. Tutup dialog.
    |
    |--------------------------------------------------------------------------
    */

    function handleSuccess() {
        onOpenChange(false);
    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-hidden p-6">

                {/* DIALOG HEADER */}

                <DialogHeader>
                    <DialogTitle>
                        Edit Menu
                    </DialogTitle>

                    <DialogDescription>
                        Perbarui informasi menu, kategori, status, gambar, dan variant.
                    </DialogDescription>
                </DialogHeader>


                {/* DIALOG BODY */}

                <div className="min-w-0 max-h-[calc(90vh-8rem)] overflow-x-hidden overflow-y-auto pr-2">

                    {/* LOADING */}

                    {loading ? (
                        <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                            Memuat data menu...
                        </div>

                    ) : !menu ? (

                        /* MENU NOT FOUND */

                        <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                            Data menu tidak ditemukan.
                        </div>

                    ) : (

                        /* EDIT MENU FORM */

                        <EditMenuForm
                            menu={menu}
                            categories={categories}
                            variants={variants}
                            reusableMenuVariants={reusableMenuVariants}
                            onSuccess={handleSuccess}
                            onCancel={() =>
                                onOpenChange(false)
                            }
                        />

                    )}

                </div>

            </DialogContent>
        </Dialog>
    );
}