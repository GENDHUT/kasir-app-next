"use client";

import { useState } from "react";

import {
    exportHistoryPdf,
    type HistoryPdfData,
} from "@/server/helper/history"; 

interface HistoryPdfExportProps {
    data: HistoryPdfData;
}

export default function HistoryPdfExport({
    data,
}: HistoryPdfExportProps) {
    const [
        isExporting,
        setIsExporting,
    ] = useState(false);

    function handleExportPdf() {
        try {
            setIsExporting(true);

            exportHistoryPdf(
                data
            );
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <button
            type="button"
            onClick={
                handleExportPdf
            }
            disabled={
                isExporting
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
        >
            {isExporting
                ? "Membuat PDF..."
                : "Export PDF"}
        </button>
    );
}