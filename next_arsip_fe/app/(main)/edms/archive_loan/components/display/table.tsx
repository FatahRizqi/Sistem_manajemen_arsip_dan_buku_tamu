'use client'

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";
import { Avatar } from "primereact/avatar";
import { Chip } from "primereact/chip";
import { useEffect, useState } from "react";
import { LoanData, TableProps } from "../interfaces";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import Form from "./form";
import { usePermissions } from '@/hooks/usePermissions';

const formatDateOnly = (value?: string | Date | null) => {
    if (!value) return '-';
    return formatDateCalendar(value, 'yyyy-MM-dd') || '-';
};

const Table = ({
    state,
    setState,
    formik,
    getLoans,
    handleApproveReject,
    handleReturn,
    toast,
    handleScan
}: TableProps) => {
    const permissions = usePermissions();
    const { canCreate, canUpdate, canDelete, canApprove } = permissions;

    const [detailDialog, setDetailDialog] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<LoanData | null>(null);
    const [approvalDialog, setApprovalDialog] = useState(false);
    const [notes, setNotes] = useState('');
    const [targetStatus, setTargetStatus] = useState<'approved' | 'rejected' | ''>('');
    const [returnDialog, setReturnDialog] = useState(false);

    const sessionUser = state.session?.user as any;
    const roleKey = String(sessionUser?.role || sessionUser?.roleCode || '').toLowerCase();
    const canApproveLoan = canApprove || ['superadmin', 'sa'].includes(roleKey);

    const statusBodyTemplate = (rowData: LoanData) => {
        let bg = '#f59e0b';
        let iconClass = 'pi-clock';
        let label = 'Menunggu';

        if (rowData.terlambat === 1 && rowData.status === 'borrowed') {
            bg = '#ef4444';
            iconClass = 'pi-exclamation-triangle';
            label = 'Terlambat';
        } else if (rowData.status === 'returned') {
            bg = '#22c55e';
            iconClass = 'pi-check';
            label = 'Dikembalikan';
        } else if (rowData.status === 'rejected') {
            bg = '#ef4444';
            iconClass = 'pi-times';
            label = 'Ditolak';
        } else if (rowData.status === 'borrowed') {
            bg = '#3b82f6';
            iconClass = 'pi-external-link';
            label = 'Dipinjam';
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

    const borrowerTemplate = (rowData: LoanData) => (
        <div className="flex align-items-center gap-2">
            <Avatar
                label={rowData.nama_peminjam?.slice(0, 1).toUpperCase() || 'B'}
                shape="circle"
                style={{ width: '2rem', height: '2rem', fontSize: '0.75rem', background: '#EEF2FF', color: '#4F46E5', fontWeight: '700', flexShrink: 0 }} />
            <span className="font-semibold text-900 text-sm">{rowData.nama_peminjam}</span>
        </div>
    );

    const documentTemplate = (rowData: LoanData) => (
        <div>
            <span className="font-semibold text-sm text-900 block">{rowData.nomor_dokumen}</span>
            <span className="text-xs text-color-secondary">{rowData.nama_dokumen}</span>
        </div>
    );

    const actionTemplate = (rowData: LoanData) => {
        const status = rowData.status;
        return (
            <div className="flex gap-1 align-items-center justify-content-center">
                <Button icon="pi pi-eye"
                    text
                    severity="secondary"
                    size="small"
                    tooltip="Lihat Detail"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => { setSelectedDetail(rowData); setDetailDialog(true); }} />
                {status === 'pending' && canApproveLoan && (
                    <>
                        <Button icon="pi pi-check"
                            rounded
                            text
                           
                            size="small"
                            tooltip="Setujui Peminjaman"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => { setSelectedDetail(rowData); setTargetStatus('approved'); setNotes(''); setApprovalDialog(true); }} />
                        <Button icon="pi pi-times"
                            rounded
                            text
                            severity="danger"
                            size="small"
                            tooltip="Tolak Peminjaman"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => { setSelectedDetail(rowData); setTargetStatus('rejected'); setNotes(''); setApprovalDialog(true); }} />
                    </>
                )}
                {status === 'borrowed' && (
                    <Button icon="pi pi-replay"
                        rounded
                        text
                        severity="info"
                        size="small"
                        tooltip="Kembalikan Dokumen"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => {
                            setSelectedDetail(rowData);
                            setReturnDialog(true);
                        }} />
                )}
            </div>
        );
    };

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="font-semibold text-color text-sm">Daftar Peminjaman</span>
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    value={state.searchVal || ''}
                    onChange={(e) => setState(p => ({ ...p, searchVal: e.target.value }))}
                    placeholder="Cari peminjam atau dokumen..."
                    className="text-sm"
                    style={{ height: '2.25rem' }} />
            </span>
        </div>
    );

    const filteredData = state.data.filter((item) => {
        const query = state.searchVal?.toLowerCase() || '';
        const matchSearch =
            item.nama_peminjam?.toLowerCase().includes(query) ||
            item.nama_dokumen?.toLowerCase().includes(query) ||
            item.nomor_dokumen?.toLowerCase().includes(query) ||
            item.keperluan?.toLowerCase().includes(query);
        if (!matchSearch) return false;
        const tab = state.activeTab;
        if (tab === 'all') return true;
        if (tab === 'pending') return item.status === 'pending';
        if (tab === 'borrowed') return item.status === 'borrowed' && item.terlambat !== 1;
        if (tab === 'returned') return item.status === 'returned';
        if (tab === 'overdue') return item.terlambat === 1 && item.status === 'borrowed';
        return true;
    });

    const tabs: { label: string; value: typeof state.activeTab; icon: string; severity: 'success' | 'danger' | 'warning' | 'info' | 'secondary' }[] = [
        { label: 'Semua', value: 'all', icon: 'pi pi-list', severity: 'secondary' },
        { label: 'Pending', value: 'pending', icon: 'pi pi-clock', severity: 'warning' },
        { label: 'Dipinjam', value: 'borrowed', icon: 'pi pi-info-circle', severity: 'info' },
        { label: 'Dikembalikan', value: 'returned', icon: 'pi pi-check-circle', severity: 'success' },
        { label: 'Terlambat', value: 'overdue', icon: 'pi pi-exclamation-circle', severity: 'danger' },
    ];

    const tabCounts: Record<string, number> = {
        all: state.data.length,
        pending: state.data.filter(d => d.status === 'pending').length,
        borrowed: state.data.filter(d => d.status === 'borrowed' && d.terlambat !== 1).length,
        returned: state.data.filter(d => d.status === 'returned').length,
        overdue: state.data.filter(d => d.terlambat === 1 && d.status === 'borrowed').length,
    };

    useEffect(() => { getLoans(); }, []);

    return <>
        <Card className="shadow-1 border-round-2xl border-none">
            {/* Page Header */}
            <div className="mb-3">
                                <h2 className="m-0 text-900 font-bold text-2xl mb-1">Archive Loans</h2>
                <p className="m-0 text-color-secondary text-sm font-medium">Kelola peminjaman dokumen fisik arsip dan monitor keterlambatan pengembalian.</p>
            </div>

            <div className="flex flex-row flex-wrap align-items-center gap-2 mb-3">
                {canCreate && (
                    <>
                        <Button size="small"
                            label="Pinjam Dokumen"
                            icon="pi pi-plus"
                            outlined
                           
                            onClick={() => { formik.resetForm(); setState(p => ({ ...p, add: true })); }} />
                        <Divider layout="vertical" />
                    </>
                )}
                <Button size="small"
                    label="Refresh"
                    icon="pi pi-refresh"
                    outlined
                    onClick={getLoans}
                    loading={state.load} />
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mb-3">
                {tabs.map((tab) => (
                    <Button key={tab.value}
                        icon={tab.icon}
                        label={`${tab.label} (${tabCounts[tab.value]})`}
                        size="small"
                        severity={state.activeTab === tab.value ? tab.severity : 'secondary'}
                        outlined={state.activeTab !== tab.value}
                        className="text-xs border-round-3xl"
                        style={{ padding: '0.4rem 0.85rem' }}
                        onClick={() => setState(p => ({ ...p, activeTab: tab.value }))} />
                ))}
            </div>

            {/* KETERANGAN STATUS BAR */}
            <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1" style={{ width: 'fit-content' }}>
                <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                    <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#f59e0b', borderRadius: '3px' }}></span>
                    <span className="text-700">Menunggu</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '3px' }}></span>
                    <span className="text-700">Dipinjam</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#22c55e', borderRadius: '3px' }}></span>
                    <span className="text-700">Dikembalikan</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '3px' }}></span>
                    <span className="text-700">Terlambat / Ditolak</span>
                </div>
            </div>

            <DataTable
                value={filteredData}
                paginator
                rows={10}
                header={headerTemplate}
                loading={state.load}
                dataKey="id_peminjaman"
                emptyMessage={
                    <div className="flex flex-column align-items-center py-5 gap-3 text-color-secondary">
                        <i className="pi pi-inbox text-4xl text-300" />
                        <span className="font-medium text-sm">Tidak ada riwayat peminjaman</span>
                    </div>
                }
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first}-{last} dari {totalRecords} data"
                rowHover
                className="text-sm">
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
                <Column header="Peminjam" body={borrowerTemplate} style={{ minWidth: '180px' }} />
                <Column header="Dokumen" body={documentTemplate} style={{ minWidth: '180px' }} />
                <Column field="tanggal_pinjam" header="Tgl. Pinjam" sortable body={rowData => formatDateOnly(rowData.tanggal_pinjam)} style={{ width: '120px' }} />
                <Column field="tanggal_pengembalian" header="Tgl. Jatuh Tempo" sortable body={rowData => formatDateOnly(rowData.tanggal_pengembalian)} style={{ width: '140px' }} />
                <Column field="tanggal_kembali" header="Tgl. Kembali" sortable body={rowData => formatDateOnly(rowData.tanggal_kembali)} style={{ width: '120px' }} />
                <Column align="center" header="Aksi" body={actionTemplate} style={{ width: '130px', textAlign: 'center' }} />
            </DataTable>
        </Card>

        <Form state={state} setState={setState} formik={formik} toast={toast} handleScan={handleScan} />

        {/* Loan Detail Dialog */}
        <Dialog
            visible={detailDialog}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-file-edit text-primary" />
                    <span className="font-bold text-900">Detail Peminjaman</span>
                </div>
            }
            modal
            style={{ width: '45rem', maxWidth: '95vw' }}
            onHide={() => { setDetailDialog(false); setSelectedDetail(null); }}
            pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
            {selectedDetail && (
                <div className="flex flex-column gap-4 pt-3">
                    <div className="flex align-items-center gap-3 p-3 surface-50 border-round-xl border-1 surface-border">
                        <Avatar
                            label={selectedDetail.nama_peminjam?.slice(0, 2).toUpperCase() || 'NA'}
                            shape="circle"
                            size="large"
                            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', color: '#FFFFFF', fontWeight: '700' }} />
                        <div>
                            <div className="font-bold text-900 text-lg">{selectedDetail.nama_peminjam}</div>
                            <div className="mt-1">{statusBodyTemplate(selectedDetail)}</div>
                        </div>
                    </div>

                    <div className="grid">
                        <div className="col-12">
                            <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Dokumen</div>
                            <div className="font-semibold text-900">{selectedDetail.nomor_dokumen}</div>
                            <div className="text-color-secondary text-sm">{selectedDetail.nama_dokumen}</div>
                        </div>
                        <div className="col-12"><Divider className="my-2" /></div>
                        <div className="col-12 md:col-4">
                            <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Tgl. Pinjam</div>
                            <div className="font-semibold text-sm">{formatDateOnly(selectedDetail.tanggal_pinjam)}</div>
                        </div>
                        <div className="col-12 md:col-4">
                            <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Jatuh Tempo</div>
                            <div className="font-semibold text-sm">{formatDateOnly(selectedDetail.tanggal_pengembalian)}</div>
                        </div>
                        <div className="col-12 md:col-4">
                            <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Tgl. Kembali</div>
                            <div className="font-semibold text-sm text-primary">
                                {selectedDetail.tanggal_kembali ? (
                                    formatDateOnly(selectedDetail.tanggal_kembali)
                                ) : selectedDetail.status === 'borrowed' ? (
                                    <span className="text-orange-500">Belum Dikembalikan</span>
                                ) : selectedDetail.status === 'rejected' ? (
                                    <span className="text-red-500">Peminjaman Ditolak</span>
                                ) : (
                                    <span className="text-color-secondary">Belum Dipinjam (Pending)</span>
                                )}
                            </div>
                        </div>
                        <div className="col-12"><Divider className="my-2" /></div>
                        <div className="col-12">
                            <div className="text-color-secondary text-xs font-bold uppercase mb-2" style={{ letterSpacing: '0.08em' }}>Keperluan Peminjaman</div>
                            <div className="p-3 surface-50 border-round-lg border-1 surface-border text-sm text-900">{selectedDetail.keperluan}</div>
                        </div>
                        {(selectedDetail.disetujui_oleh || selectedDetail.catatan_persetujuan) && (
                            <>
                                <div className="col-12"><Divider className="my-2" /></div>
                                <div className="col-12 md:col-6">
                                    <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Diproses Oleh</div>
                                    <div className="font-semibold text-sm">{selectedDetail.disetujui_oleh}</div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Waktu Proses</div>
                                    <div className="font-semibold text-sm">{selectedDetail.disetujui_pada ? formatDateCalendar(selectedDetail.disetujui_pada) : '-'}</div>
                                </div>
                                <div className="col-12">
                                    <div className="text-color-secondary text-xs font-bold uppercase mb-2" style={{ letterSpacing: '0.08em' }}>Catatan Persetujuan</div>
                                    <div className="p-3 surface-50 border-round-lg border-1 surface-border text-sm">{selectedDetail.catatan_persetujuan || 'Tidak ada catatan.'}</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Dialog>

        {/* Approval Dialog */}
        <Dialog
            visible={approvalDialog}
            header={
                <div className="flex align-items-center gap-2">
                    <i className={`pi ${targetStatus === 'approved' ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500'}`} />
                    <span className="font-bold">{targetStatus === 'approved' ? 'Setujui Permintaan' : 'Tolak Permintaan'}</span>
                </div>
            }
            modal
            style={{ width: '32rem', maxWidth: '95vw' }}
            onHide={() => { setApprovalDialog(false); setSelectedDetail(null); setNotes(''); setTargetStatus(''); }}
            pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
            <div className="flex flex-column gap-4 pt-3">
                <div className={`p-3 border-round-lg border-1 ${targetStatus === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="m-0 text-sm text-900">
                        Apakah Anda yakin ingin <strong>{targetStatus === 'approved' ? 'menyetujui' : 'menolak'}</strong> peminjaman dokumen{' '}
                        <Chip label={selectedDetail?.nomor_dokumen || ''} className="text-xs mx-1" style={{ padding: '0.1rem 0.6rem', height: 'auto' }} />{' '}
                        oleh <strong>{selectedDetail?.nama_peminjam}</strong>?
                    </p>
                </div>
                <div className="flex flex-column gap-2">
                    <label htmlFor="approval-notes" className="font-semibold text-sm text-900">Catatan <span className="text-color-secondary font-normal">(Opsional)</span></label>
                    <InputText
                        id="approval-notes"
                        placeholder="Contoh: Disetujui, harap jaga kondisi dokumen..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full" />
                </div>
                <div className="flex mt-4 pt-3 border-top-1 surface-border">
                    <Button label="Batal"
                        severity="secondary"
                        outlined
                        size="small"
                        onClick={() => { setApprovalDialog(false); setSelectedDetail(null); setNotes(''); setTargetStatus(''); }} />
                    <Button label={targetStatus === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'}
                        icon={targetStatus === 'approved' ? 'pi pi-check' : 'pi pi-times'}
                        severity={targetStatus === 'approved' ? 'success' : 'danger'}
                        size="small"
                        onClick={async () => {
                            if (selectedDetail && targetStatus) {
                                await handleApproveReject(selectedDetail.id_peminjaman, targetStatus, notes);
                                setApprovalDialog(false); setSelectedDetail(null); setNotes(''); setTargetStatus('');
                            }
                        }}
                        loading={state.load} />
                </div>
            </div>
        </Dialog>

        {/* Return Confirmation Dialog */}
        <Dialog
            visible={returnDialog}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-replay text-info" />
                    <span className="font-bold text-900">Konfirmasi Pengembalian</span>
                </div>
            }
            modal
            style={{ width: '32rem', maxWidth: '95vw' }}
            onHide={() => { setReturnDialog(false); setSelectedDetail(null); }}
            pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
            <div className="flex flex-column gap-4 pt-3">
                <div className="p-3 border-round-lg border-1 bg-blue-50 border-blue-100">
                    <p className="m-0 text-sm text-900">
                        Apakah Anda yakin ingin memproses pengembalian dokumen ini?
                    </p>
                </div>
                <div className="flex flex-column gap-2 text-sm text-700 bg-light p-1">
                    <div className="flex justify-content-between">
                        <span className="font-semibold">Nomor Dokumen:</span>
                        <span>{selectedDetail?.nomor_dokumen || '-'}</span>
                    </div>
                    <div className="flex justify-content-between mt-1">
                        <span className="font-semibold">Peminjam:</span>
                        <span>{selectedDetail?.nama_peminjam || '-'}</span>
                    </div>
                    <div className="flex justify-content-between mt-1">
                        <span className="font-semibold">Tanggal Pinjam:</span>
                        <span>{formatDateOnly(selectedDetail?.tanggal_pinjam)}</span>
                    </div>
                </div>
                <div className="flex mt-4 pt-3 border-top-1 surface-border">
                    <Button label="Batal"
                        severity="secondary"
                        outlined
                        size="small"
                        onClick={() => { setReturnDialog(false); setSelectedDetail(null); }} />
                    <Button label="Ya, Kembalikan"
                        icon="pi pi-check"
                        severity="info"
                        size="small"
                        onClick={async () => {
                            if (selectedDetail) {
                                await handleReturn(selectedDetail.id_peminjaman);
                                setReturnDialog(false);
                                setSelectedDetail(null);
                            }
                        }}
                        loading={state.load} />
                </div>
            </div>
        </Dialog>
    </>
}

export default Table
