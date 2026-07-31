"use client";

import { useState } from "react";

import { ArrowLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { OrderForm } from "@/components/kasir/order-form";

/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface CreateOrderButtonProps {
    menus: any[];
}

/*
|--------------------------------------------------------------------------
| CREATE ORDER BUTTON
|--------------------------------------------------------------------------
*/

export function CreateOrderButton({
    menus,
}: CreateOrderButtonProps) {
    const [showOrderForm, setShowOrderForm] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | FULLSCREEN ORDER FORM
    |--------------------------------------------------------------------------
    */

    if (showOrderForm) {
        return (
            <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col overflow-hidden bg-background">
                {/* HEADER */}

                <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowOrderForm(false)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>

                    <div>
                        <h1 className="text-lg font-bold">
                            Buat Pesanan Baru
                        </h1>

                        <p className="text-xs text-muted-foreground">
                            Pilih menu dan variant untuk membuat pesanan.
                        </p>
                    </div>
                </header>

                {/* ORDER FORM */}

                <main className="min-h-0 flex-1 overflow-hidden">
                    <OrderForm
                        menus={menus}
                        onSuccess={() => {
                            setShowOrderForm(false);
                            window.location.reload();
                        }}
                    />
                </main>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMAL BUTTON
    |--------------------------------------------------------------------------
    */

    return (
        <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setShowOrderForm(true)}
        >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pesanan
        </Button>
    );
}