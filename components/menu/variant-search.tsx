"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createVariant } from "@/server/variant";
import type { Variant } from "@/db/schema";

interface Props {
    variants: Variant[];
    value?: Variant | null;
    onChange: (variant: Variant | null) => void;
}

export function VariantSearch({ variants: initialVariants, value, onChange }: Props) {
    const [variants, setVariants] = useState<Variant[]>(initialVariants);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const filteredVariants = variants.filter((variant) =>
        variant.name.toLowerCase().includes(search.toLowerCase().trim())
    );

    function handleSelect(variant: Variant) {
        onChange(variant);
        setSearch("");
    }

    function handleClear() {
        onChange(null);
    }

    async function handleCreate() {
        const cleanName = search.trim();

        if (!cleanName) return;

        const exists = variants.find(
            (variant) => variant.name.toLowerCase() === cleanName.toLowerCase()
        );

        if (exists) {
            onChange(exists);
            setSearch("");
            return;
        }

        try {
            setLoading(true);

            const result = await createVariant(cleanName);

            if (!result.success) {
                alert(result.message);
                return;
            }

            if (result.data) {
                const newVariant = result.data;

                setVariants((prev) => [...prev, newVariant]);
                onChange(newVariant);
                setSearch("");
            }
        } catch (error) {
            console.error(error);
            alert("Gagal membuat variant");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            {value && (
                <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />

                        <span className="text-sm font-medium">
                            {value.name}
                        </span>
                    </div>

                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {!value && (
                <>
                    <Input
                        placeholder="Cari variant..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {search.trim() && (
                        <div className="overflow-hidden rounded-md border bg-background">
                            {filteredVariants.length > 0 && (
                                <div className="p-1">
                                    {filteredVariants.map((variant) => (
                                        <button
                                            key={variant.id}
                                            type="button"
                                            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                            onClick={() => handleSelect(variant)}
                                        >
                                            <Check className="h-4 w-4 opacity-0" />
                                            {variant.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {filteredVariants.length === 0 && (
                                <div className="p-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        disabled={loading}
                                        onClick={handleCreate}
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="mr-2 h-4 w-4" />
                                        )}

                                        {loading
                                            ? "Menambahkan..."
                                            : `Tambah variant "${search}"`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}