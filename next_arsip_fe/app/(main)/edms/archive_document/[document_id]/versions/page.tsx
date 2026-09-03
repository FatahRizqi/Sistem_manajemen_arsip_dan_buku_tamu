'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import fileDownload from "@/lib/axios/fileDownload";
import formUpload from "@/lib/axios/formData";
import getData from "@/lib/axios/getData";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import {
    apiEndpointDocumentDetail,
    apiEndpointVersionApprove,
    apiEndpointVersionDownload,
    apiEndpointVersionRollback,
    apiEndpointVersionUpload,
    apiEndpointDocumentPreview,
    apiEndpointContentGet
} from "../../components/endpoints";
import { DetailData, VersionData } from "../../components/interfaces";
import Table from "./components/display/table";

const Page = () => {
    const toast = useRef<Toast>(null);
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();
    const documentId = Number(Array.isArray(params.document_id) ? params.document_id[0] : params.document_id);

    const [load, setLoad] = useState(false);
    const [detailData, setDetailData] = useState<DetailData | null>(null);
    const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
    const [changeNotes, setChangeNotes] = useState('');
    const [approveDialogVisible, setApproveDialogVisible] = useState(false);
    const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');
    const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    const permissions = usePermissions();
    const sessionUser = session?.user as any;
    const roleKey = String(sessionUser?.role || sessionUser?.roleCode || '').toLowerCase();
    const canApproveVersion = permissions.canApprove || ['superadmin', 'sa'].includes(roleKey);

    const highestVersionNumber = useMemo(() => {
        return Math.max(...(detailData?.versions || []).map((version) => version.nomor_versi), 0);
    }, [detailData?.versions]);

    const fetchDocumentDetail = async () => {
        if (!documentId) return;

        setLoad(true);
        try {
            const res = await getData(apiEndpointDocumentDetail, { id_dokumen: documentId });
            setDetailData(res.data.data || null);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengambil detail dokumen');
        } finally {
            setLoad(false);
        }
    };

    const uploadVersion = async () => {
        if (!documentId || !newVersionFile || !changeNotes.trim()) return;

        setLoad(true);
        try {
            const formData = new FormData();
            formData.append("id_dokumen", String(documentId));
            formData.append("catatan_perubahan", changeNotes.trim());
            formData.append("file", newVersionFile);

            const res = await formUpload(apiEndpointVersionUpload, formData, {});
            showSuccess(toast, res.data?.message || 'Versi dokumen berhasil diupload');
            setNewVersionFile(null);
            setChangeNotes('');
            await fetchDocumentDetail();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengupload versi dokumen');
        } finally {
            setLoad(false);
        }
    };

    const downloadVersion = async (version: VersionData) => {
        setLoad(true);
        try {
            const res = await fileDownload(apiEndpointVersionDownload, { id_versi: version.id_versi });
            const parts = version.file_path.split('.');
            const ext = parts.length> 1 ? parts.pop() : 'pdf';
            const fileName = `${detailData?.document?.nomor_dokumen || 'doc'}_V${version.nomor_versi}.${ext}`;
            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showSuccess(toast, 'File berhasil diunduh');
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengunduh file');
        } finally {
            setLoad(false);
        }
    };

    const rollbackVersion = async (version: VersionData) => {
        if (!confirm(`Apakah Anda yakin ingin melakukan rollback ke V${version.nomor_versi}?`)) return;

        setLoad(true);
        try {
            const res = await postData(apiEndpointVersionRollback, {
                id_dokumen: documentId,
                id_versi: version.id_versi,
            });
            showSuccess(toast, res.data?.message || 'Rollback versi berhasil');
            await fetchDocumentDetail();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal melakukan rollback');
        } finally {
            setLoad(false);
        }
    };

    const approveVersion = async (versionId: number, status: 'approved' | 'rejected', notes?: string) => {
        setLoad(true);
        try {
            const res = await postData(apiEndpointVersionApprove, {
                id_versi: versionId,
                status_persetujuan: status,
                catatan_persetujuan: notes || '',
            });
            showSuccess(toast, res.data?.message || `Versi berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
            await fetchDocumentDetail();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memproses approval versi');
        } finally {
            setLoad(false);
        }
    };

    const submitRejection = async () => {
        if (!selectedVersionId) return;
        if (!rejectNotes.trim()) {
            showError(toast, 'Alasan penolakan wajib diisi');
            return;
        }

        setLoad(true);
        setRejectDialogVisible(false);
        try {
            const res = await postData(apiEndpointVersionApprove, {
                id_versi: selectedVersionId,
                status_persetujuan: 'rejected',
                catatan_persetujuan: rejectNotes.trim(),
            });
            showSuccess(toast, res.data?.message || 'Versi dokumen berhasil ditolak');
            await fetchDocumentDetail();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal menolak versi dokumen');
        } finally {
            setLoad(false);
            setSelectedVersionId(null);
            setRejectNotes('');
        }
    };

    const handleFetchPreviewUrl = async (fileName: string) => {
        if (!fileName) {
            showError(toast, 'Berkas dokumen belum diunggah untuk versi ini');
            return;
        }
        
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const supported = ['pdf', 'jpg', 'jpeg', 'png', 'txt', 'webp', 'svg'];
        if (!supported.includes(ext)) {
            showError(toast, `Peringatan: Format dokumen .${ext} tidak didukung untuk pratinjau langsung di browser. Silakan gunakan tombol Unduh.`);
            return;
        }

        setLoad(true);
        try {
            const res = await getData(apiEndpointDocumentPreview, { file_name: fileName });
            if (res.data?.status === 'success') {
                setPreviewUrl(res.data.preview_url);
                setIsPreviewVisible(true);
            } else {
                showError(toast, res.data?.message || 'Gagal mengambil URL preview');
            }
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memproses pratinjau dokumen');
        } finally {
            setLoad(false);
        }
    };

    const fetchOcrText = async (version: VersionData): Promise<string> => {
        if (!detailData?.document?.kode_dokumen) return '';
        const res = await getData(apiEndpointContentGet, {
            kode_dokumen: detailData.document.kode_dokumen,
            id_versi: version.id_versi
        });
        if (res.data?.status === 'success') {
            return res.data.data?.konten_teks || '';
        }
        throw new Error(res.data?.message || 'Gagal mengambil hasil OCR');
    };

    useEffect(() => {
        fetchDocumentDetail();
    }, [documentId]);

    return (
        <>

            <Toast ref={toast} position="top-right" />
            <Table
                load={load}
                detailData={detailData}
                newVersionFile={newVersionFile}
                setNewVersionFile={setNewVersionFile}
                changeNotes={changeNotes}
                setChangeNotes={setChangeNotes}
                approveDialogVisible={approveDialogVisible}
                setApproveDialogVisible={setApproveDialogVisible}
                rejectDialogVisible={rejectDialogVisible}
                setRejectDialogVisible={setRejectDialogVisible}
                rejectNotes={rejectNotes}
                setRejectNotes={setRejectNotes}
                selectedVersionId={selectedVersionId}
                setSelectedVersionId={setSelectedVersionId}
                canApproveVersion={canApproveVersion}
                highestVersionNumber={highestVersionNumber}
                uploadVersion={uploadVersion}
                downloadVersion={downloadVersion}
                rollbackVersion={rollbackVersion}
                approveVersion={approveVersion}
                submitRejection={submitRejection}
                fetchDocumentDetail={fetchDocumentDetail}
                handleFetchPreviewUrl={handleFetchPreviewUrl}
                fetchOcrText={fetchOcrText}
                previewUrl={previewUrl}
                isPreviewVisible={isPreviewVisible}
                setIsPreviewVisible={setIsPreviewVisible}
                setPreviewUrl={setPreviewUrl}
                router={router}
                toast={toast} />
        </>
    );
};

export default Page;
