"use client";

import {
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend,
    Cell,
} from "recharts";

import type { HistoryTopProductItem } from "@/server/history";

interface MenuByUserPieChartProps {
    data: HistoryTopProductItem[];
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

export function TopProductsPieChart({
    data,
}: MenuByUserPieChartProps) {

    const chartData = data.map((item) => ({
        ...item,
        name: item.menuName,
        value: item.quantity,
    }));

    const totalQuantity = chartData.reduce(
        (total, item) => total + item.quantity,
        0
    );

    return (
        <div className="w-full rounded-xl border bg-card p-6">

            <div className="mb-6">

                <h3 className="text-lg font-semibold">
                    Menu Terlaris
                </h3>

                <p className="text-sm text-muted-foreground">
                    Distribusi jumlah menu yang paling banyak terjual.
                </p>

            </div>

            {chartData.length === 0 ? (

                <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    Belum ada data penjualan menu.
                </div>

            ) : (

                <>

                    <div className="h-[320px] w-full">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <PieChart>

                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={105}
                                    innerRadius={55}
                                    paddingAngle={2}
                                >

                                    {chartData.map((item, index) => (

                                        <Cell
                                            key={item.menuName}
                                            fill={
                                                COLORS[
                                                index %
                                                COLORS.length
                                                ]
                                            }
                                        />

                                    ))}

                                </Pie>

                                <Tooltip
                                    formatter={(value) =>
                                        `${Number(value).toLocaleString(
                                            "id-ID"
                                        )} item`
                                    }
                                />

                                <Legend
                                    formatter={(value) => {

                                        const item =
                                            chartData.find(
                                                (dataItem) =>
                                                    dataItem.menuName === value
                                            );

                                        return (
                                            <span>
                                                {value} (
                                                {item?.percentage.toFixed(1)}
                                                %)
                                            </span>
                                        );
                                    }}
                                />

                            </PieChart>

                        </ResponsiveContainer>

                    </div>

                    <div className="mt-4 border-t pt-4">

                        <div className="flex items-center justify-between text-sm">

                            <span className="text-muted-foreground">
                                Total Menu Terjual
                            </span>

                            <span className="font-semibold">
                                {totalQuantity.toLocaleString("id-ID")} item
                            </span>

                        </div>

                    </div>

                </>

            )}

        </div>
    );
}