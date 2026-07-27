"use client";

import {
    FormEvent,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    Input,
} from "@/components/ui/input";

import {
    Label,
} from "@/components/ui/label";

import {
    Textarea,
} from "@/components/ui/textarea";

import {
    Button,
} from "@/components/ui/button";

import {
    Switch,
} from "@/components/ui/switch";

import {
    CategorySearch,
} from "./category-search";

import {
    EditMenuVariantList,
    EditSelectedVariant,
} from "./edit-menu-variant-list";

import type {
    Category,
    Menu,
    Variant,
} from "@/db/schema";

import {
    updateMenu,
} from "@/server/menu";


/*
|--------------------------------------------------------------------------
| MENU WITH RELATIONS
|--------------------------------------------------------------------------
|
| Data menu lengkap yang digunakan oleh halaman edit.
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
| REUSABLE MENU VARIANT
|--------------------------------------------------------------------------
|
| Representasi kombinasi:
|
| Menu
| + Variant
| + Harga
|
| Contoh:
|
| Thai Tea
| Small
| Rp7.000
|
| Kopi Susu
| Small
| Rp5.000
|
|--------------------------------------------------------------------------
*/

interface ReusableMenuVariant {

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

    menu: MenuWithRelations;

    categories: Category[];

    variants: Variant[];

    /*
    |--------------------------------------------------------------------------
    | REUSABLE MENU VARIANTS
    |--------------------------------------------------------------------------
    |
    | Data kombinasi variant + harga yang pernah digunakan
    | oleh menu lain.
    |
    | Default [] digunakan agar tidak pernah undefined.
    |
    |--------------------------------------------------------------------------
    */

    reusableMenuVariants?: ReusableMenuVariant[];

    onSuccess?: () => void;

    onCancel?: () => void;

}


/*
|--------------------------------------------------------------------------
| EDIT MENU FORM
|--------------------------------------------------------------------------
*/

export function EditMenuForm({

    menu,

    categories,

    variants,

    /*
    |--------------------------------------------------------------------------
    | DEFAULT VALUE
    |--------------------------------------------------------------------------
    |
    | Jika EditMenuDialog belum mengirim reusableMenuVariants,
    | maka otomatis menggunakan array kosong.
    |
    | Ini mencegah error:
    |
    | Cannot read properties of undefined (reading 'filter')
    |
    |--------------------------------------------------------------------------
    */

    reusableMenuVariants = [],

    onSuccess,

    onCancel,

}: Props) {


    /*
    |--------------------------------------------------------------------------
    | FORM REF
    |--------------------------------------------------------------------------
    */

    const formRef =
        useRef<HTMLFormElement>(null);


    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    const [

        selectedCategory,

        setSelectedCategory,

    ] = useState<Category | null>(

        menu.category ?? null

    );


    /*
    |--------------------------------------------------------------------------
    | MENU NAME
    |--------------------------------------------------------------------------
    */

    const [

        name,

        setName,

    ] = useState(

        menu.name ?? ""

    );


    /*
    |--------------------------------------------------------------------------
    | DESCRIPTION
    |--------------------------------------------------------------------------
    */

    const [

        description,

        setDescription,

    ] = useState(

        menu.description ?? ""

    );


    /*
    |--------------------------------------------------------------------------
    | MENU AVAILABLE
    |--------------------------------------------------------------------------
    */

    const [

        available,

        setAvailable,

    ] = useState(

        Boolean(

            menu.available

        )

    );


    /*
    |--------------------------------------------------------------------------
    | IMAGE
    |--------------------------------------------------------------------------
    |
    | null
    | = tidak ada gambar baru.
    |
    | File
    | = admin memilih gambar baru.
    |
    |--------------------------------------------------------------------------
    */

    const [

        imageFile,

        setImageFile,

    ] = useState<File | null>(

        null

    );


    /*
    |--------------------------------------------------------------------------
    | MENU VARIANTS
    |--------------------------------------------------------------------------
    |
    | Variant yang sedang digunakan menu.
    |
    | Data awal diambil dari menu.menuVariants.
    |
    |--------------------------------------------------------------------------
    */

    const [

        menuVariants,

        setMenuVariants,

    ] = useState<EditSelectedVariant[]>(

        []

    );


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
    | INITIALIZE MENU VARIANTS
    |--------------------------------------------------------------------------
    |
    | Mengubah struktur database:
    |
    | menu.menuVariants
    |
    | menjadi:
    |
    | EditSelectedVariant[]
    |
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const initialVariants:
            EditSelectedVariant[] =

            [...(

                menu.menuVariants ?? []

            )]

                .sort(

                    (a, b) =>

                        a.sortOrder -

                        b.sortOrder

                )

                .map(

                    (item) => ({

                        variantId:

                            item.variantId,

                        price:

                            Number(

                                item.price

                            ),

                        available:

                            Boolean(

                                item.available

                            ),

                        sortOrder:

                            item.sortOrder,

                    })

                );


        setMenuVariants(

            initialVariants

        );

    }, [

        menu.menuVariants,

    ]);


    /*
    |--------------------------------------------------------------------------
    | IMAGE CHANGE
    |--------------------------------------------------------------------------
    */

    function handleImageChange(

        event: React.ChangeEvent<HTMLInputElement>

    ) {

        const file =

            event.target.files?.[0] ??

            null;


        setImageFile(

            file

        );

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

            alert(

                "Silakan pilih kategori menu."

            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | NAME VALIDATION
        |--------------------------------------------------------------------------
        */

        const cleanName =

            name.trim();


        if (!cleanName) {

            alert(

                "Nama menu wajib diisi."

            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | VARIANT VALIDATION
        |--------------------------------------------------------------------------
        */

        if (

            menuVariants.length === 0

        ) {

            alert(

                "Menu harus memiliki minimal satu variant."

            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | PRICE VALIDATION
        |--------------------------------------------------------------------------
        */

        const invalidVariant =

            menuVariants.find(

                (item) => {

                    const numericPrice =

                        Number(

                            item.price

                        );


                    return (

                        !Number.isFinite(

                            numericPrice

                        ) ||

                        numericPrice <= 0

                    );

                }

            );


        if (invalidVariant) {

            alert(

                "Semua variant harus memiliki harga lebih dari 0."

            );

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

        const variantIds =

            menuVariants.map(

                (item) =>

                    item.variantId

            );


        const uniqueVariantIds =

            new Set(

                variantIds

            );


        if (

            uniqueVariantIds.size !==

            variantIds.length

        ) {

            alert(

                "Variant yang sama tidak boleh digunakan lebih dari satu kali pada menu ini."

            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | SUBMIT
        |--------------------------------------------------------------------------
        */

        try {

            setLoading(

                true

            );


            /*
            |--------------------------------------------------------------------------
            | CREATE FORMDATA
            |--------------------------------------------------------------------------
            */

            const formData =

                new FormData();


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

                String(

                    available

                )

            );


            /*
            |--------------------------------------------------------------------------
            | IMAGE
            |--------------------------------------------------------------------------
            |
            | Hanya mengirim gambar jika admin memilih
            | file gambar baru.
            |
            | Jika tidak ada file baru:
            |
            | server mempertahankan gambar lama.
            |
            |--------------------------------------------------------------------------
            */

            if (

                imageFile

            ) {

                formData.append(

                    "image",

                    imageFile

                );

            }


            /*
            |--------------------------------------------------------------------------
            | VARIANTS
            |--------------------------------------------------------------------------
            */

            formData.append(

                "variants",

                JSON.stringify(

                    menuVariants.map(

                        (

                            item,

                            index

                        ) => ({

                            variantId:

                                item.variantId,

                            price:

                                Number(

                                    item.price

                                ),

                            available:

                                Boolean(

                                    item.available

                                ),

                            sortOrder:

                                index,

                        })

                    )

                )

            );


            /*
            |--------------------------------------------------------------------------
            | UPDATE MENU
            |--------------------------------------------------------------------------
            */

            const result =

                await updateMenu(

                    menu.id,

                    formData

                );


            /*
            |--------------------------------------------------------------------------
            | HANDLE ERROR
            |--------------------------------------------------------------------------
            */

            if (

                !result.success

            ) {

                alert(

                    result.error ??

                    "Gagal memperbarui menu."

                );

                return;

            }


            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            alert(

                "Menu berhasil diperbarui."

            );


            /*
            |--------------------------------------------------------------------------
            | CALLBACK SUCCESS
            |--------------------------------------------------------------------------
            */

            onSuccess?.();


        } catch (

        error

        ) {

            console.error(

                "update menu error:",

                error

            );


            alert(

                error instanceof Error

                    ? error.message

                    : "Terjadi kesalahan saat memperbarui menu."

            );


        } finally {

            setLoading(

                false

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | CANCEL
    |--------------------------------------------------------------------------
    */

    function handleCancel() {

        if (

            loading

        ) {

            return;

        }


        onCancel?.();

    }


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (

        <form

            ref={

                formRef

            }

            onSubmit={

                handleSubmit

            }

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

                    categories={

                        categories

                    }

                    value={

                        selectedCategory

                    }

                    onChange={

                        setSelectedCategory

                    }

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

                    value={

                        name

                    }

                    disabled={

                        loading

                    }

                    onChange={

                        (event) =>

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

                    value={

                        description

                    }

                    disabled={

                        loading

                    }

                    onChange={

                        (event) =>

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

                    disabled={

                        loading

                    }

                    onChange={

                        handleImageChange

                    }

                />


                {/* CURRENT IMAGE */}

                {menu.imageUrl &&

                    !imageFile && (

                        <div className="rounded-md border p-3">

                            <p className="text-sm text-muted-foreground">

                                Gambar saat ini:

                            </p>


                            <p className="mt-1 text-sm font-medium">

                                Gambar menu tersimpan

                            </p>


                            <p className="mt-1 text-xs text-muted-foreground">

                                Pilih file baru jika ingin mengganti gambar.

                            </p>

                        </div>

                    )}


                {/* NEW IMAGE */}

                {imageFile && (

                    <div className="space-y-1">

                        <p className="text-sm text-muted-foreground">

                            File baru:

                            {" "}

                            {imageFile.name}

                        </p>


                        <p className="text-xs text-muted-foreground">

                            Ukuran:

                            {" "}

                            {(

                                imageFile.size /

                                1024 /

                                1024

                            ).toFixed(

                                2

                            )}

                            {" "}

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

                        Nonaktifkan jika menu sedang tidak dijual.

                        Data menu tetap tersimpan.

                    </p>

                </div>


                <Switch

                    checked={

                        available

                    }

                    onCheckedChange={

                        setAvailable

                    }

                    disabled={

                        loading

                    }

                />

            </div>


            {/* ================================================================
                EDIT MENU VARIANTS
            ================================================================ */}

            <EditMenuVariantList

                masterVariants={

                    variants ?? []

                }

                selectedVariants={

                    menuVariants

                }

                reusableMenuVariants={

                    reusableMenuVariants

                }

                onChange={

                    setMenuVariants

                }

            />


            {/* ================================================================
                BUTTON
            ================================================================ */}

            <div className="flex justify-end gap-2">

                <Button

                    type="button"

                    variant="outline"

                    disabled={

                        loading

                    }

                    onClick={

                        handleCancel

                    }

                >

                    Batal

                </Button>


                <Button

                    type="submit"

                    disabled={

                        loading

                    }

                >

                    {loading

                        ? "Menyimpan..."

                        : "Simpan Perubahan"}

                </Button>

            </div>


        </form>

    );

}