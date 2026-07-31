"use client";

import { useState } from "react";

import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EditOrderForm } from "@/components/kasir/edit-order-form";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export interface EditOrderItem {
    id: string;
    menuId: string;
    menuVariantId: string;
    menuName: string;
    variantName?: string | null;
    quantity: number;
    price: number;
}

export interface EditOrder {
    id: string;
    orderNumber: string;

    user: {
        id: string;
        name: string | null;
        email: string;
    };

    items: EditOrderItem[];

    subtotal: number;
    discount: number;
    tax: number;
    total: number;

    notes?: string | null;
}

/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface EditOrderButtonProps {
    order: EditOrder;
    menus: any[];
    onSuccess?: () => void;
}

/*
|--------------------------------------------------------------------------
| EDIT ORDER BUTTON
|--------------------------------------------------------------------------
*/

export function EditOrderButton({
    order,
    menus,
    onSuccess,
}: EditOrderButtonProps) {
    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [showEditForm, setShowEditForm] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | OPEN EDIT FORM
    |--------------------------------------------------------------------------
    */

    function handleOpenEdit() {
        setShowEditForm(true);
    }

    /*
    |--------------------------------------------------------------------------
    | CLOSE EDIT FORM
    |--------------------------------------------------------------------------
    */

    function handleCloseEdit() {
        setShowEditForm(false);
    }

    /*
    |--------------------------------------------------------------------------
    | FULLSCREEN EDIT FORM
    |--------------------------------------------------------------------------
    */

    if (showEditForm) {
        return (
            <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col overflow-hidden bg-background">
                {/* HEADER */}

                <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-5">
                    {/* BACK BUTTON */}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseEdit}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>

                    {/* TITLE */}

                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold">
                            Edit Pesanan
                        </h1>

                        <p className="text-xs text-muted-foreground">
                            Pesanan #{order.orderNumber}
                        </p>
                    </div>
                </header>

                {/* EDIT ORDER FORM */}

                <main className="min-h-0 flex-1 overflow-hidden">
                    <EditOrderForm
                        order={order}
                        menus={menus}
                        onSuccess={() => {
                            setShowEditForm(false);
                            onSuccess?.();
                        }}
                    />
                </main>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMAL EDIT BUTTON
    |--------------------------------------------------------------------------
    */

    return (
        <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleOpenEdit}
        >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
        </Button>
    );
}