'use client'

import React from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { DashboardStats } from "@/app/(main)/buku_tamu/monitoring/components/interfaces";

interface ChartDisplayProps {
    stats: DashboardStats;
    timeRange?: string;
}

export default function ChartDisplay({ stats, timeRange = 'this_week' }: ChartDisplayProps) {
    let trendSubhead = 'Statistik volume kunjungan minggu ini.';
    if (timeRange === 'last_week') {
        trendSubhead = 'Statistik volume kunjungan minggu lalu.';
    } else if (timeRange === 'this_month') {
        trendSubhead = 'Statistik volume kunjungan harian bulan ini.';
    } else if (timeRange === 'this_year') {
        trendSubhead = 'Statistik volume kunjungan bulanan tahun ini.';
    }

    const lineChartData = {
        labels: stats.chart_trend_labels || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
        datasets: [
            {
                label: 'Jumlah Kunjungan',
                data: stats.chart_trend_data || stats.chart_mingguan || [0, 0, 0, 0, 0, 0, 0],
                fill: true,
                borderColor: '#6366f1', // Indigo primary color
                backgroundColor: 'rgba(99, 102, 241, 0.08)', // Indigo translucent area
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    };

    const hasPurposeData = Boolean(
        stats.chart_tujuan_data &&
        stats.chart_tujuan_data.length> 0 &&
        stats.chart_tujuan_data.some(val => val> 0)
    );

    const doughnutChartData = {
        labels: stats.chart_tujuan_labels || [],
        datasets: [
            {
                data: stats.chart_tujuan_data || [],
                backgroundColor: ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                hoverBackgroundColor: ['#4f46e5', '#0d9488', '#d97706', '#dc2626', '#7c3aed', '#db2777'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }
        ]
    };

    const lineChartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                padding: 10,
                bodyFont: {
                    family: "'Inter', sans-serif"
                },
                titleFont: {
                    family: "'Inter', sans-serif",
                    weight: 'bold'
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: '500'
                    }
                }
            },
            y: {
                grid: {
                    color: '#f1f5f9'
                },
                border: {
                    dash: [5, 5]
                },
                ticks: {
                    color: '#64748b',
                    stepSize: 1,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: '500'
                    }
                }
            }
        }
    };

    const doughnutChartOptions = {
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 8,
                    boxHeight: 8,
                    usePointStyle: true,
                    padding: 16,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: '500'
                    },
                    color: '#475569'
                }
            },
            tooltip: {
                padding: 10,
                bodyFont: {
                    family: "'Inter', sans-serif"
                }
            }
        }
    };

    return (
        <div className="grid mt-2">
            <div className="col-12 lg:col-8">
                <Card className="shadow-1 border-round-2xl border-none h-full" pt={{ body: { className: 'p-4 flex flex-column h-full' }, content: { className: 'flex-1 p-0 m-0' } }}>
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-start mb-4 gap-3">
                        <div>
                            <h2 className="m-0 text-900 font-bold text-xl mb-1" style={{ letterSpacing: '-0.02em' }}>Tren Kunjungan Tamu</h2>
                            <p className="m-0 text-color-secondary text-sm font-medium">{trendSubhead}</p>
                        </div>
                        <div className="flex align-items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 border-round-3xl font-semibold text-xs border-1 border-indigo-100 shadow-1" style={{ width: 'fit-content' }}>
                            <span className="border-circle bg-indigo-600" style={{ width: '8px', height: '8px' }}></span>
                            Tamu Berkunjung
                        </div>
                    </div>
                    <div style={{ height: '320px', position: 'relative' }}>
                        <Chart type="line" data={lineChartData} options={lineChartOptions} style={{ height: '100%' }} />
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-4">
                <Card className="shadow-1 border-round-2xl border-none h-full flex flex-column" pt={{ body: { className: 'p-4 flex flex-column h-full' }, content: { className: 'flex-1 p-0 m-0 flex flex-column' } }}>
                    <div className="mb-4">
                        <h2 className="m-0 text-900 font-bold text-xl mb-1" style={{ letterSpacing: '-0.02em' }}>Persentase Tujuan</h2>
                        <p className="m-0 text-color-secondary text-sm font-medium">Distribusi berdasarkan keperluan.</p>
                    </div>
                    <div className="flex justify-content-center align-items-center flex-grow-1" style={{ minHeight: '250px', position: 'relative' }}>
                        {hasPurposeData ? (
                            <Chart type="doughnut" data={doughnutChartData} options={doughnutChartOptions} style={{ width: '100%', maxWidth: '240px' }} />
                        ) : (
                            <div className="flex flex-column align-items-center justify-content-center py-4 text-center">
                                <div className="border-circle p-3 mb-2 flex align-items-center justify-content-center bg-gray-50" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-chart-pie text-2xl text-400" />
                                </div>
                                <h4 className="m-0 text-800 font-bold text-sm">Belum Ada Transaksi</h4>
                                <p className="m-0 text-color-secondary text-xs mt-1 max-w-15rem">
                                    Distribusi persentase tujuan akan otomatis muncul setelah ada transaksi pada periode ini.
                                </p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
