'use client'

import { formatDateCalendar } from "@/lib/tools/dateTools";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Calendar } from "primereact/calendar";
import { OverlayPanel } from "primereact/overlaypanel";
import { useEffect, useState, useRef, useMemo } from "react";
import { apiEndpointGet } from "../endpoints";

import { TableData, TableProps } from "../interfaces";
import Form, { extractIsiSuratFromFinal } from "./form";

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
    { label: "Draft", value: "draft" },
    { label: "Menunggu Approval", value: "menunggu_approval" },
    { label: "Disetujui", value: "disetujui" },
    { label: "Ditolak", value: "ditolak" },
    { label: "Terkirim", value: "terkirim" },
    { label: "Selesai", value: "selesai" },
];

const statusConfig: Record<string, { label: string; severity: any; icon: string }> = {
    draft: { label: "Draft", severity: "secondary", icon: "pi pi-pencil" },
    menunggu_approval: { label: "Menunggu Approval", severity: "warning", icon: "pi pi-clock" },
    disetujui: { label: "Disetujui", severity: "info", icon: "pi pi-check" },
    ditolak: { label: "Ditolak", severity: "danger", icon: "pi pi-times-circle" },
    terkirim: { label: "Terkirim", severity: "success", icon: "pi pi-send" },
    selesai: { label: "Selesai", severity: "success", icon: "pi pi-check-circle" },
};

interface LetterTypeOption {
    jenis_surat_id: number;
    nama_jenis_surat: string;
}

const getUserId = (state: TableProps["state"]) =>
    state.session?.user?.IdPengguna || state.session?.user?.id || null;

const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return formatDateCalendar(date, "dd MMM yyyy", null, "id") || "-";
};

const formatFileSize = (size?: number | null) => {
    if (!size || size <= 0) return "-";
    if (size < 1024) return `${size} B`;
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
};




const getTimelineIcon = (aktivitas: string) => {
    switch (aktivitas) {
        case "surat_dibuat": return "pi pi-file-edit text-blue-500 bg-blue-100 p-2 border-round-circle";
        case "surat_diupdate": return "pi pi-pencil text-yellow-500 bg-yellow-100 p-2 border-round-circle";
        case "surat_disetujui": return "pi pi-check text-green-500 bg-green-100 p-2 border-round-circle";
        case "surat_ditolak": return "pi pi-times text-red-500 bg-red-100 p-2 border-round-circle";
        case "file_surat_diupload": return "pi pi-upload text-purple-500 bg-purple-100 p-2 border-round-circle";
        case "surat_diarsipkan": return "pi pi-bookmark text-green-500 bg-green-100 p-2 border-round-circle";
        default: return "pi pi-info-circle text-gray-500 bg-gray-100 p-2 border-round-circle";
    }
};

const getTimelineLabel = (aktivitas: string, status: string) => {
    switch (aktivitas) {
        case "surat_dibuat": return "Surat Keluar Dibuat";
        case "surat_diupdate": return `Diperbarui (Status: ${statusConfig[status]?.label || status})`;
        case "surat_disetujui": return "Surat Keluar Disetujui";
        case "surat_ditolak": return "Surat Keluar Ditolak";
        case "file_surat_diupload": return "File Surat Keluar Diunggah";
        case "surat_diarsipkan": return "Surat Keluar Diarsipkan ke EDMS";
        default: return aktivitas;
    }
};

const Table = ({ 
    state, 
    setState, 
    formik, 
    getData, 
    toast,
    handleSave,
    downloadDocx,
    getLetterTypeOptions,
    getTemplateOptions,
    loadNomorPreview,
    handleFileUpload,
    executeArchiveLetter,
    reloadDetail,
    handleDeleteLetter,
    apiSaveLetter,
    apiUploadPdf,
    apiDownloadDocx,
    apiExtractOcr,
    apiGetLetterTypes,
    apiGetTemplates,
    apiGetNomorPreview,
    apiGetConfig
}: TableProps) => {
    const [uploading, setUploading] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [letterTypeOptions, setLetterTypeOptions] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const filterOverlayRef = useRef<any>(null);

    const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const detailLetter = state.detailData?.surat;
        if (!file || !detailLetter || !handleFileUpload) return;

        if (file.type !== "application/pdf") {
            showError(toast, "File surat keluar harus berupa PDF");
            e.target.value = "";
            return;
        }

        setUploading(true);

        try {
            await handleFileUpload(file, detailLetter.id_surat_keluar, Number(getUserId(state)) || null);
            if (reloadDetail) await reloadDetail(detailLetter.id_surat_keluar);
            await refreshData();
        } finally {
            setUploading(false);
        }
    };

    const onArchiveLetter = async () => {
        const detailLetter = state.detailData?.surat;
        if (!detailLetter?.id_surat_keluar || !executeArchiveLetter) return;

        setArchiving(true);
        try {
            await executeArchiveLetter(
                detailLetter.id_surat_keluar, 
                state.session?.user?.name || "Sekretariat", 
                Number(getUserId(state)) || null
            );
            if (reloadDetail) await reloadDetail(detailLetter.id_surat_keluar);
            await refreshData();
        } finally {
            setArchiving(false);
        }
    };

    const confirmArchiveLetter = () => {
        const detailLetter = state.detailData?.surat;
        const detailFiles = state.detailData?.files || [];
        if (!detailLetter?.id_surat_keluar) return;

        if (detailFiles.length < 1) {
            showError(toast, "Unggah file surat terlebih dahulu sebelum diarsipkan");
            return;
        }

        confirmDialog({
            header: "Konfirmasi Arsip",
            message: `Arsipkan surat keluar ${detailLetter.nomor_agenda || detailLetter.nomor_surat} ke dalam Arsip Dokumen (EDMS)?`,
            icon: "pi pi-archive",
            acceptLabel: "Arsipkan",
            rejectLabel: "Batal",
            acceptClassName: "p-button-primary",
            rejectClassName: "p-button-secondary p-button-outlined",
            accept: onArchiveLetter,
        });
    };

    const buildPayload = () => ({
        keyword: state.searchVal || "",
        status: state.statusFilter || "",
        id_jenis_surat: state.jenisSuratFilter || "",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
    });

    const refreshData = () => getData(apiEndpointGet, buildPayload());

    const filteredData = useMemo(() => {
        let list = state.data || [];

        const startDate = state.startDate;
        const endDate = state.endDate;

        if (startDate || endDate) {
            list = list.filter((item) => {
                const rawDate = item.tanggal_surat || item.tanggal_kirim || item.created_at;
                const itemDate = rawDate ? String(rawDate).slice(0, 10) : '';
                if (startDate && itemDate && itemDate < startDate) return false;
                if (endDate && itemDate && itemDate > endDate) return false;
                return true;
            });
        }

        if (state.statusFilter) {
            list = list.filter(
                (item) => String(item.status || "").toLowerCase() === String(state.statusFilter).toLowerCase()
            );
        }

        if (state.jenisSuratFilter && Number(state.jenisSuratFilter) > 0) {
            list = list.filter(
                (item) => Number(item.id_jenis_surat) === Number(state.jenisSuratFilter)
            );
        }

        if (state.searchVal && state.searchVal.trim() !== "") {
            const query = state.searchVal.toLowerCase().trim();
            list = list.filter((item) => {
                return (
                    String(item.nomor_surat || "").toLowerCase().includes(query) ||
                    String(item.nomor_agenda || "").toLowerCase().includes(query) ||
                    String(item.perihal || "").toLowerCase().includes(query) ||
                    String(item.tujuan || "").toLowerCase().includes(query) ||
                    String(item.instansi_tujuan || "").toLowerCase().includes(query) ||
                    String(item.nama_pengirim || "").toLowerCase().includes(query) ||
                    String(item.jabatan || "").toLowerCase().includes(query) ||
                    String(item.nama_jenis_surat || "").toLowerCase().includes(query) ||
                    String(item.nama_file || "").toLowerCase().includes(query)
                );
            });
        }

        return list;
    }, [state.data, state.statusFilter, state.jenisSuratFilter, state.searchVal, state.startDate, state.endDate]);

    const fetchLetterTypes = async () => {
        const fn = getLetterTypeOptions || apiGetLetterTypes;
        if (fn) {
            try {
                const data = await fn();
                setLetterTypeOptions([
                    { jenis_surat_id: 0, nama_jenis_surat: "Semua Jenis" },
                    ...(Array.isArray(data) ? data : []),
                ]);
            } catch (error) {
                console.error("Gagal mengambil jenis surat:", error);
            }
        }
    };

    const openDetail = async (rowData: TableData) => {
        setState((p) => ({ ...p, detail: true, detailLoad: true, detailData: null }));
        if (reloadDetail) {
            await reloadDetail(rowData.id_surat_keluar);
        }
        setState((p) => ({ ...p, detailLoad: false }));
    };

    const confirmDelete = (letters: TableData[]) => {
        if (letters.length < 1) return;

        confirmDialog({
            header: "Konfirmasi Hapus",
            message:
                letters.length> 1
                    ? `Hapus ${letters.length} surat keluar yang dipilih dari daftar?`
                    : `Hapus surat ${letters[0].nomor_agenda || letters[0].nomor_surat} dari daftar?`,
            icon: "pi pi-exclamation-triangle",
            acceptLabel: "Ya, Hapus",
            rejectLabel: "Batal",
            acceptClassName: "p-button-danger",
            rejectClassName: "p-button-secondary p-button-outlined",
            accept: async () => {
                if (!handleDeleteLetter) return;
                setState((p) => ({ ...p, load: true }));
                try {
                    await handleDeleteLetter(letters);
                } finally {
                    setState((p) => ({ ...p, load: false }));
                }
            },
        });
    };

    const statusBodyTemplate = (rowData: TableData) => {
        const s = String(rowData.status || '').toLowerCase();
        let bg = '#f59e0b';
        let icon = 'pi-file';
        let label = 'Draft / Konsep';

        if (s === 'pending_approval' || s === 'menunggu_persetujuan') {
            bg = '#a855f7';
            icon = 'pi-clock';
            label = 'Menunggu Persetujuan';
        } else if (s === 'approved' || s === 'disetujui') {
            bg = '#3b82f6';
            icon = 'pi-check-circle';
            label = 'Disetujui';
        } else if (s === 'sent' || s === 'terkirim' || s === 'completed') {
            bg = '#22c55e';
            icon = 'pi-send';
            label = 'Terkirim';
        } else if (s === 'rejected' || s === 'ditolak') {
            bg = '#ef4444';
            icon = 'pi-times';
            label = 'Ditolak';
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

    const letterTemplate = (rowData: TableData) => (
        <div>
            <div className="font-semibold text-sm text-900">{rowData.perihal || "-"}</div>
            <div className="text-xs text-color-secondary mt-1">
                Agenda: <strong>{rowData.nomor_agenda || "-"}</strong>
            </div>
        </div>
    );

    const destinationTemplate = (rowData: TableData) => (
        <div>
            <div className="font-semibold text-sm text-900">{rowData.tujuan || "-"}</div>
            {rowData.instansi_tujuan && (
                <div className="text-xs text-color-secondary mt-1">{rowData.instansi_tujuan}</div>
            )}
        </div>
    );

    const fileMetadataTemplate = (rowData: TableData) => {
        if (!rowData.nama_file) {
            return <span className="text-color-secondary">-</span>;
        }

        return (
            <div>
                <div className="font-semibold text-sm text-900 flex align-items-center gap-2">
                    <i className="pi pi-file-pdf text-red-500" />
                    <span>{rowData.nama_file}</span>
                </div>
                <div className="text-xs text-color-secondary mt-1">
                    {rowData.mime_type || "application/pdf"} - {formatFileSize(rowData.ukuran_file)}
                </div>
                {rowData.tanggal_upload && (
                    <div className="text-xs text-color-secondary mt-1">
                        Upload: {formatDate(rowData.tanggal_upload)}
                    </div>
                )}
            </div>
        );
    };

    const actionTemplate = (rowData: TableData) => (
        <div className="flex gap-1 justify-content-center">
            <Button icon="pi pi-eye"
                text
                tooltip="Lihat Detail"
                tooltipOptions={{ position: "top" }}
                onClick={() => openDetail(rowData)} />
            <Button icon="pi pi-pencil"
                text
                severity="secondary"
                tooltip="Edit"
                tooltipOptions={{ position: "top" }}
                onClick={() => {
                    formik.setValues({
                        id_surat_keluar: rowData.id_surat_keluar,
                        nomor_surat: rowData.nomor_surat,
                        nomor_agenda: rowData.nomor_agenda,
                        tanggal_surat: rowData.tanggal_surat?.slice(0, 10) || "",
                        tanggal_kirim: rowData.tanggal_kirim?.slice(0, 10) || "",
                        id_jenis_surat: rowData.id_jenis_surat,
                        perihal: rowData.perihal,
                        tujuan: rowData.tujuan,
                        instansi_tujuan: rowData.instansi_tujuan || "",
                        media_pengiriman: rowData.media_pengiriman || "",
                        id_template: rowData.id_template || null,
                        isi_surat: rowData.isi_surat || extractIsiSuratFromFinal(rowData.isi_surat_final),
                        isi_surat_final: rowData.isi_surat_final || "",
                        nama_pengirim: rowData.nama_pengirim || "",
                        jabatan: rowData.jabatan || "",
                        status: rowData.status,
                        file_surat: null,
                        created_by: rowData.created_by,
                        updated_by: rowData.updated_by,
                    });
                    setState((p) => ({ ...p, add: false, edit: true }));
                }} />
            <Button icon="pi pi-trash"
                text
                severity="danger"
                tooltip="Hapus"
                tooltipOptions={{ position: "top" }}
                onClick={() => confirmDelete([rowData])} />
        </div>
    );

    const renderHeader = () => (
        <div className="flex flex-column md:flex-row align-items-stretch md:align-items-center justify-content-between gap-3">
            {/* Left: Date Range Filter */}
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
                    severity="danger"
                    outlined
                    onClick={() => setState(p => ({ ...p, startDate: null, endDate: null, statusFilter: '', jenisSuratFilter: null, searchVal: '' }))}
                    tooltip="Reset Filter"
                    tooltipOptions={{ position: 'top' }}
                    className="p-button-icon-only"
                />
            </div>
        </div>
    );

    useEffect(() => {
        getData(apiEndpointGet, buildPayload());
        fetchLetterTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const detailLetter = state.detailData?.surat || null;
    const detailFiles = state.detailData?.files || [];
    const detailTrackings = state.detailData?.trackings || [];

    return (
        <>
            <ConfirmDialog />
            <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
                {/* Page Header */}
                <div className="flex flex-column gap-2 mb-4 px-1">
                    <h3 className="text-2xl font-bold m-0 text-900 flex align-items-center gap-2">
                        <i className="pi pi-send text-primary"></i>
                        <span>Data Surat Keluar</span>
                    </h3>
                    <div className="text-sm text-600">
                        Kelola data surat keluar, tujuan pengiriman, dan status proses surat.
                    </div>
                </div>

                <div className="flex justify-content-between mb-4">
                    <div className="flex flex-row align-items-center gap-2">
                        <Button label="Tambah Surat"
                        icon="pi pi-plus"
                        outlined
                       
                        onClick={() => {
                            formik.resetForm();
                            setState((p) => ({ ...p, selectedLetters: [], add: true, edit: false }));
                        }} />
                    <Divider layout="vertical" className="hidden md:inline m-0" />
                    <Button label={`Hapus${state.selectedLetters.length ? ` (${state.selectedLetters.length})` : ""}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        disabled={state.selectedLetters.length === 0}
                        onClick={() => confirmDelete(state.selectedLetters)} />
                    <Divider layout="vertical" className="hidden md:inline m-0" />
                    <Button label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        loading={state.load}
                        onClick={refreshData} />
                    </div>
                </div>

                {/* KETERANGAN STATUS BAR */}
                <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1 w-full" style={{ marginTop: '-0.25rem' }}>
                    <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                        <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '4px' }}></span>
                        <span className="text-700">Draft / Konsep</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#a855f7', borderRadius: '4px' }}></span>
                        <span className="text-700">Menunggu Persetujuan</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></span>
                        <span className="text-700">Disetujui</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#22c55e', borderRadius: '4px' }}></span>
                        <span className="text-700">Terkirim</span>
                    </div>
                    <div className="flex align-items-center gap-2 text-xs font-semibold">
                        <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#ef4444', borderRadius: '4px' }}></span>
                        <span className="text-700">Ditolak</span>
                    </div>
                </div>

                <OverlayPanel ref={filterOverlayRef} dismissable className="p-3">
                    <div className="flex flex-column gap-3 w-16rem">
                        <div className="font-bold text-sm text-900 border-bottom-1 surface-border pb-2">Filter Surat Keluar</div>
                        <div>
                            <label className="block text-xs font-medium text-700 mb-1">Status Surat</label>
                            <Dropdown
                                value={state.statusFilter || ''}
                                options={statusOptions}
                                onChange={(e) => setState(p => ({ ...p, statusFilter: e.value }))}
                                placeholder="Pilih Status"
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-700 mb-1">Jenis Surat</label>
                            <Dropdown
                                value={state.jenisSuratFilter || 0}
                                options={letterTypeOptions}
                                optionLabel="nama_jenis_surat"
                                optionValue="jenis_surat_id"
                                onChange={(e) => setState(p => ({ ...p, jenisSuratFilter: e.value || null }))}
                                placeholder="Pilih Jenis"
                                className="w-full"
                            />
                        </div>
                    </div>
                </OverlayPanel>

                <DataTable
                    value={filteredData}
                    paginator
                    selectionMode="multiple"
                    rows={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    header={renderHeader()}
                    globalFilterFields={["nomor_surat", "nomor_agenda", "perihal", "tujuan", "instansi_tujuan", "status", "nama_file"]}
                    filters={state.filters}
                    loading={state.load}
                    selection={state.selectedLetters}
                    onSelectionChange={(e) => setState((p) => ({ ...p, selectedLetters: e.value }))}
                    dataKey="id_surat_keluar"
                    emptyMessage={
                        <div className="flex flex-column align-items-center py-5 gap-3 text-color-secondary">
                            <i className="pi pi-send text-4xl text-300" />
                            <span className="font-medium text-sm">Belum ada surat keluar</span>
                        </div>
                    }
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first}-{last} dari {totalRecords} data"
                    rowHover
                    className="text-sm">
                    <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                    <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
                    <Column field="nomor_surat" header="Nomor Surat" sortable style={{ minWidth: "150px" }} />
                    <Column header="Perihal" body={letterTemplate} style={{ minWidth: "220px" }} />
                    <Column header="Tujuan" body={destinationTemplate} style={{ minWidth: "180px" }} />
                    <Column field="nama_jenis_surat" header="Jenis Surat" body={(r) => r.nama_jenis_surat || "-"} style={{ minWidth: "130px" }} />
                    <Column field="tanggal_surat" header="Tanggal Surat" sortable body={(r) => formatDate(r.tanggal_surat)} style={{ width: "130px" }} />
                    <Column field="tanggal_kirim" header="Tanggal Kirim" sortable body={(r) => formatDate(r.tanggal_kirim)} style={{ width: "130px" }} />
                    <Column field="media_pengiriman" header="Media" body={(r) => r.media_pengiriman || "-"} style={{ width: "120px" }} />
                    <Column header="File PDF" body={fileMetadataTemplate} style={{ minWidth: "220px" }} />
                    <Column header="Aksi" body={actionTemplate} style={{ width: "120px", textAlign: "center" }} />
                </DataTable>
            </div>

            <Form 
                getData={getData} 
                toast={toast} 
                state={state} 
                setState={setState} 
                formik={formik} 
                handleSave={handleSave}
                downloadDocx={downloadDocx}
                getLetterTypeOptions={getLetterTypeOptions}
                getTemplateOptions={getTemplateOptions}
                loadNomorPreview={loadNomorPreview}
                apiSaveLetter={apiSaveLetter}
                apiUploadPdf={apiUploadPdf}
                apiDownloadDocx={apiDownloadDocx}
                apiExtractOcr={apiExtractOcr}
                apiGetLetterTypes={apiGetLetterTypes}
                apiGetTemplates={apiGetTemplates}
                apiGetNomorPreview={apiGetNomorPreview}
                apiGetConfig={apiGetConfig} />

            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-send text-primary" />
                        <span className="font-bold text-900">Detail Surat Keluar</span>
                    </div>
                }
                visible={state.detail}
                modal
                style={{ width: "56rem", maxWidth: "96vw" }}
                onHide={() => setState((p) => ({ ...p, detail: false, detailData: null }))}
                pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
                {state.detailLoad ? (
                    <div className="flex flex-column align-items-center py-6 gap-3 text-color-secondary">
                        <i className="pi pi-spin pi-spinner text-3xl text-primary" />
                        <span className="text-sm font-medium">Memuat detail surat...</span>
                    </div>
                ) : (
                    <div className="flex flex-column gap-4 pt-3">
                        <div className="flex align-align-items-center justify-content-between gap-3 p-3 surface-50 border-round-xl border-1 surface-border">
                            <div>
                                <h3 className="m-0 text-900 font-bold text-lg">{detailLetter?.perihal || "-"}</h3>
                                <div className="flex gap-2 mt-2 flex-wrap text-xs text-color-secondary">
                                    <span>No. Agenda: <strong>{detailLetter?.nomor_agenda || "-"}</strong></span>
                                    <span>No. Surat: <strong>{detailLetter?.nomor_surat || "-"}</strong></span>
                                </div>
                            </div>
                            <div className="flex align-items-center gap-2">
                                {(() => {
                                    const isArchived = detailTrackings.some((t: any) => t.aktivitas === "surat_diarsipkan");
                                    const canArchive = detailFiles.length> 0 && ["disetujui", "selesai", "terkirim"].includes(String(detailLetter?.status).toLowerCase());

                                    if (isArchived) {
                                        return (
                                            <Tag 
                                                value="Sudah Diarsipkan" 
                                                
                                                icon="pi pi-bookmark-fill" 
                                                style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem" }} />
                                        );
                                    } else if (canArchive) {
                                        return (
                                            <Button label="Arsipkan ke EDMS"
                                                icon="pi pi-archive"
                                               
                                                loading={archiving}
                                                onClick={confirmArchiveLetter}
                                                style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }} />
                                        );
                                    }
                                    return null;
                                })()}
                                {detailLetter?.status && statusBodyTemplate({ status: detailLetter.status } as TableData)}
                            </div>
                        </div>

                        <div className="grid text-sm">
                            {[
                                { label: "Tujuan", value: detailLetter?.tujuan },
                                { label: "Instansi Tujuan", value: detailLetter?.instansi_tujuan },
                                { label: "Tanggal Surat", value: formatDate(detailLetter?.tanggal_surat) },
                                { label: "Tanggal Kirim", value: formatDate(detailLetter?.tanggal_kirim) },
                                { label: "Jenis Surat", value: detailLetter?.nama_jenis_surat },
                                { label: "Template", value: detailLetter?.nama_template },
                                { label: "Media Pengiriman", value: detailLetter?.media_pengiriman },
                            ].map(({ label, value }) => (
                                <div key={label} className="col-12 md:col-4">
                                    <div className="text-color-secondary text-xs font-bold uppercase mb-1" style={{ letterSpacing: "0.08em" }}>
                                        {label}
                                    </div>
                                    <div className="font-semibold text-900">{value || "-"}</div>
                                </div>
                            ))}
                        </div>

                        <Divider className="my-0" />

                        {(detailFiles.length> 0 || detailLetter?.isi_surat_final) && (
                            <>
                                <div>
                                    <div className="font-bold text-900 flex align-items-center gap-2 mb-3">
                                        <i className="pi pi-file-pdf text-primary text-xl" />
                                        <span className="text-base">Pratinjau Surat & Dokumen</span>
                                    </div>

                                    {(() => {
                                        const file = detailFiles?.[0];
                                        const fileId = file?.id_file_surat_keluar || file?.id_surat_keluar || detailLetter?.id_surat_keluar;
                                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                        const fileUrl = fileId
                                            ? `${baseUrl}/api/v1/correspondence/outgoing-file-download/${fileId}`
                                            : (file?.path_file ? (file.path_file.startsWith("http") ? file.path_file : `${baseUrl}/${file.path_file.replace(/^\/+/, '')}`) : "");
                                        const isPdf = fileUrl && (file?.mime_type?.includes("pdf") || file?.path_file?.toLowerCase().endsWith(".pdf") || file?.nama_file?.toLowerCase().endsWith(".pdf"));
                                        const isDocx = fileUrl && (
                                            file?.mime_type?.includes("word") ||
                                            file?.mime_type?.includes("officedocument") ||
                                            file?.path_file?.toLowerCase().endsWith(".docx") ||
                                            file?.nama_file?.toLowerCase().endsWith(".docx") ||
                                            file?.path_file?.toLowerCase().endsWith(".doc") ||
                                            file?.nama_file?.toLowerCase().endsWith(".doc")
                                        );

                                        if (isPdf) {
                                            return (
                                                <div className="border-1 surface-border border-round-lg overflow-hidden surface-50">
                                                    <iframe
                                                        src={fileUrl}
                                                        className="w-full"
                                                        style={{ height: "480px", border: "none" }}
                                                        title="Pratinjau Dokumen Surat Keluar" />
                                                </div>
                                            );
                                        }

                                        if (isDocx || detailLetter?.isi_surat_final) {
                                            return (
                                                <div className="flex flex-column gap-3">
                                                    {isDocx && (
                                                        <div className="p-3 bg-blue-50 border-1 border-blue-200 border-round-lg flex align-items-center justify-content-between gap-3">
                                                            <div className="flex align-items-center gap-3">
                                                                <i className="pi pi-file-word text-blue-600 text-2xl" />
                                                                <div>
                                                                    <div className="font-bold text-sm text-blue-900">{file?.nama_file || "Dokumen Surat Word (.docx)"}</div>
                                                                    <div className="text-xs text-blue-700">Berkas Microsoft Word &bull; Teks naskah otomatis di-ekstrak oleh sistem</div>
                                                                </div>
                                                            </div>
                                                            {fileUrl && (
                                                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                                                                    <Button icon="pi pi-download" label="Unduh Berkas .docx" severity="info" outlined />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="surface-card p-4 md:p-5 border-1 surface-border border-round-xl shadow-1">
                                                        <div className="text-center font-bold text-xs text-color-secondary uppercase mb-3" style={{ letterSpacing: "0.15em" }}>
                                                            &mdash; Pratinjau Naskah Dokumen Surat &mdash;
                                                        </div>
                                                        <pre
                                                            className="m-0 text-sm text-900 line-height-4"
                                                            style={{ whiteSpace: "pre-wrap", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                                                            {detailLetter?.isi_surat_final || "Isi naskah dokumen tidak tersedia."}
                                                        </pre>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return null;
                                    })()}
                                </div>

                                <Divider className="my-0" />
                            </>
                        )}

                        <div>
                            <div className="flex align-items-center justify-content-between mb-3">
                                <div className="font-bold text-900 flex align-items-center gap-2">
                                    <i className="pi pi-paperclip text-primary" />
                                    Dokumen Terlampir
                                </div>
                                <div className="flex align-items-center gap-2">
                                    {(() => {
                                        const isArchived = detailTrackings.some((t: any) => t.aktivitas === "surat_diarsipkan");
                                        if (!isArchived) {
                                            return (
                                                <>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        style={{ display: "none" }}
                                                        onChange={onFileUpload}
                                                        accept="application/pdf" />
                                                    <Button type="button"
                                                        icon="pi pi-upload"
                                                        label="Unggah File"
                                                        outlined
                                                        loading={uploading}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }} />
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                    <Tag value={`${detailFiles.length} file`} severity="info" />
                                </div>
                            </div>

                            {detailFiles.length> 0 ? (
                                <div className="flex flex-column gap-2">
                                    {detailFiles.map((file, idx) => {
                                        const fileId = file.id_file_surat_keluar || file.id_surat_keluar;
                                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                        const fileUrl = fileId
                                            ? `${baseUrl}/api/v1/correspondence/outgoing-file-download/${fileId}`
                                            : (file.path_file ? (file.path_file.startsWith("http") ? file.path_file : `${baseUrl}/${file.path_file.replace(/^\/+/, '')}`) : "");

                                        return (
                                            <div key={file.id_file_surat_keluar || idx} className="p-3 surface-50 border-round-lg border-1 surface-border flex align-items-center justify-content-between gap-3">
                                                <div className="flex align-items-center gap-3">
                                                    <i className="pi pi-file text-primary" />
                                                    <div>
                                                        <div className="font-semibold text-sm text-900">{file.nama_file || "Dokumen"}</div>
                                                        <div className="text-xs text-color-secondary">
                                                            {file.mime_type || "-"} - {formatFileSize(file.ukuran_file)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {fileUrl && (
                                                    <a 
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="no-underline">
                                                        <Button icon="pi pi-download" rounded text tooltip="Download File" />
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}

                                </div>
                            ) : (
                                <div className="flex flex-column align-items-center py-4 gap-2 text-color-secondary surface-50 border-round-lg">
                                    <i className="pi pi-file text-3xl text-300" />
                                    <span className="text-sm font-medium">Belum ada dokumen terlampir</span>
                                </div>
                            )}
                        </div>

                        <Divider className="my-0" />

                        {/* Beautiful Timeline Alur Approval */}
                        <div>
                            <div className="font-bold text-900 flex align-items-center gap-2 mb-3">
                                <i className="pi pi-history text-primary" />
                                Alur & Histori Approval
                            </div>

                            {detailTrackings.length> 0 ? (
                                <div className="flex flex-column gap-4 pl-3 py-2 relative" style={{ borderLeft: "2px solid var(--surface-200)" }}>
                                    {detailTrackings.map((tracking: any, idx: number) => (
                                        <div key={tracking.id_tracking || idx} className="relative flex align-align-items-center gap-3">
                                            {/* Custom Icon Pin */}
                                            <div className="absolute" style={{ left: "-27px", top: "0" }}>
                                                <i className={`${getTimelineIcon(tracking.aktivitas)} shadow-1`} style={{ fontSize: "0.85rem", padding: "0.4rem" }} />
                                            </div>
                                            <div className="flex-1 pl-2">
                                                <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                                                    <span className="font-bold text-sm text-900">
                                                        {getTimelineLabel(tracking.aktivitas, tracking.status)}
                                                    </span>
                                                    <span className="text-xs text-color-secondary">
                                                        {formatDateCalendar(tracking.tanggal, "dd MMM yyyy HH:mm", null, "id")}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-semibold text-primary mt-1">
                                                    Oleh: {tracking.nama_pembuat || "Sistem"}
                                                </div>
                                                {tracking.catatan && (
                                                    <div className="text-sm text-color-secondary bg-surface-50 border-round p-2 mt-2 border-1 surface-border border-left-3 border-left-primary">
                                                        {tracking.catatan}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-color-secondary text-sm">
                                    Belum ada catatan riwayat tracking untuk surat ini.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
};

export default Table;
