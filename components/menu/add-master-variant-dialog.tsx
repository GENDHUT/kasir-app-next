"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVariants } from "@/server/variant";
import type { Variant } from "@/db/schema";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (variants: Variant[]) => void;
}

export function AddMasterVariantDialog({
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    const [names, setNames] = useState<string[]>([""]);
    const [loading, setLoading] = useState(false);

    function handleAddInput() {
        setNames((prev) => [...prev, ""]);
    }

    function handleChange(index: number, value: string) {
        setNames((prev) =>
            prev.map((name, currentIndex) =>
                currentIndex === index ? value : name
            )
        );
    }

    function handleRemoveInput(index: number) {
        if (names.length === 1) {
            setNames([""]);
            return;
        }

        setNames((prev) =>
            prev.filter((_, currentIndex) => currentIndex !== index)
        );
    }

    function resetForm() {
        setNames([""]);
    }

    function handleOpenChange(value: boolean) {
        if (loading) {
            return;
        }

        if (!value) {
            resetForm();
        }

        onOpenChange(value);
    }

    async function handleSubmit() {
        const cleanedNames = names
            .map((name) => name.trim())
            .filter((name) => name.length > 0);

        if (cleanedNames.length === 0) {
            alert("Minimal satu variant harus diisi.");
            return;
        }

        const normalizedNames = cleanedNames.map((name) => name.toLowerCase());
        const uniqueNames = new Set(normalizedNames);

        if (uniqueNames.size !== normalizedNames.length) {
            alert("Tidak boleh ada nama variant yang sama.");
            return;
        }

        try {
            setLoading(true);

            const result = await createVariants(cleanedNames);

            if (!result.success) {
                alert(result.message);
                return;
            }

            if (result.data && result.data.length > 0) {
                onSuccess?.(result.data);

                resetForm();

                onOpenChange(false);
            }
        } catch (error) {
            console.error("Gagal membuat variant:", error);
            alert("Terjadi kesalahan saat membuat variant.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Tambah Master Variant
                    </DialogTitle>

                    <DialogDescription>
                        Tambahkan beberapa variant sekaligus. Variant ini dapat digunakan oleh banyak menu.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* INPUT LIST */}
                    <div className="space-y-3">
                        <Label>
                            Nama Variant
                        </Label>

                        {names.map((name, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    placeholder={
                                        index === 0
                                            ? "Contoh: Small"
                                            : "Nama variant"
                                    }
                                    value={name}
                                    disabled={loading}
                                    onChange={(event) =>
                                        handleChange(
                                            index,
                                            event.target.value
                                        )
                                    }
                                />

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={loading}
                                    onClick={() =>
                                        handleRemoveInput(index)
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* ADD ROW */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                        onClick={handleAddInput}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Baris Variant
                    </Button>

                    {/* ACTION */}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading}
                            onClick={() =>
                                handleOpenChange(false)
                            }
                        >
                            Batal
                        </Button>

                        <Button
                            type="button"
                            disabled={loading}
                            onClick={handleSubmit}
                        >
                            {loading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}

                            {loading
                                ? "Menyimpan..."
                                : "Simpan Variant"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}