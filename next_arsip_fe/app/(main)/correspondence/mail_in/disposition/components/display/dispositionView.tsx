'use client'

import { useState, useEffect } from "react";
import { showError } from "@/lib/tools/generalTools";
import { usePermissions } from "@/layout/context/permissionContext";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Chip } from "primereact/chip";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { RefObject } from "react";
import { TableData } from "../../../components/interfaces";

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogMode = "create" | "forward" | "process" | "complete";

type UserOption = {
    id_pengguna: number;
    nama_lengkap: string;
    nama_pengguna: string;
};

type InstructionOption = {
    instruksi_disposisi_id: number;
    nama_instruksi: string;
    kode_instruksi: string;
};

export interface DispositionViewProps {
    toast: RefObject<Toast>;
    letters: TableData[];
    dispositions: Record<string, any>[];
    users: UserOption[];
    instructions: InstructionOption[];
    search: string;
    loading: boolean;
    dialogMode: DialogMode | null;
    selectedLetter: TableData | null;
    selectedDisposition: Record<string, any> | null;
    form: {
        surat_masuk_id: number | null;
        disposisi_induk_id: number | null;
        dari_pengguna_id: number | null;
        kepada_pengguna_id: number | null;
        instruksi_disposisi_id: number | null;
        instruksi: string;
        catatan_disposisi: string;
        batas_waktu: string;
    };
    actionNote: string;
    statusSummary: Record<string, number>;
    letterOptions: { label: string; value: number | null }[];
    onSearchChange: (val: string) => void;
    onFormChange: (key: string, value: any) => void;
    onActionNoteChange: (val: string) => void;
    onOpenCreate: (letter?: TableData) => void;
    onOpenForward: (disposition: Record<string, any>) => void;
    onOpenAction: (mode: "process" | "complete", disposition: Record<string, any>) => void;
    onCloseDialog: () => void;
    onSaveDisposition: () => void;
    onSaveAction: () => void;
    onRefresh: () => void;
    
    detailVisible?: boolean;
    detailLoad?: boolean;
    detailData?: any;
    onCloseDetail?: () => void;
    onOpenDetail?: (letterId: number) => void;
    getFileBlob?: (file: any) => Promise<any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const formatFileSize = (size?: number | null) => {
    if (!size) return "-";
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getStatus = (value?: string) => String(value || "baru").toLowerCase();

const renderStatusTag = (statusValue?: string) => {
    const s = getStatus(statusValue);
    let bgClass = "bg-blue-500";
    let icon = "pi pi-circle";
    if (s === 'baru') { bgClass = "bg-gray-500"; icon = "pi pi-envelope"; }
    else if (s === 'didisposisi') { bgClass = "bg-orange-500"; icon = "pi pi-share-alt"; }
    else if (s === 'dibaca') { bgClass = "bg-blue-500"; icon = "pi pi-eye"; }
    else if (s === 'diproses') { bgClass = "bg-orange-500"; icon = "pi pi-cog"; }
    else if (s === 'selesai') { bgClass = "bg-green-500"; icon = "pi pi-check-circle"; }
    
    let label = s === 'baru' ? 'Baru' : s === 'didisposisi' ? 'Didisposisi' : s === 'dibaca' ? 'Dibaca' : s === 'diproses' ? 'Diproses' : s === 'selesai' ? 'Selesai' : s;
    return (
        <div className="flex justify-content-center">
            <div className={`${bgClass} flex align-items-center justify-content-center`} style={{ width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0 }} title={label}>
                <i className={`${icon} text-white`} style={{ fontSize: '0.8rem' }}></i>
            </div>
        </div>
    );
};

const dialogTitleConfig: Record<DialogMode, { title: string; icon: string; color: string }> = {
    create: { title: "Buat Disposisi Surat", icon: "pi pi-send", color: "text-primary" },
    forward: { title: "Teruskan Disposisi", icon: "pi pi-share-alt", color: "text-blue-500" },
    process: { title: "Proses Disposisi", icon: "pi pi-cog", color: "text-orange-500" },
    complete: { title: "Selesaikan Disposisi", icon: "pi pi-check-circle", color: "text-green-500" },
};

// ─── Main View Component ───────────────────────────────────────────────────────

const DispositionView = ({
    toast,
    letters,
    dispositions,
    users,
    instructions,
    search,
    loading,
    dialogMode,
    selectedLetter,
    selectedDisposition,
    form,
    actionNote,
    statusSummary,
    letterOptions,
    onSearchChange,
    onFormChange,
    onActionNoteChange,
    onOpenCreate,
    onOpenForward,
    onOpenAction,
    onCloseDialog,
    onSaveDisposition,
    onSaveAction,
    onRefresh,
    detailVisible,
    detailLoad,
    detailData,
    onCloseDetail,
    onOpenDetail,
    getFileBlob,
}: DispositionViewProps) => {

    const [previewFile, setPreviewFile] = useState<{ url: string; mimeType: string; fileName: string } | null>(null);

    const detailLetter = detailData?.surat || detailData?.letter || null;
    const detailFiles = detailData?.files || [];

    const closePreview = () => {
        if (previewFile?.url) window.URL.revokeObjectURL(previewFile.url);
        setPreviewFile(null);
    };

    const previewUploadedFile = async (file: any) => {
        closePreview();
        try {
            if (!getFileBlob) return;
            const res = await getFileBlob(file);
            const mimeType = file.tipe_mime_file || res.headers["content-type"] || "application/octet-stream";
            const blob = new Blob([res.data], { type: mimeType });
            setPreviewFile({ url: window.URL.createObjectURL(blob), mimeType, fileName: file.nama_file || "file-surat" });
        } catch (error: any) {
            console.error("Preview error", error);
            const e = error?.response?.data || error;
            showError(toast, e?.message || "File surat gagal dibuka");
        }
    };

    const downloadUploadedFile = async (file: any) => {
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
            console.error("Download error", error);
            const e = error?.response?.data || error;
            showError(toast, e?.message || "File surat gagal didownload");
        }
    };

    useEffect(() => {
        return () => { if (previewFile?.url) window.URL.revokeObjectURL(previewFile.url); };
    }, [previewFile?.url]);
    const pendingLetters = letters.filter((l) => l.status !== "selesai");
    const completionRate = letters.length ? Math.round(((statusSummary.selesai || 0) / letters.length) * 100) : 0;

    const metricCards = [
        { label: "Baru", value: statusSummary.baru || 0, icon: "pi pi-envelope", bg: "#EEF2FF", color: "#4F46E5", severity: "info" as const },
        { label: "Didisposisi", value: statusSummary.didisposisi || 0, icon: "pi pi-share-alt", bg: "#FFFBEB", color: "#D97706", severity: "warning" as const },
        { label: "Diproses", value: statusSummary.diproses || 0, icon: "pi pi-cog", bg: "#FFF7ED", color: "#EA580C", severity: "warning" as const },
        { label: "Selesai", value: statusSummary.selesai || 0, icon: "pi pi-check-circle", bg: "#F0FDF4", color: "#16A34A", severity: "success" as const },
    ];

    // ─── Column Templates ────────────────────────────────────────────────────

    const pendingLetterNoTemplate = (rowData: TableData) => (
        <div>
            <div className="font-semibold text-sm text-900">{rowData.nomor_agenda || rowData.nomor_surat || "-"}</div>
            <div className="text-xs text-color-secondary">{rowData.nama_pengirim || "-"}</div>
        </div>
    );

    const pendingLetterSubjectTemplate = (rowData: TableData) => (
        <div>
            <div className="text-sm text-900">{rowData.perihal || "-"}</div>
            {rowData.keterangan_lampiran && (
                <div className="text-xs text-color-secondary mt-1">{rowData.keterangan_lampiran}</div>
            )}
        </div>
    );

    const pendingActionTemplate = (rowData: TableData) => (
        <Button icon="pi pi-send"
            label={rowData.status === "baru" ? "Disposisikan" : "Tambah"}
            style={{ border: "none", fontSize: "0.75rem" }}
            onClick={() => onOpenCreate(rowData)} />
    );

    const dispositionLetterTemplate = (row: Record<string, any>) => (
        <div>
            <div className="font-semibold text-sm text-900">{row.nomor_agenda || row.nomor_surat || "-"}</div>
            <div className="text-xs text-color-secondary">{row.perihal || "-"}</div>
        </div>
    );

    const dispositionFlowTemplate = (row: Record<string, any>) => (
        <div>
            <div className="font-semibold text-sm text-900 flex align-items-center gap-1">
                <span>{row.from_user_name || "Sekretariat"}</span>
                <i className="pi pi-arrow-right text-xs text-color-secondary" />
                <span>{row.to_user_name || "-"}</span>
            </div>
            <div className="text-xs text-color-secondary mt-1">
                {row.disposisi_induk_id ? `Lanjutan dari #${row.disposisi_induk_id}` : "Disposisi awal"}
            </div>
        </div>
    );

    const dispositionInstructionTemplate = (row: Record<string, any>) => (
        <div>
            <div className="font-semibold text-sm text-900">{row.nama_instruksi || row.instruksi || "-"}</div>
            {row.catatan_disposisi && <div className="text-xs text-color-secondary mt-1"><i className="pi pi-send text-xs mr-1" />{row.catatan_disposisi}</div>}
            {row.catatan_tindakan && <div className="text-xs text-orange-500 mt-1"><i className="pi pi-check-circle text-xs mr-1" />{row.catatan_tindakan}</div>}
        </div>
    );

    const { hasPermission } = usePermissions();

    const dispositionActionTemplate = (row: Record<string, any>) => {
        const status = getStatus(row.status);
        const isDone = status === "selesai";
        const isProcess = status === "diproses";
        const canApprove = hasPermission("Disposisi Surat", "hak_setuju");

        return (
            <div className="flex gap-1 align-items-center justify-content-center">
                {onOpenDetail && (
                    <Button icon="pi pi-eye" text tooltip="Lihat Detail" tooltipOptions={{ position: "top" }} onClick={() => onOpenDetail(row.surat_masuk_id)} />
                )}
                {canApprove && !isDone && !isProcess && (
                    <Button icon="pi pi-play" text severity="warning" tooltip="Proses" tooltipOptions={{ position: "top" }} onClick={() => onOpenAction("process", row)} />
                )}
                {!isDone && (
                    <Button icon="pi pi-share-alt" text severity="info" tooltip="Teruskan" tooltipOptions={{ position: "top" }} onClick={() => onOpenForward(row)} />
                )}
                {canApprove && !isDone && (
                    <Button icon="pi pi-check" text tooltip="Selesaikan" tooltipOptions={{ position: "top" }} onClick={() => onOpenAction("complete", row)} />
                )}
                {isDone && <span className="text-xs text-color-secondary">—</span>}
            </div>
        );
    };

    const currentDialogConfig = dialogMode ? dialogTitleConfig[dialogMode] : null;

    return (
        <>
            {/* ─── Page Header ──────────────────────────────────────────────── */}
            <Card className="shadow-2 border-1 surface-border border-round-xl p-4 bg-white border-none mb-4">
                <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
                    <div className="flex flex-column gap-2 mb-2 px-1">
                        <h3 className="text-2xl font-bold m-0 text-900 flex align-items-center gap-2">
                            <i className="pi pi-send text-primary"></i>
                            <span>Workflow Disposisi</span>
                        </h3>
                        <div className="text-sm text-600">
                            Kelola disposisi berjenjang, instruksi pimpinan, catatan, dan tracking status surat masuk.
                        </div>
                    </div>
                    <div className="flex flex-wrap align-items-center gap-2 flex-shrink-0">
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Cari surat atau disposisi..."
                                className="w-full sm:w-24rem" />
                        </span>
                        <Button icon="pi pi-send" label="Buat Disposisi" style={{ border: "none" }}
                            onClick={() => onOpenCreate()} />
                        <Button icon="pi pi-refresh" label="Refresh" outlined loading={loading} onClick={onRefresh} />
                    </div>
                </div>

                {/* ─── Metric Cards ──────────────────────── */}
                <div className="grid">
                    {metricCards.map((m) => (
                        <div key={m.label} className="col-12 sm:col-6 lg:col-3">
                            <div className="p-3 border-round-xl border-1 surface-border flex align-items-center gap-3" style={{ background: m.bg }}>
                                <div className="flex align-items-center justify-content-center border-round-lg" style={{ width: "3rem", height: "3rem", background: "rgba(255,255,255,0.6)", color: m.color, flexShrink: 0 }}>
                                    <i className={`${m.icon} text-xl`} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-color-secondary" style={{ letterSpacing: "0.08em" }}>{m.label}</div>
                                    <div className="text-2xl font-extrabold mt-1" style={{ color: m.color }}>{m.value.toLocaleString("id-ID")}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Progress */}
                <div className="mt-3 p-3 surface-50 border-round-xl border-1 surface-border flex align-items-center justify-content-between gap-3">
                    <div>
                        <div className="text-xs font-bold uppercase text-color-secondary mb-1" style={{ letterSpacing: "0.08em" }}>Tingkat Penyelesaian</div>
                        <div className="text-color-secondary text-sm">Status surat bergerak otomatis berdasarkan aksi disposisi.</div>
                    </div>
                    <div className="flex align-items-center justify-content-center border-circle font-extrabold text-lg"
                        style={{ width: "4rem", height: "4rem", backgroundColor: "var(--primary-color)", color: "#fff", flexShrink: 0 }}>
                        {completionRate}%
                    </div>
                </div>
            </Card>

            {/* ─── Surat Perlu Disposisi + Alur Realita ─────────────────────── */}
            <div className="grid mb-4">
                <div className="col-12 lg:col-8">
                    <Card className="shadow-1 border-round-2xl border-none h-full">
                        <div className="flex align-items-center justify-content-between mb-3">
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-inbox text-primary" />
                                <span className="font-bold text-900">Surat Perlu Disposisi</span>
                            </div>
                            <Chip label={`${pendingLetters.length} surat`} className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                        </div>
                        <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1 w-full">
                            <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                                <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                            </div>
                            <div className="flex align-items-center gap-2 text-xs font-semibold">
                                <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#6b7280', borderRadius: '4px' }}></span>
                                <span className="text-700">Baru</span>
                            </div>
                            <div className="flex align-items-center gap-2 text-xs font-semibold">
                                <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#f97316', borderRadius: '4px' }}></span>
                                <span className="text-700">Didisposisi</span>
                            </div>
                            <div className="flex align-items-center gap-2 text-xs font-semibold">
                                <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></span>
                                <span className="text-700">Dibaca</span>
                            </div>
                            <div className="flex align-items-center gap-2 text-xs font-semibold">
                                <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#f97316', borderRadius: '4px' }}></span>
                                <span className="text-700">Diproses</span>
                            </div>
                            <div className="flex align-items-center gap-2 text-xs font-semibold">
                                <span className="inline-block flex-shrink-0 shadow-1" style={{ width: '16px', height: '16px', backgroundColor: '#22c55e', borderRadius: '4px' }}></span>
                                <span className="text-700">Selesai</span>
                            </div>
                        </div>
                        <DataTable
                            value={pendingLetters}
                            loading={loading}
                            emptyMessage={
                                <div className="flex flex-column align-items-center py-4 gap-2 text-color-secondary">
                                    <i className="pi pi-check-circle text-2xl text-green-400" />
                                    <span className="text-sm font-medium">Semua surat sudah didisposisi</span>
                                </div>
                            }
                            className="text-sm"
                            rowHover>
                            <Column body={(r) => renderStatusTag(r.status)} header="Status" align="center" style={{ width: "80px" }} />
                            <Column header="No / Pengirim" body={pendingLetterNoTemplate} style={{ minWidth: "150px" }} />
                            <Column header="Perihal" body={pendingLetterSubjectTemplate} style={{ minWidth: "200px" }} />
                            <Column header="Aksi" body={pendingActionTemplate} style={{ width: "130px", textAlign: "center" }} />
                        </DataTable>
                    </Card>
                </div>
                <div className="col-12 lg:col-4">
                    <Card className="shadow-1 border-round-2xl border-none h-full">
                        <div className="flex align-items-center gap-2 mb-4">
                            <i className="pi pi-sitemap text-primary" />
                            <span className="font-bold text-900">Alur Disposisi</span>
                        </div>
                        <div className="flex flex-column gap-3">
                            {[
                                { step: "1", label: "Surat Baru Diterima", desc: "Sekretariat mencatat surat masuk", icon: "pi pi-envelope", bg: "#EEF2FF", color: "#4F46E5" },
                                { step: "2", label: "Disposisi Pimpinan", desc: "Pimpinan mendisposisi ke unit/staf", icon: "pi pi-send", bg: "#FFFBEB", color: "#D97706" },
                                { step: "3", label: "Proses Unit", desc: "Unit tujuan memproses surat", icon: "pi pi-cog", bg: "#FFF7ED", color: "#EA580C" },
                                { step: "4", label: "Teruskan / Selesai", desc: "Delegasi lanjutan atau penyelesaian", icon: "pi pi-check-circle", bg: "#F0FDF4", color: "#16A34A" },
                            ].map((s) => (
                                <div key={s.step} className="flex align-align-items-center gap-3">
                                    <div className="flex align-items-center justify-content-center border-round-lg flex-shrink-0" style={{ width: "2.5rem", height: "2.5rem", background: s.bg, color: s.color }}>
                                        <i className={`${s.icon} text-sm`} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm text-900">{s.label}</div>
                                        <div className="text-xs text-color-secondary mt-1">{s.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Divider className="mt-4 mb-3" />
                        <Message
                            severity="info"
                            text="Gunakan 'Teruskan' agar parent disposisi tetap tercatat dalam riwayat."
                            className="w-full text-xs" />
                    </Card>
                </div>
            </div>

            {/* ─── Alur Disposisi Berjenjang ────────────────────────────────── */}
            <Card className="shadow-1 border-round-2xl border-none mb-4">
                <div className="flex align-items-center justify-content-between mb-3">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-share-alt text-primary" />
                        <span className="font-bold text-900">Alur Disposisi Berjenjang</span>
                    </div>
                    <Chip label={`${dispositions.length} disposisi`} className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                </div>
                <DataTable
                    value={dispositions}
                    loading={loading}
                    paginator rows={8}
                    emptyMessage={
                        <div className="flex flex-column align-items-center py-4 gap-2 text-color-secondary">
                            <i className="pi pi-inbox text-2xl text-300" />
                            <span className="text-sm">Belum ada disposisi. Mulai dari tombol Buat Disposisi.</span>
                        </div>
                    }
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                    className="text-sm"
                    rowHover>
                    <Column header="Surat" body={dispositionLetterTemplate} style={{ minWidth: "160px" }} />
                    <Column header="Status" body={(r) => renderStatusTag(r.status)} align="center" style={{ width: "80px" }} />
                    <Column header="Alur" body={dispositionFlowTemplate} style={{ minWidth: "200px" }} />
                    <Column header="Instruksi Pimpinan" body={dispositionInstructionTemplate} style={{ minWidth: "180px" }} />
                    <Column field="batas_waktu" header="Tenggat Waktu" body={(r) => formatDate(r.batas_waktu)} style={{ width: "110px" }} />
                    <Column header="Aksi" body={dispositionActionTemplate} style={{ width: "140px", textAlign: "center" }} />
                </DataTable>
            </Card>

            {/* ─── Dialog Disposisi (Create / Forward / Process / Complete) ─── */}
            <Dialog
                visible={Boolean(dialogMode)}
                header={
                    currentDialogConfig ? (
                        <div className="flex align-items-center gap-2">
                            <i className={`${currentDialogConfig.icon} ${currentDialogConfig.color}`} />
                            <span className="font-bold text-900">{currentDialogConfig.title}</span>
                        </div>
                    ) : "Disposisi"
                }
                modal
                style={{ width: "44rem", maxWidth: "95vw" }}
                onHide={onCloseDialog}
                pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
                {(dialogMode === "create" || dialogMode === "forward") && (
                    <div className="flex flex-column gap-1 pt-3 text-sm">
                        {dialogMode === "forward" && selectedDisposition && (
                            <div className="mb-3 p-3 surface-50 border-round-lg border-1 border-blue-100 flex align-items-center gap-2">
                                <i className="pi pi-info-circle text-blue-500" />
                                <span className="text-sm text-900">
                                    Lanjutan dari disposisi <strong>#{selectedDisposition.disposisi_surat_id}</strong>: <strong>{selectedDisposition.to_user_name || "-"}</strong>
                                </span>
                            </div>
                        )}

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="disp_letter" className="font-semibold text-900">Surat <span className="text-red-500">*</span></label>
                            <Dropdown
                                id="disp_letter"
                                value={form.surat_masuk_id}
                                options={letterOptions}
                                onChange={(e) => onFormChange("surat_masuk_id", e.value)}
                                placeholder="Pilih surat yang akan didisposisikan"
                                filter
                                filterPlaceholder="Cari surat..."
                                disabled={dialogMode === "forward" || Boolean(selectedLetter)}
                                className="w-full" />
                        </div>

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="disp_to_user" className="font-semibold text-900">Tujuan Disposisi <span className="text-red-500">*</span></label>
                            <Dropdown
                                id="disp_to_user"
                                value={form.kepada_pengguna_id}
                                options={users}
                                optionLabel="nama_lengkap"
                                optionValue="id_pengguna"
                                onChange={(e) => onFormChange("kepada_pengguna_id", e.value)}
                                placeholder="Pilih pimpinan / unit / staf"
                                filter
                                filterPlaceholder="Cari nama..."
                                className="w-full" />
                        </div>

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="disp_instruction_id" className="font-semibold text-900">Instruksi Pimpinan</label>
                            <Dropdown
                                id="disp_instruction_id"
                                value={form.instruksi_disposisi_id}
                                options={instructions}
                                optionLabel="nama_instruksi"
                                optionValue="instruksi_disposisi_id"
                                onChange={(e) => onFormChange("instruksi_disposisi_id", e.value)}
                                placeholder="Pilih instruksi (opsional)"
                                showClear
                                className="w-full" />
                        </div>

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="disp_instruction" className="font-semibold text-900">Instruksi Tambahan</label>
                            <InputTextarea
                                id="disp_instruction"
                                value={form.instruksi}
                                onChange={(e) => onFormChange("instruksi", e.target.value)}
                                placeholder="Contoh: Mohon telaah dan siapkan bahan tindak lanjut"
                                rows={3}
                                style={{ resize: "none" }}
                                className="w-full" />
                        </div>

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="disp_note" className="font-semibold text-900">Catatan Disposisi</label>
                            <InputTextarea
                                id="disp_note"
                                value={form.catatan_disposisi}
                                onChange={(e) => onFormChange("catatan_disposisi", e.target.value)}
                                rows={3}
                                placeholder="Catatan khusus untuk penerima (opsional)"
                                style={{ resize: "none" }}
                                className="w-full" />
                        </div>

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="disp_batas_waktu" className="font-semibold text-900">Batas Waktu</label>
                            <InputText
                                id="disp_batas_waktu"
                                type="date"
                                value={form.batas_waktu}
                                onChange={(e) => onFormChange("batas_waktu", e.target.value)}
                                className="w-full" />
                        </div>

                        <Divider className="my-2" />

                        <div className="flex mt-4 pt-3 border-top-1 surface-border">
                            <Button label="Batal" icon="pi pi-times" severity="secondary" outlined onClick={onCloseDialog} disabled={loading} />
                            <Button label={dialogMode === "forward" ? "Teruskan" : "Buat Disposisi"}
                                icon="pi pi-send" style={{ border: "none" }}
                                onClick={onSaveDisposition} loading={loading} />
                        </div>
                    </div>
                )}

                {(dialogMode === "process" || dialogMode === "complete") && (
                    <div className="flex flex-column gap-1 pt-3 text-sm">
                        <div className={`mb-3 p-3 border-round-lg border-1 ${dialogMode === "complete" ? "surface-50 border-green-100" : "surface-50 border-orange-100"}`}>
                            <div className="flex align-items-center gap-2">
                                <i className={`${dialogMode === "complete" ? "pi pi-check-circle text-green-500" : "pi pi-cog text-orange-500"}`} />
                                <div>
                                    <div className="font-semibold text-900">{selectedDisposition?.nomor_agenda || selectedDisposition?.nomor_surat || "-"}</div>
                                    <div className="text-color-secondary text-xs mt-1">{selectedDisposition?.perihal || "-"}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-column gap-1 mb-3">
                            <label htmlFor="action_note" className="font-semibold text-900">
                                {dialogMode === "complete" ? "Catatan Penyelesaian" : "Catatan Proses"}
                                <span className="text-color-secondary font-normal ml-1">(Opsional)</span>
                            </label>
                            <InputTextarea
                                id="action_note"
                                value={actionNote}
                                onChange={(e) => onActionNoteChange(e.target.value)}
                                rows={4}
                                placeholder={dialogMode === "complete"
                                    ? "Contoh: Sudah ditindaklanjuti dan dokumen diarsipkan"
                                    : "Contoh: Sedang ditelaah oleh unit terkait"}
                                style={{ resize: "none" }}
                                className="w-full" />
                        </div>

                        <Divider className="my-2" />

                        <div className="flex mt-4 pt-3 border-top-1 surface-border">
                            <Button label="Batal" icon="pi pi-times" severity="secondary" outlined onClick={onCloseDialog} disabled={loading} />
                            <Button label={dialogMode === "complete" ? "Selesaikan" : "Proses"}
                                icon={dialogMode === "complete" ? "pi pi-check" : "pi pi-play"}
                                severity={dialogMode === "complete" ? "success" : "warning"}
                                onClick={onSaveAction} loading={loading} />
                        </div>
                    </div>
                )}
            </Dialog>

            {/* ── Detail Dialog ──────────────────────────────────── */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-envelope text-primary" />
                        <span className="font-bold text-900">Detail Surat Masuk</span>
                    </div>
                }
                visible={Boolean(detailVisible)}
                modal
                style={{ width: "72rem", maxWidth: "96vw" }}
                onHide={() => { closePreview(); onCloseDetail?.(); }}
                pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
                {detailLoad ? (
                    <div className="flex flex-column align-items-center py-6 gap-3 text-color-secondary">
                        <i className="pi pi-spin pi-spinner text-3xl text-primary" />
                        <span className="text-sm font-medium">Memuat detail surat...</span>
                    </div>
                ) : (
                    <div className="flex flex-column gap-4 pt-3">
                        <div className="flex align-align-items-center justify-content-between gap-3 p-3 surface-50 border-round-xl border-1 surface-border">
                            <div>
                                <h3 className="m-0 text-900 font-bold text-lg">{detailLetter?.perihal || "-"}</h3>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <Chip label={`Agenda: ${detailLetter?.nomor_agenda || "-"}`} className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                                    <Chip label={`Surat: ${detailLetter?.nomor_surat || "-"}`} className="text-xs" style={{ height: "auto", padding: "0.2rem 0.6rem" }} />
                                </div>
                            </div>
                        </div>

                        <div className="grid text-sm">
                            {[
                                { label: "Pengirim", value: detailLetter?.nama_pengirim },
                                { label: "Instansi", value: detailLetter?.instansi_pengirim },
                                { label: "Tanggal Surat", value: detailLetter?.tanggal_surat ? formatDate(detailLetter.tanggal_surat) : "-" },
                                { label: "Tanggal Diterima", value: detailLetter?.tanggal_diterima ? formatDate(detailLetter.tanggal_diterima) : "-" },
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

                        <div>
                            <div className="flex align-items-center justify-content-between mb-3">
                                <div className="font-bold text-900 flex align-items-center gap-2">
                                    <i className="pi pi-paperclip text-primary" />
                                    File Surat
                                </div>
                                <Tag value={`${detailFiles?.length || 0} file`} severity="info" />
                            </div>

                            {detailFiles && detailFiles.length > 0 ? (
                                <div className="grid">
                                    <div className="col-12 lg:col-5">
                                        <div className="flex flex-column gap-2">
                                            {detailFiles.map((file: any) => (
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

export default DispositionView;
