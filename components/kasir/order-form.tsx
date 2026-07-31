"use client";

import { useMemo, useState, useTransition } from "react";

import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import { createOrder, type CreateOrderItemInput } from "@/server/pesanan";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface OrderFormProps {
    menus: any[];
    onSuccess?: () => void;
}

interface SelectedOrderItem {
    menuId: string;
    menuVariantId: string;
    menuName: string;
    variantName: string;
    unitPrice: number;
    quantity: number;
}

/*
|--------------------------------------------------------------------------
| ORDER FORM
|--------------------------------------------------------------------------
*/

export function OrderForm({ menus, onSuccess }: OrderFormProps) {
    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [search, setSearch] = useState("");
    const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
    const [discount, setDiscount] = useState("0");
    const [tax, setTax] = useState("0");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    /*
    |--------------------------------------------------------------------------
    | FORMAT CURRENCY
    |--------------------------------------------------------------------------
    */

    function formatCurrency(value: number) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(value);
    }

    /*
    |--------------------------------------------------------------------------
    | AVAILABLE MENUS
    |--------------------------------------------------------------------------
    */

    const availableMenus = useMemo(() => {
        return menus
            .filter((menu) => menu.available === true)
            .map((menu) => ({
                ...menu,
                menuVariants: (menu.menuVariants ?? []).filter(
                    (menuVariant: any) => menuVariant.available === true
                ),
            }))
            .filter((menu) => menu.menuVariants.length > 0);
    }, [menus]);

    /*
    |--------------------------------------------------------------------------
    | SEARCH + GROUP MENU
    |--------------------------------------------------------------------------
    */

    const groupedMenus = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        const filteredMenus = availableMenus.filter((menu) => {
            if (!keyword) return true;

            const menuMatch = menu.name?.toLowerCase().includes(keyword);

            const variantMatch = menu.menuVariants.some(
                (menuVariant: any) =>
                    menuVariant.variant?.name?.toLowerCase().includes(keyword)
            );

            return menuMatch || variantMatch;
        });

        const groups = new Map<
            string,
            {
                id: string;
                name: string;
                menus: any[];
            }
        >();

        filteredMenus.forEach((menu) => {
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
    }, [availableMenus, search]);

    /*
    |--------------------------------------------------------------------------
    | ADD ITEM
    |--------------------------------------------------------------------------
    */

    function addItem(menu: any, menuVariant: any) {
        setError(null);

        setSelectedItems((currentItems) => {
            const existingItem = currentItems.find(
                (item) => item.menuVariantId === menuVariant.id
            );

            if (existingItem) {
                return currentItems.map((item) =>
                    item.menuVariantId === menuVariant.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...currentItems,
                {
                    menuId: menu.id,
                    menuVariantId: menuVariant.id,
                    menuName: menu.name,
                    variantName: menuVariant.variant?.name ?? "Variant",
                    unitPrice: menuVariant.price,
                    quantity: 1,
                },
            ];
        });
    }

    /*
    |--------------------------------------------------------------------------
    | INCREASE QUANTITY
    |--------------------------------------------------------------------------
    */

    function increaseQuantity(menuVariantId: string) {
        setSelectedItems((currentItems) =>
            currentItems.map((item) =>
                item.menuVariantId === menuVariantId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DECREASE QUANTITY
    |--------------------------------------------------------------------------
    */

    function decreaseQuantity(menuVariantId: string) {
        setSelectedItems((currentItems) =>
            currentItems
                .map((item) =>
                    item.menuVariantId === menuVariantId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE ITEM
    |--------------------------------------------------------------------------
    */

    function removeItem(menuVariantId: string) {
        setSelectedItems((currentItems) =>
            currentItems.filter(
                (item) => item.menuVariantId !== menuVariantId
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SUBTOTAL
    |--------------------------------------------------------------------------
    */

    const subtotal = useMemo(
        () =>
            selectedItems.reduce(
                (total, item) => total + item.unitPrice * item.quantity,
                0
            ),
        [selectedItems]
    );

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT
    |--------------------------------------------------------------------------
    */

    const discountAmount = Math.max(0, Number(discount) || 0);

    /*
    |--------------------------------------------------------------------------
    | TAX
    |--------------------------------------------------------------------------
    */

    const taxAmount = Math.max(0, Number(tax) || 0);

    /*
    |--------------------------------------------------------------------------
    | TOTAL
    |--------------------------------------------------------------------------
    */

    const total = Math.max(0, subtotal - discountAmount + taxAmount);

    /*
    |--------------------------------------------------------------------------
    | TOTAL QUANTITY
    |--------------------------------------------------------------------------
    */

    const totalQuantity = selectedItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

    /*
    |--------------------------------------------------------------------------
    | SUBMIT ORDER
    |--------------------------------------------------------------------------
    */

    function handleSubmit() {
        setError(null);

        if (selectedItems.length === 0) {
            setError("Silakan pilih minimal satu menu.");
            return;
        }

        const items: CreateOrderItemInput[] = selectedItems.map((item) => ({
            menuId: item.menuId,
            menuVariantId: item.menuVariantId,
            quantity: item.quantity,
        }));

        startTransition(async () => {
            try {
                await createOrder({
                    items,
                    discount: discountAmount,
                    tax: taxAmount,
                    notes: notes.trim() || undefined,
                });

                /*
                |--------------------------------------------------------------------------
                | RESET
                |--------------------------------------------------------------------------
                */

                setSelectedItems([]);
                setDiscount("0");
                setTax("0");
                setNotes("");
                setSearch("");
                setError(null);

                /*
                |--------------------------------------------------------------------------
                | SUCCESS CALLBACK
                |--------------------------------------------------------------------------
                */

                onSuccess?.();
            } catch (submitError) {
                setError(
                    submitError instanceof Error
                        ? submitError.message
                        : "Gagal membuat pesanan."
                );
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* LEFT SIDE - MENU */}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b lg:border-b-0 lg:border-r">
                {/* MENU HEADER */}
                <header className="shrink-0 border-b bg-background px-5 py-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Pilih Menu</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Pilih menu dan variant yang ingin ditambahkan.
                            </p>
                        </div>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama menu atau variant..."
                            className="h-11 w-full pl-10"
                        />
                    </div>
                </header>

                {/* MENU CONTENT */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                    {groupedMenus.length === 0 ? (
                        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed">
                            <div className="text-center">
                                <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                                <p className="font-medium">
                                    Menu tidak ditemukan
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Coba gunakan kata kunci pencarian lain.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 pb-5">
                            {groupedMenus.map((category) => (
                                <section
                                    key={category.id}
                                    className="space-y-4"
                                >
                                    {/* CATEGORY HEADER */}
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 w-1 shrink-0 rounded-full bg-primary" />

                                        <h2 className="text-lg font-bold">
                                            {category.name}
                                        </h2>

                                        <div className="h-px flex-1 bg-border" />
                                    </div>

                                    {/* MENU GRID */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {category.menus.map((menu) => (
                                            <div
                                                key={menu.id}
                                                className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
                                            >
                                                {/* MENU INFO */}
                                                <div className="mb-4 min-w-0">
                                                    <h3 className="truncate font-semibold">
                                                        {menu.name}
                                                    </h3>

                                                    {menu.description && (
                                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                            {menu.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* VARIANTS */}
                                                <div className="mt-auto space-y-2">
                                                    {menu.menuVariants.map(
                                                        (menuVariant: any) => (
                                                            <div
                                                                key={
                                                                    menuVariant.id
                                                                }
                                                                className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-2"
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-medium">
                                                                        {menuVariant.variant?.name ??
                                                                            "Variant"}
                                                                    </p>

                                                                    <p className="text-xs text-muted-foreground">
                                                                        {formatCurrency(
                                                                            menuVariant.price
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 shrink-0"
                                                                    onClick={() =>
                                                                        addItem(
                                                                            menu,
                                                                            menuVariant
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isPending
                                                                    }
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* RIGHT SIDE - ORDER */}
            <aside className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/20 lg:flex-none">
                {/* ORDER HEADER */}
                <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-5 py-4">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />

                        <h2 className="font-bold">Pesanan</h2>
                    </div>

                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {totalQuantity} item
                    </span>
                </header>

                {/* SELECTED ITEMS */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                    {selectedItems.length === 0 ? (
                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-5 text-center">
                            <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground/40" />

                            <p className="font-medium">
                                Belum ada pesanan
                            </p>

                            <p className="mt-1 max-w-[250px] text-xs text-muted-foreground">
                                Pilih menu di sebelah kiri untuk menambahkan
                                pesanan.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 pb-5">
                            {selectedItems.map((item) => (
                                <div
                                    key={item.menuVariantId}
                                    className="rounded-xl border bg-background p-3"
                                >
                                    {/* ITEM HEADER */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">
                                                {item.menuName}
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                {item.variantName}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeItem(
                                                    item.menuVariantId
                                                )
                                            }
                                            disabled={isPending}
                                            className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* ITEM FOOTER */}
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold">
                                            {formatCurrency(
                                                item.unitPrice * item.quantity
                                            )}
                                        </p>

                                        {/* QUANTITY */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                    decreaseQuantity(
                                                        item.menuVariantId
                                                    )
                                                }
                                                disabled={isPending}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>

                                            <span className="w-6 text-center text-sm font-semibold">
                                                {item.quantity}
                                            </span>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                    increaseQuantity(
                                                        item.menuVariantId
                                                    )
                                                }
                                                disabled={isPending}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ORDER SUMMARY */}
                <footer className="shrink-0 border-t bg-background p-5">
                    <div className="space-y-4">
                        {/* SUBTOTAL */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Subtotal
                            </span>

                            <span className="font-medium">
                                {formatCurrency(subtotal)}
                            </span>
                        </div>

                        {/* DISCOUNT */}
                        <div className="grid grid-cols-[1fr_130px] items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                                Diskon
                            </span>

                            <Input
                                type="number"
                                min="0"
                                value={discount}
                                onChange={(event) =>
                                    setDiscount(event.target.value)
                                }
                                className="h-9"
                                disabled={isPending}
                            />
                        </div>

                        {/* TAX */}
                        <div className="grid grid-cols-[1fr_130px] items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                                Pajak
                            </span>

                            <Input
                                type="number"
                                min="0"
                                value={tax}
                                onChange={(event) =>
                                    setTax(event.target.value)
                                }
                                className="h-9"
                                disabled={isPending}
                            />
                        </div>

                        <Separator />

                        {/* TOTAL */}
                        <div className="flex items-center justify-between">
                            <span className="text-base font-bold">Total</span>

                            <span className="text-xl font-bold text-primary">
                                {formatCurrency(total)}
                            </span>
                        </div>

                        {/* NOTES */}
                        <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Catatan pesanan (opsional)..."
                            className="min-h-[70px] resize-none"
                            disabled={isPending}
                        />

                        {/* ERROR */}
                        {error && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {/* SUBMIT */}
                        <Button
                            type="button"
                            className="h-11 w-full"
                            disabled={
                                isPending || selectedItems.length === 0
                            }
                            onClick={handleSubmit}
                        >
                            <ShoppingCart className="mr-2 h-4 w-4" />

                            {isPending
                                ? "Menyimpan Pesanan..."
                                : "Buat Pesanan"}
                        </Button>
                    </div>
                </footer>
            </aside>
        </div>
    );
}