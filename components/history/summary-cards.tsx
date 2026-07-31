"use client";

interface SummaryData {
    totalRevenue: number;
    totalTransactions: number;
    topMenus: {
        menuName: string;
        quantity: number;
        revenue: number;
    }[];

    topUser: {
        userId: string;
        userName: string;
        username: string;
        revenue: number;
        transactions: number;
    } | null;
}

interface SummaryCardsProps {
    data: SummaryData;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

export function SummaryCards({
    data,
}: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            {/* Total Revenue */}

            <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">
                    Total Pendapatan
                </div>

                <div className="mt-2 text-2xl font-bold tracking-tight">
                    {formatCurrency(data.totalRevenue)}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                    Total pendapatan dari seluruh transaksi selesai
                </p>
            </div>

            {/* Total Transaction */}

            <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">
                    Total Transaksi
                </div>

                <div className="mt-2 text-2xl font-bold tracking-tight">
                    {data.totalTransactions.toLocaleString("id-ID")}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                    Jumlah transaksi yang berhasil diselesaikan
                </p>
            </div>

            {/* Top Menu */}

            <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">
                    Menu Paling Laris
                </div>

                <div className="mt-3 space-y-2">
                    {data.topMenus.length > 0 ? (
                        data.topMenus.slice(0, 3).map((item, index) => (
                            <div
                                key={`${item.menuName}-${index}`}
                                className="flex items-center justify-between gap-3 text-sm"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                        {index + 1}
                                    </span>

                                    <span className="truncate font-medium">
                                        {item.menuName}
                                    </span>
                                </div>

                                <span className="shrink-0 text-muted-foreground">
                                    {item.quantity} terjual
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Belum ada data penjualan.
                        </p>
                    )}
                </div>
            </div>

            {/* Top User */}

            <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">
                    User Paling Laris
                </div>

                {data.topUser ? (
                    <>
                        <div className="mt-2 truncate text-xl font-bold">
                            {data.topUser.userName}
                        </div>

                        <div className="mt-1 text-sm font-medium">
                            {formatCurrency(data.topUser.revenue)}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {data.topUser.transactions} transaksi
                        </p>
                    </>
                ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Belum ada data transaksi.
                    </p>
                )}
            </div>

        </div>
    );
}