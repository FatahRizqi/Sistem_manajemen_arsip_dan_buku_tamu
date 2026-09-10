import { FilterMatchMode } from 'primereact/api';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';

export type OutgoingLetterStatus =
    | 'draft'
    | 'menunggu_approval'
    | 'disetujui'
    | 'ditolak'
    | 'terkirim'
    | 'selesai';

export interface initValue {
    id_surat_keluar: number | null;
    nomor_surat: string;
    nomor_agenda: string;
    tanggal_surat: string;
    tanggal_kirim: string;
    id_jenis_surat: number | null;
    perihal: string;
    tujuan: string;
    instansi_tujuan: string;
    media_pengiriman: string;
    id_template: number | null;
    isi_surat: string;
    isi_surat_final: string;
    nama_pengirim: string;
    jabatan: string;
    status: OutgoingLetterStatus | string;
    file_surat: File | null;
    created_by: number | null;
    updated_by: number | null;
}

export interface TableData {
    id_surat_keluar: number;
    nomor_surat: string;
    nomor_agenda: string;
    tanggal_surat: string;
    tanggal_kirim: string | null;
    id_jenis_surat: number | null;
    nama_jenis_surat: string | null;
    perihal: string;
    tujuan: string;
    instansi_tujuan: string | null;
    media_pengiriman: string | null;
    id_template: number | null;
    nama_template: string | null;
    nama_file: string | null;
    mime_type: string | null;
    ukuran_file: number | null;
    tanggal_upload: string | null;
    path_file: string | null;
    isi_surat: string | null;
    isi_surat_final: string | null;
    nama_pengirim: string | null;
    jabatan: string | null;
    status: OutgoingLetterStatus | string;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface OutgoingLetterFile {
    id_file_surat_keluar: number;
    id_surat_keluar: number;
    nama_file: string | null;
    path_file: string;
    mime_type: string | null;
    ukuran_file: number | null;
    tanggal_upload: string;
    status: string;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
}


export interface OutgoingLetterDetailData {
    surat: Record<string, any> | null;
    files: OutgoingLetterFile[];
    trackings?: any[];
}

export interface State {
    load: boolean;
    detail: boolean;
    detailLoad: boolean;
    detailData: OutgoingLetterDetailData | null;
    data: TableData[];
    add: boolean;
    edit: boolean;
    delete: boolean;
    selectedLetters: TableData[];
    searchVal: string;
    statusFilter: string;
    jenisSuratFilter: number | null;
    tanggalMulai: string;
    tanggalAkhir: string;
    startDate?: string | null;
    endDate?: string | null;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
    submittedData: initValue | null;
    config?: {
        COMPANY_NAME: string;
        COMPANY_ADDRESS: string;
        COMPANY_CONTACT: string;
        COMPANY_LICENSE: string;
        COMPANY_LOGO: string;
    };
}

export interface TableProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    getData: (apiEndpoint: string, payload?: Record<string, any>) => Promise<void>;
    toast: RefObject<Toast>;
    handleSave?: (input: initValue) => Promise<void>;
    downloadDocx?: (idSuratKeluar: number, nomorSurat: string) => Promise<void>;
    getLetterTypeOptions?: () => Promise<any[]>;
    getTemplateOptions?: () => Promise<any[]>;
    loadNomorPreview?: (idJenisSurat: number, tanggalSurat: string, currentUnitKerjaId: number | null) => Promise<string | null>;
    handleFileUpload?: (file: File, idSuratKeluar: number, uploadedBy: number | null) => Promise<void>;
    executeArchiveLetter?: (idSuratKeluar: number, pic: string, createdBy: number | null) => Promise<void>;
    reloadDetail?: (idSuratKeluar: number) => Promise<void>;
    handleDeleteLetter?: (letters: TableData[]) => Promise<void>;
    
    // New exact API handlers for Dumb Component architecture
    apiSaveLetter?: (payload: any, isEdit: boolean, idSuratKeluar: number | null) => Promise<any>;
    apiUploadPdf?: (idSuratKeluar: number, formData: FormData) => Promise<any>;
    apiDownloadDocx?: (idSuratKeluar: number, headers: any) => Promise<Blob | any>;
    apiExtractOcr?: (formData: FormData) => Promise<any>;
    apiGetLetterTypes?: () => Promise<any[]>;
    apiGetTemplates?: () => Promise<any[]>;
    apiGetNomorPreview?: (payload: any) => Promise<string>;
    apiGetConfig?: (payload: any) => Promise<any>;
}

export interface FormProps extends TableProps {}
