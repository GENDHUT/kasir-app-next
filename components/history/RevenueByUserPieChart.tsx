"use client";

import {
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend,
    Cell,
} from "recharts";

export interface RevenueByUserData {
    userId: string;
    userName: string;
    revenue: number;
}

interface RevenueByUserPieChartProps {
    data: RevenueByUserData[];
}

const COLORS = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);

export function RevenueByUserPieChart({
    data = [],
}: RevenueByUserPieChartProps) {
    const totalRevenue = data.reduce(
        (total, item) => total + item.revenue,
        0
    );

    const chartData = data.map((item) => ({
        ...item,
        percentage:
            totalRevenue > 0
                ? (item.revenue / totalRevenue) * 100
                : 0,
    }));

    return (
        <div className="w-full rounded-xl border bg-card p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold">
                    Pendapatan Per User
                </h3>

                <p className="text-sm text-muted-foreground">
                    Persentase kontribusi pendapatan berdasarkan kasir.
                </p>
            </div>

            {chartData.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    Belum ada data pendapatan.
                </div>
            ) : (
                <div className="h-[320px] w-full">
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="revenue"
                                nameKey="userName"
                                cx="50%"
                                cy="50%"
                                outerRadius={105}
                                innerRadius={55}
                                paddingAngle={2}
                            >
                                {chartData.map((item, index) => (
                                    <Cell
                                        key={item.userId}
                                        fill={
                                            COLORS[
                                            index % COLORS.length
                                            ]
                                        }
                                    />
                                ))}
                            </Pie>

                            <Tooltip
                                formatter={(value) =>
                                    formatCurrency(Number(value))
                                }
                            />

                            <Legend
                                formatter={(value) => {
                                    const item = chartData.find(
                                        (d) =>
                                            d.userName === value
                                    );

                                    return (
                                        <span>
                                            {value} (
                                            {item?.percentage.toFixed(1) ?? 0}
                                            %)
                                        </span>
                                    );
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Total Pendapatan
                    </span>

                    <span className="font-semibold">
                        {formatCurrency(totalRevenue)}
                    </span>
                </div>
            </div>
        </div>
    );
}