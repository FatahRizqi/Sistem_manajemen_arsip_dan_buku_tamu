'use client';
import postData from '@/lib/axios/postData';
import apiGetData from '@/lib/axios/getData';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { useFormik } from 'formik';
import { initValue, NavState, State } from './components/interfaces';
import Table from './components/display/table';
import { FilterMatchMode } from 'primereact/api';
import Form from './components/display/form';
import { useSession } from 'next-auth/react';
import { DataRekap } from '@/types/print-tools';
import Print from './components/display/print';
import { apiEndpointGetNavDataEdit, apiEndpointUpdateNav, apiEndpointCreate, apiEndpointUpdate, apiEndpointDelete, apiEndpointGet } from './components/endpoints';
import NavForm from './components/display/navbar';

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    // 1. TAMBAH MASTER DATA KE STATE GLOBAL
    const [state, setState] = useState<State & { masterData?: any }>({
        load: false,
        data: [],
        add: false,
        edit: false,
        delete: false,
        selectedUsers: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,
        masterData: {
            branches: [],
            positions: [],
            divisions: [],
            departments: [],
            workUnits: [],
            roles: [] // Tempat nyimpen data mst_roles
        }
    });

    const [dataRekap, setDataRekap] = useState<DataRekap>({
        data: {},
        dataTotal: [],
        head: [],
        load: false,
        columnStyles: {},
        show: false,
        adjust: false,
        fileName: `laporan-user-${new Date().toISOString().slice(0, 10)}`,
        judul1: 'Laporan USER',
        judul2: ''
    });

    const [navBar, setNavBar] = useState<NavState>({
        data: [],
        menu: [],
        IdPengguna: '',
        load: false,
        show: false
    });

    const formik = useFormik({
        initialValues: {
            id_pengguna: '',
            nama_lengkap: '',
            nama_pengguna: '',
            kata_sandi: '',
            telepon: '',
            status: 'active', // Lebih baik default ke 'active' daripada '0'
            id_peran: '',

            // --- TAMBAHKAN INI ---
            id_cabang: '',
            id_jabatan: '',
            id_divisi: '',
            id_departemen: '',
            id_unit_kerja: ''
        },
        validate: (data: initValue) => {
            let errors = {} as initValue;

            if (!data.nama_lengkap) {
                errors.nama_lengkap = 'Nama wajib diisi';
            } else if (data.nama_lengkap.length < 3) {
                errors.nama_lengkap = 'Nama harus terdiri dari minimal 3 karakter';
            } else if (!/^[a-zA-Z\s]+$/.test(data.nama_lengkap)) {
                errors.nama_lengkap = 'Nama hanya boleh berisi huruf dan spasi';
            }

            if (!data.nama_pengguna) {
                errors.nama_pengguna = 'Username/email wajib diisi';
            }

            if (!data.kata_sandi && !state.edit) {
                errors.kata_sandi = 'Kata sandi wajib diisi';
            } else if (data.kata_sandi) {
                if (data.kata_sandi.length < 8) {
                    errors.kata_sandi = 'Kata sandi harus terdiri dari minimal 8 karakter';
                } else if (!/[A-Z]/.test(data.kata_sandi)) {
                    errors.kata_sandi = 'Kata sandi harus mengandung huruf besar';
                } else if (!/[a-z]/.test(data.kata_sandi)) {
                    errors.kata_sandi = 'Kata sandi harus mengandung huruf kecil';
                } else if (!/[0-9]/.test(data.kata_sandi)) {
                    errors.kata_sandi = 'Kata sandi harus mengandung angka';
                } else if (!/[\W_]/.test(data.kata_sandi)) {
                    errors.kata_sandi = 'Kata sandi harus mengandung simbol';
                }
            }

            if (!data.telepon) {
                errors.telepon = 'Nomor HP wajib diisi';
            } else if (!/^(08|(\+62))\d{8,13}$/.test(data.telepon)) {
                errors.telepon = 'Nomor HP harus dimulai dengan 08 dan panjang 9-13 digit';
            }

            if (!data.id_peran || (Array.isArray(data.id_peran) && data.id_peran.length === 0)) {
                errors.id_peran = 'Role wajib dipilih';
            }

            if (!data.id_cabang) {
                errors.id_cabang = 'Cabang wajib dipilih';
            }

            if (!data.id_jabatan) {
                errors.id_jabatan = 'Posisi wajib dipilih';
            }

            if (!data.id_divisi) {
                errors.id_divisi = 'Divisi wajib dipilih';
            }

            if (!data.id_departemen) {
                errors.id_departemen = 'Departemen wajib dipilih';
            }

            if (!data.id_unit_kerja) {
                errors.id_unit_kerja = 'Unit Kerja wajib dipilih';
            }

            return errors;
        },
        onSubmit: async (data) => {
            await handleSave(data);
        }
    });

    // A. Mengambil Master Data (Dropdown) — bypass filter cabang agar admin bisa assign user ke cabang manapun
    useEffect(() => {
        if (session) {
            const vaEndpoints = [
                { key: 'branches', path: '/master/organisasi/branches/get-data' },
                { key: 'positions', path: '/master/organisasi/positions/get-data' },
                { key: 'divisions', path: '/master/organisasi/divisions/get-data' },
                { key: 'departments', path: '/master/organisasi/department/get-data' },
                { key: 'workUnits', path: '/master/organisasi/work-unit/get-data' },
                { key: 'roles', path: '/master/organisasi/roles/get-data' }
            ];

            const myIdPengguna = (session as any)?.user?.IdPengguna || (session as any)?.user?.id || '';

            // Membiarkan filter mengalir sesuai context dari Global Branch Switcher
            const bypassFilters: Record<string, string> = {
                'x-uniqueid': String(myIdPengguna),
                'x-timestamp': new Date().toISOString()
            };

            vaEndpoints.forEach((oItem) => {
                postData(
                    oItem.path,
                    {},
                    bypassFilters
                )
                    .then((oRes) => {
                        setState((prev: any) => ({
                            ...prev,
                            masterData: { ...prev.masterData, [oItem.key]: oRes.data.data }
                        }));
                    })
                    .catch((e) => console.error(`Error loading ${oItem.key}:`, e));
            });
        }
    }, [session]);

    // B. Handle Save / Update
    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const idUser = input.id_pengguna;
            const isEdit = Boolean(idUser);
            const cEndPoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;

            const oHeaders: Record<string, string> = {
                'X-Credential': JSON.stringify({
                    nama_pengguna: input.nama_pengguna,
                    kata_sandi: input.kata_sandi
                })
            };

            const oBody: Record<string, any> = {
                nama_lengkap: input.nama_lengkap,
                nama_pengguna: input.nama_pengguna,
                kata_sandi: input.kata_sandi,
                telepon: input.telepon,
                status: input.status,
                id_peran: input.id_peran,
                id_cabang: input.id_cabang,
                id_jabatan: input.id_jabatan,
                id_divisi: input.id_divisi,
                id_departemen: input.id_departemen,
                id_unit_kerja: input.id_unit_kerja
            };

            if (isEdit) oBody['id_pengguna'] = idUser;

            const vaData = await postData(cEndPoint, oBody, oHeaders);
            showSuccess(toast, vaData.data?.data?.message || 'Berhasil Menyimpan Data');
            formik.resetForm();
            setState((p: any) => ({ ...p, add: false, edit: false, delete: false, manageRole: false }));

            // Refresh tabel
            getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    // C. Handle Delete
    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));

        try {
            if (state.selectedUsers.length < 1) return;

            // KITA HACK DI SINI:
            // Karena id_pengguna itu null, kita coba ambil dari 'v.id'
            // Pastikan data ini isinya beneran ANGKA (Number)
            const vaIdPengguna = state.selectedUsers.map((v: any) => v.id || v.id_pengguna);

            // Kita bungkus angka tersebut ke dalam key 'id_pengguna' demi backend
            const finalPayload = { id_pengguna: vaIdPengguna.map(Number) };

            // (Opsional) Intip payload-nya sebelum dikirim, pastikan BUKAN [ null ] atau [ NaN ]
            console.log("PAYLOAD KE BACKEND:", finalPayload);

            const vaData = await postData(apiEndpointDelete, finalPayload);
            showSuccess(toast, vaData.data?.data?.message || 'Berhasil Menghapus Data');

            setState((p) => ({ ...p, selectedUsers: [], delete: false }));

            // Refresh tabel
            getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    }

    const getData = async (apiEndpoint: string, isExact: boolean = true) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpoint, {}, {
                'x-exact-cabang': isExact ? 'true' : 'false'
            });
            setState((p) => ({
                ...p,
                data: res.data.data
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getNav = async (IdPengguna: string | number) => {
        setNavBar((p) => ({ ...p, load: true }));

        try {
            const headers = {
                'X-Level': '1'
            };
            const vaData = await postData(apiEndpointGetNavDataEdit, { id_pengguna: IdPengguna }, headers);

            let res = vaData.data;
            setNavBar((p) => ({
                ...p,
                data: JSON.parse(JSON.stringify(res.data)),
                menu: JSON.parse(JSON.stringify(res.menu)),
                IdPengguna,
                show: true
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setNavBar((p) => ({ ...p, load: false }));
        }
    };

    const handleSaveNavbar = async () => {
        setNavBar((p) => ({ ...p, load: true }));

        try {
            const res = await postData(apiEndpointUpdateNav, {
                id_pengguna: navBar.IdPengguna,
                menu: JSON.stringify(navBar.menu)
            });
            showSuccess(toast, res.data.message);
            setNavBar((p) => ({ ...p, show: false }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setNavBar((p) => ({ ...p, load: false }));
        }
    };

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session: session
            }));
        }
    }, [session]);

    return (
        <>
            <Toast ref={toast} position="top-right" />


            <Table getNav={getNav} dataRekap={dataRekap} setDataRekap={setDataRekap} state={state} toast={toast} setState={setState} formik={formik} getData={getData} handleSave={handleSave} handleDelete={handleDelete} />
            <Print dataRekap={dataRekap} setDataRekap={setDataRekap} state={state} toast={toast} setState={setState} formik={formik} getData={getData} />
        </>
    );
};

export default Page;
