'use client'

import getData from "@/lib/axios/getData";
import postData from "@/lib/axios/postData";
import formUpload from "@/lib/axios/formData";
import fileDownload from "@/lib/axios/fileDownload";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { FilterMatchMode } from "primereact/api";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { useFormik } from "formik";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Table from "./components/display/table";
import {
    apiEndpointDocumentCreate,
    apiEndpointDocumentDelete,
    apiEndpointDocumentDetail,
    apiEndpointDocumentGet,
    apiEndpointDocumentUpdate,
    apiEndpointVersionUpload,
    apiEndpointVersionDownload,
    apiEndpointVersionRollback,
    apiEndpointVersionApprove,
    apiEndpointDocumentPreview,
    apiEndpointCategoryGet,
    apiEndpointConfidentialityGet,
    apiEndpointQrGenerate,
    apiEndpointQrScan,
    apiEndpointLocationUpdate,
    apiEndpointRetentionGet,
    apiEndpointNumberGenerate
} from "./components/endpoints";
import { initValue, State } from "./components/interfaces";

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        detailLoad: false,
        data: [],
        add: false,
        edit: false,
        delete: false,
        detail: false,
        detailData: null,
        selectedDocuments: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,
        previewUrl: '',
        isPreviewVisible: false,
        documentTypes: [],
        classifications: [],
        categories: [],
        confidentialities: [],
        retentions: [],
        filterClassification: '',
        filterType: '',
        filterCategory: '',
        filterConfidentiality: '',
        startDate: null,
        endDate: null,
        qrDialog: false,
        qrData: null,
        qrLoad: false,
        trackingDialog: false,
        trackingCode: '',
        trackingResult: null,
        trackingLoad: false,
        updatingLocation: false,
    });

    const formik = useFormik<initValue>({
        initialValues: {
            id_dokumen: null,
            nama_dokumen: '',
            nomor_dokumen: '',
            tanggal: '',
            tanggal_kedaluwarsa: '',
            nama_pic: '',
            kode_jenis_dokumen: '',
            kode_klasifikasi: '',
            kode_kategori_dokumen: '',
            kode_tingkat_kerahasiaan: '',
            tanggal_transaksi: '',
            lokasi_fisik: '',
            kode_retensi: '',
            file: null,
        },
        validate: (data: initValue) => {
            const errors = {} as any;

            if (!data.nama_dokumen) {
                errors.nama_dokumen = 'Nama dokumen wajib diisi';
            }

            if (!data.nomor_dokumen) {
                errors.nomor_dokumen = 'Nomor dokumen wajib diisi';
            }

            if (!data.tanggal) {
                errors.tanggal = 'Tanggal dokumen wajib diisi';
            }

            if (!data.nama_pic) {
                errors.nama_pic = 'PIC wajib diisi';
            }

            if (!data.kode_jenis_dokumen) {
                errors.kode_jenis_dokumen = 'Jenis dokumen wajib diisi';
            }

            if (!data.kode_klasifikasi) {
                errors.kode_klasifikasi = 'Klasifikasi wajib diisi';
            }

            if (!data.kode_kategori_dokumen) {
                errors.kode_kategori_dokumen = 'Kategori dokumen wajib diisi';
            }

            if (!data.kode_tingkat_kerahasiaan) {
                errors.kode_tingkat_kerahasiaan = 'Kerahasiaan dokumen wajib diisi';
            }

            if (!state.edit && !data.file) {
                errors.file = 'File dokumen PDF wajib diunggah';
            }

            return errors;
        },
        onSubmit: (data) => {
            setState(p => ({ ...p, submittedData: data }));
        },
    });

    const getDocuments = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            const params: any = {};
            if (state.searchVal) params.search = state.searchVal;
            if (state.filterClassification) params.kode_klasifikasi = state.filterClassification;
            if (state.filterType) params.kode_jenis_dokumen = state.filterType;
            if (state.filterCategory) params.kode_kategori_dokumen = state.filterCategory;
            if (state.filterConfidentiality) params.kode_tingkat_kerahasiaan = state.filterConfidentiality;
            if (state.startDate) {
                const start = new Date(state.startDate);
                start.setHours(0, 0, 0, 0);
                params.date_from = start.toISOString().replace('T', ' ').substring(0, 19);
            }
            if (state.endDate) {
                const end = new Date(state.endDate);
                end.setHours(23, 59, 59, 999);
                params.date_to = end.toISOString().replace('T', ' ').substring(0, 19);
            }

            const res = await getData(apiEndpointDocumentGet, params);
            setState((p) => ({
                ...p,
                data: res.data.data || []
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getDocumentDetail = async (idDokumen: number) => {
        setState((p) => ({ ...p, detailLoad: true }));
        try {
            const res = await getData(apiEndpointDocumentDetail, { id_dokumen: idDokumen });
            setState((p) => ({
                ...p,
                detail: true,
                detailData: res.data.data || null
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, detailLoad: false }));
        }
    };

    const saveDocument = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const isEdit = Boolean(state.edit);
            const cEndpoint = isEdit ? apiEndpointDocumentUpdate : apiEndpointDocumentCreate;

            let res;
            if (isEdit) {
                res = await postData(cEndpoint, {
                    id_dokumen: input.id_dokumen,
                    nama_dokumen: input.nama_dokumen,
                    nomor_dokumen: input.nomor_dokumen,
                    tanggal: input.tanggal,
                    nama_pic: input.nama_pic,
                    kode_jenis_dokumen: input.kode_jenis_dokumen,
                    kode_klasifikasi: input.kode_klasifikasi,
                    kode_kategori_dokumen: input.kode_kategori_dokumen,
                    kode_tingkat_kerahasiaan: input.kode_tingkat_kerahasiaan,
                    lokasi_fisik: input.lokasi_fisik || null,
                    kode_retensi: input.kode_retensi || null,
                    status: input.status || 'active',
                });
            } else {
                const formData = new FormData();
                formData.append('nama_dokumen', input.nama_dokumen);
                formData.append('nomor_dokumen', input.nomor_dokumen);
                formData.append('tanggal', input.tanggal);
                formData.append('nama_pic', input.nama_pic);
                formData.append('kode_jenis_dokumen', input.kode_jenis_dokumen);
                formData.append('kode_klasifikasi', input.kode_klasifikasi);
                formData.append('kode_kategori_dokumen', input.kode_kategori_dokumen);
                formData.append('kode_tingkat_kerahasiaan', input.kode_tingkat_kerahasiaan);
                if (input.lokasi_fisik) {
                    formData.append('lokasi_fisik', input.lokasi_fisik);
                }
                if (input.kode_retensi) {
                    formData.append('kode_retensi', input.kode_retensi);
                }
                if (input.file) {
                    formData.append('file', input.file);
                }

                res = await formUpload(cEndpoint, formData, {});
            }

            showSuccess(toast, res.data?.message || 'Document berhasil disimpan');
            formik.resetForm();
            setState((p) => ({ ...p, add: false, edit: false, submittedData: null }));
            await getDocuments();
            await getDropdownOptions();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const deleteDocuments = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            if (state.selectedDocuments.length < 1) {
                showError(toast, 'Tidak ada dokumen yang dipilih');
                return;
            }

            const vaDocumentId = state.selectedDocuments.map((oDocument) => oDocument.id_dokumen);
            const res = await postData(apiEndpointDocumentDelete, {
                id_dokumen: vaDocumentId,
            });

            showSuccess(toast, res.data?.message || 'Document berhasil dihapus');
            setState((p) => ({ ...p, delete: false, selectedDocuments: [] }));
            await getDocuments();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const uploadVersion = async (idDokumen: number, changeNotes: string, file: File) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const formData = new FormData();
            formData.append("id_dokumen", String(idDokumen));
            formData.append("catatan_perubahan", changeNotes);
            formData.append("file", file);

            const res = await formUpload(apiEndpointVersionUpload, formData, {});
            showSuccess(toast, res.data?.message || 'Versi dokumen berhasil diupload');
            await getDocumentDetail(idDokumen);
            await getDocuments();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengupload versi dokumen');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const downloadVersion = async (idVersi: number, fileName: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await fileDownload(apiEndpointVersionDownload, { id_versi: idVersi });
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
            setState((p) => ({ ...p, load: false }));
        }
    };

    const rollbackVersion = async (idDokumen: number, idVersi: number) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpointVersionRollback, { id_dokumen: idDokumen, id_versi: idVersi });
            showSuccess(toast, res.data?.message || 'Rollback versi berhasil');
            await getDocuments();
            await getDocumentDetail(idDokumen);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal melakukan rollback');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const approveVersion = async (idVersi: number, status: 'approved' | 'rejected', notes?: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpointVersionApprove, {
                id_versi: idVersi,
                status: status,
                catatan_persetujuan: notes || ''
            });
            showSuccess(toast, res.data?.message || `Berhasil mengubah status versi menjadi ${status}`);
            if (state.detailData?.document?.id_dokumen) {
                await getDocumentDetail(state.detailData.document.id_dokumen);
            }
            await getDocuments();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengubah status approval');
        } finally {
            setState((p) => ({ ...p, load: false }));
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

        setState((p) => ({ ...p, load: true }));
        try {
            const res = await getData(apiEndpointDocumentPreview, { file_name: fileName });
            if (res.data?.status === 'success') {
                setState((p) => ({
                    ...p,
                    previewUrl: res.data.preview_url,
                    isPreviewVisible: true,
                }));
            } else {
                showError(toast, res.data?.message || 'Gagal mengambil URL preview');
            }
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memproses pratinjau dokumen');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleGenerateQR = async (id: number) => {
        setState(prev => ({ ...prev, qrDialog: true, qrLoad: true, qrData: null }));
        try {
            const res = await postData(apiEndpointQrGenerate, { id_dokumen: id });
            if (res.data?.status === 'success') {
                setState(prev => ({
                    ...prev,
                    qrData: res.data.data,
                    qrLoad: false
                }));
            } else {
                showError(toast, res.data?.message || 'Gagal membuat QR Code');
                setState(prev => ({ ...prev, qrLoad: false, qrDialog: false }));
            }
        } catch (error: any) {
            showError(toast, error.response?.data?.message || error.message || 'Terjadi kesalahan sistem');
            setState(prev => ({ ...prev, qrLoad: false, qrDialog: false }));
        }
    };

    const handleScanQR = async (qrCode: string) => {
        if (!qrCode.trim()) {
            showError(toast, 'Harap isi QR Code terlebih dahulu');
            return;
        }
        setState(prev => ({ ...prev, trackingLoad: true, trackingResult: null }));
        try {
            const res = await getData(`${apiEndpointQrScan}?qr_code=${encodeURIComponent(qrCode.trim())}`);
            if (res.data?.status === 'success') {
                setState(prev => ({
                    ...prev,
                    trackingResult: res.data.data,
                    trackingLoad: false
                }));
            } else {
                showError(toast, res.data?.message || 'QR Code tidak ditemukan');
                setState(prev => ({ ...prev, trackingLoad: false }));
            }
        } catch (error: any) {
            showError(toast, error.response?.data?.message || error.message || 'QR Code tidak terdaftar');
            setState(prev => ({ ...prev, trackingLoad: false }));
        }
    };

    const handleUpdateLocation = async (id: number, location: string) => {
        setState(prev => ({ ...prev, updatingLocation: true }));
        try {
            const res = await postData(apiEndpointLocationUpdate, { id_dokumen: id, lokasi_fisik: location });
            if (res.data?.status === 'success') {
                showSuccess(toast, 'Lokasi fisik dokumen berhasil diperbarui');
                setState(prev => ({
                    ...prev,
                    updatingLocation: false,
                    trackingResult: prev.trackingResult ? {
                        ...prev.trackingResult,
                        document: {
                            ...prev.trackingResult.document,
                            lokasi_fisik: location
                        }
                    } : null
                }));
                getDocuments();
            } else {
                showError(toast, res.data?.message || 'Gagal memperbarui lokasi fisik');
                setState(prev => ({ ...prev, updatingLocation: false }));
            }
        } catch (error: any) {
            showError(toast, error.response?.data?.message || error.message || 'Terjadi kesalahan sistem');
            setState(prev => ({ ...prev, updatingLocation: false }));
        }
    };

    const handleGenerateAutoNumber = async () => {
        try {
            const res = await getData(apiEndpointNumberGenerate, {
                kode_klasifikasi: formik.values.kode_klasifikasi || 'ADM',
                kode_kategori_dokumen: formik.values.kode_kategori_dokumen || 'KONTRAK',
                tanggal: formik.values.tanggal || new Date().toISOString().slice(0, 10)
            });

            if (res.data?.status === 'success' && res.data?.data?.nomor_dokumen) {
                formik.setFieldValue('nomor_dokumen', res.data.data.nomor_dokumen);
                showSuccess(toast, `Nomor dokumen dihasilkan: ${res.data.data.nomor_dokumen}`);
            }
        } catch (error: any) {
            console.error('Gagal auto-generate nomor dokumen:', error);
        }
    };

    const getDropdownOptions = async () => {
        try {
            const [resTypes, resClassifications, resCategories, resConfidentialities, resRetentions] = await Promise.all([
                getData('/master/arsip/document-types'),
                getData('/master/arsip/archive-classifications'),
                getData(apiEndpointCategoryGet),
                getData(apiEndpointConfidentialityGet),
                getData(apiEndpointRetentionGet)
            ]);
            setState(p => ({
                ...p,
                documentTypes: (resTypes.data.data || []).filter((item: any) => item.kode_jenis_dokumen !== 'SURAT'),
                classifications: resClassifications.data.data || [],
                categories: resCategories.data.data || [],
                confidentialities: resConfidentialities.data.data || [],
                retentions: resRetentions.data.data || []
            }));
        } catch (error) {
            console.error("Gagal mengambil opsi dropdown:", error);
        }
    };

    useEffect(() => {
        getDropdownOptions();
    }, []);

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session: session
            }));
            const name = (session?.user as any)?.name || (session?.user as any)?.nama_pengguna || '';
            if (name && !formik.values.nama_pic) {
                formik.setFieldValue('nama_pic', name);
            }
        }
    }, [session]);

    useEffect(() => {
        if (state.submittedData) {
            saveDocument(state.submittedData);
        }
    }, [state.submittedData]);

    useEffect(() => {
        getDocuments();
    }, [state.searchVal, state.filterClassification, state.filterType, state.filterCategory, state.filterConfidentiality]);

    return <>
        <Toast ref={toast} position="top-right" />

        <Table
            getDocuments={getDocuments}
            getDocumentDetail={getDocumentDetail}
            deleteDocuments={deleteDocuments}
            uploadVersion={uploadVersion}
            downloadVersion={downloadVersion}
            rollbackVersion={rollbackVersion}
            approveVersion={approveVersion}
            handleFetchPreviewUrl={handleFetchPreviewUrl}
            handleGenerateQR={handleGenerateQR}
            handleScanQR={handleScanQR}
            handleUpdateLocation={handleUpdateLocation}
            handleGenerateAutoNumber={handleGenerateAutoNumber}
            state={state}
            setState={setState}
            formik={formik}
            toast={toast} />

        {/* Document Preview Dialog */}
        <Dialog
            visible={state.isPreviewVisible}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-file-pdf text-primary" />
                    <span className="font-bold text-900">Pratinjau Dokumen</span>
                </div>
            }
            modal
            style={{ width: '60rem', maxWidth: '95vw' }}
            onHide={() => {
                setState((p) => ({ ...p, isPreviewVisible: false, previewUrl: '' }));
            }}
            pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
            <div className="pt-3">
                {state.previewUrl ? (
                    <iframe
                        src={state.previewUrl}
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
    </>
}

export default Page