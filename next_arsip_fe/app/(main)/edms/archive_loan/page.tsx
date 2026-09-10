'use client'

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useFormik } from "formik";
import { Toast } from "primereact/toast";
import getData from "@/lib/axios/getData";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import Table from "./components/display/table";
import {
    apiLoanGet,
    apiLoanCreate,
    apiLoanApprove,
    apiLoanReturn,
    apiDocumentGet
} from "./components/endpoints";
import { initValue, State } from "./components/interfaces";

const getLocalDateInputValue = () => {
    const date = new Date();
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        data: [],
        documents: [],
        add: false,
        approveDialog: false,
        returnDialog: false,
        selectedLoan: null,
        approvalStatus: '',
        approvalNotes: '',
        session: null,
        submittedData: null,
        searchVal: '',
        activeTab: 'all',
        startDate: '',
        endDate: ''
    });

    const formik = useFormik<initValue>({
        initialValues: {
            kode_dokumen: '',
            nama_peminjam: '',
            tanggal_pinjam: '',
            tanggal_pengembalian: '',
            keperluan: ''
        },
        validate: (data: initValue) => {
            const errors = {} as any;

            if (!data.kode_dokumen) {
                errors.kode_dokumen = 'Dokumen wajib dipilih';
            }

            if (!data.nama_peminjam.trim()) {
                errors.nama_peminjam = 'Nama peminjam wajib diisi';
            }

            if (!data.tanggal_pengembalian) {
                errors.tanggal_pengembalian = 'Rencana tanggal pengembalian wajib diisi';
            }

            if (!data.keperluan.trim()) {
                errors.keperluan = 'Keperluan peminjaman wajib diisi';
            }

            return errors;
        },
        onSubmit: (data) => {
            setState(p => ({ ...p, submittedData: data }));
        },
    });

    const getLoans = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await getData(apiLoanGet);
            setState((p) => ({
                ...p,
                data: res.data.data || []
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengambil data peminjaman');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getDocuments = async () => {
        try {
            const res = await getData(apiDocumentGet);
            setState((p) => ({
                ...p,
                documents: res.data.data || []
            }));
        } catch (error: any) {
            console.error("Gagal mengambil daftar dokumen:", error);
        }
    };

    const createLoan = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiLoanCreate, {
                kode_dokumen: input.kode_dokumen,
                nama_peminjam: input.nama_peminjam.trim(),
                tanggal_pinjam: getLocalDateInputValue(),
                tanggal_pengembalian: input.tanggal_pengembalian,
                keperluan: input.keperluan.trim(),
            });

            showSuccess(toast, res.data?.message || 'Pengajuan peminjaman berhasil diajukan');
            formik.resetForm();
            setState((p) => ({ ...p, add: false, submittedData: null }));
            await getLoans();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengajukan peminjaman');
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const handleApproveReject = async (loanId: number, status: 'approved' | 'rejected', notes: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiLoanApprove, {
                id_peminjaman: loanId,
                status: status,
                catatan_persetujuan: notes
            });

            showSuccess(toast, res.data?.message || `Peminjaman berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
            await getLoans();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memproses persetujuan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleReturn = async (loanId: number) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiLoanReturn, {
                id_peminjaman: loanId
            });

            showSuccess(toast, res.data?.message || 'Dokumen berhasil dikembalikan');
            await getLoans();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memproses pengembalian');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleScan = async (codeStr: string) => {
        const cleanCode = codeStr.trim();
        if (!cleanCode) return;

        try {
            const res = await getData(`/arsip-dokumen/qr/scan?qr_code=${encodeURIComponent(cleanCode)}`);
            if (res.data?.status === 'success' && res.data?.data?.document) {
                const doc = res.data.data.document;
                
                // Cek apakah dokumen sedang dipinjam
                const isBorrowed = state.data.some(loan => loan.kode_dokumen === doc.kode_dokumen && loan.status === 'borrowed');
                if (isBorrowed) {
                    showError(toast, `Dokumen ${doc.nomor_dokumen} sedang dipinjam dan tidak dapat dipilih`);
                } else {
                    formik?.setFieldValue('kode_dokumen', doc.kode_dokumen);
                    showSuccess(toast, `Dokumen ${doc.nomor_dokumen} terpilih`);
                }
            } else {
                showError(toast, res.data?.message || 'Dokumen tidak ditemukan');
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'QR Code tidak terdaftar';
            showError(toast, msg);
        }
    };

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session: session
            }));
            getLoans();
            getDocuments();
        }
    }, [session]);

    useEffect(() => {
        if (state.submittedData) {
            createLoan(state.submittedData);
        }
    }, [state.submittedData]);

    return <>
        <Toast ref={toast} position="top-right" />

            <Table
                getLoans={getLoans}
                handleApproveReject={handleApproveReject}
                handleReturn={handleReturn}
                state={state}
                setState={setState}
                formik={formik}
                toast={toast}
                handleScan={handleScan} />
    </>
}

export default Page
