"use client";

import { usePathname, useRouter } from "next/navigation";
import type { HistoryPeriodOption } from "@/server/history";

interface PeriodFilterProps {
    periods: HistoryPeriodOption[];
    selectedPeriodId: string;
}

export default function PeriodFilter({
    periods,
    selectedPeriodId,
}: PeriodFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    function handleChange(periodId: string) {
        router.push(`${pathname}?period=${encodeURIComponent(periodId)}`);
    }

    return (
        <div className="flex w-full flex-col gap-2 sm:w-auto">
            <label
                htmlFor="history-period"
                className="text-sm font-medium text-muted-foreground"
            >
                Filter Periode
            </label>

            <select
                id="history-period"
                value={selectedPeriodId}
                onChange={(event) => handleChange(event.target.value)}
                className="h-10 min-w-[260px] rounded-lg border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
            >
                <option value="all">Full Semua (Awal hingga Akhir)</option>
                {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                        {period.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
