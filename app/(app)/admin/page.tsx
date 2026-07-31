import { Suspense } from "react";

import {
    getHistorySummary,
    getHistoryLineChart,
    getHistoryUserRevenue,
    getHistoryTopProducts,
    getHistoryOrders,
    getHistoryPdfData,
} from "@/server/history";

import { requireRole } from "@/server/helper/permission";

import { SummaryCards } from "@/components/history/summary-cards";
import { RevenueLineChart } from "@/components/history/revenue-line-chart";
import { RevenueByUserPieChart } from "@/components/history/RevenueByUserPieChart";
import { TopProductsPieChart } from "@/components/history/TopProductsPieChart";
import { TopProductsBarChart } from "@/components/history/TopProductsBarChart";
import HistoryTable from "@/components/history/HistoryTable";
import HistoryPdfExport from "@/components/history/HistoryPdfExport";

export default async function HistoryPage() {
    await requireRole("ADMIN");

    const [
        summary,
        lineChart,
        userRevenue,
        topProducts,
        orders,
        pdfData,
    ] = await Promise.all([
        getHistorySummary(),
        getHistoryLineChart(),
        getHistoryUserRevenue(),
        getHistoryTopProducts(),
        getHistoryOrders(),
        getHistoryPdfData(),
    ]);

    return (
        <div className="space-y-8">
            {/* Header */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        History Transaksi
                    </h1>

                    <p className="mt-2 text-muted-foreground">
                        Statistik, laporan penjualan, grafik, dan riwayat seluruh transaksi.
                    </p>
                </div>

                <HistoryPdfExport
                    data={pdfData}
                />
            </div>

            {/* Summary */}

            <Suspense>
                <SummaryCards
                    data={summary}
                />
            </Suspense>

            {/* Revenue */}

            <Suspense>
                <RevenueLineChart
                    data={lineChart}
                />
            </Suspense>

            {/* Pie Chart */}

            <div className="grid gap-6 lg:grid-cols-2">

                <Suspense>
                    <RevenueByUserPieChart
                        data={userRevenue}
                    />
                </Suspense>

                <Suspense>
                    <TopProductsPieChart
                        data={topProducts}
                    />
                </Suspense>

            </div>

            {/* Top Products */}

            <Suspense>
                <TopProductsBarChart
                    data={topProducts}
                />
            </Suspense>

            {/* History Table */}

            <HistoryTable
                orders={orders.data}
                pagination={orders.pagination}
            />
        </div>
    );
}