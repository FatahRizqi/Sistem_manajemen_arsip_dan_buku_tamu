"use client";
import postData from '@/lib/axios/postData';
import getDataInterceptor from '@/lib/axios/getData';
import putData from '@/lib/axios/putData';
import deleteData from '@/lib/axios/deleteData';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { useFormik } from 'formik';
import { initValue, State } from './components/interfaces';
import Table from './components/display/table';
import { FilterMatchMode } from 'primereact/api';
import Form from './components/display/form';
import { useSession } from 'next-auth/react';
import { apiEndpointCreate, apiEndpointUpdate, apiEndpointDelete, apiEndpointGet, apiEndpointGetCategories } from './components/endpoints';

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        data: [],
        categories: [],
        add: false,
        edit: false,
        delete: false,
        selectedData: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null
    });

    const formik = useFormik<initValue>({
        initialValues: {
            id_jadwal_retensi: '',
            kode_kategori_dokumen: '',
            kode_retensi: '',
            nama_retensi: '',
            tahun_retensi: '',
            tindakan_retensi: '',
            deskripsi: '',
            status: 'active'
        },
        validate: (data: initValue) => {
            let errors = {} as any;
            if (!data.kode_retensi) {
                errors.kode_retensi = 'Kode retensi wajib diisi';
            }
            if (!data.nama_retensi) {
                errors.nama_retensi = 'Nama jadwal retensi wajib diisi';
            }
            if (!data.kode_kategori_dokumen) {
                errors.kode_kategori_dokumen = 'Kategori dokumen wajib dipilih';
            }
            if (data.tahun_retensi === '') {
                errors.tahun_retensi = 'Lama tahun retensi wajib diisi';
            } else if (isNaN(Number(data.tahun_retensi)) || Number(data.tahun_retensi) < 0) {
                errors.tahun_retensi = 'Tahun retensi harus berupa angka positif';
            }
            if (!data.tindakan_retensi) {
                errors.tindakan_retensi = 'Tindakan akhir retensi wajib dipilih';
            }
            return errors;
        },
        onSubmit: async (data) => {
            await handleSave(data);
        }
    });

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const isEdit = Boolean(input.id_jadwal_retensi);
            if (isEdit) {
                const cEndPoint = `${apiEndpointUpdate}/${input.id_jadwal_retensi}`;
                const oBody = {
                    kode_kategori_dokumen: input.kode_kategori_dokumen,
                    kode_retensi: input.kode_retensi,
                    nama_retensi: input.nama_retensi,
                    tahun_retensi: Number(input.tahun_retensi),
                    tindakan_retensi: input.tindakan_retensi,
                    deskripsi: input.deskripsi
                };
                const res = await putData(cEndPoint, oBody);
                showSuccess(toast, res.data?.message || 'Berhasil Memperbarui Data');
            } else {
                const oBody = {
                    kode_kategori_dokumen: input.kode_kategori_dokumen,
                    kode_retensi: input.kode_retensi,
                    nama_retensi: input.nama_retensi,
                    tahun_retensi: Number(input.tahun_retensi),
                    tindakan_retensi: input.tindakan_retensi,
                    deskripsi: input.deskripsi
                };
                const res = await postData(apiEndpointCreate, oBody);
                showSuccess(toast, res.data?.message || 'Berhasil Menyimpan Data');
            }
            formik.resetForm();
            setState((p) => ({ ...p, add: false, edit: false }));
            getData(apiEndpointGet);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            if (state.selectedData.length < 1) {
                setState((p) => ({ ...p, delete: false, load: false }));
                return;
            }
            for (const item of state.selectedData) {
                const cEndPoint = `${apiEndpointDelete}/${item.id_jadwal_retensi}`;
                await deleteData(cEndPoint);
            }
            showSuccess(toast, 'Berhasil Menghapus Data');
            setState((p) => ({ ...p, selectedData: [], delete: false }));
            await getData(apiEndpointGet);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Terjadi Kesalahan');
            setState((p) => ({ ...p, delete: false }));
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getData = async (apiEndpoint: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await getDataInterceptor(apiEndpoint);
            setState((p) => ({ ...p, data: res.data.data || [] }));
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getCategories = async () => {
        try {
            const res = await getDataInterceptor(apiEndpointGetCategories);
            setState((p) => ({ ...p, categories: res.data.data || [] }));
        } catch (error: any) {
            console.error('Gagal mengambil data kategori dokumen:', error);
        }
    };

    useEffect(() => {
        if (session) {
            setState((prev) => ({ ...prev, session: session }));
            getCategories();
        }
    }, [session]);

    return (
        <>

            <Toast ref={toast} position="top-right" />
            <Table state={state} toast={toast} setState={setState} formik={formik} getData={getData} handleDelete={handleDelete} />
            <Form formik={formik} state={state} setState={setState} handleDelete={handleDelete} />
        </>
    );
};

export default Page;
