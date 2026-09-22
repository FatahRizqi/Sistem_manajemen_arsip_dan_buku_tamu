'use client'

import React, { useEffect, useState, useRef } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Timeline } from "primereact/timeline";
import { useParams, useRouter } from "next/navigation";
import getData from "@/lib/axios/getData";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import { showError } from "@/lib/tools/generalTools";
import {
    apiEndpointDocumentDetail,
    apiEndpointHistoryGet
} from "../../components/endpoints";
import { DetailData, DocumentHistoryData } from "../../components/interfaces";

const HistoryPage = () => {
    const toast = useRef<Toast>(null);
    const router = useRouter();
    const params = useParams();
    const documentId = Number(Array.isArray(params.document_id) ? params.document_id[0] : params.document_id);

    const [load, setLoad] = useState(false);
    const [detailData, setDetailData] = useState<DetailData | null>(null);
    const [historyList, setHistoryList] = useState<DocumentHistoryData[]>([]);

    const fetchData = async () => {
        if (!documentId) return;

        setLoad(true);
        try {
            // Fetch document metadata
            const docRes = await getData(apiEndpointDocumentDetail, { id_dokumen: documentId });
            const docData = docRes.data?.data || null;
            setDetailData(docData);

            if (docData?.document?.kode_dokumen) {
                // Fetch audit history
                const histRes = await getData(apiEndpointHistoryGet, { kode_dokumen: docData.document.kode_dokumen });
                setHistoryList(histRes.data?.data || []);
            }
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengambil riwayat perubahan dokumen');
        } finally {
            setLoad(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [documentId]);

    const getActionBadge = (aksi: string) => {
        switch (aksi) {
            case 'create':
                return { label: 'Dokumen Dibuat', severity: 'success', icon: 'pi pi-plus-circle' };
            case 'update':
                return { label: 'Perubahan Metadata', severity: 'info', icon: 'pi pi-pencil' };
            case 'delete':
                return { label: 'Dokumen Dihapus', severity: 'danger', icon: 'pi pi-trash' };
            case 'version_upload':
                return { label: 'Upload Versi Baru', severity: 'warning', icon: 'pi pi-upload' };
            case 'version_approve':
                return { label: 'Versi Disetujui', severity: 'success', icon: 'pi pi-check-circle' };
            case 'version_reject':
                return { label: 'Versi Ditolak', severity: 'danger', icon: 'pi pi-times-circle' };
            case 'version_rollback':
                return { label: 'Rollback Versi', severity: 'warning', icon: 'pi pi-replay' };
            case 'loan':
                return { label: 'Peminjaman Arsip', severity: 'info', icon: 'pi pi-book' };
            case 'return':
                return { label: 'Pengembalian Arsip', severity: 'success', icon: 'pi pi-inbox' };
            default:
                return { label: aksi, severity: 'secondary', icon: 'pi pi-info-circle' };
        }
    };

    const customizedMarker = (item: DocumentHistoryData) => {
        const badge = getActionBadge(item.aksi);
        let colorBg = 'bg-blue-500';
        if (badge.severity === 'success') colorBg = 'bg-green-500';
        if (badge.severity === 'danger') colorBg = 'bg-red-500';
        if (badge.severity === 'warning') colorBg = 'bg-yellow-500';

        return (
            <span className={`flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1 ${colorBg}`}>
                <i className={`${badge.icon} text-sm`} />
            </span>
        );
    };

    const customizedContent = (item: DocumentHistoryData) => {
        const badge = getActionBadge(item.aksi);

        return (
            <Card className="mb-3 shadow-1 border-round-xl border-1 surface-border">
                <div className="flex flex-column gap-2">
                    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="flex align-items-center gap-2">
                            <Tag value={badge.label} severity={badge.severity as any} />
                            <span className="font-semibold text-color text-base">{item.deskripsi}</span>
                        </div>
                        <span className="text-xs text-color-secondary font-mono">
                            {formatDateCalendar(item.created_at, 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-color-secondary mt-1">
                        <div><i className="pi pi-user mr-1" />Oleh: <strong>{item.dilakukan_oleh}</strong></div>
                        {item.ip_alamat && <div><i className="pi pi-desktop mr-1" />IP: {item.ip_alamat}</div>}
                    </div>

                    {item.detail_json && Object.keys(item.detail_json).length> 0 && (
                        <div className="mt-2 surface-100 p-3 border-round-lg text-xs">
                            <div className="font-semibold text-color mb-2">
                                {item.aksi === 'update' ? 'Detail Perubahan Field:' : 'Detail Informasi:'}
                            </div>
                            <div className="grid">
                                {Object.entries(item.detail_json).map(([field, change]: [string, any]) => {
                                    const isDiff = change && typeof change === 'object' && ('lama' in change || 'baru' in change);
                                    return (
                                        <div key={field} className="col-12 md:col-6">
                                            <div className="font-semibold text-color-secondary">{field}:</div>
                                            {isDiff ? (
                                                <div className="flex align-items-center gap-2 mt-1">
                                                    <span className="line-through text-red-500">{String(change?.lama ?? 'kosong')}</span>
                                                    <i className="pi pi-arrow-right text-xs text-color-secondary" />
                                                    <span className="font-bold text-green-600">{String(change?.baru ?? 'kosong')}</span>
                                                </div>
                                            ) : (
                                                <div className="font-bold text-green-600 mt-1">
                                                    {String(change ?? '-')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    return (
        <>

            <Toast ref={toast} position="top-right" />

            <div className="card p-5 mb-4 border-round-xl shadow-1">
                <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-3">
                    <div>
                        <Button type="button"
                            icon="pi pi-arrow-left"
                            label="Kembali ke Daftar Versi"
                            text
                            className="p-0 mb-2 text-primary"
                            onClick={() => router.push(`/edms/archive_document/${documentId}/versions`)} />
                        <h2 className="text-3xl font-bold text-color mb-1 flex align-items-center gap-2">
                            <i className="pi pi-clock text-primary text-3xl" />
                            Riwayat Perubahan Dokumen (Audit Trail)
                        </h2>
                        <span className="text-color-secondary text-sm">
                            {detailData?.document?.nomor_dokumen || '-'} — {detailData?.document?.nama_dokumen || '-'}
                        </span>
                    </div>

                    <Button label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        loading={load}
                        onClick={fetchData} />
                </div>

                <Divider />

                {load ? (
                    <div className="flex flex-column align-items-center justify-content-center py-6">
                        <i className="pi pi-spin pi-spinner text-4xl text-primary mb-3" />
                        <span className="text-color-secondary">Memuat riwayat perubahan...</span>
                    </div>
                ) : historyList.length === 0 ? (
                    <div className="text-center py-6 surface-50 border-round-xl">
                        <i className="pi pi-history text-5xl text-color-secondary mb-3" />
                        <h4 className="text-xl font-bold text-color mb-1">Belum Ada Riwayat Perubahan</h4>
                        <p className="text-color-secondary text-sm m-0">
                            Aktivitas perubahan dokumen akan tercatat secara otomatis di sini.
                        </p>
                    </div>
                ) : (
                    <div className="pt-3">
                        <Timeline
                            value={historyList}
                            marker={customizedMarker}
                            content={customizedContent}
                            className="customized-timeline" />
                    </div>
                )}
            </div>
        </>
    );
};

export default HistoryPage;
