"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from "recharts";

export interface TopProductData {
    menuName: string;
    quantity: number;
}

interface TopProductsBarChartProps {
    data: TopProductData[];
}

const COLORS = [
    "#3b82f6", // Biru
    "#22c55e", // Hijau
    "#f59e0b", // Kuning
    "#ef4444", // Merah
    "#8b5cf6", // Ungu
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#84cc16", // Lime
    "#f97316", // Orange
    "#14b8a6", // Teal
    "#6366f1", // Indigo
    "#a855f7", // Violet
];

export function TopProductsBarChart({
    data,
}: TopProductsBarChartProps) {
    const totalQuantity = data.reduce(
        (total, item) => total + item.quantity,
        0
    );

    const chartData = data.map((item) => ({
        ...item,
        percentage:
            totalQuantity > 0
                ? (item.quantity / totalQuantity) * 100
                : 0,
    }));

    return (
        <div className="w-full rounded-xl border bg-card p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold">
                    Produk Terlaris
                </h3>

                <p className="text-sm text-muted-foreground">
                    Ranking produk berdasarkan jumlah unit yang berhasil
                    terjual.
                </p>
            </div>

            {chartData.length === 0 ? (
                <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                    Belum ada data produk terjual.
                </div>
            ) : (
                <div className="h-[360px] w-full">
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                            />

                            <XAxis
                                type="number"
                                allowDecimals={false}
                            />

                            <YAxis
                                type="category"
                                dataKey="menuName"
                                width={170}
                            />

                            <Tooltip
                                formatter={(value, _, props) => {
                                    const item = props.payload;

                                    return [
                                        `${Number(value).toLocaleString(
                                            "id-ID"
                                        )} item (${item.percentage.toFixed(
                                            1
                                        )}%)`,
                                        "Terjual",
                                    ];
                                }}
                            />

                            <Bar
                                dataKey="quantity"
                                name="Terjual"
                                radius={[0, 6, 6, 0]}
                            >
                                {chartData.map((_, index) => (
                                    <Cell
                                        key={index}
                                        fill={
                                            COLORS[
                                            index % COLORS.length
                                            ]
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Total Produk Terjual
                    </span>

                    <span className="font-semibold">
                        {totalQuantity.toLocaleString("id-ID")} item
                    </span>
                </div>
            </div>
        </div>
    );
}