"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import type { Variant } from "@/db/schema";

import { getMenuVariantsForReuse } from "@/server/variant";

import { AddMasterVariantDialog } from "./add-master-variant-dialog";

export interface SelectedVariant {
    variantId: string;
    price: number;
    available: boolean;
    sortOrder: number;
}

interface ReusableMenuVariant {
    id: string;
    menuId: string;
    variantId: string;
    price: number;
    available: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    variant: Variant;
    menu: {
        id: string;
        name: string;
    };
}

interface Props {
    masterVariants: Variant[];
    selectedVariants: SelectedVariant[];
    onChange: (variants: SelectedVariant[]) => void;
}

export function VariantList({
    masterVariants: initialMasterVariants,
    selectedVariants,
    onChange,
}: Props) {
    const [masterVariants, setMasterVariants] = useState<Variant[]>(
        initialMasterVariants
    );

    const [reusableMenuVariants, setReusableMenuVariants] =
        useState<ReusableMenuVariant[]>([]);

    const [loadingReusableVariants, setLoadingReusableVariants] =
        useState(true);

    const [search, setSearch] = useState("");
    const [selectedVariantId, setSelectedVariantId] = useState("");
    const [price, setPrice] = useState("");
    const [selectedReusableId, setSelectedReusableId] = useState("");
    const [addVariantOpen, setAddVariantOpen] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | LOAD REUSABLE MENU VARIANTS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        async function loadReusableMenuVariants() {
            try {
                setLoadingReusableVariants(true);

                const data = await getMenuVariantsForReuse();

                setReusableMenuVariants(data as ReusableMenuVariant[]);
            } catch (error) {
                console.error(
                    "Gagal mengambil variant yang dapat digunakan kembali:",
                    error
                );
            } finally {
                setLoadingReusableVariants(false);
            }
        }

        loadReusableMenuVariants();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | SELECTED VARIANT IDS
    |--------------------------------------------------------------------------
    |
    | Satu master variant hanya boleh digunakan satu kali
    | dalam satu menu.
    |
    | Contoh:
    |
    | Small -> Rp7.000
    |
    | Tidak boleh:
    |
    | Small -> Rp7.000
    | Small -> Rp8.000
    |
    | dalam menu yang sama.
    |
    |--------------------------------------------------------------------------
    */

    const selectedVariantIds = useMemo(
        () => new Set(selectedVariants.map((item) => item.variantId)),
        [selectedVariants]
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER MASTER VARIANTS
    |--------------------------------------------------------------------------
    */

    const availableMasterVariants = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return masterVariants
            .filter((item) => !selectedVariantIds.has(item.id))
            .filter(
                (item) =>
                    !keyword ||
                    item.name.toLowerCase().includes(keyword)
            );
    }, [masterVariants, selectedVariantIds, search]);

    /*
    |--------------------------------------------------------------------------
    | FILTER REUSABLE VARIANTS
    |--------------------------------------------------------------------------
    |
    | Hanya menampilkan variant + harga yang belum digunakan
    | pada menu saat ini.
    |
    |--------------------------------------------------------------------------
    */

    const availableReusableVariants = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        const uniqueMap = new Map<string, ReusableMenuVariant>();

        for (const item of reusableMenuVariants) {
            if (selectedVariantIds.has(item.variantId)) {
                continue;
            }

            const key = `${item.variantId}-${item.price}`;

            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        }

        return Array.from(uniqueMap.values()).filter((item) => {
            if (!keyword) {
                return true;
            }

            const variantName = item.variant.name.toLowerCase();
            const menuName = item.menu.name.toLowerCase();

            return (
                variantName.includes(keyword) ||
                menuName.includes(keyword) ||
                item.price.toString().includes(keyword)
            );
        });
    }, [reusableMenuVariants, selectedVariantIds, search]);

    /*
    |--------------------------------------------------------------------------
    | SELECTED MASTER VARIANT
    |--------------------------------------------------------------------------
    */

    const selectedMasterVariant = masterVariants.find(
        (item) => item.id === selectedVariantId
    );

    /*
    |--------------------------------------------------------------------------
    | ADD MANUAL VARIANT
    |--------------------------------------------------------------------------
    */

    function handleAddVariant() {
        if (!selectedMasterVariant) {
            alert("Silakan pilih variant.");
            return;
        }

        const numericPrice = Number(price);

        if (!price.trim()) {
            alert("Harga variant wajib diisi.");
            return;
        }

        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
            alert("Harga variant harus lebih dari 0.");
            return;
        }

        if (selectedVariantIds.has(selectedMasterVariant.id)) {
            alert("Variant sudah digunakan pada menu ini.");
            return;
        }

        const newVariant: SelectedVariant = {
            variantId: selectedMasterVariant.id,
            price: Math.round(numericPrice),
            available: true,
            sortOrder: selectedVariants.length,
        };

        onChange([...selectedVariants, newVariant]);

        setSelectedVariantId("");
        setPrice("");
        setSearch("");
    }

    /*
    |--------------------------------------------------------------------------
    | REUSE EXISTING VARIANT
    |--------------------------------------------------------------------------
    |
    | Contoh:
    |
    | Thai Tea
    | Small -> Rp7.000
    |
    | Admin membuat:
    |
    | Kopi Susu
    |
    | Memilih:
    |
    | Small -> Rp7.000
    |
    | Maka data baru akan dibuat:
    |
    | Kopi Susu
    | Small -> Rp7.000
    |
    |--------------------------------------------------------------------------
    */

    function handleReuseVariant() {
        const reusable = reusableMenuVariants.find(
            (item) => item.id === selectedReusableId
        );

        if (!reusable) {
            alert("Silakan pilih variant dan harga yang ingin digunakan.");
            return;
        }

        if (selectedVariantIds.has(reusable.variantId)) {
            alert("Variant tersebut sudah digunakan pada menu ini.");
            return;
        }

        const newVariant: SelectedVariant = {
            variantId: reusable.variantId,
            price: reusable.price,
            available: true,
            sortOrder: selectedVariants.length,
        };

        onChange([...selectedVariants, newVariant]);

        setSelectedReusableId("");
        setSearch("");
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE VARIANT
    |--------------------------------------------------------------------------
    */

    function handleRemoveVariant(variantId: string) {
        const masterVariant = masterVariants.find(
            (item) => item.id === variantId
        );

        const confirmed = window.confirm(
            `Apakah kamu yakin ingin menghapus variant "${masterVariant?.name ?? "ini"}" dari menu?`
        );

        if (!confirmed) {
            return;
        }

        const updatedVariants = selectedVariants
            .filter((item) => item.variantId !== variantId)
            .map((item, index) => ({
                ...item,
                sortOrder: index,
            }));

        onChange(updatedVariants);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE PRICE
    |--------------------------------------------------------------------------
    */

    function handleUpdatePrice(variantId: string, value: string) {
        const numericValue = Number(value);

        const updatedVariants = selectedVariants.map((item) =>
            item.variantId === variantId
                ? {
                    ...item,
                    price: value === "" ? 0 : numericValue,
                }
                : item
        );

        onChange(updatedVariants);
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
        const updatedVariants = selectedVariants.map((item) =>
            item.variantId === variantId
                ? {
                    ...item,
                    available,
                }
                : item
        );

        onChange(updatedVariants);
    }

    /*
    |--------------------------------------------------------------------------
    | MASTER VARIANT CREATED
    |--------------------------------------------------------------------------
    */

    function handleMasterVariantsCreated(newVariants: Variant[]) {
        setMasterVariants((previous) => {
            const existingIds = new Set(
                previous.map((item) => item.id)
            );

            const uniqueNewVariants = newVariants.filter(
                (item) => !existingIds.has(item.id)
            );

            return [...previous, ...uniqueNewVariants];
        });

        /*
        |--------------------------------------------------------------------------
        | Jika hanya membuat satu variant baru,
        | otomatis pilih variant tersebut.
        |--------------------------------------------------------------------------
        */

        if (newVariants.length === 1) {
            const newVariant = newVariants[0];

            if (newVariant) {
                setSelectedVariantId(newVariant.id);
            }
        }
    }

    return (
        <div className="min-w-0 space-y-5">
            {/* HEADER */}

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h3 className="font-semibold">Variant Menu</h3>

                    <p className="text-sm text-muted-foreground">
                        Gunakan variant yang sudah pernah dipakai atau tambahkan master variant baru.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setAddVariantOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Variant
                </Button>
            </div>

            {/* SEARCH */}

            <div className="relative min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                    placeholder="Cari variant atau harga..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full min-w-0 pl-9"
                />
            </div>

            {/* REUSABLE VARIANTS */}

            <div className="min-w-0 rounded-lg border p-4">
                <div className="mb-4">
                    <p className="text-sm font-medium">
                        Gunakan Variant yang Sudah Ada
                    </p>

                    <p className="text-xs text-muted-foreground">
                        Pilih kombinasi variant dan harga yang pernah digunakan oleh menu lain.
                    </p>
                </div>

                {loadingReusableVariants ? (
                    <div className="rounded-md bg-muted p-4">
                        <p className="text-sm text-muted-foreground">
                            Memuat variant yang tersedia...
                        </p>
                    </div>
                ) : availableReusableVariants.length === 0 ? (
                    <div className="rounded-md bg-muted p-4">
                        <p className="text-sm text-muted-foreground">
                            {reusableMenuVariants.length === 0
                                ? "Belum ada variant dengan harga yang dapat digunakan kembali."
                                : "Semua variant yang tersedia sudah digunakan pada menu ini atau tidak sesuai pencarian."}
                        </p>
                    </div>
                ) : (
                    <div className="grid min-w-0 gap-2">
                        {availableReusableVariants.map((item) => {
                            const isSelected =
                                selectedReusableId === item.id;

                            return (
                                <button
                                    key={`${item.variantId}-${item.price}`}
                                    type="button"
                                    onClick={() =>
                                        setSelectedReusableId(
                                            isSelected ? "" : item.id
                                        )
                                    }
                                    className={`flex min-w-0 items-center justify-between gap-4 rounded-md border p-3 text-left transition hover:bg-muted ${isSelected
                                            ? "border-primary bg-muted"
                                            : ""
                                        }`}
                                >
                                    <div className="min-w-0">
                                        <p className="break-words font-medium">
                                            {item.variant.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            Pernah digunakan oleh:{" "}
                                            {item.menu.name}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className="text-sm font-semibold">
                                            Rp{" "}
                                            {item.price.toLocaleString(
                                                "id-ID"
                                            )}
                                        </span>

                                        {isSelected && (
                                            <Badge>Dipilih</Badge>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        <Button
                            type="button"
                            className="mt-2 w-full"
                            disabled={!selectedReusableId}
                            onClick={handleReuseVariant}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Gunakan Variant Terpilih
                        </Button>
                    </div>
                )}
            </div>

            {/* MANUAL ADD */}

            <div className="min-w-0 rounded-lg border p-4">
                <div className="mb-4">
                    <p className="text-sm font-medium">
                        Tambahkan Variant Manual
                    </p>

                    <p className="text-xs text-muted-foreground">
                        Pilih master variant dan tentukan harga khusus untuk menu ini.
                    </p>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                    {/* VARIANT SELECT */}

                    <select
                        className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                        value={selectedVariantId}
                        onChange={(event) =>
                            setSelectedVariantId(event.target.value)
                        }
                    >
                        <option value="">Pilih Variant</option>

                        {availableMasterVariants.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>

                    {/* PRICE */}

                    <Input
                        type="number"
                        min="1"
                        placeholder="Harga"
                        value={price}
                        onChange={(event) =>
                            setPrice(event.target.value)
                        }
                        className="w-full min-w-0"
                    />

                    {/* ADD */}

                    <Button
                        type="button"
                        className="shrink-0"
                        onClick={handleAddVariant}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah
                    </Button>
                </div>

                {availableMasterVariants.length === 0 && (
                    <div className="mt-3 min-w-0 rounded-md bg-muted p-3">
                        <p className="break-words text-sm text-muted-foreground">
                            {masterVariants.length === 0
                                ? "Belum ada master variant."
                                : search.trim()
                                    ? `Variant "${search}" tidak ditemukan.`
                                    : "Semua master variant sudah digunakan oleh menu ini."}
                        </p>
                    </div>
                )}
            </div>

            {/* SELECTED VARIANTS */}

            <div className="min-w-0 space-y-3">
                <div>
                    <h3 className="text-sm font-semibold">
                        Variant Menu Ini
                    </h3>

                    <p className="text-xs text-muted-foreground">
                        Variant dan harga yang akan digunakan oleh menu ini.
                    </p>
                </div>

                {selectedVariants.length === 0 ? (
                    <div className="min-w-0 rounded-lg border border-dashed p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Belum ada variant untuk menu ini.
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Pilih variant yang sudah tersedia atau tambahkan variant baru.
                        </p>
                    </div>
                ) : (
                    selectedVariants.map((selectedVariant) => {
                        const masterVariant = masterVariants.find(
                            (item) =>
                                item.id === selectedVariant.variantId
                        );

                        if (!masterVariant) {
                            return null;
                        }

                        return (
                            <div
                                key={selectedVariant.variantId}
                                className="min-w-0 rounded-lg border p-4"
                            >
                                <div className="flex min-w-0 items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <p className="break-words font-medium">
                                                {masterVariant.name}
                                            </p>

                                            {selectedVariant.available ? (
                                                <Badge className="shrink-0">
                                                    Tersedia
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0"
                                                >
                                                    Tidak tersedia
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Master Variant
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <Switch
                                            checked={
                                                selectedVariant.available
                                            }
                                            onCheckedChange={(checked) =>
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
                                        value={selectedVariant.price}
                                        onChange={(event) =>
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
                    })
                )}
            </div>

            {/* ADD MASTER VARIANT */}

            <AddMasterVariantDialog
                open={addVariantOpen}
                onOpenChange={setAddVariantOpen}
                onSuccess={handleMasterVariantsCreated}
            />
        </div>
    );
}