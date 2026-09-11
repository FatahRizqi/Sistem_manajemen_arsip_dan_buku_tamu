'use client'

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import { showError } from "@/lib/tools/generalTools";
import { DetailData, VersionData } from "../../../../components/interfaces";

interface TableProps {
    load: boolean;
    detailData: DetailData | null;
    newVersionFile: File | null;
    setNewVersionFile: (file: File | null) => void;
    changeNotes: string;
    setChangeNotes: (notes: string) => void;
    approveDialogVisible: boolean;
    setApproveDialogVisible: (visible: boolean) => void;
    rejectDialogVisible: boolean;
    setRejectDialogVisible: (visible: boolean) => void;
    rejectNotes: string;
    setRejectNotes: (notes: string) => void;
    selectedVersionId: number | null;
    setSelectedVersionId: (id: number | null) => void;
    canApproveVersion: boolean;
    highestVersionNumber: number;
    uploadVersion: () => Promise<void>;
    downloadVersion: (version: VersionData) => Promise<void>;
    rollbackVersion: (version: VersionData) => Promise<void>;
    approveVersion: (versionId: number, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
    submitRejection: () => Promise<void>;
    fetchDocumentDetail: () => Promise<void>;
    handleFetchPreviewUrl: (fileName: string) => Promise<void>;
    fetchOcrText: (version: VersionData) => Promise<string>;
    previewUrl: string;
    isPreviewVisible: boolean;
    setIsPreviewVisible: (visible: boolean) => void;
    setPreviewUrl: (url: string) => void;
    router: any;
    toast: React.RefObject<Toast>;
}

const Table: React.FC<TableProps> = ({
    load,
    detailData,
    newVersionFile,
    setNewVersionFile,
    changeNotes,
    setChangeNotes,
    approveDialogVisible,
    setApproveDialogVisible,
    rejectDialogVisible,
    setRejectDialogVisible,
    rejectNotes,
    setRejectNotes,
    selectedVersionId,
    setSelectedVersionId,
    canApproveVersion,
    highestVersionNumber,
    uploadVersion,
    downloadVersion,
    rollbackVersion,
    approveVersion,
    submitRejection,
    fetchDocumentDetail,
    handleFetchPreviewUrl,
    fetchOcrText,
    previewUrl,
    isPreviewVisible,
    setIsPreviewVisible,
    setPreviewUrl,
    router,
    toast
}) => {
    const [ocrText, setOcrText] = useState('');
    const [isOcrDialogVisible, setIsOcrDialogVisible] = useState(false);
    const [ocrLoad, setOcrLoad] = useState(false);
    const [selectedOcrVersion, setSelectedOcrVersion] = useState<number | null>(null);

    const selectedVersion = (detailData?.versions || []).find(
        (version) => version.id_versi === selectedVersionId,
    );

    const closeApproveDialog = () => {
        setApproveDialogVisible(false);
        setSelectedVersionId(null);
    };

    const handleFetchOcrText = async (version: VersionData) => {
        if (!detailData?.document?.kode_dokumen) return;
        setOcrLoad(true);
        setSelectedOcrVersion(version.nomor_versi);
        try {
            const text = await fetchOcrText(version);
            setOcrText(text || 'Teks belum diekstrak atau dokumen kosong.');
            setIsOcrDialogVisible(true);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Hasil OCR / ekstraksi teks belum tersedia');
        } finally {
            setOcrLoad(false);
        }
    };

    const versionStatusTemplate = (rowData: VersionData) => {
        const status = rowData.status_persetujuan || 'pending';
        let severity: 'success' | 'danger' | 'warning' | 'info' = 'warning';
        if (status === 'approved') severity = 'success';
        if (status === 'rejected') severity = 'danger';
        return <Tag value={status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Pending'} severity={severity} />;
    };

    const versionPreviewTemplate = (rowData: VersionData) => (
        <div className="flex gap-1 justify-content-center">
            <Button icon="pi pi-eye"
                text
                severity="info"
                size="small"
                tooltip={rowData.file_path ? "Pratinjau Dokumen" : "Belum ada file berkas"}
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleFetchPreviewUrl(rowData.file_path || '')}
                disabled={!rowData.file_path} />
            <Button icon="pi pi-file-word"
                rounded
                text
                severity="help"
                size="small"
                tooltip="Teks Hasil OCR"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleFetchOcrText(rowData)}
                disabled={!rowData.file_path} />
        </div>
    );

    const versionActionTemplate = (rowData: VersionData) => {
        const isLatest = rowData.nomor_versi === highestVersionNumber;
        const status = rowData.status_persetujuan || 'pending';

        return (
            <div className="flex gap-1 justify-content-center align-items-center">
                <Button icon="pi pi-download"
                    rounded
                    text
                    severity="secondary"
                    size="small"
                    tooltip="Unduh File"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => downloadVersion(rowData)} />
                {status === 'approved' && !isLatest && (
                    <Button icon="pi pi-replay"
                        rounded
                        text
                        severity="warning"
                        size="small"
                        tooltip="Rollback ke versi ini"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => rollbackVersion(rowData)} />
                )}
                {status === 'pending' && canApproveVersion && (
                    <>
                        <Button icon="pi pi-check"
                            rounded
                            text
                           
                            size="small"
                            tooltip="Setujui Versi"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => approveVersion(rowData.id_versi, 'approved')} />
                        <Button icon="pi pi-times"
                            rounded
                            text
                            severity="danger"
                            size="small"
                            tooltip="Tolak Versi"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => {
                                setSelectedVersionId(rowData.id_versi);
                                setRejectNotes('');
                                setRejectDialogVisible(true);
                            }} />
                    </>
                )}
            </div>
        );
    };

    const approveDialogFooter = (
        <div className="flex mt-4 pt-3 border-top-1 surface-border">
            <Button label="Batal"
                icon="pi pi-times"
                outlined
                severity="secondary"
                onClick={closeApproveDialog}
                disabled={load}
                className="p-button-sm font-semibold" />
            <Button label="Ya, Setujui"
                icon="pi pi-check"
               
                loading={load}
                disabled={!selectedVersionId}
                onClick={async () => {
                    if (!selectedVersionId) return;
                    await approveVersion(selectedVersionId, 'approved');
                    closeApproveDialog();
                }}
                className="p-button-sm font-semibold" />
        </div>
    );

    const rejectDialogFooter = (
        <div className="flex mt-4 pt-3 border-top-1 surface-border">
            <Button label="Batal"
                icon="pi pi-times"
                outlined
                severity="secondary"
                onClick={() => setRejectDialogVisible(false)}
                className="p-button-sm font-semibold" />
            <Button label="Tolak Versi"
                icon="pi pi-check"
                severity="danger"
                onClick={submitRejection}
                disabled={!rejectNotes.trim()}
                className="p-button-sm font-semibold" />
        </div>
    );

    return (
        <div className="card p-5">
            <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <Button type="button"
                        icon="pi pi-arrow-left"
                        label="Kembali ke Daftar Arsip"
                        text
                        className="p-0 mb-2"
                        onClick={() => router.push('/edms/archive_document')} />
                    <h3 className="text-2xl font-bold text-color mb-1">Versi Dokumen</h3>
                    <span className="text-color-secondary text-sm">
                        {detailData?.document?.nomor_dokumen || '-'} - {detailData?.document?.nama_dokumen || '-'}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button size="small"
                        label="Audit Trail (Riwayat)"
                        icon="pi pi-clock"
                        severity="info"
                        outlined
                        onClick={() => router.push(`/edms/archive_document/${detailData?.document?.id_dokumen}/history`)}
                        disabled={!detailData?.document?.id_dokumen} />
                    <Button size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        loading={load}
                        onClick={fetchDocumentDetail} />
                </div>
            </div>

            <div className="grid text-sm mb-3">
                <div className="col-12 md:col-3">
                    <div className="text-color-secondary mb-1 font-semibold">Nomor Dokumen</div>
                    <div className="font-semibold text-color">{detailData?.document?.nomor_dokumen || '-'}</div>
                </div>
                <div className="col-12 md:col-3">
                    <div className="text-color-secondary mb-1 font-semibold">PIC</div>
                    <div className="text-color">{detailData?.document?.nama_pic || '-'}</div>
                </div>
                <div className="col-12 md:col-3">
                    <div className="text-color-secondary mb-1 font-semibold">Tanggal Dokumen</div>
                    <div className="text-color">{detailData?.document?.tanggal ? formatDateCalendar(detailData.document.tanggal, 'yyyy-MM-dd') : '-'}</div>
                </div>
                <div className="col-12 md:col-3">
                    <div className="text-color-secondary mb-1 font-semibold">Tanggal Kedaluwarsa</div>
                    <div className="text-color">{detailData?.document?.tanggal_kedaluwarsa ? formatDateCalendar(detailData.document.tanggal_kedaluwarsa, 'yyyy-MM-dd') : '-'}</div>
                </div>
            </div>

            <Divider />

            <div className="border-1 border-dashed surface-border p-4 flex flex-column gap-3 surface-50 mb-4">
                <div className="font-semibold text-lg text-color mb-1">Unggah Versi Baru</div>
                <div className="flex flex-column md:flex-row gap-3 align-align-items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-color-secondary mb-1 text-sm font-semibold">Pilih File</label>
                        <input
                            type="file"
                            className="p-inputtext w-full text-sm"
                            onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-color-secondary mb-1 text-sm font-semibold">Catatan Perubahan</label>
                        <InputText
                            className="w-full text-sm"
                            placeholder="Contoh: Memperbarui konten, memperbaiki typo..."
                            value={changeNotes}
                            onChange={(e) => setChangeNotes(e.target.value)} />
                    </div>
                    <Button label="Unggah"
                        icon="pi pi-upload"
                        size="small"
                        disabled={!newVersionFile || !changeNotes.trim() || load}
                        loading={load}
                        onClick={uploadVersion} />
                </div>
            </div>

            <DataTable
                value={detailData?.versions || []}
                loading={load || ocrLoad}
                rows={10}
                paginator
                emptyMessage="Belum ada versi dokumen"
                className="text-sm"
                dataKey="id_versi">
                <Column field="nomor_versi" header="Versi" sortable style={{ width: '80px', textAlign: 'center' }} />
                <Column field="catatan_perubahan" header="Catatan Perubahan" />
                <Column field="diunggah_oleh" header="Diunggah Oleh" body={(rowData: VersionData) => rowData.diunggah_oleh || '-'} />
                <Column field="status_persetujuan" header=""  body={versionStatusTemplate}   style={{ width: '3rem', textAlign: 'center' }} />
                <Column field="disetujui_oleh" header="Disetujui/Ditolak Oleh" body={(rowData: VersionData) => rowData.disetujui_oleh || '-'} />
                <Column field="created_at" header="Tanggal Dibuat" body={(rowData: VersionData) => formatDateCalendar(rowData.created_at)} style={{ width: '160px' }} />
                <Column header="Pratinjau / OCR" body={versionPreviewTemplate} style={{ width: '130px', textAlign: 'center' }} />
                <Column headerStyle={{ textAlign: 'center' }} align="center" header="Aksi" body={versionActionTemplate} style={{ width: '130px', textAlign: 'center' }} />
            </DataTable>

            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-check-circle text-green-500 text-xl" />
                        <span className="font-bold">Setujui Versi Dokumen</span>
                    </div>
                }
                visible={approveDialogVisible}
                style={{ width: '450px', maxWidth: '95vw' }}
                modal
                footer={approveDialogFooter}
                closable={!load}
                onHide={closeApproveDialog}>
                <div className="flex flex-column gap-3 pt-2">
                    <div className="p-3 border-round-lg border-1 bg-green-50 border-green-100">
                        <div className="flex align-align-items-center gap-3">
                            <i className="pi pi-file-check text-green-600 text-2xl mt-1" />
                            <div>
                                <div className="font-semibold text-900 mb-1">
                                    Konfirmasi Persetujuan
                                </div>
                                <p className="m-0 text-sm text-color-secondary line-height-3">
                                    Apakah Anda yakin ingin menyetujui versi{' '}
                                    <strong className="text-900">
                                        V{selectedVersion?.nomor_versi || '-'}
                                    </strong>{' '}
                                    untuk dokumen{' '}
                                    <strong className="text-900">
                                        {detailData?.document?.nama_dokumen || '-'}
                                    </strong>?
                                </p>
                            </div>
                        </div>
                    </div>
                    <small className="text-color-secondary">
                        Status versi akan berubah menjadi disetujui dan tercatat pada riwayat dokumen.
                    </small>
                </div>
            </Dialog>

            <Dialog
                header="Tolak Versi Dokumen"
                visible={rejectDialogVisible}
                style={{ width: '450px' }}
                modal
                className="p-fluid"
                footer={rejectDialogFooter}
                onHide={() => setRejectDialogVisible(false)}>
                <div className="flex flex-column gap-3">
                    <div className="flex align-items-center gap-2 text-red-600 font-semibold mb-2">
                        <i className="pi pi-exclamation-triangle text-2xl"></i>
                        <span>Tindakan penolakan ini tidak dapat dibatalkan</span>
                    </div>
                    <p className="text-sm text-color-secondary m-0">
                        Harap berikan alasan yang jelas mengapa Anda menolak versi dokumen ini. Alasan ini akan disimpan di riwayat persetujuan dokumen.
                    </p>
                    <div className="field mt-2">
                        <label htmlFor="alasan" className="block text-sm font-semibold mb-2 text-color">
                            Alasan Penolakan <span className="text-red-500">*</span>
                        </label>
                        <InputTextarea
                            id="alasan"
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            required
                            rows={5}
                            autoResize
                            placeholder="Contoh: File dokumen buram atau data tidak sesuai dengan draft awal."
                            className="w-full text-sm" />
                    </div>
                </div>
            </Dialog>

            {/* OCR Extracted Text Dialog */}
            <Dialog
                visible={isOcrDialogVisible}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-file-word text-purple-600 text-xl" />
                        <span className="font-bold text-900">Teks Hasil OCR / Ekstraksi V{selectedOcrVersion}</span>
                    </div>
                }
                modal
                style={{ width: '50rem', maxWidth: '95vw' }}
                onHide={() => {
                    setIsOcrDialogVisible(false);
                    setOcrText('');
                }}>
                <div className="pt-2">
                    <div className="surface-100 p-4 border-round-lg font-mono text-sm line-height-3 style-scroll max-h-30rem overflow-y-auto whitespace-pre-wrap border-1 surface-border">
                        {ocrText || 'Teks kosong atau belum diekstrak.'}
                    </div>
                </div>
            </Dialog>

            {/* Document Preview Dialog */}
            <Dialog
                visible={isPreviewVisible}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-file-pdf text-primary" />
                        <span className="font-bold text-900">Pratinjau Dokumen</span>
                    </div>
                }
                modal
                style={{ width: '60rem', maxWidth: '95vw' }}
                onHide={() => {
                    setIsPreviewVisible(false);
                    setPreviewUrl('');
                }}
                pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
                <div className="pt-3">
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            width="100%"
                            height="600px"
                            style={{ border: 'none', borderRadius: '8px' }}
                            title="Preview Arsip" />
                    ) : (
                        <div className="flex flex-column align-items-center justify-content-center py-5 text-color-secondary">
                            <i className="pi pi-spin pi-spinner text-3xl mb-3" />
                            <span>Memuat dokumen...</span>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    );
};

export default Table;
