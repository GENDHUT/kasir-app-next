"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory } from "@/server/category";
import type { Category } from "@/db/schema";

interface Props {
    categories: Category[];
    value?: Category | null;
    onChange: (category: Category | null) => void;
}

export function CategorySearch({
    categories: initialCategories,
    value,
    onChange,
}: Props) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(search.toLowerCase().trim())
    );

    async function handleCreateCategory() {
        const cleanName = search.trim();

        if (!cleanName) return;

        const existingCategory = categories.find(
            (category) =>
                category.name.toLowerCase() === cleanName.toLowerCase()
        );

        if (existingCategory) {
            onChange(existingCategory);
            setSearch("");
            return;
        }

        try {
            setLoading(true);

            const result = await createCategory(cleanName);

            if (result.error) {
                alert(result.error);
                return;
            }

            if (result.data) {
                const newCategory = result.data;

                setCategories((prev) => [...prev, newCategory]);
                onChange(newCategory);
                setSearch("");
            }
        } catch (error) {
            console.error("Gagal membuat kategori:", error);
            alert("Gagal membuat kategori");
        } finally {
            setLoading(false);
        }
    }

    function handleSelectCategory(category: Category) {
        onChange(category);
        setSearch("");
    }

    function handleClearCategory() {
        onChange(null);
    }

    return (
        <div className="space-y-2">
            {/* SELECTED CATEGORY */}
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
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleClearCategory}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* SEARCH INPUT */}
            {!value && (
                <>
                    <Input
                        type="text"
                        placeholder="Cari atau tambah kategori..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />

                    {/* SEARCH RESULTS */}
                    {search.trim() && (
                        <div className="overflow-hidden rounded-md border bg-background shadow-sm">
                            {/* EXISTING CATEGORY */}
                            {filteredCategories.length > 0 && (
                                <div className="p-1">
                                    {filteredCategories.map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                            onClick={() =>
                                                handleSelectCategory(category)
                                            }
                                        >
                                            <Check className="h-4 w-4 opacity-0" />
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* CATEGORY NOT FOUND */}
                            {filteredCategories.length === 0 && (
                                <div className="p-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        disabled={loading}
                                        onClick={handleCreateCategory}
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="mr-2 h-4 w-4" />
                                        )}

                                        {loading
                                            ? "Menambahkan..."
                                            : `Tambah kategori "${search}"`}
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