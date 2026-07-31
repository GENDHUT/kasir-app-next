"use client";

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export interface RevenueChartData {
    date: string;
    revenue: number;
    transactions: number;
}

interface RevenueLineChartProps {
    data: RevenueChartData[];
    days?: number;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
    }).format(new Date(date));
}

export function RevenueLineChart({
    data,
    days = 30,
}: RevenueLineChartProps) {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-6">
                <h3 className="text-base font-semibold">
                    Perkembangan Pendapatan
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                    Perkembangan pendapatan dan transaksi dalam {days} hari terakhir.
                </p>
            </div>

            {data.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                        Belum ada data transaksi.
                    </div>
                </div>
            ) : (
                <div className="h-[320px] w-full">
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <LineChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 10,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />

                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={90}
                                tickFormatter={(value) =>
                                    `Rp${Number(value).toLocaleString("id-ID")}`
                                }
                            />

                            <Tooltip
                                labelFormatter={(label) =>
                                    formatDate(String(label))
                                }
                                formatter={(value, name) => {
                                    if (name === "revenue") {
                                        return [
                                            formatCurrency(Number(value)),
                                            "Pendapatan",
                                        ];
                                    }

                                    return [
                                        `${Number(value).toLocaleString("id-ID")} transaksi`,
                                        "Transaksi",
                                    ];
                                }}
                            />

                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="revenue"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{
                                    r: 5,
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}