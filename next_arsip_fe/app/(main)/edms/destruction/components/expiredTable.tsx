"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Tag } from 'primereact/tag';
import { Calendar } from 'primereact/calendar';
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

const parseDateStr = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

const formatDateStr = (date: Date | null) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

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
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [reason, setReason] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        fetchExpiredData(selectedCategory);
    }, [selectedCategory, fetchExpiredData]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const itemDate = item.tanggal ? String(item.tanggal).slice(0, 10) : (item.RetentionEndDate ? String(item.RetentionEndDate).slice(0, 10) : '');
            if (startDate && itemDate && itemDate < startDate) return false;
            if (endDate && itemDate && itemDate > endDate) return false;
            return true;
        });
    }, [data, startDate, endDate]);

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

    const filterOverlayRef = React.useRef<any>(null);

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

                <div className="flex flex-column md:flex-row align-items-stretch md:align-items-center justify-content-between gap-3">
                    {/* Left: Date Range Filter */}
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <div className="p-inputgroup flex-1 sm:w-14rem">
                            <Calendar
                                value={parseDateStr(startDate)}
                                onChange={(e) => setStartDate(formatDateStr(e.value as Date))}
                                dateFormat="yy-mm-dd"
                                placeholder="YYYY-MM-DD"
                                showIcon
                                icon="pi pi-calendar"
                                className="text-xs w-full p-inputtext-sm"
                            />
                        </div>
                        <span className="text-xs font-semibold text-color-secondary px-1">s.d</span>
                        <div className="p-inputgroup flex-1 sm:w-14rem">
                            <Calendar
                                value={parseDateStr(endDate)}
                                onChange={(e) => setEndDate(formatDateStr(e.value as Date))}
                                dateFormat="yy-mm-dd"
                                placeholder="YYYY-MM-DD"
                                showIcon
                                icon="pi pi-calendar"
                                className="text-xs w-full p-inputtext-sm"
                            />
                        </div>
                    </div>

                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Button
                            type="button"
                            icon="pi pi-filter"
                            label="Filter"
                            outlined
                            severity="secondary"
                            size="small"
                            onClick={(e) => filterOverlayRef.current?.toggle(e)}
                            className="text-xs px-3"
                        />

                        <div className="p-input-icon-left flex-1 sm:w-16rem">
                            <i className="pi pi-search text-xs" />
                            <InputText
                                value={searchVal}
                                onChange={(e) => setSearchVal(e.target.value)}
                                placeholder="Cari Data..."
                                className="text-xs p-inputtext-sm w-full"
                            />
                        </div>

                        <Button
                            type="button"
                            icon="pi pi-filter-slash"
                            outlined
                            severity="danger"
                            size="small"
                            tooltip="Reset Filter"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => {
                                setSelectedCategory('');
                                setSearchVal('');
                                setStartDate('');
                                setEndDate('');
                            }}
                        />
                    </div>
                </div>

                <OverlayPanel ref={filterOverlayRef} showCloseIcon style={{ width: '320px' }}>
                    <div className="flex flex-column gap-3 p-1">
                        <div className="font-bold text-sm text-900 border-bottom-1 surface-border pb-2 flex align-items-center justify-content-between">
                            <span><i className="pi pi-filter text-primary mr-2" />Filter Kategori</span>
                            {selectedCategory && (
                                <Button label="Bersihkan"
                                    icon="pi pi-times"
                                    text
                                    severity="danger"
                                    size="small"
                                    className="p-0 text-xs"
                                    onClick={() => setSelectedCategory('')} />
                            )}
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="text-xs font-semibold text-700">Kategori Dokumen</label>
                            <Dropdown
                                value={selectedCategory}
                                options={categories.map(c => ({ label: `${c.kode_kategori_dokumen || ''} - ${c.nama_kategori_dokumen}`, value: c.kode_kategori_dokumen }))}
                                onChange={(e) => setSelectedCategory(e.value || '')}
                                placeholder="Pilih Kategori"
                                className="w-full text-xs p-inputtext-sm"
                                filter
                                showClear />
                        </div>
                    </div>
                </OverlayPanel>
            </div>
        );
    };

    return (
        <div className="px-3 pt-1 pb-3">
            <DataTable
                value={filteredData}
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
