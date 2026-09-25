"use client";
import React from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import StatsCards from './statsCards';
import ChartDisplay from './chart';
import ActiveGuestsTable from './activeGuestsTable';
import { DashboardStats } from '../interfaces';

interface MonitoringViewProps {
    stats: DashboardStats;
    activeGuests: any[];
    load: boolean;
    lastUpdated?: Date | null | string;
    onRefresh: () => void;
    timeRange: string;
    setTimeRange: (val: string) => void;
}

export default function MonitoringView({
    stats,
    activeGuests,
    load,
    lastUpdated,
    onRefresh,
    timeRange,
    setTimeRange
}: MonitoringViewProps) {
    const timeRangeOptions = [
        { label: 'Minggu Ini', value: 'this_week' },
        { label: 'Minggu Lalu', value: 'last_week' },
        { label: 'Bulan Ini', value: 'this_month' },
        { label: 'Tahun Ini', value: 'this_year' }
    ];
    return (
        <div className="flex flex-column gap-4">
            {/* Custom Styles for Pulse Animation and Premium Cards */}
            <style jsx global>{`
                @keyframes pulse-live {
                    0% { transform: scale(0.95); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                .live-pulse-dot {
                    display: inline-block;
                    width: 7px;
                    height: 7px;
                    background-color: #10b981;
                    border-radius: 50%;
                    animation: pulse-live 2s infinite;
                }
                .premium-hover-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .premium-hover-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.08) !important;
                }
                .glow-blue:hover {
                    border-left: 4px solid #3b82f6 !important;
                }
                .glow-amber:hover {
                    border-left: 4px solid #f59e0b !important;
                }
                .glow-emerald:hover {
                    border-left: 4px solid #10b981 !important;
                }
            `}</style>


            {/* Header Section */}
            <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3">
                <div>
                    <div className="inline-flex align-items-center gap-2 px-3 py-1 border-round-lg bg-indigo-50 text-indigo-700 mb-2" style={{ border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                        <i className="pi pi-chart-line text-xs text-indigo-600" />
                        <span className="font-semibold text-xs" style={{ letterSpacing: '0.02em' }}>
                            Dashboard Pemantauan Buku Tamu
                        </span>
                    </div>
                    <h2 className="m-0 text-900 font-bold text-2xl mb-1 flex align-items-center gap-2">
                        <i className="pi pi-chart-line text-primary"></i>
                        <span>Monitoring Buku Tamu</span>
                    </h2>
                    <p className="m-0 text-color-secondary font-medium text-sm">
                        Pantau statistik kunjungan harian, tamu aktif, dan tren mingguan secara real-time.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0 align-self-start md:align-self-center align-items-center">
                    <Dropdown 
                        value={timeRange} 
                        options={timeRangeOptions} 
                        onChange={(e) => setTimeRange(e.value)} 
                        placeholder="Pilih Waktu" 
                        className="w-full md:w-14rem" />
                    <Button type="button"
                        icon={`pi pi-refresh ${load ? 'pi-spin' : ''}`}
                        label="Refresh"
                        outlined
                        severity="secondary"
                        className="py-2 px-3 border-round-lg font-semibold text-sm bg-white"
                        onClick={onRefresh}
                        loading={load} />
                </div>
            </div>

            {/* Stats Metrics Cards */}
            <StatsCards stats={stats} timeRange={timeRange} />

            {/* Charts Section */}
            <ChartDisplay stats={stats} timeRange={timeRange} />

            {/* Active Visitors List Section */}
            <ActiveGuestsTable activeGuests={activeGuests} />
        </div>
    );
}
