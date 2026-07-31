"use client";

import { useMemo, useState } from "react";

import { MenuGalleryCard } from "./menu-gallery-card";
import { MenuPreviewDialog } from "@/components/menu/menu-preview-dialog";

interface MenuGalleryProps {
    menus: any[];
}

export function MenuGallery({ menus }: MenuGalleryProps) {
    const [selectedMenu, setSelectedMenu] = useState<any | null>(null);

    /*
    |--------------------------------------------------------------------------
    | GROUP MENU BY CATEGORY
    |--------------------------------------------------------------------------
    */

    const groupedMenus = useMemo(() => {
        const groups = new Map<
            string,
            {
                id: string;
                name: string;
                menus: any[];
            }
        >();

        menus.forEach((menu) => {
            const categoryId = menu.category?.id ?? "uncategorized";
            const categoryName = menu.category?.name ?? "Tanpa Kategori";

            if (!groups.has(categoryId)) {
                groups.set(categoryId, {
                    id: categoryId,
                    name: categoryName,
                    menus: [],
                });
            }

            groups.get(categoryId)!.menus.push(menu);
        });

        return Array.from(groups.values());
    }, [menus]);

    /*
    |--------------------------------------------------------------------------
    | OPEN MENU PREVIEW
    |--------------------------------------------------------------------------
    */

    function handleMenuClick(menu: any) {
        setSelectedMenu(menu);
    }

    /*
    |--------------------------------------------------------------------------
    | CLOSE MENU PREVIEW
    |--------------------------------------------------------------------------
    */

    function handlePreviewChange(open: boolean) {
        if (!open) {
            setSelectedMenu(null);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | EMPTY STATE
    |--------------------------------------------------------------------------
    */

    if (menus.length === 0) {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <span className="text-2xl">🍽️</span>
                </div>

                <h2 className="text-lg font-semibold">
                    Belum Ada Menu
                </h2>

                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Belum ada menu yang tersedia untuk ditampilkan.
                </p>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <div className="space-y-12">
                {groupedMenus.map((category) => (
                    <section key={category.id} className="space-y-5">
                        {/* CATEGORY HEADER */}

                        <div className="flex items-center gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="h-8 w-1 rounded-full bg-primary" />

                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">
                                        {category.name}
                                    </h2>

                                    <p className="text-xs text-muted-foreground">
                                        {category.menus.length} menu tersedia
                                    </p>
                                </div>
                            </div>

                            <div className="h-px flex-1 bg-border" />
                        </div>

                        {/* MENU GRID */}

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {category.menus.map((menu) => (
                                <MenuGalleryCard
                                    key={menu.id}
                                    menu={menu}
                                    onClick={() => handleMenuClick(menu)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* MENU PREVIEW */}

            <MenuPreviewDialog
                menu={selectedMenu}
                open={Boolean(selectedMenu)}
                onOpenChange={handlePreviewChange}
            />
        </>
    );
}