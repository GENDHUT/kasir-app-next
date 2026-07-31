import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface HistoryPdfUserData {
    userId: string;
    userName: string;
    totalOrders: number;
    totalRevenue: number;
}

export interface HistoryPdfMenuData {
    menuId: string;
    menuName: string;
    totalQuantity: number;
    totalRevenue: number;
}

export interface HistoryPdfData {
    totalOrders: number;
    totalRevenue: number;
    users: HistoryPdfUserData[];
    topMenus: HistoryPdfMenuData[];
}

const PDF_CONFIG = {
    marginX: 14,
    headerY: 20,
    infoY: 28,
    dividerY: 33,

    summaryTitleY: 44,
    summaryTableY: 49,

    pageWidth: 196,
    pageBottom: 290,

    titleFontSize: 18,
    sectionFontSize: 13,
    normalFontSize: 10,
    footerFontSize: 8,
} as const;

const REPORT_TITLE =
    "Laporan Penjualan";

function createPdf() {
    return new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });
}

function getLastTableY(
    pdf: jsPDF
) {
    const lastAutoTable = (
        pdf as jsPDF & {
            lastAutoTable?: {
                finalY: number;
            };
        }
    ).lastAutoTable;

    return lastAutoTable?.finalY ?? 0;
}

function formatCurrency(
    value: number
) {
    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }
    ).format(value);
}

function getGeneratedAt() {
    return new Intl.DateTimeFormat(
        "id-ID",
        {
            dateStyle: "full",
            timeStyle: "short",
        }
    ).format(new Date());
}

function getFileName() {
    const date =
        new Date()
            .toISOString()
            .split("T")[0];

    return `laporan-penjualan-${date}.pdf`;
}

function generateHeader(
    pdf: jsPDF
) {
    pdf.setFontSize(
        PDF_CONFIG.titleFontSize
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.text(
        REPORT_TITLE,
        PDF_CONFIG.marginX,
        PDF_CONFIG.headerY
    );

    pdf.setFontSize(
        PDF_CONFIG.normalFontSize
    );

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.text(
        `Dibuat pada : ${getGeneratedAt()}`,
        PDF_CONFIG.marginX,
        PDF_CONFIG.infoY
    );

    pdf.setDrawColor(
        200,
        200,
        200
    );

    pdf.line(
        PDF_CONFIG.marginX,
        PDF_CONFIG.dividerY,
        PDF_CONFIG.pageWidth,
        PDF_CONFIG.dividerY
    );
}

function generateSummaryTable(
    pdf: jsPDF,
    data: HistoryPdfData
) {
    pdf.setFontSize(
        PDF_CONFIG.sectionFontSize
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.text(
        "Ringkasan Penjualan",
        PDF_CONFIG.marginX,
        PDF_CONFIG.summaryTitleY
    );

    autoTable(pdf, {
        startY:
            PDF_CONFIG.summaryTableY,

        theme: "grid",

        head: [[
            "Keterangan",
            "Nilai",
        ]],

        body: [
            [
                "Total Penjualan",
                `${data.totalOrders} transaksi`,
            ],
            [
                "Total Pendapatan",
                formatCurrency(
                    data.totalRevenue
                ),
            ],
        ],

        styles: {
            fontSize: 10,
            cellPadding: 4,
        },

        headStyles: {
            fontStyle: "bold",
        },
    });
}

function generateUserTable(
    pdf: jsPDF,
    data: HistoryPdfData
) {
    const startY =
        Math.max(
            getLastTableY(pdf),
            60
        ) + 15;

    pdf.setFontSize(
        PDF_CONFIG.sectionFontSize
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.text(
        "Penjualan dan Pendapatan Per User",
        PDF_CONFIG.marginX,
        startY
    );

    autoTable(pdf, {
        startY: startY + 5,

        theme: "grid",

        head: [[
            "User",
            "Total Penjualan",
            "Total Pendapatan",
        ]],

        body:
            data.users.length > 0
                ? data.users.map(
                    (user) => [
                        user.userName,
                        `${user.totalOrders} transaksi`,
                        formatCurrency(
                            user.totalRevenue
                        ),
                    ]
                )
                : [[
                    "-",
                    "0 transaksi",
                    formatCurrency(0),
                ]],

        styles: {
            fontSize: 9,
            cellPadding: 4,
        },

        headStyles: {
            fontStyle: "bold",
        },
    });
}

function generateTopMenuTable(
    pdf: jsPDF,
    data: HistoryPdfData
) {
    const startY =
        Math.max(
            getLastTableY(pdf),
            100
        ) + 15;
    pdf.setFontSize(
        PDF_CONFIG.sectionFontSize
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.text(
        "Menu Paling Laku",
        PDF_CONFIG.marginX,
        startY
    );

    autoTable(pdf, {
        startY: startY + 5,

        theme: "grid",

        head: [[
            "No",
            "Menu",
            "Jumlah Terjual",
            "Pendapatan",
        ]],

        body:
            data.topMenus.length > 0
                ? data.topMenus.map(
                    (
                        menu,
                        index
                    ) => [
                            index + 1,
                            menu.menuName,
                            `${menu.totalQuantity} item`,
                            formatCurrency(
                                menu.totalRevenue
                            ),
                        ]
                )
                : [[
                    "-",
                    "Belum ada data",
                    "0 item",
                    formatCurrency(0),
                ]],

        styles: {
            fontSize: 9,
            cellPadding: 4,
        },

        headStyles: {
            fontStyle: "bold",
        },
    });
}

function generateFooter(
    pdf: jsPDF
) {
    const pageCount =
        pdf.getNumberOfPages();

    for (
        let page = 1;
        page <= pageCount;
        page++
    ) {
        pdf.setPage(page);

        pdf.setFontSize(
            PDF_CONFIG.footerFontSize
        );

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.text(
            `Halaman ${page} dari ${pageCount}`,
            PDF_CONFIG.pageWidth,
            PDF_CONFIG.pageBottom,
            {
                align: "right",
            }
        );
    }
}

export function exportHistoryPdf(
    data: HistoryPdfData
) {
    const pdf =
        createPdf();

    generateHeader(
        pdf
    );

    generateSummaryTable(
        pdf,
        data
    );

    generateUserTable(
        pdf,
        data
    );

    generateTopMenuTable(
        pdf,
        data
    );

    generateFooter(
        pdf
    );

    pdf.save(
        getFileName()
    );
}