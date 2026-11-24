import { Suspense } from "react";

import {
    getHistorySummary,
    getHistoryLineChart,
    getHistoryUserRevenue,
    getHistoryTopProducts,
    getHistoryOrders,
    getHistoryPdfData,
    getHistoryPeriodOptions,
} from "@/server/history";

import { requireRole } from "@/server/helper/permission";

import { SummaryCards } from "@/components/history/summary-cards";
import { RevenueLineChart } from "@/components/history/revenue-line-chart";
import { RevenueByUserPieChart } from "@/components/history/RevenueByUserPieChart";
import { TopProductsPieChart } from "@/components/history/TopProductsPieChart";
import { TopProductsBarChart } from "@/components/history/TopProductsBarChart";
import HistoryTable from "@/components/history/HistoryTable";
import HistoryPdfExport from "@/components/history/HistoryPdfExport";
import PeriodFilter from "@/components/history/PeriodFilter";

type HistoryPageProps = {
    // `await` juga menerima object biasa (Next.js 14) dan Promise (Next.js 15+).
    searchParams?: any;
};

function createJakartaDate(date: string, endOfDay = false) {
    return new Date(
        `${date}T${endOfDay ? "23:59:59.999" : "00:00:00"}+07:00`
    );
}

export default async function HistoryPage({
    searchParams,
}: HistoryPageProps) {
    await requireRole("ADMIN");

    const params = await searchParams;
    const periodOptions = await getHistoryPeriodOptions();

    const isFullHistory = params?.period === "all";

    const selectedPeriod =
        periodOptions.periods.find(
            (period) => period.id === params?.period
        ) ??
        periodOptions.periods.find(
            (period) => period.id === periodOptions.defaultPeriodId
        ) ??
        periodOptions.periods[0];

    // Mode "all" tidak mengirim batas tanggal sama sekali ke query.
    const filters = isFullHistory
        ? undefined
        : {
            startDate: createJakartaDate(selectedPeriod.startDate),
            endDate: createJakartaDate(selectedPeriod.endDate, true),
        };

    const selectedPeriodId = isFullHistory
        ? "all"
        : selectedPeriod.id;

    const [
        summary,
        lineChart,
        userRevenue,
        topProducts,
        orders,
        pdfData,
    ] = await Promise.all([
        getHistorySummary(filters),
        getHistoryLineChart(filters),
        getHistoryUserRevenue(filters),
        getHistoryTopProducts(filters),
        getHistoryOrders(filters ?? {}),
        getHistoryPdfData(
            filters,
            isFullHistory
                ? { label: "Full Semua" }
                : {
                    label: selectedPeriod.label,
                    startDate: selectedPeriod.startDate,
                    endDate: selectedPeriod.endDate,
                }
        ),
    ]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        History Transaksi
                    </h1>

                    <p className="mt-2 text-muted-foreground">
                        Statistik, laporan penjualan, grafik, dan riwayat transaksi berdasarkan periode.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <PeriodFilter
                        periods={periodOptions.periods}
                        selectedPeriodId={selectedPeriodId}
                    />

                    <HistoryPdfExport data={pdfData} />
                </div>
            </div>

            <Suspense>
                <SummaryCards data={summary} />
            </Suspense>

            <Suspense>
                <RevenueLineChart data={lineChart} />
            </Suspense>

            <div className="grid gap-6 lg:grid-cols-2">
                <Suspense>
                    <RevenueByUserPieChart data={userRevenue} />
                </Suspense>

                <Suspense>
                    <TopProductsPieChart data={topProducts} />
                </Suspense>
            </div>

            <Suspense>
                <TopProductsBarChart data={topProducts} />
            </Suspense>

            <HistoryTable
                orders={orders.data}
                pagination={orders.pagination}
                startDate={isFullHistory ? undefined : selectedPeriod.startDate}
                endDate={isFullHistory ? undefined : selectedPeriod.endDate}
            />
        </div>
    );
}
