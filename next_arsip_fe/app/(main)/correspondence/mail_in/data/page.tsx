'use client'

import formUpload from "@/lib/axios/formData";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useFormik } from "formik";
import { useSession } from "next-auth/react";
import { FilterMatchMode } from "primereact/api";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import fileDownload from "@/lib/axios/fileDownload";
import Table from "../components/display/table";
import { 
    apiEndpointCreate, 
    apiEndpointDelete, 
    apiEndpointGet, 
    apiEndpointLetterTypeData, 
    apiEndpointUpdate, 
    apiEndpointUpload,
    apiEndpointDetail,
    apiEndpointArchive,
    apiEndpointFileDownload
} from "../components/endpoints";
import { IncomingLetterFile, initValue, State, TableData } from "../components/interfaces";
import { mapIncomingLetterPayload, mapIncomingLetterRow } from "../components/mappers";

const initialValues: initValue = {
    surat_masuk_id: null,
    nomor_agenda: "",
    nomor_surat: "",
    tanggal_surat: "",
    tanggal_diterima: "",
    nama_pengirim: "",
    instansi_pengirim: "",
    perihal: "",
    keterangan_lampiran: "",
    file_surat: null,
    jenis_surat_id: null,
    jenis_dokumen_id: null,
    archive_classification_id: null,
    confidentiality_level_id: null,
    status: "baru",
    created_by: null,
    updated_by: null,
};

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        detail: false,
        detailLoad: false,
        detailData: null,
        data: [],
        add: false,
        edit: false,
        delete: false,
        selectedLetters: [],
        searchVal: "",
        statusFilter: "",
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,
        startDate: "",
        endDate: "",
    });

    const formik = useFormik({
        initialValues,
        validate: (data: initValue) => {
            const errors = {} as Partial<Record<keyof initValue, string>>;

            if (state.edit && !data.nomor_agenda) errors.nomor_agenda = "Nomor agenda wajib diisi";
            if (!data.nomor_surat) errors.nomor_surat = "Nomor surat wajib diisi";
            if (!data.tanggal_surat) errors.tanggal_surat = "Tanggal surat wajib diisi";
            if (!data.tanggal_diterima) errors.tanggal_diterima = "Tanggal diterima wajib diisi";
            if (!data.nama_pengirim) errors.nama_pengirim = "Pengirim wajib diisi";
            if (!data.perihal) errors.perihal = "Perihal wajib diisi";
            if (!data.jenis_surat_id) errors.jenis_surat_id = "Jenis surat wajib dipilih";
            if (state.edit && !data.surat_masuk_id) errors.surat_masuk_id = "surat_masuk_id wajib diisi";

            return errors;
        },
        onSubmit: (data) => {
            setState((p) => ({ ...p, submittedData: data }));
        },
    });

    const getData = async (apiEndpoint: string, payload: Record<string, any> = {}) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const res = await postData(apiEndpoint, payload);
            setState((p) => ({
                ...p,
                data: (res.data?.data || []).map(mapIncomingLetterRow),
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getIncomingLetterId = (res: any, input: initValue) =>
        res?.data?.data?.surat_masuk_id || input.surat_masuk_id;

    const getLetterTypeOptions = async () => {
        try {
            const res = await postData(apiEndpointLetterTypeData, {});
            return res.data?.data || [];
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Jenis surat gagal diambil");
            return [];
        }
    };

    const uploadLetterFile = async (input: initValue, incomingLetterId: number | null) => {
        if (!input.file_surat || !incomingLetterId) return;
        const formData = new FormData();
        formData.append("surat_masuk_id", String(incomingLetterId));
        formData.append("File", input.file_surat);
        const uploadedBy = input.updated_by || input.created_by;
        if (uploadedBy) formData.append("uploaded_by", String(uploadedBy));
        await formUpload(apiEndpointUpload, formData, {});
    };

    const handleSave = async (input: initValue) => {
        try {
            const isEdit = Boolean(state.edit);
            const cEndPoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;
            const oBody = mapIncomingLetterPayload(input, isEdit);
            const vaData = await postData(cEndPoint, oBody);
            const res = vaData.data;
            const incomingLetterId = getIncomingLetterId(vaData, input);

            let uploadErrorMessage = "";
            if (input.file_surat) {
                try {
                    await uploadLetterFile(input, incomingLetterId);
                } catch (error: any) {
                    const e = error?.response?.data || error;
                    uploadErrorMessage = e?.message || "File surat gagal diupload";
                }
            }

            if (uploadErrorMessage) {
                showError(toast, `Surat tersimpan, tetapi ${uploadErrorMessage.toLowerCase()}`);
            } else {
                showSuccess(toast, res?.message || "Berhasil Menyimpan Data");
            }

            formik.resetForm();
            setState((p) => ({
                ...p,
                add: false,
                edit: false,
                delete: false,
                detail: false,
                detailData: null,
                selectedLetters: [],
            }));
            await getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        }
    };

    const handleDelete = async () => {
        try {
            if (state.selectedLetters.length < 1) {
                showError(toast, "Tidak ada surat yang dipilih");
                return;
            }
            for (const letter of state.selectedLetters) {
                await postData(apiEndpointDelete, { surat_masuk_id: letter.surat_masuk_id });
            }
            showSuccess(toast, "Surat masuk berhasil dihapus");
            setState((p) => ({ ...p, selectedLetters: [], add: false, edit: false, delete: false }));
            await getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        }
    };

    const openDetail = async (rowData: TableData) => {
        setState((p) => ({ ...p, detail: true, detailLoad: true, detailData: null }));
        try {
            const res = await postData(apiEndpointDetail, { surat_masuk_id: rowData.surat_masuk_id });
            setState((p) => ({ ...p, detailData: res.data?.data || null }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Detail surat gagal diambil");
            setState((p) => ({ ...p, detail: false, detailData: null }));
        } finally {
            setState((p) => ({ ...p, detailLoad: false }));
        }
    };

    const reloadDetail = async (letterId: number) => {
        const res = await postData(apiEndpointDetail, { surat_masuk_id: letterId });
        setState((p) => ({ ...p, detailData: res.data?.data || null }));
    };

    const executeArchiveLetter = async (letterId: number, pic: string, createdBy: number | null) => {
        try {
            const res = await postData(apiEndpointArchive, {
                surat_masuk_id: letterId,
                nama_pic: pic,
                created_by: createdBy,
            });
            showSuccess(toast, res.data?.message || "Surat berhasil diarsipkan");
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Surat gagal diarsipkan");
        }
    };

    const getFileBlob = async (file: IncomingLetterFile) => {
        return fileDownload(apiEndpointFileDownload, { file_surat_masuk_id: file.file_surat_masuk_id });
    };

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session,
            }));
        }
    }, [session]);

    return (
        <>
            <Toast ref={toast} position="top-right" />
            <Table 
                getData={getData} 
                state={state} 
                setState={setState} 
                formik={formik} 
                toast={toast} 
                handleSave={handleSave}
                handleDelete={handleDelete}
                getLetterTypeOptions={getLetterTypeOptions}
                openDetail={openDetail}
                reloadDetail={reloadDetail}
                executeArchiveLetter={executeArchiveLetter}
                getFileBlob={getFileBlob} />
        </>
    );
};

export default Page;
