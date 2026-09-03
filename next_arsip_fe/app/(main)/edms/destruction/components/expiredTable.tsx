"use client";
import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { usePermissions } from '@/hooks/usePermissions';
import { showError, showSuccess } from '@/lib/tools/generalTools';

interface ExpiredTableProps {
    toast: React.RefObject<any>;
    data: any[];
    categories: any[];
    loading: boolean;
    fetchExpiredData: (category: string) => void;
    proposeDestruction: (kode: string, alasan: string) => Promise<boolean>;
    refreshProposals: () => void;
}

export default function ExpiredTable({ 
    toast, 
    data, 
    categories, 
    loading, 
    fetchExpiredData, 
    proposeDestruction, 
    refreshProposals 
}: ExpiredTableProps) {
    const { canCreate } = usePermissions();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchVal, setSearchVal] = useState<string>('');
    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [reason, setReason] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        fetchExpiredData(selectedCategory);
    }, [selectedCategory, fetchExpiredData]);

    const handleProposeDestruction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            showError(toast, 'Alasan pemusnahan wajib diisi');
            return;
        }

        setSubmitting(true);
        try {
            await proposeDestruction(selectedDoc.kode_dokumen, reason);
            setDialogVisible(false);
            setSelectedDoc(null);
            setReason('');
            fetchExpiredData(selectedCategory);
            refreshProposals();
        } catch (error: any) {
            // Error handled by parent
        } finally {
            setSubmitting(false);
        }
    };

    const actionTextTemplate = (rowData: any) => {
        let bg = '#ef4444';
        let label = 'Musnahkan';

        if (rowData.tindakan_retensi === 'review') {
            bg = '#f59e0b';
            label = 'Tinjau Kembali';
        } else if (rowData.tindakan_retensi === 'permanent') {
            bg = '#22c55e';
            label = 'Permanen';
        }

        return (
            <span className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-white text-xs font-semibold" style={{ background: bg, borderRadius: '4px' }}>
                {label}
            </span>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        const hasProposal = Boolean(rowData.ActiveProposalStatus);
        
        if (hasProposal) {
            let bgClass = "bg-orange-500";
            let icon = "pi pi-clock";
            let label = "Diproses";
            if (rowData.ActiveProposalStatus === 'approved') {
                bgClass = "bg-blue-500";
                icon = "pi pi-check";
                label = "Disetujui";
            } else if (rowData.ActiveProposalStatus === 'rejected') {
                bgClass = "bg-red-500";
                icon = "pi pi-times";
                label = "Ditolak";
            }
            return (
                <div className="flex justify-content-center">
                    <div className={`${bgClass} flex align-items-center justify-content-center`} style={{ width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0 }} title={`Usulan: ${label}`}>
                        <i className={`${icon} text-white`} style={{ fontSize: '0.8rem' }}></i>
                    </div>
                </div>
            );
        }

        return (
            <Button type="button"
                label="Usulkan"
                icon="pi pi-file-export"
                size="small"
                outlined
                severity="danger"
                disabled={!canCreate}
                className="p-button-sm py-1 font-semibold text-xs"
                onClick={() => {
                    setSelectedDoc(rowData);
                    setDialogVisible(true);
                }} />
        );
    };

    const formatDate = (val: string) => {
        if (!val) return '-';
        return new Date(val).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderHeader = () => {
        return (
            <div className="flex flex-column gap-3">
                <div className="flex align-items-center gap-3 surface-50 p-2 border-round text-sm w-fit" style={{ border: "1px solid var(--surface-200)" }}>
                    <div className="flex align-items-center gap-2 font-semibold text-600">
                        <i className="pi pi-info-circle"></i> KETERANGAN STATUS:
                    </div>
                    <div className="flex align-items-center gap-2 ml-2">
                        <div className="bg-orange-500 flex align-items-center justify-content-center" style={{ width: "18px", height: "18px", borderRadius: "3px" }}>
                            <i className="pi pi-clock text-white" style={{ fontSize: "0.6rem" }}></i>
                        </div>
                        <span className="text-700 font-medium text-xs">Diproses</span>
                    </div>
                    <div className="flex align-items-center gap-2 ml-2">
                        <div className="bg-blue-500 flex align-items-center justify-content-center" style={{ width: "18px", height: "18px", borderRadius: "3px" }}>
                            <i className="pi pi-check text-white" style={{ fontSize: "0.6rem" }}></i>
                        </div>
                        <span className="text-700 font-medium text-xs">Disetujui</span>
                    </div>
                    <div className="flex align-items-center gap-2 ml-2">
                        <div className="bg-red-500 flex align-items-center justify-content-center" style={{ width: "18px", height: "18px", borderRadius: "3px" }}>
                            <i className="pi pi-times text-white" style={{ fontSize: "0.6rem" }}></i>
                        </div>
                        <span className="text-700 font-medium text-xs">Ditolak</span>
                    </div>
                </div>
                <div className="flex flex-wrap align-items-center justify-content-between gap-3 text-sm">
                    <span className="font-bold text-color">Dokumen Kedaluwarsa JRA</span>
                    <div className="flex gap-2 align-items-center">
                        <Dropdown
                            value={selectedCategory}
                            options={categories.map(c => ({ label: c.nama_kategori_dokumen, value: c.kode_kategori_dokumen }))}
                            onChange={(e) => setSelectedCategory(e.value)}
                            placeholder="Filter Kategori"
                            showClear
                            className="text-xs"
                            style={{ minWidth: '15rem', height: '2.25rem' }} />
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText
                                value={searchVal}
                                onChange={(e) => setSearchVal(e.target.value)}
                                placeholder="Cari dokumen..."
                                className="text-sm"
                                style={{ height: '2.25rem' }} />
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="px-3 pt-1 pb-3">
            <DataTable
                value={data}
                paginator
                rows={10}
                header={renderHeader()}
                globalFilter={searchVal}
                emptyMessage="Tidak ada dokumen kedaluwarsa retensi ditemukan."
                loading={loading}
                className="text-sm"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first}-{last} dari {totalRecords} data">
                <Column body={actionBodyTemplate} header="Status Pernyataan" align="center" style={{ width: '80px' }}></Column>
                <Column field="kode_dokumen" header="Kode Dokumen" sortable className="font-semibold text-primary"></Column>
                <Column field="nomor_dokumen" header="No. Dokumen" sortable></Column>
                <Column field="nama_dokumen" header="Nama Dokumen" sortable style={{ minWidth: '200px' }}></Column>
                <Column field="nama_kategori_dokumen" header="Kategori" sortable></Column>
                <Column field="tanggal" header="Tgl. Dokumen" sortable body={rowData => formatDate(rowData.tanggal)}></Column>
                <Column field="tahun_retensi" header="Masa Retensi" body={rowData => `${rowData.tahun_retensi} Thn`} sortable></Column>
                <Column body={actionTextTemplate} header="Tindakan JRA" sortable field="tindakan_retensi"></Column>
                <Column field="RetentionEndDate" header="Berakhir Retensi" sortable body={rowData => formatDate(rowData.RetentionEndDate)}></Column>
            </DataTable>

            <Dialog
                visible={dialogVisible}
                header="Ajukan Pemusnahan Dokumen"
                modal
                style={{ width: '35rem' }}
                onHide={() => {
                    setDialogVisible(false);
                    setSelectedDoc(null);
                    setReason('');
                }}>
                {selectedDoc && (
                    <form onSubmit={handleProposeDestruction} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                        <div className="surface-50 p-3 border-round border-1 surface-border">
                            <div className="mb-2"><strong>Nomor Dokumen:</strong> {selectedDoc.nomor_dokumen}</div>
                            <div className="mb-2"><strong>Nama Dokumen:</strong> {selectedDoc.nama_dokumen}</div>
                            <div className="mb-2"><strong>Jadwal Retensi:</strong> {selectedDoc.nama_retensi} ({selectedDoc.tahun_retensi} Tahun)</div>
                            <div><strong>Tindakan:</strong> {selectedDoc.tindakan_retensi === 'destroy' ? 'Musnahkan' : 'Tinjau Kembali'}</div>
                        </div>

                        <div className="flex flex-column gap-2">
                            <label htmlFor="alasan_usulan" className="text-sm">
                                Alasan Pemusnahan <span className="text-red-500">*</span>
                            </label>
                            <InputTextarea
                                id="alasan_usulan"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                                required
                                placeholder="Masukkan alasan mengapa dokumen ini diusulkan untuk dimusnahkan..." />
                        </div>

                        <div className="mt-2">
                            <Button type="submit"
                                label="Usulkan"
                                className="w-full p-button-primary"
                                loading={submitting} />
                        </div>
                    </form>
                )}
            </Dialog>
        </div>
    );
}
