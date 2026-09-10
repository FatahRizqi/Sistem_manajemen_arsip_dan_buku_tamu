'use client';

import React, { useEffect, useRef, useState } from 'react';
import putData from '@/lib/axios/putData';
import { Toast } from 'primereact/toast';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { FilterMatchMode } from 'primereact/api';
import { State } from './components/interfaces';
import { apiEndpointGet, apiEndpointApproval } from './components/endpoints';
import GuestDataTable from './components/display/table';
import { CheckoutDialog, DetailVisitorDialog, ScanQRDialog, RejectDialog } from './components/display/dialogs';
import { useSession } from 'next-auth/react';

const CheckoutPage = () => {
    const { data: session } = useSession();
    const toast = useRef<Toast>(null);
    const [state, setState] = useState<State>({
        load: false,
        data: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        statusFilter: '',
        showCheckoutDialog: false,
        checkoutToken: '',
        checkoutNotes: '',
        detailRecord: null,
        startDate: '',
        endDate: ''
    });
    const [selectedId, setSelectedId] = useState<string | number>('');
    const [showScanDialog, setShowScanDialog] = useState(false);
    const [rejectRecord, setRejectRecord] = useState<any>(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');


    const getData = async (apiEndpoint: string, payload: Record<string, any> = {}) => {
        setState((p: State) => ({ ...p, load: true }));
        try {
            const response = await postData(apiEndpoint, payload);
            const result = response.data;
            if (result) {
                let finalArrayData = [];
                if (Array.isArray(result.data)) finalArrayData = result.data;
                else if (result.data && Array.isArray(result.data.rows)) finalArrayData = result.data.rows;
                else if (result.data && Array.isArray(result.data.data)) finalArrayData = result.data.data;
                else if (Array.isArray(result)) finalArrayData = result;
                setState((p: State) => ({ ...p, data: finalArrayData }));
            }
        } catch (error: any) {
            showError(toast, 'Gagal memuat data');
            setState((p: State) => ({ ...p, data: [] }));
        } finally {
            setState((p: State) => ({ ...p, load: false }));
        }
    };

    const fetchAll = async () => {
        const payload: Record<string, any> = {};
        if (state.statusFilter) payload.Status = state.statusFilter;
        await getData(apiEndpointGet, payload);
    };

    useEffect(() => {
        fetchAll();
    }, [state.statusFilter]);

    const onCheckout = (row: any) => {
        setSelectedId(row.id_kunjungan || '');
        setState((p: State) => ({
            ...p,
            showCheckoutDialog: true,
            checkoutToken: row.token_qr || row.kode_kunjungan || '',
            checkoutNotes: ''
        }));
    };

    const onDetail = (row: any) => {
        setState((p: State) => ({ ...p, detailRecord: row }));
    };

    const onFilterStatus = (value: string) => {
        setState((p: State) => ({ ...p, statusFilter: value }));
    };

    const handleCheckout = async () => {
        if (!selectedId) {
            showError(toast, 'ID Kunjungan tidak ditemukan');
            return;
        }

        try {
            setState((p: State) => ({ ...p, load: true }));

            const tokenSIAB = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token') || '') : '';

            let userIdAdmin = "";
            if (typeof window !== 'undefined') {
                const userSessionString = sessionStorage.getItem('user') || localStorage.getItem('user');
                if (userSessionString) {
                    try {
                        const parsedUser = JSON.parse(userSessionString);
                        userIdAdmin = parsedUser.user_id || parsedUser.id || parsedUser.UniqueId || "";
                    } catch (e) {
                        userIdAdmin = "";
                    }
                }
            }

            if (!userIdAdmin) {
                userIdAdmin = "1";
            }

            const timestamp = new Date().toISOString();

            const response = await putData(
                `/buku-tamu/visit-checkout/${selectedId}`,
                {}
            );

            if (response.data?.status === '00') {
                showSuccess(toast, 'Check-out berhasil');
                setState((p: State) => ({ ...p, showCheckoutDialog: false, checkoutNotes: '' }));
                fetchAll();
            } else {
                throw new Error(response.data?.message || 'Gagal check-out');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || error?.message || 'Gagal check-out');
        } finally {
            setState((p: State) => ({ ...p, load: false }));
        }
    };

    const handleApproval = async (idKunjungan: string | number, action: 'approved' | 'rejected', notes: string = '') => {
        try {
            setState((p: State) => ({ ...p, load: true }));

            const tokenSIAB = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token') || '') : '';

            let userIdAdmin = "";
            if (typeof window !== 'undefined') {
                const userSessionString = sessionStorage.getItem('user') || localStorage.getItem('user');
                if (userSessionString) {
                    try {
                        const parsedUser = JSON.parse(userSessionString);
                        userIdAdmin = parsedUser.user_id || parsedUser.id || parsedUser.UniqueId || "";
                    } catch (e) {
                        userIdAdmin = "";
                    }
                }
            }

            if (!userIdAdmin) {
                userIdAdmin = "1";
            }

            const timestamp = new Date().toISOString();

            const response = await postData(
                apiEndpointApproval,
                {
                    idKunjungan,
                    action,
                    catatanPersetujuan: notes
                }
            );

            if (response.data?.status === '00') {
                showSuccess(toast, action === 'approved' ? 'Permohonan kunjungan disetujui!' : 'Permohonan kunjungan ditolak!');
                setShowRejectDialog(false);
                setRejectRecord(null);
                setRejectNotes('');
                fetchAll();
            } else {
                throw new Error(response.data?.message || 'Gagal memproses persetujuan');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || error?.message || 'Gagal memproses persetujuan');
        } finally {
            setState((p: State) => ({ ...p, load: false }));
        }
    };

    const handleCheckin = async (idKunjungan: string | number) => {
        try {
            setState((p: State) => ({ ...p, load: true }));

            const tokenSIAB = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token') || '') : '';

            let userIdAdmin = "";
            if (typeof window !== 'undefined') {
                const userSessionString = sessionStorage.getItem('user') || localStorage.getItem('user');
                if (userSessionString) {
                    try {
                        const parsedUser = JSON.parse(userSessionString);
                        userIdAdmin = parsedUser.user_id || parsedUser.id || parsedUser.UniqueId || "";
                    } catch (e) {
                        userIdAdmin = "";
                    }
                }
            }

            if (!userIdAdmin) {
                userIdAdmin = "1";
            }

            const timestamp = new Date().toISOString();

            const response = await putData(
                `/buku-tamu/visit-checkin/${idKunjungan}`,
                {}
            );

            if (response.data?.status === '00') {
                showSuccess(toast, response.data?.message || 'Check-in berhasil!');
                fetchAll();
            } else {
                throw new Error(response.data?.message || 'Gagal check-in');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || error?.message || 'Gagal check-in');
        } finally {
            setState((p: State) => ({ ...p, load: false }));
        }
    };
 
    const handleScanSuccess = async (decodedText: string) => {
        setShowScanDialog(false);
        if (!decodedText) return;
 
        try {
            setState((p: State) => ({ ...p, load: true }));
 
            const tokenSIAB = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token') || '') : '';
            let userIdAdmin = "";
            if (typeof window !== 'undefined') {
                const userSessionString = sessionStorage.getItem('user') || localStorage.getItem('user');
                if (userSessionString) {
                    try {
                        const parsedUser = JSON.parse(userSessionString);
                        userIdAdmin = parsedUser.user_id || parsedUser.id || parsedUser.UniqueId || "";
                    } catch (e) {
                        userIdAdmin = "";
                    }
                }
            }
 
            if (!userIdAdmin) {
                userIdAdmin = "1";
            }
 
            const timestamp = new Date().toISOString();
 
            // Fetch visitor details by scanned QR token
            const response = await postData(
                "/buku-tamu/visit-qr-scan",
                {
                    QRToken: decodedText
                }
            );
 
            if (response.data?.status === '00' && response.data?.data?.record) {
                const record = response.data.data.record;
                
                if (record.status === 'Rencana') {
                    // Check-In Flow
                    if (record.status_persetujuan !== 'approved') {
                        showError(toast, `Kunjungan tamu ${record.nama_tamu} belum disetujui (Status Persetujuan: ${record.status_persetujuan})`);
                        return;
                    }
                    showSuccess(toast, `QR Dideteksi: Memulai Check-In Tamu ${record.nama_tamu}`);
                    await handleCheckin(record.id_kunjungan);
                } else if (record.status === 'in') {
                    // Check-Out Flow
                    setSelectedId(record.id_kunjungan);
                    setState((p: State) => ({
                        ...p,
                        showCheckoutDialog: true,
                        checkoutToken: record.token_qr || record.kode_kunjungan || decodedText,
                        checkoutNotes: ''
                    }));
                    showSuccess(toast, `QR Dideteksi: Menyiapkan Check-Out Tamu ${record.nama_tamu}`);
                } else if (record.status === 'out') {
                    showError(toast, `Tamu ${record.nama_tamu} sudah melakukan check-out sebelumnya.`);
                } else {
                    showError(toast, `Status kunjungan tamu ${record.nama_tamu} tidak valid (${record.status})`);
                }
            } else {
                showError(toast, response.data?.message || 'Data kunjungan tamu tidak ditemukan');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memproses QR code');
        } finally {
            setState((p: State) => ({ ...p, load: false }));
        }
    };
 
    return (
        <>

            <Toast ref={toast} position="top-right" />
 
            <GuestDataTable
                state={state}
                setState={setState}
                session={session}
                onCheckout={onCheckout}
                onDetail={onDetail}
                onFilterStatus={onFilterStatus}
                onRefresh={fetchAll}
                onApprove={(row) => handleApproval(row.id_kunjungan, 'approved')}
                onReject={(row) => {
                    setRejectRecord(row);
                    setRejectNotes('');
                    setShowRejectDialog(true);
                }}
                onCheckin={(row) => handleCheckin(row.id_kunjungan)}
                onScanQR={() => setShowScanDialog(true)} />

            <RejectDialog
                visible={showRejectDialog}
                rejectRecord={rejectRecord}
                rejectNotes={rejectNotes}
                loading={state.load}
                onHide={() => setShowRejectDialog(false)}
                onNotesChange={setRejectNotes}
                onConfirm={() => rejectRecord && handleApproval(rejectRecord.id_kunjungan, 'rejected', rejectNotes)} />
 
            <CheckoutDialog
                visible={state.showCheckoutDialog}
                checkoutToken={state.checkoutToken}
                checkoutNotes={state.checkoutNotes}
                loading={state.load}
                onHide={() => setState((p: State) => ({ ...p, showCheckoutDialog: false }))}
                onTokenChange={(val) => setState((p: State) => ({ ...p, checkoutToken: val }))}
                onNotesChange={(val) => setState((p: State) => ({ ...p, checkoutNotes: val }))}
                onConfirm={handleCheckout} />
 
            <DetailVisitorDialog
                visible={!!state.detailRecord}
                record={state.detailRecord}
                onHide={() => setState((p: State) => ({ ...p, detailRecord: null }))} />
 
            <ScanQRDialog
                visible={showScanDialog}
                onHide={() => setShowScanDialog(false)}
                onScanSuccess={handleScanSuccess}
                loading={state.load} />
        </>
    );
};

export default CheckoutPage;

