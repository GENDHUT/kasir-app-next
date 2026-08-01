"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
    Minus,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";

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

    // Controls the mobile / tablet cart bottom-sheet (hidden on lg+ where
    // the cart is always visible as a sidebar).
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | LOCK BODY SCROLL WHILE MOBILE CART SHEET IS OPEN
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!isMobileCartOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileCartOpen]);

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
                setIsMobileCartOpen(false);

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
    | RENDER: CART ITEMS LIST (shared by sidebar + mobile sheet)
    |--------------------------------------------------------------------------
    */

    function renderCartItems() {
        if (selectedItems.length === 0) {
            return (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-5 text-center">
                    <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground/40" />

                    <p className="font-medium">Belum ada pesanan</p>

                    <p className="mt-1 max-w-[250px] text-xs text-muted-foreground">
                        Pilih menu untuk menambahkan pesanan.
                    </p>
                </div>
            );
        }

        return (
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
                                onClick={() => removeItem(item.menuVariantId)}
                                disabled={isPending}
                                className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {/* ITEM FOOTER */}
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                                {formatCurrency(item.unitPrice * item.quantity)}
                            </p>

                            {/* QUANTITY */}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 shrink-0 sm:h-7 sm:w-7"
                                    onClick={() =>
                                        decreaseQuantity(item.menuVariantId)
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
                                    className="h-8 w-8 shrink-0 sm:h-7 sm:w-7"
                                    onClick={() =>
                                        increaseQuantity(item.menuVariantId)
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
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER: ORDER SUMMARY FOOTER (shared by sidebar + mobile sheet)
    |--------------------------------------------------------------------------
    */

    function renderCartSummary() {
        return (
            <div className="space-y-4">
                {/* SUBTOTAL */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>

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
                        inputMode="numeric"
                        min="0"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                        className="h-9 text-base sm:text-sm"
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
                        inputMode="numeric"
                        min="0"
                        value={tax}
                        onChange={(event) => setTax(event.target.value)}
                        className="h-9 text-base sm:text-sm"
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
                    className="min-h-[70px] resize-none text-base sm:text-sm"
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
                    disabled={isPending || selectedItems.length === 0}
                    onClick={handleSubmit}
                >
                    <ShoppingCart className="mr-2 h-4 w-4" />

                    {isPending ? "Menyimpan Pesanan..." : "Buat Pesanan"}
                </Button>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* LEFT SIDE - MENU */}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-r">
                {/* MENU HEADER */}
                <header className="shrink-0 border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
                    <div className="mb-3 sm:mb-4">
                        <h2 className="text-base font-bold sm:text-lg">
                            Pilih Menu
                        </h2>
                        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                            Pilih menu dan variant yang ingin ditambahkan.
                        </p>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama menu atau variant..."
                            className="h-11 w-full pl-10 text-base sm:text-sm"
                        />
                    </div>
                </header>

                {/* MENU CONTENT */}
                <div
                    className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 ${
                        selectedItems.length > 0 ? "pb-24 lg:pb-5" : ""
                    }`}
                >
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
                        <div className="space-y-6 sm:space-y-8">
                            {groupedMenus.map((category) => (
                                <section
                                    key={category.id}
                                    className="space-y-3 sm:space-y-4"
                                >
                                    {/* CATEGORY HEADER */}
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-1 shrink-0 rounded-full bg-primary sm:h-7" />

                                        <h2 className="text-base font-bold sm:text-lg">
                                            {category.name}
                                        </h2>

                                        <div className="h-px flex-1 bg-border" />
                                    </div>

                                    {/* MENU GRID */}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                                        {category.menus.map((menu) => (
                                            <div
                                                key={menu.id}
                                                className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
                                            >
                                                {/* MENU INFO */}
                                                <div className="mb-3 min-w-0 sm:mb-4">
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
                                                                    className="h-9 w-9 shrink-0 sm:h-8 sm:w-8"
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

            {/* RIGHT SIDE - ORDER (sidebar, desktop / large tablet only) */}
            <aside className="hidden min-h-0 min-w-0 flex-col overflow-hidden bg-muted/20 lg:flex">
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
                    {renderCartItems()}
                </div>

                {/* ORDER SUMMARY */}
                <footer className="shrink-0 border-t bg-background p-5">
                    {renderCartSummary()}
                </footer>
            </aside>

            {/* MOBILE / TABLET - FLOATING CART BAR */}
            {selectedItems.length > 0 && !isMobileCartOpen && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
                    <button
                        type="button"
                        onClick={() => setIsMobileCartOpen(true)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground active:opacity-90"
                    >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                            <span className="relative">
                                <ShoppingCart className="h-5 w-5" />
                                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-background text-[10px] font-bold text-primary">
                                    {totalQuantity}
                                </span>
                            </span>
                            Lihat Pesanan
                        </span>

                        <span className="text-sm font-bold">
                            {formatCurrency(total)}
                        </span>
                    </button>
                </div>
            )}

            {/* MOBILE / TABLET - CART BOTTOM SHEET */}
            {isMobileCartOpen && (
                <div className="fixed inset-0 z-40 flex flex-col lg:hidden">
                    {/* OVERLAY */}
                    <button
                        type="button"
                        aria-label="Tutup pesanan"
                        onClick={() => setIsMobileCartOpen(false)}
                        className="absolute inset-0 bg-black/50"
                    />

                    {/* SHEET */}
                    <div className="relative mt-auto flex max-h-[88vh] min-h-0 flex-col rounded-t-2xl bg-background shadow-xl">
                        {/* SHEET HEADER */}
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                                <h2 className="font-bold">Pesanan</h2>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                    {totalQuantity} item
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsMobileCartOpen(false)}
                                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </header>

                        {/* SHEET ITEMS */}
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                            {renderCartItems()}
                        </div>

                        {/* SHEET SUMMARY */}
                        <footer className="shrink-0 border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                            {renderCartSummary()}
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
