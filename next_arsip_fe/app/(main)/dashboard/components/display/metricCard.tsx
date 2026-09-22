import React from 'react';
import { Skeleton } from 'primereact/skeleton';
import { Card } from 'primereact/card';
import { useRouter } from 'next/navigation';

interface MetricCardsProps {
    data: {
        arsipAktif: number;
        tamuHariIni: number;
        menungguDisposisi: number;
        retensiExpired: number;
    };
    isLoading: boolean;
}

export default function MetricCards({ data, isLoading }: MetricCardsProps) {
    const router = useRouter();

    const vaMetrics = [
        {
            label: 'Arsip Aktif',
            value: data.arsipAktif.toLocaleString('id-ID'),
            icon: 'pi pi-folder-open',
            tone: 'indigo',
            to: '/edms/archive_document'
        },
        {
            label: 'Tamu Berkunjung',
            value: data.tamuHariIni.toLocaleString('id-ID'),
            note: 'aktif hari ini',
            icon: 'pi pi-id-card',
            tone: 'emerald',
            to: '/buku_tamu/monitoring'
        },
        {
            label: 'Surat Disposisi',
            value: data.menungguDisposisi.toLocaleString('id-ID'),
            note: 'menunggu tindak lanjut',
            icon: 'pi pi-inbox',
            tone: 'amber',
            to: '/correspondence/mail_in/disposition'
        },
        {
            label: 'Retensi Expired',
            value: data.retensiExpired.toLocaleString('id-ID'),
            note: 'perlu review',
            icon: 'pi pi-exclamation-triangle',
            tone: 'rose',
            to: '/edms/destruction'
        }
    ];

    const getColorClass = (tone: string) => {
        switch (tone) {
            case 'indigo': return 'text-indigo-600 bg-indigo-50';
            case 'emerald': return 'text-green-600 bg-green-50';
            case 'amber': return 'text-orange-600 bg-orange-50';
            case 'rose': return 'text-pink-600 bg-pink-50';
            default: return 'text-blue-600 bg-blue-50';
        }
    };

    if (isLoading) {
        return (
            <div className="grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="col-12 md:col-6 xl:col-3">
                        <Skeleton height="8.5rem" borderRadius="16px" className="shadow-1" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid">
            {vaMetrics.map((oMetric) => (
                <div
                    className="col-12 md:col-6 xl:col-3 cursor-pointer"
                    key={oMetric.label}
                    onClick={() => oMetric.to && router.push(oMetric.to)}
                    style={{ transition: 'all 0.2s ease-in-out' }}>
                    <Card className="shadow-1 border-round-2xl border-none h-full hover:shadow-3 hover:-translate-y-1 transition-all transition-duration-200" pt={{ body: { className: 'p-4' }, content: { className: 'p-0 m-0' } }}>
                        <div className="flex justify-content-between align-align-items-center">
                            <div>
                                <span className="block text-color-secondary font-semibold text-sm mb-2">{oMetric.label}</span>
                                <div className="text-900 font-extrabold text-3xl mb-2" style={{ letterSpacing: '-0.02em' }}>{oMetric.value}</div>
                                {oMetric.note && <span className="text-color-secondary text-xs font-medium bg-gray-50 px-2 py-1 border-round">{oMetric.note}</span>}
                            </div>
                            <div className={`flex align-items-center justify-content-center border-round-xl ${getColorClass(oMetric.tone)}`} style={{ width: '3rem', height: '3rem' }}>
                                <i className={`${oMetric.icon} text-xl`}></i>
                            </div>
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    );
}
