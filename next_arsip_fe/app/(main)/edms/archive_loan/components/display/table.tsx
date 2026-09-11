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
import { Calendar } from "primereact/calendar";
import { OverlayPanel } from "primereact/overlaypanel";
import { Dropdown } from "primereact/dropdown";
import { useEffect, useState, useRef, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { LoanData, TableProps } from "../interfaces";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import Form from "./form";
import { usePermissions } from '@/hooks/usePermissions';

const formatDateOnly = (value?: string | Date | null) => {
    if (!value) return '-';
    return formatDateCalendar(value, 'yyyy-MM-dd') || '-';
};

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

const ScanQrDialog = ({
    visible,
    onHide,
    onScan
}: {
    visible: boolean;
    onHide: () => void;
    onScan: (codeStr: string) => Promise<void>;
}) => {
    const scannerRef = useRef<any>(null);
    const [manualCode, setManualCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    useEffect(() => {
        if (visible) {
            setManualCode('');
            setCameraError(false);
            const timeoutId = setTimeout(() => {
                try {
                    const html5QrCode = new Html5Qrcode("loan-qr-reader");
                    scannerRef.current = html5QrCode;

                    html5QrCode.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 220, height: 220 } },
                        async (decodedText) => {
                            if (html5QrCode.isScanning) {
                                await html5QrCode.stop().catch(() => {});
                            }
                            scannerRef.current = null;
                            handleProcessScan(decodedText);
                        },
                        () => {}
                    ).catch((err: any) => {
                        console.error("Gagal memulai scanner QR:", err);
                        setCameraError(true);
                    });
                } catch (e) {
                    setCameraError(true);
                }
            }, 300);

            return () => {
                clearTimeout(timeoutId);
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => {});
                }
            };
        } else {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        }
    }, [visible]);

    const handleClose = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (err) {}
        }
        scannerRef.current = null;
        onHide();
    };

    const handleProcessScan = async (code: string) => {
        if (!code.trim()) return;
        setLoading(true);
        await onScan(code);
        setLoading(false);
        handleClose();
    };

    return (
        <Dialog
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-qrcode text-primary text-xl" />
                    <span className="font-bold text-900">Scan QR Code Peminjaman</span>
                </div>
            }
            visible={visible}
            modal
            style={{ width: '95vw', maxWidth: '440px' }}
            onHide={handleClose}
            pt={{
                header: { className: 'border-bottom-1 surface-border py-3 px-4' },
                content: { className: 'p-4 flex flex-column align-items-center' }
            }}>
            <div className="text-center mb-3">
                <p className="text-sm text-600 m-0">Arahkan QR Code dokumen ke kamera di bawah atau masukkan kode manual</p>
            </div>

            <div className="relative w-full border-round-xl overflow-hidden bg-black shadow-inner mb-3 flex align-items-center justify-content-center" style={{ minHeight: '260px' }}>
                <div id="loan-qr-reader" className="w-full h-full" style={{ border: 'none' }}></div>
                {cameraError && (
                    <div className="absolute p-3 text-center text-white bg-black-alpha-70 w-full h-full flex flex-column align-items-center justify-content-center gap-2">
                        <i className="pi pi-camera-slash text-3xl text-yellow-400" />
                        <span className="text-xs">Kamera tidak tersedia atau tidak diizinkan. Gunakan input kode manual di bawah ini.</span>
                    </div>
                )}
            </div>

            <div className="w-full mt-2">
                <label className="text-xs font-semibold text-700 mb-1 block">Input / Scan Manual Kode QR</label>
                <div className="p-inputgroup">
                    <span className="p-inputgroup-addon">
                        <i className="pi pi-barcode" />
                    </span>
                    <InputText
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleProcessScan(manualCode);
                            }
                        }}
                        placeholder="Scan atau tempel UUID / Kode QR..."
                        className="text-sm"
                        disabled={loading} />
                    <Button
                        type="button"
                        icon={loading ? "pi pi-spin pi-spinner" : "pi pi-search"}
                        label="Cari"
                        onClick={() => handleProcessScan(manualCode)}
                        disabled={!manualCode.trim() || loading} />
                </div>
            </div>
        </Dialog>
    );
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

    const filterOverlayRef = useRef<any>(null);

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

    const filteredData = useMemo(() => {
        return state.data.filter((item) => {
            if (state.startDate) {
                const itemDate = item.tanggal_pinjam ? String(item.tanggal_pinjam).slice(0, 10) : '';
                if (itemDate && itemDate < state.startDate) return false;
            }
            if (state.endDate) {
                const itemDate = item.tanggal_pinjam ? String(item.tanggal_pinjam).slice(0, 10) : '';
                if (itemDate && itemDate > state.endDate) return false;
            }

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
        });
    }, [state.data, state.searchVal, state.activeTab, state.startDate, state.endDate]);

    useEffect(() => { getLoans(); }, []);

    const renderHeader = () => (
        <div className="flex flex-column md:flex-row align-items-stretch md:align-items-center justify-content-between gap-3">
            {/* Left: Date Range Filter (Tanggal s.d Tanggal) */}
            <div className="flex align-items-center gap-2 flex-wrap">
                <div className="p-inputgroup flex-1 sm:w-14rem">
                    <Calendar
                        value={parseDateStr(state.startDate)}
                        onChange={(e) => setState(p => ({ ...p, startDate: formatDateStr(e.value as Date) }))}
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
                        value={parseDateStr(state.endDate)}
                        onChange={(e) => setState(p => ({ ...p, endDate: formatDateStr(e.value as Date) }))}
                        dateFormat="yy-mm-dd"
                        placeholder="YYYY-MM-DD"
                        showIcon
                        icon="pi pi-calendar"
                        className="text-xs w-full p-inputtext-sm"
                    />
                </div>
            </div>

            {/* Right: Filter Button, Search Bar, Reset Button */}
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
                        value={state.searchVal || ''}
                        onChange={(e) => setState(p => ({ ...p, searchVal: e.target.value }))}
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
                    onClick={() => setState(p => ({ ...p, startDate: '', endDate: '', searchVal: '', activeTab: 'all' }))}
                />
            </div>
        </div>
    );

    return (
        <>
            <Card className="shadow-1 border-round-2xl border-none">
                {/* Page Header */}
                <div className="mb-3">
                    <h2 className="m-0 text-900 font-bold text-2xl mb-1">Peminjaman & Pengembalian Arsip</h2>
                    <p className="m-0 text-color-secondary text-sm font-medium">Kelola sirkulasi peminjaman berkas fisik, konfirmasi pengembalian, dan lacak status keterlambatan.</p>
                </div>

                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-3">
                    {canCreate && (
                        <Button type="button"
                            size="small"
                            label="Form Peminjaman Baru"
                            icon="pi pi-plus"
                            outlined
                           
                            onClick={() => setState((p) => ({ ...p, add: true, edit: false, selectedLoan: null }))} />
                    )}
                    {canCreate && <Divider layout="vertical" />}
                    <Button type="button"
                        size="small"
                        label="Scan QR Code Peminjaman"
                        icon="pi pi-qrcode"
                        outlined
                        severity="info"
                        onClick={() => setState(p => ({ ...p, scanDialog: true, scanCode: '', scanResult: null }))} />
                    <Divider layout="vertical" />
                    <Button type="button"
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        loading={state.load}
                        onClick={getLoans} />
                </div>

                {/* Status Legend Bar */}
                <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1" style={{ width: 'fit-content' }}>
                    <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                        <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#f97316', borderRadius: '3px' }}></span>
                        <span className="text-700">Pending</span>
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
                        <span className="text-700">Terlambat</span>
                    </div>
                </div>

                <OverlayPanel ref={filterOverlayRef} style={{ width: '300px' }}>
                    <div className="flex flex-column gap-3 p-2">
                        <span className="font-bold text-sm text-900 border-bottom-1 surface-border pb-2">Filter Data</span>
                        <div className="flex flex-column gap-2">
                            <label className="text-xs font-semibold text-700">Status Peminjaman</label>
                            <Dropdown
                                value={state.activeTab}
                                options={[
                                    { label: 'Semua Status', value: 'all' },
                                    { label: 'Pending (Menunggu)', value: 'pending' },
                                    { label: 'Dipinjam', value: 'borrowed' },
                                    { label: 'Dikembalikan', value: 'returned' },
                                    { label: 'Terlambat', value: 'overdue' }
                                ]}
                                onChange={(e) => setState(p => ({ ...p, activeTab: e.value }))}
                                placeholder="Pilih Status"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="flex justify-content-end gap-2 mt-2">
                            <Button
                                label="Reset"
                                size="small"
                                severity="secondary"
                                outlined
                                onClick={() => {
                                    setState(p => ({ ...p, activeTab: 'all', startDate: '', endDate: '' }));
                                    filterOverlayRef.current?.hide();
                                }}
                            />
                            <Button
                                label="Terapkan"
                                size="small"
                                onClick={() => filterOverlayRef.current?.hide()}
                            />
                        </div>
                    </div>
                </OverlayPanel>

                <DataTable
                    value={filteredData}
                    header={renderHeader()}
                paginator
                rows={10}
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

        {/* QR Code Scanner Dialog */}
        <ScanQrDialog
            visible={!!state.scanDialog}
            onHide={() => setState(p => ({ ...p, scanDialog: false }))}
            onScan={async (codeStr) => {
                if (handleScan) await handleScan(codeStr);
            }} />
    </>
    );
};

export default Table;
