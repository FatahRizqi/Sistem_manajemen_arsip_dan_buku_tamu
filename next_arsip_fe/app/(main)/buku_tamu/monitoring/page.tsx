"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'primereact/toast';
import postData from '@/lib/axios/postData';
import { apiEndpointMonitoring } from './components/endpoints';
import { DashboardStats } from './components/interfaces';
import MonitoringView from './components/display/monitoringView';

const MonitoringPage: React.FC = () => {
    const router = useRouter();
    const toast = useRef<Toast>(null);
    const [load, setLoad] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [timeRange, setTimeRange] = useState<string>('this_week');
    const [stats, setStats] = useState<DashboardStats>({
        total_tamu_hari_ini: 0,
        sedang_berkunjung: 0,
        selesai_kunjungan: 0,
        chart_mingguan: [0, 0, 0, 0, 0, 0, 0],
        chart_tujuan_labels: [],
        chart_tujuan_data: []
    });
    const [activeGuests, setActiveGuests] = useState<any[]>([]);

    const fetchMonitoringData = async (overrideRange?: string) => {
        setLoad(true);
        try {
            const currentRange = overrideRange || timeRange;
            const response = await postData(apiEndpointMonitoring, { time_range: currentRange });
            console.log("MONITORING RES:", response?.data);
            if (response?.data?.data) {
                setStats(response.data.data);
            }

            const resActive = await postData('/buku-tamu/visit-data', { Status: 'in', limit: 5 });
            if (resActive?.data?.data?.rows) {
                setActiveGuests(resActive.data.data.rows);
            }

            const now = new Date();
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
            setLastUpdated(timeStr);
        } catch (error: any) {
            console.error("Gagal mengambil data monitoring tamu:", error);
            // Default Fallbacks
            setStats({
                total_tamu_hari_ini: 0,
                sedang_berkunjung: 0,
                selesai_kunjungan: 0,
                chart_mingguan: [0, 0, 0, 0, 0, 0, 0],
                chart_tujuan_labels: [],
                chart_tujuan_data: []
            });
            setActiveGuests([]);
        } finally {
            setLoad(false);
        }
    };

    useEffect(() => {
        fetchMonitoringData(timeRange);
        const interval = setInterval(() => {
            fetchMonitoringData(timeRange);
        }, 30000);
        return () => clearInterval(interval);
    }, [timeRange]);

    return (
        <>
            <Toast ref={toast} position="top-right" />
            <MonitoringView
                stats={stats}
                activeGuests={activeGuests}
                load={load}
                lastUpdated={lastUpdated}
                onRefresh={() => fetchMonitoringData(timeRange)}
                timeRange={timeRange}
                setTimeRange={setTimeRange} />
        </>
    );
};

export default MonitoringPage;

