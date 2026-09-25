'use client';

import React, { useRef, useMemo } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Calendar } from 'primereact/calendar';
import { OverlayPanel } from 'primereact/overlaypanel';
import { State } from "@/app/(main)/buku_tamu/checkout/components/interfaces";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import { usePermissions } from '@/layout/context/permissionContext';

interface TableProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    session?: any;
    onCheckout: (row: any) => void;
    onDetail: (row: any) => void;
    onFilterStatus: (value: string) => void;
    onRefresh: () => void;
    onApprove: (row: any) => void;
    onReject: (row: any) => void;
    onCheckin: (row: any) => void;
    onScanQR: () => void;
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

export default function GuestDataTable({
    state,
    setState,
    session,
    onCheckout,
    onDetail,
    onFilterStatus,
    onRefresh,
    onApprove,
    onReject,
    onCheckin,
    onScanQR
}: TableProps) {
    const roleCode = (session?.user as any)?.roleCode;
    const isSuperadmin = roleCode === 'SUPERADMIN';
    const statusOptions = [
        { label: 'Semua Status', value: '' },
        { label: 'Sedang Berkunjung', value: 'in' },
        { label: 'Selesai', value: 'out' }
    ];

    const permissions = usePermissions();
    const { canUpdate, canApprove } = permissions;
    const filterOverlayRef = useRef<any>(null);

    const filteredData = useMemo(() => {
        return state.data.filter((item) => {
            const rawDate = item.waktu_masuk || item.created_at || item.tanggal_kunjungan;
            const itemDate = rawDate && rawDate !== '0000-00-00 00:00:00' ? String(rawDate).slice(0, 10) : '';

            if (state.startDate && itemDate && itemDate < state.startDate) return false;
            if (state.endDate && itemDate && itemDate > state.endDate) return false;

            const query = state.searchVal?.toLowerCase() || '';
            if (query) {
                const match =
                    item.nama_tamu?.toLowerCase().includes(query) ||
                    item.instansi_tamu?.toLowerCase().includes(query) ||
                    item.nomor_telepon?.toLowerCase().includes(query) ||
                    item.VisitPurposeName?.toLowerCase().includes(query) ||
                    item.BranchName?.toLowerCase().includes(query);
                if (!match) return false;
            }

            return true;
        });
    }, [state.data, state.searchVal, state.startDate, state.endDate]);

    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-eye" severity="info" outlined onClick={() => onDetail(rowData)} tooltip="Detail" />
                {canApprove && rowData.status_persetujuan === 'pending' && (
                    <>
                        <Button icon="pi pi-check" rounded outlined onClick={() => onApprove(rowData)} tooltip="Setujui" />
                        <Button icon="pi pi-times" severity="danger" rounded outlined onClick={() => onReject(rowData)} tooltip="Tolak" />
                    </>
                )}
                {canUpdate && rowData.status === 'Rencana' && rowData.status_persetujuan === 'approved' && (
                    <Button icon="pi pi-sign-in" rounded outlined onClick={() => onCheckin(rowData)} tooltip="Check-In (Masuk)" />
                )}
                {canUpdate && rowData.status === 'in' && rowData.status_persetujuan === 'approved' && (
                    <Button icon="pi pi-sign-out" severity="danger" rounded outlined onClick={() => onCheckout(rowData)} tooltip="Check-Out" />
                )}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: any) => {
        const isActive = rowData.status === 'in' || rowData.status === 'active' || rowData.status === 'Aktif';
        return (
            <div className="flex align-items-center justify-content-center">
                <div
                    className="w-2rem h-2rem border-round flex align-items-center justify-content-center text-white shadow-1"
                    style={{ background: isActive ? '#22c55e' : '#ef4444', borderRadius: '8px' }}
                    title={isActive ? 'Aktif' : 'Tidak Aktif'}
                >
                    <i className={`pi ${isActive ? 'pi-chevron-down' : 'pi-times'} text-xs font-bold`} />
                </div>
            </div>
        );
    };

    const approvalBodyTemplate = (rowData: any) => {
        let severity: "success" | "info" | "warning" | "danger" | null = null;
        let statusLabel = "Pending";

        if (rowData.status_persetujuan === 'approved') {
            severity = "success";
            statusLabel = "Disetujui";
        } else if (rowData.status_persetujuan === 'rejected') {
            severity = "danger";
            statusLabel = "Ditolak";
        } else {
            severity = "warning";
        }

        return <Tag severity={severity} value={statusLabel} />;
    };

    const renderHeader = () => (
        <div className="flex flex-column lg:flex-row align-items-stretch lg:align-items-center justify-content-between gap-3">
            {/* Left: Date Range Filter (Check In Date Range) */}
            <div className="flex align-items-center gap-2 flex-wrap">
                <div className="p-inputgroup flex-1 sm:w-14rem">
                    <Calendar
                        value={parseDateStr(state.startDate)}
                        onChange={(e) => setState(p => ({ ...p, startDate: formatDateStr(e.value as Date) }))}
                        dateFormat="yy-mm-dd"
                        placeholder="YYYY-MM-DD"
                        showIcon
                        icon="pi pi-calendar"
                        className="w-full"
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
                        className="w-full"
                    />
                </div>
            </div>

            {/* Right: Scan QR, Filter Button, Search Bar, Reset Button */}
            <div className="flex align-items-center gap-2 flex-wrap">
                <Button type="button"
                    label="Scan QR"
                    icon="pi pi-qrcode"
                    className="px-3 text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none' }}
                    onClick={onScanQR}
                />

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
                        value={state.searchVal || ''}
                        onChange={(e) => setState(p => ({ ...p, searchVal: e.target.value }))}
                        placeholder="Cari Nama Tamu..."
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
                        onFilterStatus('');
                        setState(p => ({ ...p, searchVal: '', startDate: '', endDate: '' }));
                    }}
                />
            </div>
        </div>
    );

    return (
        <div className="card shadow-2 border-round p-4">
            {/* Page Header */}
            <div className="mb-3">
                <h2 className="m-0 text-900 font-bold text-2xl mb-1 flex align-items-center gap-2">
                    <i className="pi pi-history text-primary"></i>
                    <span>Riwayat Kunjungan Tamu</span>
                </h2>
                <p className="m-0 text-color-secondary text-sm font-medium">Pantau data kehadiran tamu, proses check-in / check-out, serta persetujuan permohonan kunjungan.</p>
            </div>

            {/* KETERANGAN STATUS BAR */}
            <div className="flex align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1 w-full">
                <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                    <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#22c55e', borderRadius: '4px' }}></span>
                    <span className="text-700">Aktif</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#ef4444', borderRadius: '4px' }}></span>
                    <span className="text-700">Tidak Aktif</span>
                </div>
            </div>

            <OverlayPanel ref={filterOverlayRef} showCloseIcon style={{ width: '300px' }}>
                <div className="flex flex-column gap-3 p-1">
                    <div className="font-bold text-sm text-900 border-bottom-1 surface-border pb-2 flex align-items-center justify-content-between">
                        <span><i className="pi pi-filter text-primary mr-2" />Filter Status Kunjungan</span>
                        {state.statusFilter && (
                            <Button label="Bersihkan"
                                icon="pi pi-times"
                                text
                                severity="danger"
                                className="p-0 text-xs"
                                onClick={() => onFilterStatus('')} />
                        )}
                    </div>
                    <div className="flex flex-column gap-1">
                        <label className="text-xs font-semibold text-700">Status Kunjungan</label>
                        <Dropdown
                            value={state.statusFilter}
                            options={statusOptions}
                            onChange={(e) => onFilterStatus(e.value)}
                            placeholder="Pilih Status"
                            className="w-full text-xs p-inputtext-sm" />
                    </div>
                </div>
            </OverlayPanel>

            <DataTable value={filteredData} header={renderHeader()} loading={state.load} paginator rows={10} responsiveLayout="scroll" emptyMessage="Data kunjungan tamu kosong">
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
                <Column field="nama_tamu" header="Nama Tamu" sortable />
                {isSuperadmin && <Column field="BranchName" header="Kantor Cabang" sortable />}
                <Column field="nomor_telepon" header="No. Telepon" />
                <Column field="instansi_tamu" header="Instansi" sortable />
                <Column field="VisitPurposeName" header="Tujuan" />
                <Column field="waktu_masuk" header="Check In" body={(r) => r.waktu_masuk && r.waktu_masuk !== '0000-00-00 00:00:00' ? formatDateCalendar(r.waktu_masuk, 'HH:mm dd/MM/yyyy') : '-'} sortable />
                <Column field="waktu_keluar" header="Check Out" body={(r) => r.waktu_keluar && r.waktu_keluar !== '0000-00-00 00:00:00' ? formatDateCalendar(r.waktu_keluar, 'HH:mm dd/MM/yyyy') : '-'} />
                <Column field="status_persetujuan" header="Persetujuan" body={approvalBodyTemplate} sortable />
                <Column align="center" header="Aksi" body={actionBodyTemplate} style={{ minWidth: '10rem' }} />
            </DataTable>
        </div>
    );
}
