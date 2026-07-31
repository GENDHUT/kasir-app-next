"use client";

import Image from "next/image";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface MenuPreviewDialogProps {
    menu: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MenuPreviewDialog({
    menu,
    open,
    onOpenChange,
}: MenuPreviewDialogProps) {
    if (!menu) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl overflow-hidden p-0">
                <div className="max-h-[90vh] overflow-y-auto">
                    {/* ==========================================================
                        MAIN MENU CARD
                    ========================================================== */}

                    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

                        {/* ======================================================
                            MENU IMAGE
                        ====================================================== */}

                        <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden bg-muted md:min-h-[480px]">
                            {menu.imageUrl ? (
                                <Image
                                    src={menu.imageUrl}
                                    alt={menu.name}
                                    fill
                                    className="object-contain p-4"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            ) : (
                                <div className="flex h-full min-h-[320px] w-full items-center justify-center text-sm text-muted-foreground">
                                    No Image
                                </div>
                            )}
                        </div>

                        {/* ======================================================
                            MENU INFORMATION
                        ====================================================== */}

                        <div className="flex flex-col justify-center p-6 md:p-8">

                            <DialogHeader className="space-y-3">
                                {/* CATEGORY */}

                                <div>
                                    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                        {menu.category?.name ?? "Tanpa Kategori"}
                                    </span>
                                </div>

                                {/* MENU NAME */}

                                <DialogTitle className="text-2xl font-bold tracking-tight md:text-3xl">
                                    {menu.name}
                                </DialogTitle>

                                {/* DESCRIPTION */}

                                <DialogDescription className="text-sm leading-relaxed">
                                    {menu.description ||
                                        "Tidak ada deskripsi untuk menu ini."}
                                </DialogDescription>
                            </DialogHeader>

                            {/* ==================================================
                                STATUS
                            ================================================== */}

                            <div className="mt-6">
                                <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                                    <div>
                                        <p className="text-sm font-medium">
                                            Status Menu
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Status ketersediaan menu saat ini.
                                        </p>
                                    </div>

                                    <span
                                        className={
                                            menu.available
                                                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                                                : "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                                        }
                                    >
                                        {menu.available
                                            ? "Tersedia"
                                            : "Tidak Tersedia"}
                                    </span>
                                </div>
                            </div>

                            {/* ==================================================
                                VARIANTS
                            ================================================== */}

                            <div className="mt-6">

                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">
                                        Variant Menu
                                    </h3>

                                    <span className="text-xs text-muted-foreground">
                                        {menu.menuVariants?.length ?? 0} Variant
                                    </span>
                                </div>

                                {menu.menuVariants?.length > 0 ? (
                                    <div className="space-y-2">
                                        {menu.menuVariants.map(
                                            (menuVariant: any) => (
                                                <div
                                                    key={menuVariant.id}
                                                    className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted/50"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                                                            {menuVariant.variant?.name
                                                                ?.charAt(0)
                                                                ?.toUpperCase() ??
                                                                "V"}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">
                                                                {menuVariant.variant
                                                                    ?.name ??
                                                                    "-"}
                                                            </p>

                                                            <p
                                                                className={
                                                                    menuVariant.available
                                                                        ? "text-xs text-green-600"
                                                                        : "text-xs text-muted-foreground"
                                                                }
                                                            >
                                                                {menuVariant.available
                                                                    ? "Tersedia"
                                                                    : "Tidak tersedia"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <p className="ml-4 shrink-0 text-sm font-bold">
                                                        Rp{" "}
                                                        {Number(
                                                            menuVariant.price
                                                        ).toLocaleString(
                                                            "id-ID"
                                                        )}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed p-6 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada variant.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}