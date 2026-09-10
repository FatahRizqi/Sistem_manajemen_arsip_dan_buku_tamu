import { FormikProps } from "formik";
import { Session } from "next-auth";
import { Toast } from "primereact/toast";
import { RefObject } from "react";

export interface initValue {
    kode_dokumen: string;
    nama_peminjam: string;
    tanggal_pinjam: string;
    tanggal_pengembalian: string;
    keperluan: string;
}

export interface LoanData {
    id_peminjaman: number;
    kode_dokumen: string;
    id_dokumen?: number;
    nama_dokumen?: string;
    nomor_dokumen?: string;
    nama_peminjam: string;
    tanggal_pinjam: string;
    tanggal_pengembalian?: string | null;
    tanggal_kembali?: string | null;
    keperluan: string;
    status: string;
    disetujui_oleh?: string | null;
    disetujui_pada?: string | null;
    catatan_persetujuan?: string | null;
    terlambat?: number;
    created_at: string;
    updated_at: string;
}

export interface DocumentSelectData {
    id_dokumen: number;
    kode_dokumen: string;
    nama_dokumen: string;
    nomor_dokumen: string;
}

export interface State {
    load: boolean;
    data: LoanData[];
    documents: DocumentSelectData[];
    add: boolean;
    approveDialog: boolean;
    returnDialog: boolean;
    selectedLoan: LoanData | null;
    approvalStatus: 'approved' | 'rejected' | '';
    approvalNotes: string;
    session: Session | null;
    submittedData: initValue | null;
    searchVal: string;
    activeTab: 'all' | 'pending' | 'borrowed' | 'returned' | 'overdue';
    startDate?: string | null;
    endDate?: string | null;
}

export interface TableProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    getLoans: () => Promise<void>;
    handleApproveReject: (loanId: number, status: 'approved' | 'rejected', notes: string) => Promise<void>;
    handleReturn: (loanId: number) => Promise<void>;
    toast: RefObject<Toast>;
    handleScan?: (codeStr: string) => Promise<void>;
}

export interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    handleScan?: (codeStr: string) => Promise<void>;
}
