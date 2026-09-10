import { FilterMatchMode } from 'primereact/api';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';

export type IncomingLetterStatus = 'baru' | 'diproses' | 'didisposisi' | 'selesai';

export interface initValue {
    surat_masuk_id: number | null;
    nomor_agenda: string;
    nomor_surat: string;
    tanggal_surat: string;
    tanggal_diterima: string;
    nama_pengirim: string;
    instansi_pengirim: string;
    perihal: string;
    keterangan_lampiran: string;
    file_surat: File | null;
    jenis_surat_id: number | null;
    jenis_dokumen_id: number | null;
    archive_classification_id: number | null;
    confidentiality_level_id: number | null;
    status: IncomingLetterStatus | string;
    created_by: number | null;
    updated_by: number | null;
}

export interface TableData {
    surat_masuk_id: number;
    nomor_agenda: string;
    nomor_surat: string;
    tanggal_surat: string;
    tanggal_diterima: string;
    nama_pengirim: string;
    instansi_pengirim: string | null;
    perihal: string;
    keterangan_lampiran: string | null;
    jenis_surat_id: number | null;
    nama_jenis_surat: string | null;
    jenis_dokumen_id: number | null;
    archive_classification_id: number | null;
    confidentiality_level_id: number | null;
    status: IncomingLetterStatus | string;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface IncomingLetterFile {
    file_surat_masuk_id: number;
    surat_masuk_id: number;
    path_file: string;
    nama_file: string | null;
    tipe_mime_file: string | null;
    ukuran_file: number | null;
    uploaded_by: number | null;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface IncomingLetterDisposition {
    disposisi_surat_id: number;
    surat_masuk_id: number;
    disposisi_induk_id: number | null;
    dari_pengguna_id: number | null;
    kepada_pengguna_id: number | null;
    nama_instruksi: string | null;
    instruksi: string | null;
    catatan_disposisi: string | null;
    batas_waktu: string | null;
    status: string;
    created_at: string;
}

export interface IncomingLetterTracking {
    tracking_surat_masuk_id: number;
    surat_masuk_id: number;
    disposisi_surat_id: number | null;
    nama_aksi: string;
    status_sebelumnya: string | null;
    status_saat_ini: string | null;
    catatan: string | null;
    processed_at: string;
}

export interface ArchivedDocumentSummary {
    id_dokumen: number;
    kode_dokumen: string;
    nama_dokumen: string;
    nomor_dokumen: string;
    tanggal: string;
    status: string;
    created_at: string;
}

export interface IncomingLetterDetailData {
    surat: Record<string, any> | null;
    letter?: Record<string, any> | null;
    files: IncomingLetterFile[];
    archived_document?: ArchivedDocumentSummary | null;
    disposisi: IncomingLetterDisposition[];
    dispositions?: IncomingLetterDisposition[];
    trackings: IncomingLetterTracking[];
}

export interface State {
    load: boolean;
    detail: boolean;
    detailLoad: boolean;
    detailData: IncomingLetterDetailData | null;
    data: TableData[];
    add: boolean;
    edit: boolean;
    delete: boolean;
    selectedLetters: TableData[];
    searchVal: string;
    statusFilter: string;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
    submittedData: initValue | null;
    startDate?: string | null;
    endDate?: string | null;
}

export interface TableProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    getData: (apiEndpoint: string, payload?: Record<string, any>) => Promise<void>;
    toast: RefObject<Toast>;
    handleSave?: (input: initValue) => Promise<void>;
    handleDelete?: () => Promise<void>;
    getLetterTypeOptions?: () => Promise<any[]>;
    openDetail?: (rowData: TableData) => Promise<void>;
    reloadDetail?: (letterId: number) => Promise<void>;
    executeArchiveLetter?: (letterId: number, pic: string, createdBy: number | null) => Promise<void>;
    getFileBlob?: (file: IncomingLetterFile) => Promise<any>;
}

export interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string, payload?: Record<string, any>) => Promise<void>;
    handleSave?: (input: initValue) => Promise<void>;
    handleDelete?: () => Promise<void>;
    getLetterTypeOptions?: () => Promise<any[]>;
}
