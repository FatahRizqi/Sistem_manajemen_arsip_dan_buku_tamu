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
import { usePermissions } from '@/layout/context/permissionContext';
import { showError } from '@/lib/tools/generalTools';

interface ProposalTableProps {
    toast: React.RefObject<any>;
    data: any[];
    loading: boolean;
    fetchProposals: (statusFilter: string) => void;
    reviewProposal: (id: number, status: string, notes: string) => Promise<boolean>;
    executeProposal: (id: number, file: string) => Promise<boolean>;
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

export default function ProposalTable({ 
    toast, 
    data, 
    loading, 
    fetchProposals, 
    reviewProposal, 
    executeProposal 
}: ProposalTableProps) {
    const { canApprove, canDelete } = usePermissions();

    const [searchVal, setSearchVal] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Review Dialog States
    const [reviewDialog, setReviewDialog] = useState<boolean>(false);
    const [selectedProposal, setSelectedProposal] = useState<any>(null);
    const [reviewStatus, setReviewStatus] = useState<string>('approved');
    const [reviewNotes, setReviewNotes] = useState<string>('');
    const [submittingReview, setSubmittingReview] = useState<boolean>(false);

    // Execution Dialog States
    const [executeDialog, setExecuteDialog] = useState<boolean>(false);
    const [baFile, setBaFile] = useState<string>('');
    const [submittingExecution, setSubmittingExecution] = useState<boolean>(false);

    useEffect(() => {
        fetchProposals(statusFilter);
    }, [statusFilter, fetchProposals]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const itemDate = item.tanggal_usulan ? String(item.tanggal_usulan).slice(0, 10) : (item.created_at ? String(item.created_at).slice(0, 10) : '');
            if (startDate && itemDate && itemDate < startDate) return false;
            if (endDate && itemDate && itemDate > endDate) return false;
            return true;
        });
    }, [data, startDate, endDate]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProposal) return;

        setSubmittingReview(true);
        try {
            await reviewProposal(selectedProposal.id_usulan, reviewStatus, reviewNotes);
            setReviewDialog(false);
            setSelectedProposal(null);
            setReviewNotes('');
            fetchProposals(statusFilter);
        } catch (error: any) {
            // Handled by parent
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleExecuteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProposal) return;
        if (!baFile.trim()) {
            showError(toast, 'Nomor/File Berita Acara wajib diisi');
            return;
        }

        setSubmittingExecution(true);
        try {
            await executeProposal(selectedProposal.id_usulan, baFile);
            setExecuteDialog(false);
            setSelectedProposal(null);
            setBaFile('');
            fetchProposals(statusFilter);
        } catch (error: any) {
            // Handled by parent
        } finally {
            setSubmittingExecution(false);
        }
    };

    const statusBodyTemplate = (rowData: any) => {
        let bg = '#f59e0b';
        let iconClass = 'pi-clock';
        let label = 'Menunggu Tinjauan';

        switch (rowData.status) {
            case 'submitted':
                bg = '#f59e0b';
                iconClass = 'pi-clock';
                label = 'Menunggu Tinjauan';
                break;
            case 'approved':
                bg = '#a855f7';
                iconClass = 'pi-check-circle';
                label = 'Disetujui (Siap Musnah)';
                break;
            case 'rejected':
                bg = '#ef4444';
                iconClass = 'pi-times';
                label = 'Ditolak';
                break;
            case 'executed':
                bg = '#3b82f6';
                iconClass = 'pi-trash';
                label = 'Telah Dimusnahkan';
                break;
            default:
                label = rowData.status || '-';
                break;
        }

        return (
            <div className="flex align-items-center justify-content-center">
                <div
                    className="w-2rem h-2rem border-round flex align-items-center justify-content-center text-white shadow-1"
                    style={{ background: bg, borderRadius: '8px' }}
                    title={label}
                >
                    <i className={`pi ${iconClass} text-xs font-bold`} />
                </div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        const isSubmitted = rowData.status === 'submitted';
        const isApproved = rowData.status === 'approved';

        return (
            <div className="flex gap-2 justify-content-center">
                {isSubmitted && (
                    <Button type="button"
                        label="Review"
                        icon="pi pi-shield"
                        severity="warning"
                        outlined
                        className="py-1 font-semibold text-xs"
                        disabled={!canApprove}
                        onClick={() => {
                            setSelectedProposal(rowData);
                            setReviewDialog(true);
                        }} />
                )}
                {isApproved && (
                    <Button type="button"
                        label="Eksekusi"
                        icon="pi pi-trash"
                        severity="danger"
                        className="py-1 font-semibold text-xs"
                        disabled={!canDelete && !canApprove}
                        onClick={() => {
                            setSelectedProposal(rowData);
                            setExecuteDialog(true);
                        }} />
                )}
                {!isSubmitted && !isApproved && (
                    <span className="text-gray-400 text-xs italic">-</span>
                )}
            </div>
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

    const statusOptions = [
        { label: 'Setujui Usulan', value: 'approved' },
        { label: 'Tolak Usulan', value: 'rejected' }
    ];

    const proposalStatusFilterOptions = [
        { label: 'Menunggu Tinjauan', value: 'submitted' },
        { label: 'Disetujui', value: 'approved' },
        { label: 'Ditolak', value: 'rejected' },
        { label: 'Telah Dimusnahkan', value: 'executed' }
    ];

    const filterOverlayRef = React.useRef<any>(null);

    const renderHeader = () => {
        return (
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
                    <Button type="button"
                        icon="pi pi-filter"
                        label="Filter"
                        outlined
                        severity="secondary"
                        onClick={(e) => filterOverlayRef.current?.toggle(e)}
                        className="px-3"
                    />

                    <div className="p-input-icon-left flex-1 sm:w-24rem">
                        <i className="pi pi-search" />
                        <InputText
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            placeholder="Cari Data..."
                            className="w-full"
                        />
                    </div>

                    <Button type="button"
                        icon="pi pi-filter-slash"
                        outlined
                        severity="danger"
                        tooltip="Reset Filter"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => {
                            setStatusFilter('');
                            setSearchVal('');
                            setStartDate('');
                            setEndDate('');
                        }}
                    />
                </div>

                <OverlayPanel ref={filterOverlayRef} showCloseIcon style={{ width: '320px' }}>
                    <div className="flex flex-column gap-3 p-1">
                        <div className="font-bold text-sm text-900 border-bottom-1 surface-border pb-2 flex align-items-center justify-content-between">
                            <span><i className="pi pi-filter text-primary mr-2" />Filter Status Usulan</span>
                            {statusFilter && (
                                <Button label="Bersihkan"
                                    icon="pi pi-times"
                                    text
                                    severity="danger"
                                    className="p-0 text-xs"
                                    onClick={() => setStatusFilter('')} />
                            )}
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="text-xs font-semibold text-700">Status Permohonan</label>
                            <Dropdown
                                value={statusFilter}
                                options={proposalStatusFilterOptions}
                                onChange={(e) => setStatusFilter(e.value || '')}
                                placeholder="Pilih Status"
                                className="w-full text-xs p-inputtext-sm"
                                showClear />
                        </div>
                    </div>
                </OverlayPanel>
            </div>
        );
    };

    return (
        <div className="px-3 pt-1 pb-3">
            {/* KETERANGAN STATUS BAR */}
            <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1 w-full" style={{ marginTop: '-0.25rem' }}>
                <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                    <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '4px' }}></span>
                    <span className="text-700">Menunggu Tinjauan</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#a855f7', borderRadius: '4px' }}></span>
                    <span className="text-700">Disetujui</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></span>
                    <span className="text-700">Telah Dimusnahkan</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#ef4444', borderRadius: '4px' }}></span>
                    <span className="text-700">Ditolak</span>
                </div>
            </div>

            <DataTable
                value={filteredData}
                paginator
                rows={10}
                header={renderHeader()}
                globalFilter={searchVal}
                emptyMessage="Tidak ada usulan pemusnahan ditemukan."
                loading={loading}
                className="text-sm"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first}-{last} dari {totalRecords} data">
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }}></Column>
                <Column field="kode_dokumen" header="Kode Dokumen" sortable className="font-semibold text-primary"></Column>
                <Column field="nomor_dokumen" header="No. Dokumen" sortable></Column>
                <Column field="nama_dokumen" header="Nama Dokumen" sortable style={{ minWidth: '150px' }}></Column>
                <Column field="alasan_usulan" header="Alasan Usulan" sortable></Column>
                <Column field="diusulkan_oleh" header="Pengusul" sortable></Column>
                <Column field="diusulkan_pada" header="Tgl. Usulan" sortable body={rowData => formatDate(rowData.diusulkan_pada)}></Column>
                <Column field="ditinjau_oleh" header="Peninjau" sortable body={rowData => rowData.ditinjau_oleh || '-'}></Column>
                <Column field="catatan_tinjauan" header="Catatan Tinjauan" sortable body={rowData => rowData.catatan_tinjauan || '-'}></Column>
                <Column field="file_berita_acara" header="Berita Acara" sortable body={rowData => rowData.file_berita_acara || '-'}></Column>
                <Column body={actionBodyTemplate} header="Aksi" style={{ width: '130px', textAlign: 'center' }}></Column>
            </DataTable>

            {/* Review Dialog */}
            <Dialog
                visible={reviewDialog}
                header="Tinjau Usulan Pemusnahan"
                modal
                style={{ width: '35rem' }}
                onHide={() => {
                    setReviewDialog(false);
                    setSelectedProposal(null);
                    setReviewNotes('');
                }}>
                {selectedProposal && (
                    <form onSubmit={handleReviewSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                        <div className="surface-50 p-3 border-round border-1 surface-border">
                            <div className="mb-2"><strong>Dokumen:</strong> {selectedProposal.nama_dokumen} ({selectedProposal.nomor_dokumen})</div>
                            <div className="mb-2"><strong>Alasan Usulan:</strong> {selectedProposal.alasan_usulan}</div>
                            <div><strong>Diusulkan Oleh:</strong> {selectedProposal.diusulkan_oleh} ({formatDate(selectedProposal.diusulkan_pada)})</div>
                        </div>

                        <div className="flex flex-column gap-2">
                            <label className="text-sm">Keputusan Tinjauan <span className="text-red-500">*</span></label>
                            <Dropdown
                                value={reviewStatus}
                                options={statusOptions}
                                onChange={(e) => setReviewStatus(e.value)}
                                className="w-full" />
                        </div>

                        <div className="flex flex-column gap-2">
                            <label htmlFor="catatan_tinjauan" className="text-sm">Catatan Tinjauan</label>
                            <InputTextarea
                                id="catatan_tinjauan"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={3}
                                placeholder="Masukkan catatan penolakan atau instruksi persetujuan..." />
                        </div>

                        <div className="mt-2">
                            <Button type="submit"
                                label="Tinjau"
                                className="w-full p-button-primary"
                                loading={submittingReview} />
                        </div>
                    </form>
                )}
            </Dialog>

            {/* Execution Dialog */}
            <Dialog
                visible={executeDialog}
                header="Eksekusi Pemusnahan Dokumen"
                modal
                style={{ width: '35rem' }}
                onHide={() => {
                    setExecuteDialog(false);
                    setSelectedProposal(null);
                    setBaFile('');
                }}>
                {selectedProposal && (
                    <form onSubmit={handleExecuteSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                        <div className="surface-50 p-3 border-round border-1 surface-border">
                            <div className="mb-2"><strong>Dokumen:</strong> {selectedProposal.nama_dokumen} ({selectedProposal.nomor_dokumen})</div>
                            <div className="mb-2"><strong>Alasan Usulan:</strong> {selectedProposal.alasan_usulan}</div>
                            <div><strong>Disetujui Oleh:</strong> {selectedProposal.ditinjau_oleh} ({formatDate(selectedProposal.ditinjau_pada)})</div>
                        </div>

                        <div className="flex flex-column gap-2">
                            <label htmlFor="file_berita_acara" className="text-sm">
                                Nomor / File Berita Acara <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="file_berita_acara"
                                value={baFile}
                                onChange={(e) => setBaFile(e.target.value)}
                                required
                                placeholder="Contoh: BA-PEMUSNAHAN/2026/001" />
                            <small className="text-color-secondary mt-1">
                                Memasukkan data ini menandakan dokumen telah secara fisik dimusnahkan. Dokumen akan dinonaktifkan permanen di sistem.
                            </small>
                        </div>

                        <div className="mt-2">
                            <Button type="submit"
                                label="Selesaikan Pemusnahan"
                                className="w-full p-button-danger"
                                loading={submittingExecution} />
                        </div>
                    </form>
                )}
            </Dialog>
        </div>
    );
}
