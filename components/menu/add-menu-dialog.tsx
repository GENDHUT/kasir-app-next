"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { MenuForm } from "./menu-form";
import { getCategories } from "@/server/category";
import { getVariants } from "@/server/variant";
import type { Category, Variant } from "@/db/schema";

export function AddMenuDialog() {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);

            const [categoryData, variantData] = await Promise.all([
                getCategories(),
                getVariants(),
            ]);

            setCategories(categoryData);
            setVariants(variantData);
        } catch (error) {
            console.error("Gagal mengambil data menu:", error);

            setError(
                "Gagal memuat kategori dan variant. Silakan coba lagi."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        loadData();
    }, [open]);

    function handleOpenChange(value: boolean) {
        setOpen(value);

        if (!value) {
            setError(null);
        }
    }

    function handleMenuCreated() {
        setOpen(false);
    }

    function handleRefreshPage() {
        window.location.reload();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <div className="flex items-center gap-2">
                <DialogTrigger asChild>
                    <Button type="button">
                        Tambah Menu Baru
                    </Button>
                </DialogTrigger>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshPage}
                    title="Refresh halaman"
                >
                    <RefreshCw className="h-4 w-4" />

                    <span className="sr-only">
                        Refresh halaman
                    </span>
                </Button>
            </div>

            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-hidden p-6">
                <DialogHeader>
                    <DialogTitle>
                        Tambah Menu Baru
                    </DialogTitle>

                    <DialogDescription>
                        Tambahkan informasi menu, gambar, dan variant yang tersedia.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-w-0 max-h-[calc(90vh-8rem)] overflow-x-hidden overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex min-h-[200px] items-center justify-center">
                            <p className="text-sm text-muted-foreground">
                                Memuat data...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
                            <p className="text-sm text-destructive">
                                {error}
                            </p>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={loadData}
                            >
                                Coba Lagi
                            </Button>
                        </div>
                    ) : (
                        <MenuForm
                            categories={categories}
                            variants={variants}
                            onSuccess={handleMenuCreated}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}