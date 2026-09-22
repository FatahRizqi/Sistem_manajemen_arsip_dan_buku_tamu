'use client'

import postData from "@/lib/axios/postData";
import { showError } from "@/lib/tools/generalTools";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";

const apiEndpointStats = "/correspondence/outgoing-letter-dashboard";

interface DashboardStats {
    summary: {
        terkirim: number;
        disetujui: number;
        ditolak: number;
        menungguApproval: number;
        total: number;
    };
    chartData: {
        labels: string[];
        datasets: any[];
    };
}

const Page = () => {
    const toast = useRef<Toast>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await postData(apiEndpointStats, {});
            setStats(res.data?.data || null);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Data statistik dashboard gagal diambil");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const chartOptions = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: "#495057",
                },
                position: "bottom",
            },
        },
        scales: {
            x: {
                ticks: {
                    color: "#495057",
                },
                grid: {
                    color: "#ebedef",
                },
            },
            y: {
                ticks: {
                    color: "#495057",
                    stepSize: 1,
                },
                grid: {
                    color: "#ebedef",
                },
                min: 0,
            },
        },
    };

    return (
        <div className="flex flex-column gap-4 w-full">
            <Toast ref={toast} position="top-right" />

            {/* ─── Hero / Header Section ───────────────────────────────────── */}
            <Card className="border-none shadow-1 border-round-2xl overflow-hidden relative">
                <div className="flex flex-column md:flex-row align-items-center justify-content-between gap-3 z-1 relative">
                    <div>
                        <span className="text-primary font-bold text-xs uppercase" style={{ letterSpacing: "0.1em" }}>
                            Analisis & Laporan
                        </span>
                        <h1 className="m-0 text-900 font-extrabold text-3xl mt-1 mb-2" style={{ letterSpacing: "-0.03em" }}>
                            Dashboard Surat Keluar
                        </h1>
                        <p className="m-0 text-color-secondary text-sm font-medium">
                            Visualisasi data, tracking alur pengiriman, dan grafik status surat keluar secara real-time.
                        </p>
                    </div>
                    <Button icon="pi pi-refresh"
                        outlined
                        loading={loading}
                        label="Refresh Data"
                        onClick={fetchStats}
                        />
                </div>
            </Card>

            {/* ─── Metrics Cards Grid ───────────────────────────────────────── */}
            <div className="grid">
                <div className="col-12 sm:col-6 lg:col-3">
                    <Card className="border-none shadow-1 border-round-xl p-1 bg-white h-full">
                        <div className="flex align-items-center gap-3">
                            <div className="flex align-items-center justify-content-center border-round-xl" style={{ width: "3.5rem", height: "3.5rem", background: "#EEF2FF", color: "#4F46E5" }}>
                                <i className="pi pi-send text-2xl" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: "0.05em" }}>
                                    Total Terkirim
                                </span>
                                <div className="text-3xl font-extrabold text-900 mt-1">
                                    {stats?.summary?.terkirim.toLocaleString("id-ID") || 0}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <Card className="border-none shadow-1 border-round-xl p-1 bg-white h-full">
                        <div className="flex align-items-center gap-3">
                            <div className="flex align-items-center justify-content-center border-round-xl" style={{ width: "3.5rem", height: "3.5rem", background: "#E0F2FE", color: "#0284c7" }}>
                                <i className="pi pi-check-circle text-2xl" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: "0.05em" }}>
                                    Disetujui / Diterima
                                </span>
                                <div className="text-3xl font-extrabold text-900 mt-1">
                                    {stats?.summary?.disetujui.toLocaleString("id-ID") || 0}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <Card className="border-none shadow-1 border-round-xl p-1 bg-white h-full">
                        <div className="flex align-items-center gap-3">
                            <div className="flex align-items-center justify-content-center border-round-xl" style={{ width: "3.5rem", height: "3.5rem", background: "#FEE2E2", color: "#DC2626" }}>
                                <i className="pi pi-times-circle text-2xl" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: "0.05em" }}>
                                    Ditolak
                                </span>
                                <div className="text-3xl font-extrabold text-900 mt-1">
                                    {stats?.summary?.ditolak.toLocaleString("id-ID") || 0}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <Card className="border-none shadow-1 border-round-xl p-1 bg-white h-full">
                        <div className="flex align-items-center gap-3">
                            <div className="flex align-items-center justify-content-center border-round-xl" style={{ width: "3.5rem", height: "3.5rem", background: "#FEF3C7", color: "#D97706" }}>
                                <i className="pi pi-clock text-2xl" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: "0.05em" }}>
                                    Menunggu Approval
                                </span>
                                <div className="text-3xl font-extrabold text-900 mt-1">
                                    {stats?.summary?.menungguApproval.toLocaleString("id-ID") || 0}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* ─── Chart Section ────────────────────────────────────────────── */}
            <Card className="border-none shadow-1 border-round-2xl p-3 bg-white">
                <div className="flex align-items-center gap-2 mb-4">
                    <i className="pi pi-chart-line text-primary" />
                    <span className="font-bold text-900 text-lg">Grafik Aktivitas Surat Keluar (7 Hari Terakhir)</span>
                </div>
                {loading ? (
                    <div className="flex flex-column align-items-center justify-content-center py-8 gap-3 text-color-secondary">
                        <i className="pi pi-spin pi-spinner text-3xl text-primary" />
                        <span className="text-sm font-medium">Memuat data grafik...</span>
                    </div>
                ) : stats?.chartData ? (
                    <div style={{ height: "400px" }}>
                        <Chart type="line" data={stats.chartData} options={chartOptions} style={{ height: "100%" }} />
                    </div>
                ) : (
                    <div className="flex flex-column align-items-center justify-content-center py-8 gap-2 text-color-secondary">
                        <i className="pi pi-chart-bar text-4xl text-300" />
                        <span className="text-sm font-medium">Data grafik tren tidak tersedia</span>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Page;
