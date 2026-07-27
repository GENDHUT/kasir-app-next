"use client";

import { useMemo, useState } from "react";

import {
    Plus,
    Trash2,
} from "lucide-react";

import {
    Badge,
} from "@/components/ui/badge";

import {
    Button,
} from "@/components/ui/button";

import {
    Input,
} from "@/components/ui/input";

import {
    Switch,
} from "@/components/ui/switch";

import type {
    Variant,
} from "@/db/schema";


/*
|--------------------------------------------------------------------------
| EDIT SELECTED VARIANT
|--------------------------------------------------------------------------
|
| Variant yang sedang digunakan oleh menu yang sedang diedit.
|
*/

export interface EditSelectedVariant {
    variantId: string;

    price: number;

    available: boolean;

    sortOrder: number;
}


/*
|--------------------------------------------------------------------------
| REUSABLE MENU VARIANT
|--------------------------------------------------------------------------
|
| Kombinasi:
|
| Variant + Harga
|
| yang pernah digunakan oleh menu lain.
|
| Contoh:
|
| Small
| Rp 7.000
| Pernah digunakan oleh Thai Tea
|
*/

export interface ReusableMenuVariant {
    id: string;

    variantId: string;

    price: number;

    variant: {
        id: string;

        name: string;
    };

    menu: {
        id: string;

        name: string;
    };
}


/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface Props {
    /*
    |--------------------------------------------------------------------------
    | MASTER VARIANTS
    |--------------------------------------------------------------------------
    |
    | Semua master variant yang tersedia di database.
    |
    */

    masterVariants: Variant[];


    /*
    |--------------------------------------------------------------------------
    | SELECTED VARIANTS
    |--------------------------------------------------------------------------
    |
    | Variant yang sedang digunakan oleh menu.
    |
    */

    selectedVariants: EditSelectedVariant[];


    /*
    |--------------------------------------------------------------------------
    | REUSABLE MENU VARIANTS
    |--------------------------------------------------------------------------
    |
    | Data kombinasi variant + harga dari menu lain.
    |
    */

    reusableMenuVariants: ReusableMenuVariant[];


    /*
    |--------------------------------------------------------------------------
    | ON CHANGE
    |--------------------------------------------------------------------------
    */

    onChange: (
        variants: EditSelectedVariant[]
    ) => void;


    /*
    |--------------------------------------------------------------------------
    | DISABLED
    |--------------------------------------------------------------------------
    |
    | Digunakan ketika form sedang submit.
    |
    */

    disabled?: boolean;
}


/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export function EditMenuVariantList({
    masterVariants,
    selectedVariants,
    reusableMenuVariants,
    onChange,
    disabled = false,
}: Props) {

    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [
        selectedReusableId,
        setSelectedReusableId,
    ] = useState<string>("");


    const [
        selectedNewVariantId,
        setSelectedNewVariantId,
    ] = useState<string>("");


    const [
        newVariantPrice,
        setNewVariantPrice,
    ] = useState<string>("");


    /*
    |--------------------------------------------------------------------------
    | SELECTED VARIANT IDS
    |--------------------------------------------------------------------------
    |
    | Digunakan untuk mengetahui master variant mana yang sedang
    | digunakan oleh menu.
    |
    */

    const selectedVariantIds = useMemo(
        () =>
            new Set(
                selectedVariants.map(
                    (item) =>
                        item.variantId
                )
            ),

        [
            selectedVariants,
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | AVAILABLE REUSABLE VARIANTS
    |--------------------------------------------------------------------------
    |
    | Hanya menampilkan reusable variant yang master variant-nya
    | BELUM sedang digunakan pada menu ini.
    |
    | Contoh:
    |
    | Menu sekarang:
    |
    | Small
    |
    | Maka reusable:
    |
    | Small - Rp 7.000
    |
    | tidak ditampilkan.
    |
    | Setelah Small dilepas:
    |
    | Small - Rp 7.000
    |
    | akan muncul kembali.
    |
    */

    const availableReusableVariants = useMemo(
        () => {

            return reusableMenuVariants.filter(
                (item) => {

                    const alreadyUsed =
                        selectedVariantIds.has(
                            item.variantId
                        );

                    return !alreadyUsed;
                }
            );
        },

        [
            reusableMenuVariants,
            selectedVariantIds,
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | AVAILABLE MASTER VARIANTS
    |--------------------------------------------------------------------------
    |
    | Master variant yang belum digunakan oleh menu saat ini.
    |
    */

    const availableMasterVariants = useMemo(
        () => {

            return masterVariants.filter(
                (item) =>
                    !selectedVariantIds.has(
                        item.id
                    )
            );
        },

        [
            masterVariants,
            selectedVariantIds,
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | SELECTED REUSABLE VARIANT
    |--------------------------------------------------------------------------
    */

    const selectedReusableVariant =
        reusableMenuVariants.find(
            (item) =>
                item.id ===
                selectedReusableId
        );


    /*
    |--------------------------------------------------------------------------
    | REMOVE VARIANT
    |--------------------------------------------------------------------------
    |
    | Melepas variant dari menu.
    |
    | Setelah dilepas:
    |
    | 1. Variant dihapus dari selectedVariants.
    | 2. Variant bisa digunakan kembali.
    | 3. Reusable variant dengan variantId yang sama
    |    akan muncul kembali.
    |
    */

    function handleRemoveVariant(
        variantId: string
    ) {

        if (disabled) {
            return;
        }


        const masterVariant =
            masterVariants.find(
                (item) =>
                    item.id ===
                    variantId
            );


        const confirmed =
            window.confirm(
                `Apakah kamu yakin ingin melepas variant "${masterVariant?.name ?? "ini"}" dari menu?`
            );


        if (!confirmed) {
            return;
        }


        const updatedVariants =
            selectedVariants
                .filter(
                    (item) =>
                        item.variantId !==
                        variantId
                )
                .map(
                    (
                        item,
                        index
                    ) => ({
                        ...item,

                        sortOrder:
                            index,
                    })
                );


        onChange(
            updatedVariants
        );


        /*
        |--------------------------------------------------------------------------
        | RESET REUSABLE SELECTION
        |--------------------------------------------------------------------------
        */

        setSelectedReusableId("");
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE PRICE
    |--------------------------------------------------------------------------
    */

    function handleUpdatePrice(
        variantId: string,
        value: string
    ) {

        if (disabled) {
            return;
        }


        const numericValue =
            Number(
                value
            );


        const updatedVariants =
            selectedVariants.map(
                (
                    item
                ) =>
                    item.variantId ===
                        variantId
                        ? {
                            ...item,

                            price:
                                value === ""
                                    ? 0
                                    : numericValue,
                        }
                        : item
            );


        onChange(
            updatedVariants
        );
    }


    /*
    |--------------------------------------------------------------------------
    | TOGGLE AVAILABLE
    |--------------------------------------------------------------------------
    */

    function handleToggleAvailable(
        variantId: string,
        available: boolean
    ) {

        if (disabled) {
            return;
        }


        const updatedVariants =
            selectedVariants.map(
                (
                    item
                ) =>
                    item.variantId ===
                        variantId
                        ? {
                            ...item,

                            available,
                        }
                        : item
            );


        onChange(
            updatedVariants
        );
    }


    /*
    |--------------------------------------------------------------------------
    | REUSE VARIANT
    |--------------------------------------------------------------------------
    |
    | Menggunakan kombinasi variant + harga yang sudah ada.
    |
    */

    function handleReuseVariant() {

        if (disabled) {
            return;
        }


        if (
            !selectedReusableVariant
        ) {

            alert(
                "Silakan pilih variant yang ingin digunakan."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | CEK DUPLIKAT VARIANT
        |--------------------------------------------------------------------------
        */

        if (
            selectedVariantIds.has(
                selectedReusableVariant.variantId
            )
        ) {

            alert(
                "Variant tersebut sudah digunakan pada menu ini."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | BUAT VARIANT BARU
        |--------------------------------------------------------------------------
        */

        const newVariant:
            EditSelectedVariant = {

            variantId:
                selectedReusableVariant.variantId,

            price:
                Number(
                    selectedReusableVariant.price
                ),

            available:
                true,

            sortOrder:
                selectedVariants.length,
        };


        onChange(
            [
                ...selectedVariants,
                newVariant,
            ]
        );


        /*
        |--------------------------------------------------------------------------
        | RESET SELECTION
        |--------------------------------------------------------------------------
        */

        setSelectedReusableId("");
    }


    /*
    |--------------------------------------------------------------------------
    | ADD NEW MASTER VARIANT
    |--------------------------------------------------------------------------
    |
    | Menambahkan master variant yang belum digunakan
    | dengan harga yang ditentukan admin.
    |
    */

    function handleAddNewVariant() {

        if (disabled) {
            return;
        }


        /*
        |--------------------------------------------------------------------------
        | VALIDATE VARIANT
        |--------------------------------------------------------------------------
        */

        if (
            !selectedNewVariantId
        ) {

            alert(
                "Silakan pilih variant."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | VALIDATE PRICE
        |--------------------------------------------------------------------------
        */

        if (
            !newVariantPrice.trim()
        ) {

            alert(
                "Harga variant wajib diisi."
            );

            return;
        }


        const numericPrice =
            Number(
                newVariantPrice
            );


        if (
            !Number.isFinite(
                numericPrice
            ) ||
            numericPrice <= 0
        ) {

            alert(
                "Harga variant harus lebih dari 0."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | CEK DUPLIKAT VARIANT
        |--------------------------------------------------------------------------
        */

        if (
            selectedVariantIds.has(
                selectedNewVariantId
            )
        ) {

            alert(
                "Variant tersebut sudah digunakan pada menu ini."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | BUAT VARIANT BARU
        |--------------------------------------------------------------------------
        */

        const newVariant:
            EditSelectedVariant = {

            variantId:
                selectedNewVariantId,

            price:
                numericPrice,

            available:
                true,

            sortOrder:
                selectedVariants.length,
        };


        /*
        |--------------------------------------------------------------------------
        | TAMBAHKAN
        |--------------------------------------------------------------------------
        */

        onChange(
            [
                ...selectedVariants,
                newVariant,
            ]
        );


        /*
        |--------------------------------------------------------------------------
        | RESET FORM
        |--------------------------------------------------------------------------
        */

        setSelectedNewVariantId("");

        setNewVariantPrice("");
    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="min-w-0 space-y-5">

            {/* ==============================================================
                CURRENT VARIANTS
            ============================================================== */}

            <div className="min-w-0 space-y-3">

                <div>
                    <h3 className="font-semibold">
                        Variant Menu
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        Edit harga, ubah status, atau lepas variant dari menu.
                    </p>
                </div>


                {selectedVariants.length === 0 ? (

                    <div className="min-w-0 rounded-lg border border-dashed p-6 text-center">

                        <p className="text-sm text-muted-foreground">
                            Belum ada variant untuk menu ini.
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Gunakan variant yang sudah ada atau tambahkan variant baru.
                        </p>

                    </div>

                ) : (

                    selectedVariants.map(
                        (
                            selectedVariant
                        ) => {

                            const masterVariant =
                                masterVariants.find(
                                    (
                                        item
                                    ) =>
                                        item.id ===
                                        selectedVariant.variantId
                                );


                            /*
                            |--------------------------------------------------------------------------
                            | JIKA MASTER VARIANT SUDAH TIDAK ADA
                            |--------------------------------------------------------------------------
                            */

                            if (
                                !masterVariant
                            ) {
                                return null;
                            }


                            return (

                                <div
                                    key={
                                        selectedVariant.variantId
                                    }
                                    className="min-w-0 rounded-lg border p-4"
                                >

                                    {/* HEADER */}

                                    <div className="flex min-w-0 items-start justify-between gap-4">

                                        <div className="min-w-0">

                                            <div className="flex min-w-0 flex-wrap items-center gap-2">

                                                <p className="break-words font-medium">
                                                    {
                                                        masterVariant.name
                                                    }
                                                </p>


                                                {selectedVariant.available ? (

                                                    <Badge>
                                                        Tersedia
                                                    </Badge>

                                                ) : (

                                                    <Badge
                                                        variant="secondary"
                                                    >
                                                        Tidak tersedia
                                                    </Badge>

                                                )}

                                            </div>


                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Variant yang sedang digunakan menu ini.
                                            </p>

                                        </div>


                                        <div className="flex shrink-0 items-center gap-2">

                                            <Switch
                                                checked={
                                                    selectedVariant.available
                                                }
                                                disabled={
                                                    disabled
                                                }
                                                onCheckedChange={(
                                                    checked
                                                ) =>
                                                    handleToggleAvailable(
                                                        selectedVariant.variantId,
                                                        checked
                                                    )
                                                }
                                            />


                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                disabled={
                                                    disabled
                                                }
                                                onClick={() =>
                                                    handleRemoveVariant(
                                                        selectedVariant.variantId
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>

                                        </div>

                                    </div>


                                    {/* PRICE */}

                                    <div className="mt-3 min-w-0 space-y-2">

                                        <p className="text-sm font-medium">
                                            Harga Variant
                                        </p>


                                        <Input
                                            type="number"
                                            min="1"
                                            value={
                                                selectedVariant.price
                                            }
                                            disabled={
                                                disabled
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleUpdatePrice(
                                                    selectedVariant.variantId,
                                                    event.target.value
                                                )
                                            }
                                            className="w-full min-w-0"
                                        />

                                    </div>

                                </div>

                            );
                        }
                    )

                )}

            </div>


            {/* ==============================================================
                REUSABLE VARIANTS
            ============================================================== */}

            <div className="min-w-0 rounded-lg border p-4">

                <div className="mb-4">

                    <p className="text-sm font-medium">
                        Gunakan Variant yang Sudah Ada
                    </p>


                    <p className="text-xs text-muted-foreground">
                        Pilih kombinasi variant dan harga yang pernah digunakan oleh menu lain.
                    </p>

                </div>


                {availableReusableVariants.length === 0 ? (

                    <div className="rounded-md bg-muted p-4">

                        <p className="text-sm text-muted-foreground">

                            {reusableMenuVariants.length === 0

                                ? "Belum ada variant dengan harga yang dapat digunakan kembali."

                                : "Semua variant yang tersedia sudah digunakan pada menu ini atau tidak sesuai."}

                        </p>

                    </div>

                ) : (

                    <div className="grid min-w-0 gap-2">

                        {availableReusableVariants.map(
                            (
                                item
                            ) => {

                                const isSelected =
                                    selectedReusableId ===
                                    item.id;


                                return (

                                    <button
                                        key={
                                            item.id
                                        }
                                        type="button"
                                        disabled={
                                            disabled
                                        }
                                        onClick={() =>
                                            setSelectedReusableId(
                                                isSelected
                                                    ? ""
                                                    : item.id
                                            )
                                        }
                                        className={`flex min-w-0 items-center justify-between gap-4 rounded-md border p-3 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${isSelected
                                                ? "border-primary bg-muted"
                                                : ""
                                            }`}
                                    >

                                        <div className="min-w-0">

                                            <p className="break-words font-medium">
                                                {
                                                    item.variant.name
                                                }
                                            </p>


                                            <p className="text-xs text-muted-foreground">
                                                Pernah digunakan oleh:{" "}
                                                {
                                                    item.menu.name
                                                }
                                            </p>

                                        </div>


                                        <div className="flex shrink-0 items-center gap-3">

                                            <span className="text-sm font-semibold">
                                                Rp{" "}
                                                {Number(
                                                    item.price
                                                ).toLocaleString(
                                                    "id-ID"
                                                )}
                                            </span>


                                            {isSelected && (

                                                <Badge>
                                                    Dipilih
                                                </Badge>

                                            )}

                                        </div>

                                    </button>

                                );
                            }
                        )}


                        <Button
                            type="button"
                            className="mt-2 w-full"
                            disabled={
                                disabled ||
                                !selectedReusableId
                            }
                            onClick={
                                handleReuseVariant
                            }
                        >

                            <Plus className="mr-2 h-4 w-4" />

                            Gunakan Variant Terpilih

                        </Button>

                    </div>

                )}

            </div>


            {/* ==============================================================
                ADD NEW VARIANT
            ============================================================== */}

            <div className="min-w-0 rounded-lg border p-4">

                <div className="mb-4">

                    <p className="text-sm font-medium">
                        Tambahkan Variant Lain
                    </p>


                    <p className="text-xs text-muted-foreground">
                        Pilih master variant yang belum digunakan pada menu ini dan tentukan harga baru.
                    </p>

                </div>


                {availableMasterVariants.length === 0 ? (

                    <div className="rounded-md bg-muted p-4">

                        <p className="text-sm text-muted-foreground">
                            Semua master variant sudah digunakan pada menu ini.
                        </p>

                    </div>

                ) : (

                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">

                        {/* VARIANT */}

                        <select
                            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            value={
                                selectedNewVariantId
                            }
                            disabled={
                                disabled
                            }
                            onChange={(
                                event
                            ) =>
                                setSelectedNewVariantId(
                                    event.target.value
                                )
                            }
                        >

                            <option value="">
                                Pilih Variant
                            </option>


                            {availableMasterVariants.map(
                                (
                                    item
                                ) => (

                                    <option
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.name
                                        }
                                    </option>

                                )
                            )}

                        </select>


                        {/* PRICE */}

                        <Input
                            type="number"
                            min="1"
                            placeholder="Harga"
                            value={
                                newVariantPrice
                            }
                            disabled={
                                disabled
                            }
                            onChange={(
                                event
                            ) =>
                                setNewVariantPrice(
                                    event.target.value
                                )
                            }
                            className="w-full min-w-0"
                        />


                        {/* ADD */}

                        <Button
                            type="button"
                            className="shrink-0"
                            disabled={
                                disabled
                            }
                            onClick={
                                handleAddNewVariant
                            }
                        >

                            <Plus className="mr-2 h-4 w-4" />

                            Tambah

                        </Button>

                    </div>

                )}

            </div>

        </div>
    );
}