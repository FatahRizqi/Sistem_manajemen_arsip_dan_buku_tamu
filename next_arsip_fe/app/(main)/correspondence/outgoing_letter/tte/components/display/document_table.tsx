'use client';

import { showError, showSuccess } from "@/lib/tools/generalTools";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { useEffect, useState } from "react";

import { usePermissions } from "@/layout/context/permissionContext";
import {
    apiEndpointPending,
    apiEndpointSigned,
} from "../endpoints";
import { formatDate, formatDateTime, formatFileSize, statusIcon, statusTone } from "../utils";
import { TteCertificateRow, TteDocumentRow, TtePageProps } from "../interfaces";

interface Props extends TtePageProps {
    mode: "pending" | "signed";
    title: string;
    subtitle: string;
}

const DocumentTable = ({ state, setState, toast, getData, openDetail, finalizeDocument, signDocument, mode, title, subtitle }: Props) => {
    const permissions = usePermissions();
    const [signing, setSigning] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState<number | null>(null);

    const detailLetter: any = state.detailData?.surat || null;
    const detailSignatures = state.detailData?.signatures || [];
    const detailVerifications = state.detailData?.verifications || [];
    const certificates = (state.detailData?.certificates || []) as TteCertificateRow[];
    const posisiTtd = state.detailData?.posisi_tanda_tangan || null;
    const fileUrl = state.detailData?.file_aktif_url || null;

    const refreshData = () =>
        getData(mode === "pending" ? apiEndpointPending : apiEndpointSigned, {
            keyword: state.searchVal || "",
            sort_by: mode === "pending" ? "created_at" : "waktu_tanda_tangan",
            sort_order: "desc",
        });

    const handleOpenDetail = async (rowData: TteDocumentRow) => {
        const firstCert = await openDetail(rowData);
        setSelectedCertificate(firstCert);
    };

    const handleFinalizeDocument = async () => {
        setFinalizing(true);
        try {
            await finalizeDocument(detailLetter);
            await handleOpenDetail({ id_surat_keluar: detailLetter.id_surat_keluar } as TteDocumentRow);
            await refreshData();
        } finally {
            setFinalizing(false);
        }
    };

    const handleSignDocument = async () => {
        if (!selectedCertificate) {
            showError(toast, "Pilih sertifikat elektronik terlebih dahulu");
            return;
        }

        setSigning(true);
        try {
            await signDocument(detailLetter, selectedCertificate);
            await handleOpenDetail({ id_surat_keluar: detailLetter.id_surat_keluar } as TteDocumentRow);
            await refreshData();
        } finally {
            setSigning(false);
        }
    };

    const confirmFinalize = () => {
        if (!permissions.canCreate) {
            showError(toast, "Anda tidak memiliki hak finalisasi dokumen");
            return;
        }

        confirmDialog({
            header: "Finalisasi Dokumen",
            message: `Finalisasi dokumen ${detailLetter?.nomor_surat || detailLetter?.nomor_agenda || "-"} untuk proses tanda tangan?`,
            icon: "pi pi-file",
            acceptLabel: "Finalisasi",
            rejectLabel: "Batal",
            acceptClassName: "p-button-primary",
            accept: handleFinalizeDocument,
        });
    };

    const confirmSign = () => {
        if (!permissions.canApprove) {
            showError(toast, "Anda tidak memiliki hak menandatangani dokumen");
            return;
        }

        confirmDialog({
            header: "Tanda Tangan Dokumen",
            message: `Tandatangani dokumen ${detailLetter?.nomor_surat || detailLetter?.nomor_agenda || "-"} sekarang?`,
            icon: "pi pi-pencil",
            acceptLabel: "Tandatangani",
            rejectLabel: "Batal",
            acceptClassName: "p-button-primary",
            accept: handleSignDocument,
        });
    };

    const previewTemplate = (rowData: TteDocumentRow) => {
        const active = String(rowData.status || "").toLowerCase();
        return (
            <div>
                <div className="font-semibold text-900 text-sm">{rowData.perihal || "-"}</div>
                <div className="text-xs text-color-secondary mt-1">Agenda: {rowData.nomor_agenda || "-"}</div>
                <div className="mt-2">
                    <Tag
                        value={active}
                        severity={statusTone(active)}
                        icon={statusIcon(active)} />
                </div>
            </div>
        );
    };

    const fileTemplate = (rowData: TteDocumentRow) => (
        <div>
            <div className="font-semibold text-sm text-900 flex align-items-center gap-2">
                <i className="pi pi-file-pdf text-red-500" />
                <span>{rowData.nama_file || "-"}</span>
            </div>
            <div className="text-xs text-color-secondary mt-1">
                {rowData.mime_type || "application/pdf"} - {formatFileSize(rowData.ukuran_file)}
            </div>
        </div>
    );

    const signatureTemplate = (rowData: TteDocumentRow) => (
        <Tag
            value={`${rowData.jumlah_tanda_tangan || 0} tanda tangan`}
            severity={(Number(rowData.jumlah_tanda_tangan || 0)> 0) ? "success" : "warning"}
            icon="pi pi-sign-in" />
    );

    const actionTemplate = (rowData: TteDocumentRow) => (
        <div className="flex gap-1 justify-content-center">
            <Button icon="pi pi-eye"
                text
                tooltip="Lihat Detail"
                tooltipOptions={{ position: "top" }}
                onClick={() => handleOpenDetail(rowData)} />
            <Button icon="pi pi-download"
                rounded
                text
                severity="secondary"
                tooltip="Buka Dokumen"
                tooltipOptions={{ position: "top" }}
                onClick={() => {
                    const url = rowData.dokumen_tte_url || rowData.file_url;
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                }} />
        </div>
    );

    const headerTemplate = (
        <div className="flex flex-column xl:flex-row xl:align-items-center justify-content-between gap-3 w-full">
            <div className="flex align-items-center gap-2" style={{ minWidth: "12rem", flexShrink: 0 }}>
                <i className="pi pi-shield text-primary text-sm" />
                <span className="font-semibold text-color text-sm white-space-nowrap">{title}</span>
            </div>

            <div className="flex align-items-center gap-2 w-full xl:justify-content-end">
                <span className="p-input-icon-left w-full sm:w-24rem">
                    <i className="pi pi-search" />
                    <InputText
                        value={state.searchVal}
                        onChange={(e) => setState((p) => ({ ...p, searchVal: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") refreshData();
                        }}
                        placeholder="Cari nomor, perihal, tujuan..."
                        className="w-full"
                    />
                </span>
                <Button icon="pi pi-filter"
                    outlined
                    onClick={refreshData}
                    style={{ width: "2.5rem", height: "2.5rem" }} />
            </div>
        </div>
    );

    useEffect(() => {
        if (!state.data.length) refreshData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const actionBar = (
        <div className="flex justify-content-between mb-4">
            <div className="flex flex-row align-items-center gap-2">
                <Button label="Refresh" icon="pi pi-refresh" outlined loading={state.load} onClick={refreshData} />
            </div>
        </div>
    );

    return (
        <>
            <ConfirmDialog />
            <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
                {/* Page Header */}
                <div className="flex flex-column gap-2 mb-4 px-1">
                    <h3 className="text-2xl font-semibold m-0 text-900">{title}</h3>
                    <div className="text-sm text-600">
                        {subtitle}
                    </div>
                </div>

                {actionBar}

                <DataTable
                    value={state.data}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    header={headerTemplate}
                    loading={state.load}
                    dataKey="id_surat_keluar"
                    filters={state.filters}
                    globalFilterFields={["nomor_surat", "nomor_agenda", "perihal", "tujuan", "instansi_tujuan", "nama_file"]}
                    emptyMessage="Belum ada data"
                    rowHover
                    className="text-sm">
                    <Column field="nomor_surat" header="Nomor Surat" sortable style={{ minWidth: "150px" }} />
                    <Column header="Perihal" body={previewTemplate} style={{ minWidth: "230px" }} />
                    <Column field="tujuan" header="Tujuan" body={(r) => r.tujuan || "-"} style={{ minWidth: "160px" }} />
                    <Column field="nama_file" header="Dokumen" body={fileTemplate} style={{ minWidth: "220px" }} />
                    <Column header="Tanda Tangan" body={signatureTemplate} style={{ width: "160px" }} />
                    <Column field="waktu_tanda_tangan_terakhir" header="Waktu" body={(r) => formatDateTime(r.waktu_tanda_tangan_terakhir)} style={{ width: "150px" }} />
                    <Column field="status" header="Status" body={(r) => <Tag value={r.status || "-"} severity={statusTone(r.status)} icon={statusIcon(r.status)} />} style={{ width: "140px" }} />
                    <Column header="Aksi" body={actionTemplate} style={{ width: "120px", textAlign: "center" }} />
                </DataTable>
            </div>

            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-shield text-primary" />
                        <span className="font-bold text-900">Detail Dokumen</span>
                    </div>
                }
                visible={state.detail}
                modal
                style={{ width: "62rem", maxWidth: "96vw" }}
                onHide={() => setState((p) => ({ ...p, detail: false, detailData: null }))}>
                {state.detailLoad ? (
                    <div className="flex flex-column align-items-center py-6 gap-3 text-color-secondary">
                        <i className="pi pi-spin pi-spinner text-3xl text-primary" />
                        <span className="text-sm font-medium">Memuat detail dokumen...</span>
                    </div>
                ) : detailLetter ? (
                    <div className="flex flex-column gap-4 pt-2">
                        <div className="p-3 surface-50 border-1 surface-border border-round-xl">
                            <div className="flex align-items-start justify-content-between gap-3 flex-wrap">
                                <div>
                                    <h3 className="m-0 text-900 font-bold text-lg">{detailLetter.perihal || "-"}</h3>
                                    <div className="text-xs text-color-secondary mt-2">
                                        Nomor Surat: <strong>{detailLetter.nomor_surat || "-"}</strong>
                                        {" "} | Agenda: <strong>{detailLetter.nomor_agenda || "-"}</strong>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Tag value={detailLetter.status || "-"} severity={statusTone(detailLetter.status)} icon={statusIcon(detailLetter.status)} />
                                    {fileUrl && (
                                        <Button label="Buka Dokumen"
                                            icon="pi pi-external-link"
                                            outlined
                                            onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid text-sm">
                            {[
                                { label: "Tujuan", value: detailLetter.tujuan },
                                { label: "Instansi Tujuan", value: detailLetter.instansi_tujuan },
                                { label: "Jenis Surat", value: detailLetter.nama_jenis_surat },
                                { label: "Template", value: detailLetter.nama_template },
                                { label: "Tanggal Surat", value: formatDate(detailLetter.tanggal_surat) },
                                { label: "Tanggal Kirim", value: formatDate(detailLetter.tanggal_kirim) },
                                { label: "Media", value: detailLetter.media_pengiriman },
                                { label: "Posisi", value: posisiTtd ? `Hal ${posisiTtd.halaman} - X:${posisiTtd.posisi_x} Y:${posisiTtd.posisi_y}` : "-" },
                            ].map((item) => (
                                <div key={item.label} className="col-12 md:col-3">
                                    <div className="text-color-secondary text-xs font-bold uppercase mb-1">{item.label}</div>
                                    <div className="font-semibold text-900">{item.value || "-"}</div>
                                </div>
                            ))}
                        </div>

                        {mode === "pending" && (
                            <div className="flex align-items-center gap-2 flex-wrap">
                                <Button label="Lihat Detail & TTE" 
                                    severity="info" 
                                    onClick={() => handleOpenDetail(detailLetter)} />
                                <Button label="Finalisasi"
                                    icon="pi pi-check"
                                   
                                    outlined
                                    disabled={!permissions.canCreate}
                                    loading={finalizing}
                                    onClick={confirmFinalize} />
                                <Button label="Tanda Tangani Dokumen" 
                                    
                                    onClick={handleSignDocument} 
                                    loading={signing} />
                                <Button label="Tandatangani"
                                    icon="pi pi-pencil"
                                    disabled={!permissions.canApprove}
                                    loading={signing}
                                    onClick={confirmSign} />
                            </div>
                        )}

                        {mode === "signed" && fileUrl && (
                            <div className="flex align-items-center gap-2">
                                <Button label="Buka Dokumen" icon="pi pi-external-link" outlined onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")} />
                            </div>
                        )}

                        <div className="grid">
                            <div className="col-12 lg:col-6">
                                <div className="font-bold text-900 mb-2 flex align-items-center gap-2">
                                    <i className="pi pi-list text-primary" />
                                    Riwayat Tanda Tangan
                                </div>
                                <div className="flex flex-column gap-2">
                                    {detailSignatures.length> 0 ? detailSignatures.map((item: any) => (
                                        <div key={item.id_tanda_tangan_dokumen} className="p-3 surface-50 border-1 surface-border border-round-lg">
                                            <div className="font-semibold text-900">{item.nama_penanda_tangan || item.username_penanda_tangan || "-"}</div>
                                            <div className="text-xs text-color-secondary mt-1">
                                                {item.alias_sertifikat || item.nama_sertifikat || "-"} | {formatDateTime(item.waktu_tanda_tangan)}
                                            </div>
                                            <div className="text-xs text-color-secondary mt-1">
                                                Seri: {item.nomor_seri_sertifikat || "-"}
                                            </div>
                                        </div>
                                    )) : <div className="text-sm text-color-secondary">Belum ada tanda tangan.</div>}
                                </div>
                            </div>

                            <div className="col-12 lg:col-6">
                                <div className="font-bold text-900 mb-2 flex align-items-center gap-2">
                                    <i className="pi pi-shield text-primary" />
                                    Sertifikat & Verifikasi
                                </div>
                                <div className="flex flex-column gap-2">
                                    {mode === "pending" ? (
                                        <>
                                            <Dropdown
                                                value={selectedCertificate}
                                                options={certificates}
                                                optionLabel="nama_sertifikat"
                                                optionValue="id_sertifikat_elektronik"
                                                placeholder="Pilih Sertifikat"
                                                onChange={(e) => setSelectedCertificate(e.value)}
                                                className="w-full" />
                                            {certificates.length === 0 && <div className="text-sm text-color-secondary">Belum ada sertifikat aktif.</div>}
                                        </>
                                    ) : null}

                                    {detailVerifications.length> 0 ? detailVerifications.map((item: any) => (
                                        <div key={item.id_verifikasi_dokumen} className="p-3 surface-50 border-1 surface-border border-round-lg">
                                            <div className="font-semibold text-900">Validasi {formatDateTime(item.diverifikasi_pada)}</div>
                                            <div className="text-xs text-color-secondary mt-1">
                                                Kriptografis: {String(item.valid_kriptografis)} | Integritas: {String(item.valid_integritas)}
                                            </div>
                                            <div className="text-xs text-color-secondary mt-1">
                                                Sertifikat dipercaya: {String(item.sertifikat_dipercaya)}
                                            </div>
                                        </div>
                                    )) : <div className="text-sm text-color-secondary">Belum ada hasil verifikasi.</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </Dialog>
        </>
    );
};

export default DocumentTable;
