'use client'

import { formatDateCalendar } from "@/lib/tools/dateTools";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useRouter } from "next/navigation";
import { FilterMatchMode } from "primereact/api";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Chip } from "primereact/chip";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Divider } from "primereact/divider";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Calendar } from "primereact/calendar";
import { OverlayPanel } from "primereact/overlaypanel";
import { useEffect, useState, useRef, useMemo } from "react";
import { apiEndpointGet } from "../endpoints";
import { IncomingLetterFile, IncomingLetterStatus, TableData, TableProps } from "../interfaces";
import Form from "./form";
import { usePermissions } from '@/layout/context/permissionContext';

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

const statusOptions = [
    { label: "Semua Status", value: "" },
    { label: "Baru", value: "baru" },
    { label: "Diproses", value: "diproses" },
    { label: "Didisposisi", value: "didisposisi" },
    { label: "Selesai", value: "selesai" },
];

const formatFileSize = (size?: number | null) => {
    if (!size) return "-";
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getStatusConfig = (status: string): { label: string; severity: "success" | "warning" | "danger" | "info"; icon: string } => {
    const map: Record<string, { label: string; severity: "success" | "warning" | "danger" | "info"; icon: string }> = {
        baru: { label: "Baru", severity: "info", icon: "pi pi-envelope" },
        diproses: { label: "Diproses", severity: "warning", icon: "pi pi-spin pi-cog" },
        didisposisi: { label: "Didisposisi", severity: "warning", icon: "pi pi-share-alt" },
        selesai: { label: "Selesai", severity: "success", icon: "pi pi-check-circle" },
    };
    return map[String(status).toLowerCase()] || { label: status, severity: "info", icon: "pi pi-circle" };
};

const Table = ({
    state,
    setState,
    formik,
    getData,
    toast,
    handleSave,
    handleDelete,
    getLetterTypeOptions,
    openDetail,
    reloadDetail,
    executeArchiveLetter,
    getFileBlob
}: TableProps) => {
    const permissions = usePermissions();
    const { canCreate, canUpdate, canDelete } = permissions;
    const router = useRouter();
    const [previewFile, setPreviewFile] = useState<{ url: string; mimeType: string; fileName: string } | null>(null);
    const filterOverlayRef = useRef<any>(null);

    const filteredData = useMemo(() => {
        return state.data.filter((item) => {
            const rawDate = item.tanggal_diterima || item.tanggal_surat || item.created_at;
            const itemDate = rawDate ? String(rawDate).slice(0, 10) : '';

            if (state.startDate && itemDate && itemDate < state.startDate) return false;
            if (state.endDate && itemDate && itemDate > state.endDate) return false;

            if (state.statusFilter) {
                const s = String(item.status || '').toLowerCase();
                if (state.statusFilter !== s) return false;
            }

            const query = state.searchVal?.toLowerCase() || '';
            if (query) {
                const match =
                    item.nomor_agenda?.toLowerCase().includes(query) ||
                    item.nomor_surat?.toLowerCase().includes(query) ||
                    item.nama_pengirim?.toLowerCase().includes(query) ||
                    item.instansi_pengirim?.toLowerCase().includes(query) ||
                    item.perihal?.toLowerCase().includes(query) ||
                    item.nama_jenis_surat?.toLowerCase().includes(query);
                if (!match) return false;
            }

            return true;
        });
    }, [state.data, state.searchVal, state.statusFilter, state.startDate, state.endDate]);

    const buildPayload = () => ({ keyword: state.searchVal || "", status: state.statusFilter || "" });
    const refreshData = () => getData(apiEndpointGet, buildPayload());

    const closePreview = () => {
        if (previewFile?.url) window.URL.revokeObjectURL(previewFile.url);
        setPreviewFile(null);
    };

    const closeDetail = () => {
        closePreview();
        setState((p) => ({ ...p, detail: false, detailData: null }));
    };

    const onOpenDetail = async (rowData: TableData) => {
        closePreview();
        if (openDetail) await openDetail(rowData);
    };

    const onArchiveLetter = async () => {
        if (!detailLetter?.surat_masuk_id || !executeArchiveLetter) return;

        setState((p) => ({ ...p, load: true }));
        try {
            await executeArchiveLetter(
                detailLetter.surat_masuk_id,
                detailLetter.nama_pengirim || "Sekretariat",
                detailLetter.updated_by || detailLetter.created_by || null
            );
            if (reloadDetail) await reloadDetail(detailLetter.surat_masuk_id);
            await refreshData();
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const confirmArchiveLetter = () => {
        if (!detailLetter?.surat_masuk_id) return;
        if (detailFiles.length < 1) {
            showError(toast, "Upload file surat terlebih dahulu sebelum diarsipkan");
            return;
        }

        confirmDialog({
            header: "Konfirmasi Arsip",
            message: `Arsipkan surat ${detailLetter.nomor_agenda || detailLetter.nomor_surat}?`,
            icon: "pi pi-archive",
            acceptLabel: "Arsipkan",
            rejectLabel: "Batal",
            acceptClassName: "p-button-primary",
            rejectClassName: "p-button-secondary p-button-outlined",
            accept: onArchiveLetter,
        });
    };

    const previewUploadedFile = async (file: IncomingLetterFile) => {
        closePreview();
        try {
            if (!getFileBlob) return;
            const res = await getFileBlob(file);
            const mimeType = file.tipe_mime_file || res.headers["content-type"] || "application/octet-stream";
            const blob = new Blob([res.data], { type: mimeType });
            setPreviewFile({ url: window.URL.createObjectURL(blob), mimeType, fileName: file.nama_file || "file-surat" });
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "File surat gagal dibuka");
        }
    };

    const downloadUploadedFile = async (file: IncomingLetterFile) => {
        try {
            if (!getFileBlob) return;
            const res = await getFileBlob(file);
            const blob = new Blob([res.data], { type: file.tipe_mime_file || "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.nama_file || "file-surat";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "File surat gagal didownload");
        }
    };

    // ─── Column Templates ───────────────────────────────────────────────────

    const senderTemplate = (rowData: TableData) => (
        <div className="flex align-items-center gap-2">
            <Avatar
                label={rowData.nama_pengirim?.slice(0, 1).toUpperCase() || "S"}
                shape="circle"
                style={{ width: "2rem", height: "2rem", fontSize: "0.7rem", background: "#EEF2FF", color: "#4F46E5", fontWeight: "700", flexShrink: 0 }} />
            <div>
                <div className="font-semibold text-sm text-900">{rowData.nama_pengirim}</div>
                {rowData.instansi_pengirim && (
                    <div className="text-xs text-color-secondary">{rowData.instansi_pengirim}</div>
                )}
            </div>
        </div>
    );

    const letterTemplate = (rowData: TableData) => (
        <div>
            <div className="font-semibold text-sm text-900">{rowData.perihal}</div>
            <div className="text-xs text-color-secondary mt-1">
                <span className="mr-2">No. Agenda: <strong>{rowData.nomor_agenda || "-"}</strong></span>
            </div>
        </div>
    );

    const statusBodyTemplate = (rowData: TableData) => {
        const s = String(rowData.status || '').toLowerCase();
        let bg = '#f59e0b';
        let icon = 'pi-clock';
        let label = 'Baru / Diproses';

        if (s === 'didisposisi' || s === 'disposed') {
            bg = '#a855f7';
            icon = 'pi-send';
            label = 'Didisposisi';
        } else if (s === 'selesai' || s === 'completed') {
            bg = '#22c55e';
            icon = 'pi-check';
            label = 'Selesai';
        } else if (s === 'batal' || s === 'rejected') {
            bg = '#ef4444';
            icon = 'pi-times';
            label = 'Batal / Ditolak';
        }

        return (
            <div className="flex justify-content-center align-items-center">
                <div
                    className="w-2rem h-2rem flex align-items-center justify-content-center text-white shadow-1"
                    style={{ background: bg, borderRadius: '8px' }}
                    title={`Status: ${label}`}
                >
                    <i className={`pi ${icon} text-xs`}></i>
                </div>
            </div>
        );
    };

    const actionTemplate = (rowData: TableData) => (
        <div className="flex gap-1 justify-content-center">
            <Button icon="pi pi-eye"
                text tooltip="Lihat Detail" tooltipOptions={{ position: "top" }}
                onClick={() => onOpenDetail(rowData)} />
            {canUpdate && (
                <Button icon="pi pi-pencil"
                    text severity="secondary" tooltip="Edit" tooltipOptions={{ position: "top" }}
                    onClick={() => {
                        formik.setValues({
                            surat_masuk_id: rowData.surat_masuk_id,
                            nomor_agenda: rowData.nomor_agenda,
                            nomor_surat: rowData.nomor_surat,
                            tanggal_surat: rowData.tanggal_surat?.slice(0, 10) || "",
                            tanggal_diterima: rowData.tanggal_diterima?.slice(0, 10) || "",
                            nama_pengirim: rowData.nama_pengirim,
                            instansi_pengirim: rowData.instansi_pengirim || "",
                            perihal: rowData.perihal,
                            keterangan_lampiran: rowData.keterangan_lampiran || "",
                            file_surat: null,
                            jenis_surat_id: rowData.jenis_surat_id,
                            jenis_dokumen_id: rowData.jenis_dokumen_id,
                            archive_classification_id: rowData.archive_classification_id,
                            confidentiality_level_id: rowData.confidentiality_level_id,
                            status: rowData.status,
                            created_by: rowData.created_by,
                            updated_by: rowData.updated_by,
                        });
                        setState((p) => ({ ...p, add: false, delete: false, edit: true }));
                    }} />
            )}
            {canDelete && (
                <Button icon="pi pi-trash"
                    text severity="danger" tooltip="Hapus" tooltipOptions={{ position: "top" }}
                    onClick={() => setState((p) => ({ ...p, delete: true, selectedLetters: [rowData] }))} />
            )}
        </div>
    );



    useEffect(() => {
        getData(apiEndpointGet);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => { if (previewFile?.url) window.URL.revokeObjectURL(previewFile.url); };
    }, [previewFile?.url]);

    const detailLetter = state.detailData?.surat || state.detailData?.letter || null;
    const detailFiles = state.detailData?.files || [];
    const archivedDocument = state.detailData?.archived_document || null;


    const renderHeader = () => (
        <div className="flex flex-column md:flex-row align-items-stretch md:align-items-center justify-content-between gap-3">
            {/* Left: Date Range Filter (Tanggal Terima / Tanggal Surat) */}
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

            {/* Right: Filter Button, Search Bar, Reset Button */}
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
                        value={state.searchVal || ''}
                        onChange={(e) => setState(p => ({ ...p, searchVal: e.target.value }))}
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
                    onClick={() => setState(p => ({ ...p, searchVal: '', statusFilter: '', startDate: '', endDate: '' }))}
                />
            </div>
        </div>
    );

    return (
        <>
            <ConfirmDialog />
            <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
                {/* Page Header */}
                <div className="flex flex-column gap-2 mb-4 px-1">
                    <h3 className="text-2xl font-bold m-0 text-900 flex align-items-center gap-2">
                        <i className="pi pi-inbox text-primary"></i>
                        <span>Surat Masuk</span>
                    </h3>
                    <div className="text-sm text-600">
                        Kelola seluruh surat masuk, upload file, dan pantau status disposisi.
                    </div>
                </div>

                <div className="flex justify-content-between mb-4">
                    <div className="flex flex-row align-items-center gap-2">
                    {canCreate && (
                        <>
                            <Button label="Tambah Surat"
                                icon="pi pi-plus"
                                outlined
                               
                                onClick={() => { formik.resetForm(); setState((p) => ({ ...p, selectedLetters: [], add: true, edit: false, delete: false })); }} />
                        </>
                    )}
                    {canCreate && canDelete && <Divider layout="vertical" className="hidden md:inline m-0" />}
                    {canDelete && (
                        <>
                            <Button label={`Hapus${state.selectedLetters.length > 0 ? ` (${state.selectedLetters.length})` : ""}`}
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                disabled={state.selectedLetters.length === 0}
                                onClick={() => {
                                    if (state.selectedLetters.length < 1) return;
                                    setState((p) => ({ ...p, delete: true }));
                                }} />
                        </>
                    )}
                    {(canCreate || canDelete) && <Divider layout="vertical" className="hidden md:inline m-0" />}
                    <Button label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        loading={state.load}
                        onClick={refreshData} />
                    </div>
                </div>

                {/* KETERANGAN STATUS BAR */}
                <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1 w-full">
                    <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                        <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '4px' }}></span>
                        <span className="text-700">Baru / Diproses</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#a855f7', borderRadius: '4px' }}></span>
                        <span className="text-700">Didisposisi</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#22c55e', borderRadius: '4px' }}></span>
                        <span className="text-700">Selesai</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#ef4444', borderRadius: '4px' }}></span>
                        <span className="text-700">Ditolak / Batal</span>
                    </div>
                </div>

                <OverlayPanel ref={filterOverlayRef} showCloseIcon style={{ width: '300px' }}>
                    <div className="flex flex-column gap-3 p-1">
                        <div className="font-bold text-sm text-900 border-bottom-1 surface-border pb-2 flex align-items-center justify-content-between">
                            <span><i className="pi pi-filter text-primary mr-2" />Filter Status Surat</span>
                            {state.statusFilter && (
                                <Button label="Bersihkan"
                                    icon="pi pi-times"
                                    text
                                    severity="danger"
                                    className="p-0 text-xs"
                                    onClick={() => setState(p => ({ ...p, statusFilter: '' }))} />
                            )}
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="text-xs font-semibold text-700">Status Surat</label>
                            <Dropdown
                                value={state.statusFilter}
                                options={statusOptions}
                                onChange={(e) => setState(p => ({ ...p, statusFilter: e.value }))}
                                placeholder="Pilih Status"
                                className="w-full" />
                        </div>
                    </div>
                </OverlayPanel>

                <DataTable
                    value={filteredData}
                    header={renderHeader()}
                    paginator
                    selectionMode="multiple"
                    rows={10}
                    globalFilterFields={["nomor_agenda", "nomor_surat", "nama_pengirim", "instansi_pengirim", "perihal", "status"]}
                    filters={state.filters}
                    loading={state.load}
                    selection={state.selectedLetters}
                    onSelectionChange={(e) => setState((p) => ({ ...p, selectedLetters: e.value }))}
                    dataKey="surat_masuk_id"
                    emptyMessage={
                        <div className="flex flex-column align-items-center py-5 gap-3 text-color-secondary">
                            <i className="pi pi-inbox text-4xl text-300" />
                            <span className="font-medium text-sm">Belum ada surat masuk</span>
                        </div>
                    }
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first}-{last} dari {totalRecords} data"
                    rowHover
                    className="text-sm">
                    <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                    <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
                    <Column field="nomor_agenda" header="No. Surat" body={(r) => (
                        <div>
                            <div className="font-semibold text-sm text-900">{r.nomor_agenda || "-"}</div>
                            <div className="text-xs text-color-secondary">{r.nomor_surat || "-"}</div>
                        </div>
                    )} sortable style={{ minWidth: "140px" }} />
                    <Column header="Perihal & Agenda" body={letterTemplate} style={{ minWidth: "200px" }} />
                    <Column header="Pengirim" body={senderTemplate} style={{ minWidth: "180px" }} />
                    <Column field="tanggal_diterima" header="Tgl. Terima" sortable body={(r) => formatDateCalendar(r.tanggal_diterima)} style={{ width: "120px" }} />
                    <Column field="nama_jenis_surat" header="Jenis Surat" style={{ width: "120px" }} />
                    <Column field="created_at" header="Dibuat" sortable body={(r) => formatDateCalendar(r.created_at)} style={{ width: "120px" }} />
                    <Column align="center" header="Aksi" body={actionTemplate} style={{ width: "130px", textAlign: "center" }} />
                </DataTable>
            </div>

                <Form 
                    getData={getData} 
                    state={state} 
                    setState={setState} 
                    formik={formik} 
                    toast={toast} 
                    handleSave={handleSave}
                    handleDelete={handleDelete}
                    getLetterTypeOptions={getLetterTypeOptions} />

            {/* ── Detail Dialog ──────────────────────────────────── */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-envelope text-primary" />
                        <span className="font-bold text-900">Detail Surat Masuk</span>
                    </div>
                }
                visible={state.detail}
                modal
                style={{ width: "72rem", maxWidth: "96vw" }}
                onHide={closeDetail}
                pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
                {state.detailLoad ? (
                    <div className="flex flex-column align-items-center py-6 gap-3 text-color-secondary">
                        <i className="pi pi-spin pi-spinner text-3xl text-primary" />
                        <span className="text-sm font-medium">Memuat detail surat...</span>
                    </div>
                ) : (
                    <div className="flex flex-column gap-4 pt-3">
                        {/* Header info */}
                        <div className="flex align-align-items-center justify-content-between gap-3 p-3 surface-50 border-round-xl border-1 surface-border">
                            <div>
                                <h3 className="m-0 text-900 font-bold text-lg">{detailLetter?.perihal || "-"}</h3>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <Chip label={`Agenda: ${detailLetter?.nomor_agenda || "-"}`} className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                                    <Chip label={`Surat: ${detailLetter?.nomor_surat || "-"}`} className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                                    {archivedDocument && (
                                        <Chip label={`Arsip: ${archivedDocument.kode_dokumen}`} icon="pi pi-verified" className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-column align-align-items-end gap-2">
                                {detailLetter?.status && statusBodyTemplate({ status: detailLetter.status } as TableData)}
                                {archivedDocument ? (
                                    <Button label="Lihat Arsip"
                                        icon="pi pi-folder-open"
                                        outlined
                                        onClick={() => router.push(`/edms/archive_document/${archivedDocument.id_dokumen}/versions`)} />
                                ) : (
                                    <Button label="Arsipkan"
                                        icon="pi pi-archive"
                                        loading={state.load}
                                        disabled={detailFiles.length < 1}
                                        onClick={confirmArchiveLetter}
                                        tooltip={detailFiles.length < 1 ? "Upload file surat terlebih dahulu" : "Arsipkan surat sebagai dokumen"}
                                        tooltipOptions={{ position: "left" }} />
                                )}
                            </div>
                        </div>

                        <div className="grid text-sm">
                            {[
                                { label: "Pengirim", value: detailLetter?.nama_pengirim },
                                { label: "Instansi", value: detailLetter?.instansi_pengirim },
                                { label: "Tanggal Surat", value: formatDateCalendar(detailLetter?.tanggal_surat) },
                                { label: "Tanggal Diterima", value: formatDateCalendar(detailLetter?.tanggal_diterima) },
                                { label: "Jenis Surat", value: detailLetter?.nama_jenis_surat },
                                { label: "Lampiran", value: detailLetter?.keterangan_lampiran },
                            ].map(({ label, value }) => (
                                <div key={label} className="col-12 md:col-4">
                                    <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: "0.08em" }}>{label}</div>
                                    <div className="font-semibold text-900">{value || "-"}</div>
                                </div>
                            ))}
                        </div>

                        <Divider className="my-0" />

                        {/* File section */}
                        <div>
                            <div className="flex align-items-center justify-content-between mb-3">
                                <div className="font-bold text-900 flex align-items-center gap-2">
                                    <i className="pi pi-paperclip text-primary" />
                                    File Surat
                                </div>
                                <Tag value={`${detailFiles.length} file`} severity="info" />
                            </div>

                            {detailFiles.length> 0 ? (
                                <div className="grid">
                                    <div className="col-12 lg:col-5">
                                        <div className="flex flex-column gap-2">
                                            {detailFiles.map((file) => (
                                                <div key={file.file_surat_masuk_id} className="p-3 surface-50 border-round-lg border-1 surface-border">
                                                    <div className="flex justify-content-between align-align-items-center gap-2">
                                                        <div className="flex align-items-center gap-2">
                                                            <div className="flex align-items-center justify-content-center border-round" style={{ width: "2rem", height: "2rem", background: "#EEF2FF", color: "#4F46E5", flexShrink: 0 }}>
                                                                <i className="pi pi-file text-sm" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-sm text-900">{file.nama_file || "File surat"}</div>
                                                                <div className="text-xs text-color-secondary mt-1">{file.tipe_mime_file || "-"} - {formatFileSize(file.ukuran_file)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button icon="pi pi-eye" text tooltip="Lihat file" onClick={() => previewUploadedFile(file)} />
                                                            <Button icon="pi pi-download" rounded text tooltip="Download" onClick={() => downloadUploadedFile(file)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-12 lg:col-7">
                                        <div className="surface-50 border-round-lg border-1 surface-border p-3 flex align-items-center justify-content-center" style={{ minHeight: "26rem" }}>
                                            {previewFile ? (
                                                previewFile.mimeType.startsWith("image/") ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={previewFile.url} alt={previewFile.fileName} className="w-full" style={{ maxHeight: "34rem", objectFit: "contain" }} />
                                                ) : previewFile.mimeType === "application/pdf" ? (
                                                    <iframe src={previewFile.url} title={previewFile.fileName} className="w-full" style={{ minHeight: "34rem", border: "none" }} />
                                                ) : (
                                                    <div className="flex flex-column align-items-center text-center gap-3 text-color-secondary">
                                                        <i className="pi pi-file text-5xl text-300" />
                                                        <div>
                                                            <div className="font-semibold text-900">{previewFile.fileName}</div>
                                                            <p className="m-0 mt-1 text-sm">Format ini tidak bisa dipreview. Gunakan tombol download.</p>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex flex-column align-items-center text-center gap-3 text-color-secondary">
                                                    <i className="pi pi-file-pdf text-5xl text-300" />
                                                    <div>
                                                        <div className="font-semibold text-900">Preview File</div>
                                                        <p className="m-0 mt-1 text-sm">Klik ikon mata di samping file untuk preview.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Message severity="info" text="Belum ada file surat yang diupload." className="w-full" />
                            )}
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
};

export default Table;
