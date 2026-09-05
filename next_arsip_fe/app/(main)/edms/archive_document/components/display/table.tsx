'use client'

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";
import { Avatar } from "primereact/avatar";
import { Dropdown } from "primereact/dropdown";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { DocumentData, LoanData, TableProps } from "../interfaces";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import { OverlayPanel } from "primereact/overlaypanel";
import { Calendar } from "primereact/calendar";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { apiEndpointDocumentUpdate } from "../endpoints";
import Form from "./form";
import { usePermissions } from '@/hooks/usePermissions';

const Table = ({
    state,
    setState,
    formik,
    getDocuments,
    getDocumentDetail,
    deleteDocuments,
    handleFetchPreviewUrl,
    handleGenerateQR,
    handleScanQR,
    handleUpdateLocation,
    handleGenerateAutoNumber,
    toast
}: TableProps) => {
    const permissions = usePermissions();
    const { canCreate, canUpdate, canDelete } = permissions;
    const router = useRouter();

    const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual');
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraErr, setCameraErr] = useState<string | null>(null);
    const html5QrRef = useRef<Html5Qrcode | null>(null);
    const filterPanelRef = useRef<OverlayPanel>(null);

    const startCameraScanner = async () => {
        setCameraErr(null);
        try {
            const html5Qr = new Html5Qrcode("qr-camera-reader");
            html5QrRef.current = html5Qr;
            setCameraActive(true);

            await html5Qr.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText: string) => {
                    handleScanQR(decodedText);
                    html5Qr.stop().then(() => {
                        setCameraActive(false);
                    }).catch(console.error);
                },
                () => { }
            );
        } catch (err: any) {
            console.error("Gagal memulai kamera:", err);
            setCameraErr(err?.message || "Kamera tidak ditemukan atau izin akses ditolak");
            setCameraActive(false);
        }
    };

    const stopCameraScanner = () => {
        if (html5QrRef.current) {
            html5QrRef.current.stop().then(() => {
                setCameraActive(false);
            }).catch(console.error);
        }
    };

    useEffect(() => {
        return () => {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { });
            }
        };
    }, []);

    const formatDateInput = (value?: string) => {
        if (!value) return '';
        return String(value).slice(0, 10);
    };

    const statusBodyTemplate = (rowData: DocumentData) => {
        const s = (rowData.status || '').toLowerCase();
        let bg = '#22c55e';
        let iconClass = 'pi-chevron-down';
        let label = 'Aktif';

        if (s === 'active' || s === 'aktif') {
            bg = '#22c55e';
            iconClass = 'pi-chevron-down';
            label = 'Aktif';
        } else if (s === 'inactive' || s === 'inaktif') {
            bg = '#f97316';
            iconClass = 'pi-clock';
            label = 'Inaktif';
        } else if (s === 'borrowed' || s === 'dipinjam') {
            bg = '#3b82f6';
            iconClass = 'pi-external-link';
            label = 'Dipinjam';
        } else if (s === 'proposal_destruction' || s === 'usul_musnah' || s === 'usulan_musnah') {
            bg = '#a855f7';
            iconClass = 'pi-exclamation-triangle';
            label = 'Usul Musnah';
        } else if (s === 'destroyed' || s === 'dimusnahkan') {
            bg = '#6b7280';
            iconClass = 'pi-trash';
            label = 'Dimusnahkan';
        } else if (s === 'nonactive' || s === 'nonaktif') {
            bg = '#ef4444';
            iconClass = 'pi-times';
            label = 'Tidak Aktif';
        } else {
            label = rowData.status || 'Aktif';
        }

        return (
            <div className="flex align-items-center justify-content-center">
                <div
                    className="w-2rem h-2rem border-round flex align-items-center justify-content-center text-white shadow-1"
                    style={{ background: bg, borderRadius: '8px' }}
                    title={label}
                >
                    <i className={`pi ${iconClass} text-xs font-bold`} />
                </div>
            </div>
        );
    };

    const documentTemplate = (rowData: DocumentData) => (
        <div>
            <span className="font-semibold text-sm text-900 block">{rowData.nomor_dokumen}</span>
            <span className="text-xs text-color-secondary">{rowData.nama_dokumen}</span>
        </div>
    );

    const picTemplate = (rowData: DocumentData) => (
        <div className="flex align-items-center gap-2">
            <Avatar
                label={rowData.nama_pic?.slice(0, 1).toUpperCase() || 'P'}
                shape="circle"
                style={{ width: '1.75rem', height: '1.75rem', fontSize: '0.7rem', background: '#EEF2FF', color: '#4F46E5', fontWeight: '700', flexShrink: 0 }} />
            <span className="text-sm text-900">{rowData.nama_pic}</span>
        </div>
    );

    const actionTemplate = (rowData: DocumentData) => (
        <div className="flex gap-1 align-items-center">
            <Button icon="pi pi-info-circle"
                rounded
                text
                size="small"
                tooltip="Detail Dokumen"
                tooltipOptions={{ position: 'top' }}
                loading={state.detailLoad}
                onClick={() => getDocumentDetail(rowData.id_dokumen)} />
            <Button icon="pi pi-history"
                rounded
                text
                severity="info"
                size="small"
                tooltip="Riwayat Versi"
                tooltipOptions={{ position: 'top' }}
                onClick={() => router.push(`/edms/archive_document/${rowData.id_dokumen}/versions`)} />
            <Button icon="pi pi-clock"
                rounded
                text
                severity="help"
                size="small"
                tooltip="Audit Trail"
                tooltipOptions={{ position: 'top' }}
                onClick={() => router.push(`/edms/archive_document/${rowData.id_dokumen}/history`)} />
            <Button icon="pi pi-qrcode"
                rounded
                text
                severity="warning"
                size="small"
                tooltip="Lihat & Cetak Stiker QR Code"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleGenerateQR(rowData.id_dokumen)} />
            {canUpdate && (
                <Button icon="pi pi-pencil"
                    text
                    severity="secondary"
                    size="small"
                    tooltip="Edit Metadata"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => {
                        formik.setValues({
                            id_dokumen: rowData.id_dokumen,
                            nama_dokumen: rowData.nama_dokumen,
                            nomor_dokumen: rowData.nomor_dokumen,
                            tanggal: formatDateInput(rowData.tanggal),
                            tanggal_kedaluwarsa: formatDateInput(rowData.tanggal_kedaluwarsa),
                            nama_pic: rowData.nama_pic,
                            kode_jenis_dokumen: rowData.kode_jenis_dokumen || '',
                            kode_klasifikasi: rowData.kode_klasifikasi || '',
                            kode_kategori_dokumen: rowData.kode_kategori_dokumen || '',
                            kode_tingkat_kerahasiaan: rowData.kode_tingkat_kerahasiaan || '',
                            tanggal_transaksi: formatDateInput(rowData.tanggal_transaksi || undefined),
                            lokasi_fisik: rowData.lokasi_fisik || '',
                            kode_retensi: rowData.kode_retensi || '',
                        });
                        setState((p) => ({ ...p, add: false, edit: true, delete: false, selectedDocuments: [rowData] }));
                    }} />
            )}
            {canDelete && (
                <Button icon="pi pi-trash"
                    text
                    severity="danger"
                    size="small"
                    tooltip="Hapus Dokumen"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => setState((p) => ({ ...p, delete: true, selectedDocuments: [rowData] }))} />
            )}
        </div>
    );

    const previewTemplate = (rowData: DocumentData) => (
        <Button icon="pi pi-eye"
            text
            severity="info"
            size="small"
            tooltip={rowData.file_path ? "Pratinjau Dokumen" : "Belum ada file berkas"}
            tooltipOptions={{ position: 'top' }}
            onClick={() => handleFetchPreviewUrl(rowData.file_path || '')}
            disabled={!rowData.file_path} />
    );

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="font-semibold text-color text-sm">Daftar Dokumen</span>
        </div>
    );

    const deleteFooterTemplate = (
        <div className="flex mt-4 pt-3 border-top-1 surface-border">
            <Button label="Batal"
                icon="pi pi-times"
                severity="secondary"
                outlined
                size="small"
                onClick={() => setState((p) => ({ ...p, delete: false }))}
                disabled={state.load} />
            <Button label="Hapus"
                icon="pi pi-trash"
                severity="danger"
                size="small"
                onClick={deleteDocuments}
                loading={state.load} />
        </div>
    );

    return <>
        <Card className="shadow-1 border-round-2xl border-none">
            {/* Page Header */}
            <div className="mb-3">
                <h2 className="m-0 text-900 font-bold text-2xl mb-1">Archive Documents</h2>
                <p className="m-0 text-color-secondary text-sm font-medium">Kelola metadata dokumen dan pantau riwayat versi serta peminjaman arsip.</p>
            </div>

            <div className="flex flex-column sm:flex-row align-items-stretch sm:align-items-center justify-content-between gap-2 mb-3">
                <div className="flex flex-row flex-wrap align-items-center gap-2">
                    {canCreate && (
                        <Button type="button"
                            size="small"
                            label="Tambah Dokumen"
                            icon="pi pi-plus"
                            outlined

                            onClick={() => {
                                const name = (state.session?.user as any)?.name || (state.session?.user as any)?.nama_pengguna || '';
                                formik.resetForm({
                                    values: {
                                        id_dokumen: null,
                                        nama_dokumen: '',
                                        nomor_dokumen: '',
                                        tanggal: '',
                                        tanggal_kedaluwarsa: '',
                                        nama_pic: name,
                                        kode_jenis_dokumen: '',
                                        kode_klasifikasi: '',
                                        kode_kategori_dokumen: '',
                                        kode_tingkat_kerahasiaan: '',
                                        tanggal_transaksi: '',
                                        lokasi_fisik: '',
                                        kode_retensi: '',
                                    }
                                });
                                setState(p => ({ ...p, add: true, edit: false, delete: false }));
                            }} />
                    )}
                    {canCreate && canDelete && <Divider layout="vertical" className="hidden sm:inline" />}
                    {canDelete && (
                        <Button type="button"
                            size="small"
                            label={`Hapus${state.selectedDocuments.length > 0 ? ` (${state.selectedDocuments.length})` : ''}`}
                            icon="pi pi-trash"
                            severity="danger"
                            outlined
                            disabled={state.selectedDocuments.length === 0}
                            onClick={() => setState((p) => ({ ...p, delete: true }))} />
                    )}
                    {(canCreate || canDelete) && <Divider layout="vertical" className="hidden sm:inline" />}
                    <Button type="button"
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        loading={state.load}
                        onClick={getDocuments} />
                </div>

                <div className="flex flex-row flex-wrap align-items-center gap-2">
                    <Button type="button"
                        size="small"
                        label="Scan & Track QR"
                        icon="pi pi-qrcode"
                        outlined
                        severity="info"
                        tooltip="Pindai Stiker QR Berkas Fisik dengan Kamera Live atau USB Scanner"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => setState(p => ({ ...p, trackingDialog: true, trackingCode: '', trackingResult: null }))} />
                    <Divider layout="vertical" className="hidden sm:inline" />
                    <Button type="button"
                        size="small"
                        label="Pencarian OCR & Teks"
                        icon="pi pi-search-plus"
                        outlined
                        severity="help"
                        onClick={() => router.push('/edms/archive_document/search')} />
                </div>
            </div>

            {/* Status Legend Bar */}
            <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1" style={{ width: 'fit-content' }}>
                <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                    <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#22c55e', borderRadius: '3px' }}></span>
                    <span className="text-700">Aktif</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#f97316', borderRadius: '3px' }}></span>
                    <span className="text-700">Inaktif</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '3px' }}></span>
                    <span className="text-700">Dipinjam</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#a855f7', borderRadius: '3px' }}></span>
                    <span className="text-700">Usul Musnah</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#6b7280', borderRadius: '3px' }}></span>
                    <span className="text-700">Dimusnahkan</span>
                </div>
                <div className="flex align-items-center gap-2 text-xs font-semibold">
                    <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '3px' }}></span>
                    <span className="text-700">Tidak Aktif</span>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                {/* Left: Date Pickers */}
                <div className="flex align-items-center gap-2">
                    <Calendar 
                        value={state.startDate || undefined} 
                        onChange={(e) => setState(p => ({ ...p, startDate: e.value as Date }))} 
                        placeholder="Tanggal Awal" 
                        showIcon 
                        className="p-inputtext-sm w-12rem"
                        dateFormat="yy-mm-dd" />
                    <span className="text-sm font-semibold text-600">s.d</span>
                    <Calendar 
                        value={state.endDate || undefined} 
                        onChange={(e) => setState(p => ({ ...p, endDate: e.value as Date }))} 
                        placeholder="Tanggal Akhir" 
                        showIcon 
                        className="p-inputtext-sm w-12rem"
                        dateFormat="yy-mm-dd" />
                </div>

                {/* Right: Filters & Search */}
                <div className="flex align-items-center gap-2">
                    <Button 
                        type="button" 
                        label="Filter" 
                        icon="pi pi-filter" 
                        outlined 
                        className="p-button-sm bg-white" 
                        onClick={(e) => filterPanelRef.current?.toggle(e)} />
                    
                    <OverlayPanel ref={filterPanelRef} className="w-25rem">
                        <div className="flex flex-column gap-3 p-2">
                            <span className="font-bold text-sm text-800 border-bottom-1 surface-border pb-2">Filter Lanjutan</span>
                            <div className="flex flex-column gap-1">
                                <label className="text-xs font-semibold text-color-secondary">Klasifikasi</label>
                                <Dropdown
                                    value={state.filterClassification}
                                    options={[
                                        { label: 'Semua Klasifikasi', value: '' },
                                        ...state.classifications.map((item: any) => ({
                                            label: `${item.kode_klasifikasi} - ${item.nama_klasifikasi}`,
                                            value: item.kode_klasifikasi
                                        }))
                                    ]}
                                    onChange={(e) => setState(p => ({ ...p, filterClassification: e.value || '', filterCategory: '' }))}
                                    placeholder="Pilih Klasifikasi"
                                    className="w-full text-xs p-inputtext-sm"
                                    filter
                                    showClear />
                            </div>
                            <div className="flex flex-column gap-1">
                                <label className="text-xs font-semibold text-color-secondary">Kategori</label>
                                <Dropdown
                                    value={state.filterCategory}
                                    options={[
                                        { label: 'Semua Kategori', value: '' },
                                        ...state.categories
                                            .filter((item: any) => !state.filterClassification || item.kode_klasifikasi === state.filterClassification)
                                            .map((item: any) => ({
                                                label: `${item.kode_kategori_dokumen} - ${item.nama_kategori_dokumen}`,
                                                value: item.kode_kategori_dokumen
                                            }))
                                    ]}
                                    onChange={(e) => setState(p => ({ ...p, filterCategory: e.value || '' }))}
                                    placeholder="Pilih Kategori"
                                    className="w-full text-xs p-inputtext-sm"
                                    filter
                                    showClear
                                    disabled={!state.filterClassification} />
                            </div>
                            <div className="flex flex-column gap-1">
                                <label className="text-xs font-semibold text-color-secondary">Tipe Dokumen</label>
                                <Dropdown
                                    value={state.filterType}
                                    options={[
                                        { label: 'Semua Tipe', value: '' },
                                        ...(state.documentTypes || []).map((item: any) => ({
                                            label: `${item.kode_jenis_dokumen} - ${item.nama_jenis_dokumen}`,
                                            value: item.kode_jenis_dokumen
                                        }))
                                    ]}
                                    onChange={(e) => setState(p => ({ ...p, filterType: e.value || '' }))}
                                    placeholder="Pilih Tipe Dokumen"
                                    className="w-full text-xs p-inputtext-sm"
                                    filter
                                    showClear />
                            </div>
                            <div className="flex flex-column gap-1">
                                <label className="text-xs font-semibold text-color-secondary">Tingkat Kerahasiaan</label>
                                <Dropdown
                                    value={state.filterConfidentiality}
                                    options={[
                                        { label: 'Semua Kerahasiaan', value: '' },
                                        ...state.confidentialities.map((item: any) => ({
                                            label: `${item.kode_tingkat_kerahasiaan} - ${item.nama_tingkat_kerahasiaan}`,
                                            value: item.kode_tingkat_kerahasiaan
                                        }))
                                    ]}
                                    onChange={(e) => setState(p => ({ ...p, filterConfidentiality: e.value || '' }))}
                                    placeholder="Pilih Kerahasiaan"
                                    className="w-full text-xs p-inputtext-sm"
                                    filter
                                    showClear />
                            </div>
                        </div>
                    </OverlayPanel>
                    
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            value={state.searchVal}
                            onChange={(e) => {
                                const value = e.target.value;
                                const filters = { ...state.filters };
                                filters.global.value = value;
                                setState((p) => ({ ...p, searchVal: value, filters }));
                            }}
                            placeholder="Cari Data..."
                            className="p-inputtext-sm w-15rem" />
                    </span>
                    
                    {(state.filterClassification || state.filterCategory || state.filterType || state.filterConfidentiality || state.startDate || state.endDate || state.searchVal) && (
                        <Button 
                            icon="pi pi-filter-slash"
                            className="p-button-danger p-button-outlined p-button-sm bg-white"
                            tooltip="Bersihkan Semua Filter"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => setState(p => ({
                                ...p,
                                filterClassification: '',
                                filterCategory: '',
                                filterType: '',
                                filterConfidentiality: '',
                                startDate: null,
                                endDate: null,
                                searchVal: '',
                                filters: { global: { value: null, matchMode: 'contains' as any } }
                            }))} />
                    )}
                </div>
            </div>

            <DataTable
                value={state.data}
                selection={state.selectedDocuments}
                onSelectionChange={(e: any) => setState((p) => ({ ...p, selectedDocuments: e.value as DocumentData[] }))}
                selectionMode="multiple"
                dataKey="id_dokumen"
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                loading={state.load}
                emptyMessage="Tidak ada dokumen ditemukan."
                header={headerTemplate}
                filters={state.filters}
                globalFilterFields={['nomor_dokumen', 'nama_dokumen', 'nama_pic', 'lokasi_fisik']}
                responsiveLayout="scroll"
                className="p-datatable-sm border-round-xl border-1 surface-border overflow-hidden"
                stripedRows>
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
                <Column field="nomor_dokumen" header="Nomor / Nama Dokumen" body={documentTemplate} sortable style={{ minWidth: '16rem' }} />
                <Column field="nama_jenis_dokumen" header="Tipe" sortable style={{ minWidth: '10rem' }} />
                <Column field="nama_kategori_dokumen" header="Kategori" sortable style={{ minWidth: '12rem' }} />
                <Column field="lokasi_fisik" header="Lokasi Fisik" body={(r) => r.lokasi_fisik || '-'} sortable style={{ minWidth: '10rem' }} />
                <Column field="nama_tingkat_kerahasiaan" header="Kerahasiaan" body={(r) => r.nama_tingkat_kerahasiaan || '-'} sortable style={{ minWidth: '10rem' }} />
                <Column field="nama_pic" header="PIC" body={picTemplate} sortable style={{ minWidth: '12rem' }} />
                <Column field="tanggal" header="Tgl. Dokumen" body={(r) => formatDateCalendar(r.tanggal, 'yyyy-MM-dd')} sortable style={{ minWidth: '9rem' }} />
                <Column field="tanggal_kedaluwarsa" header="Tgl. Kedaluwarsa" body={(r) => formatDateCalendar(r.tanggal_kedaluwarsa, 'yyyy-MM-dd')} sortable style={{ minWidth: '9rem' }} />
                <Column header="Berkas" body={previewTemplate} style={{ width: '4rem', textAlign: 'center' }} />
                <Column header="Aksi" body={actionTemplate} style={{ minWidth: '13rem', textAlign: 'center' }} />
            </DataTable>
        </Card>

        {/* Modal Form Tambah / Edit Dokumen */}
        <Form
            state={state}
            setState={setState}
            formik={formik}
            handleGenerateAutoNumber={handleGenerateAutoNumber}
            toast={toast} />

        {/* Modal Hapus Dokumen */}
        <Dialog
            visible={state.delete}
            header="Konfirmasi Hapus Dokumen"
            modal
            footer={deleteFooterTemplate}
            onHide={() => setState((p) => ({ ...p, delete: false }))}
            style={{ width: '30rem' }}>
            <div className="flex align-items-center gap-3">
                <i className="pi pi-exclamation-triangle text-red-500 text-3xl" />
                <span>
                    Apakah Anda yakin ingin menghapus <strong className="text-900">{state.selectedDocuments.length}</strong> dokumen yang dipilih? Tindakan ini tidak dapat dibatalkan.
                </span>
            </div>
        </Dialog>

        {/* Modal Detail Dokumen */}
        <Dialog
            visible={state.detail}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-file text-primary" />
                    <span className="font-bold text-900">Detail Informasi Dokumen</span>
                </div>
            }
            modal
            style={{ width: '40rem', maxWidth: '95vw' }}
            onHide={() => setState(p => ({ ...p, detail: false, detailData: null }))}>
            {state.detailData?.document ? (
                <div className="flex flex-column gap-3 text-sm pt-2">
                    <div className="bg-primary-50 p-3 border-round-xl border-1 border-primary-100 flex justify-content-between align-items-center">
                        <div>
                            <span className="font-extrabold text-base text-primary-900 block">{state.detailData.document.nomor_dokumen}</span>
                            <span className="text-xs text-primary-700 block mt-1">{state.detailData.document.nama_dokumen}</span>
                        </div>
                        <Tag
                            value={state.detailData.document.status === 'active' ? 'AKTIF' : 'NONAKTIF'}
                            severity={state.detailData.document.status === 'active' ? 'success' : 'danger'} />
                    </div>

                    <div className="grid mt-1">
                        <div className="col-6 flex flex-column gap-1">
                            <span className="text-color-secondary font-bold text-xs uppercase">Kode Dokumen</span>
                            <span className="text-900 font-medium">{state.detailData.document.kode_dokumen}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1">
                            <span className="text-color-secondary font-bold text-xs uppercase">Kode UUID QR</span>
                            <span className="text-900 font-medium font-mono text-xs">{state.detailData.document.qr_code}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1 mt-2">
                            <span className="text-color-secondary font-bold text-xs uppercase">Tipe Dokumen</span>
                            <span className="text-900 font-medium">{state.detailData.document.nama_jenis_dokumen || '-'}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1 mt-2">
                            <span className="text-color-secondary font-bold text-xs uppercase">Kategori Dokumen</span>
                            <span className="text-900 font-medium">{state.detailData.document.nama_kategori_dokumen || '-'}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1 mt-2">
                            <span className="text-color-secondary font-bold text-xs uppercase">Klasifikasi Arsip</span>
                            <span className="text-900 font-medium">{state.detailData.document.nama_klasifikasi || '-'}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1 mt-2">
                            <span className="text-color-secondary font-bold text-xs uppercase">Tingkat Kerahasiaan</span>
                            <span className="text-900 font-medium">{state.detailData.document.nama_tingkat_kerahasiaan || '-'}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1 mt-2">
                            <span className="text-color-secondary font-bold text-xs uppercase">PIC Penanggung Jawab</span>
                            <span className="text-900 font-medium">{state.detailData.document.nama_pic}</span>
                        </div>
                        <div className="col-6 flex flex-column gap-1 mt-2">
                            <span className="text-color-secondary font-bold text-xs uppercase">Lokasi Penyimpanan Fisik</span>
                            <span className="text-900 font-medium">{state.detailData.document.lokasi_fisik || 'Belum diatur'}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 text-color-secondary">Memuat data...</div>
            )}
        </Dialog>

        {/* Modal Tampilan & Cetak QR Code Dokumen */}
        <Dialog
            visible={state.qrDialog}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-qrcode text-warning text-xl" />
                    <span className="font-bold text-900">Stiker QR Code Berkas Fisik</span>
                </div>
            }
            modal
            style={{ width: '28rem' }}
            onHide={() => setState(p => ({ ...p, qrDialog: false, qrData: null }))}>
            <div className="flex flex-column align-items-center justify-content-center py-3">
                {state.qrLoad ? (
                    <i className="pi pi-spin pi-spinner text-3xl text-primary" />
                ) : state.qrData ? (
                    <>
                        <div id="printable-qr" className="flex flex-column align-items-center text-center p-3 border-2 border-dashed surface-border border-round-xl w-full surface-card">
                            <img src={state.qrData.qr_base64} alt="QR Code" style={{ width: '180px', height: '180px' }} />
                            <h4 className="m-0 mt-3 text-900 font-bold text-base">{state.qrData.nomor_dokumen}</h4>
                            <p className="m-0 text-xs text-color-secondary mt-1 max-w-18rem">{state.qrData.nama_dokumen}</p>
                            <span className="text-xs text-primary font-mono font-bold mt-2 bg-blue-50 px-2 py-1 border-round border-1 border-blue-200">
                                {state.qrData.qr_code}
                            </span>
                        </div>
                        <Button label="Cetak Stiker QR Code"
                            icon="pi pi-print"
                            className="mt-4 w-full font-bold"
                            severity="warning"
                            onClick={() => {
                                if (state.qrData) {
                                    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
                                    windowPrint?.document.write(`
                                        <html>
                                            <head>
                                                <title>Cetak QR Code</title>
                                                <style>
                                                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
                                                    .qr-container { text-align: center; border: 2px dashed #94a3b8; padding: 20px; border-radius: 12px; }
                                                    img { width: 200px; height: 200px; }
                                                    h3 { margin: 10px 0 5px 0; font-size: 18px; }
                                                    p { margin: 0; font-size: 12px; color: #64748b; }
                                                    .code { font-family: monospace; font-size: 11px; margin-top: 8px; color: #3b82f6; }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="qr-container">
                                                    <img src="${state.qrData.qr_base64}" />
                                                    <h3>${state.qrData.nomor_dokumen}</h3>
                                                    <p>${state.qrData.nama_dokumen}</p>
                                                    <div class="code">${state.qrData.qr_code}</div>
                                                </div>
                                                <script>
                                                    window.onload = function() { window.print(); window.close(); }
                                                </script>
                                            </body>
                                        </html>
                                    `);
                                    windowPrint?.document.close();
                                }
                            }} />
                    </>
                ) : (
                    <span className="text-red-500">Gagal memuat QR Code</span>
                )}
            </div>
        </Dialog>

        {/* Scan & Track QR Dialog */}
        <Dialog
            visible={state.trackingDialog}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-qrcode text-primary text-xl" />
                    <div>
                        <span className="font-bold text-900 block text-base">Tracking Dokumen & Scan QR</span>
                        <span className="text-xs text-500 font-normal">Pindai stiker QR fisik untuk cek lokasi rak & peminjaman</span>
                    </div>
                </div>
            }
            modal
            style={{ width: '48rem', maxWidth: '95vw' }}
            onHide={() => {
                if (html5QrRef.current) {
                    html5QrRef.current.stop().catch(() => { });
                }
                setCameraActive(false);
                setState(p => ({ ...p, trackingDialog: false, trackingCode: '', trackingResult: null }));
            }}
            pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
            <div className="flex flex-column gap-4 pt-3">
                {/* Information Banner */}
                <div className="bg-blue-50 border-1 border-blue-200 border-round-xl p-3 text-xs text-blue-900 flex flex-column gap-1">
                    <div className="font-bold flex align-items-center gap-2">
                        <i className="pi pi-info-circle text-blue-600" />
                        <span>Petunjuk Fitur QR Code EDMS:</span>
                    </div>
                    <ul className="m-0 pl-4 flex flex-column gap-1 leading-relaxed">
                        <li><strong>Fitur Pelacakan (Dialog Ini):</strong> Pindai stiker QR pada berkas fisik menggunakan <strong>Kamera Live</strong> atau <strong>USB Barcode Scanner</strong> untuk melihat posisi rak/lemari & status peminjaman.</li>
                        <li><strong>Cetak QR Code Dokumen:</strong> Untuk melihat & mencetak stiker QR fisik dokumen, klik tombol berikon QR (<i className="pi pi-qrcode text-warning" />) pada <strong>kolom aksi paling kanan tabel dokumen</strong>.</li>
                    </ul>
                </div>

                {/* Mode Selector Buttons */}
                <div className="flex justify-content-center gap-2">
                    <Button label="Scanner USB / Ketik Manual"
                        icon="pi pi-keyboard"
                        size="small"
                        severity={scanMode === 'manual' ? 'info' : 'secondary'}
                        outlined={scanMode !== 'manual'}
                        className="font-bold text-xs px-3"
                        onClick={() => {
                            if (html5QrRef.current) html5QrRef.current.stop().catch(() => { });
                            setCameraActive(false);
                            setScanMode('manual');
                        }} />
                    <Button label="Pindai via Kamera Live"
                        icon="pi pi-camera"
                        size="small"
                        severity={scanMode === 'camera' ? 'info' : 'secondary'}
                        outlined={scanMode !== 'camera'}
                        className="font-bold text-xs px-3"
                        onClick={() => setScanMode('camera')} />
                </div>

                {/* Camera Mode */}
                {scanMode === 'camera' && (
                    <div className="flex flex-column align-items-center gap-3 p-3 bg-gray-50 border-round-xl border-1 surface-border">
                        <div id="qr-camera-reader" className="w-full border-round-lg overflow-hidden bg-black" style={{ minHeight: '260px', maxWidth: '400px' }} />
                        {cameraErr && (
                            <span className="text-red-500 text-xs font-semibold">
                                <i className="pi pi-exclamation-triangle mr-1" />{cameraErr}
                            </span>
                        )}
                        {!cameraActive ? (
                            <Button label="Buka Kamera Live"
                                icon="pi pi-video"

                                className="p-button-sm font-bold"
                                onClick={startCameraScanner} />
                        ) : (
                            <Button label="Tutup Kamera"
                                icon="pi pi-power-off"
                                severity="danger"
                                outlined
                                className="p-button-sm font-bold"
                                onClick={stopCameraScanner} />
                        )}
                    </div>
                )}

                {/* Manual / USB Scanner Mode */}
                {scanMode === 'manual' && (
                    <div className="flex flex-column gap-2 text-sm">
                        <label htmlFor="qr_input" className="font-semibold text-sm text-700">
                            Masukkan Kode UUID / Gunakan USB Scanner <span className="text-red-500">*</span>
                        </label>
                        <div className="p-inputgroup">
                            <InputText
                                id="qr_input"
                                value={state.trackingCode}
                                onChange={(e) => setState(p => ({ ...p, trackingCode: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleScanQR(state.trackingCode);
                                    }
                                }}
                                placeholder="Arahkan kursor ke sini lalu scan stiker QR dengan USB Scanner..."
                                className="text-sm"
                                autoFocus />
                            <Button icon="pi pi-search"
                                label="Lacak Berkas"
                                loading={state.trackingLoad}
                                onClick={() => handleScanQR(state.trackingCode)} />
                        </div>
                    </div>
                )}

                {state.trackingLoad && (
                    <div className="flex flex-column align-items-center py-5">
                        <i className="pi pi-spin pi-spinner text-3xl text-primary mb-3" />
                        <span className="text-sm text-color-secondary">Mencari data pelacakan berkas...</span>
                    </div>
                )}

                {!state.trackingLoad && state.trackingResult && (
                    <div className="surface-card border-1 border-200 border-round-xl p-4 flex flex-column gap-3 text-sm shadow-1">
                        <div className="flex justify-content-between align-items-center pb-2 border-bottom-1 surface-border">
                            <div>
                                <span className="font-extrabold text-lg text-900 block">{state.trackingResult.document.nomor_dokumen}</span>
                                <span className="text-xs text-color-secondary block mt-1">{state.trackingResult.document.kode_dokumen}</span>
                            </div>
                            <Tag
                                value={state.trackingResult.is_currently_borrowed ? 'SEDANG DIPINJAM' : 'TERSEDIA'}
                                severity={state.trackingResult.is_currently_borrowed ? 'warning' : 'success'}
                                icon={state.trackingResult.is_currently_borrowed ? 'pi pi-exclamation-circle' : 'pi pi-check-circle'}
                                className="px-3 py-1 font-semibold text-xs border-round-md" />
                        </div>

                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <span className="text-color-secondary font-bold text-xs uppercase" style={{ letterSpacing: '0.05em' }}>Nama Dokumen</span>
                                <span className="text-900 font-medium">{state.trackingResult.document.nama_dokumen}</span>
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <span className="text-color-secondary font-bold text-xs uppercase" style={{ letterSpacing: '0.05em' }}>Kategori & Kerahasiaan</span>
                                <span className="text-900 font-medium">
                                    {state.trackingResult.document.nama_kategori_dokumen || '-'} ({state.trackingResult.document.nama_tingkat_kerahasiaan || '-'})
                                </span>
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1 mt-2">
                                <span className="text-color-secondary font-bold text-xs uppercase" style={{ letterSpacing: '0.05em' }}>PIC Dokumen</span>
                                <span className="text-900 font-medium">{state.trackingResult.document.nama_pic}</span>
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1 mt-2">
                                <span className="text-color-secondary font-bold text-xs uppercase" style={{ letterSpacing: '0.05em' }}>Berkas Elektronik (PDF)</span>
                                {state.trackingResult.latest_version ? (
                                    <div className="flex align-items-center gap-2 mt-1">
                                        <i className="pi pi-file-pdf text-red-500 text-lg" />
                                        <a
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleFetchPreviewUrl(state.trackingResult.latest_version.file_path);
                                            }}
                                            className="text-primary font-semibold hover:underline">
                                            Versi {state.trackingResult.latest_version.nomor_versi} (Pratinjau)
                                        </a>
                                    </div>
                                ) : (
                                    <span className="text-color-secondary">Belum mengunggah berkas</span>
                                )}
                            </div>
                        </div>

                        {state.trackingResult.is_currently_borrowed && state.trackingResult.active_loan && (
                            <div className="bg-orange-50 border-round-xl p-3 border-1 border-orange-200 mt-2">
                                <div className="font-bold text-orange-800 mb-2 flex align-items-center gap-2">
                                    <i className="pi pi-info-circle" />
                                    Informasi Peminjaman Aktif
                                </div>
                                <div className="grid text-xs text-orange-900">
                                    <div className="col-6">
                                        <span className="font-semibold block">Nama Peminjam:</span>
                                        <span>{state.trackingResult.active_loan.nama_peminjam}</span>
                                    </div>
                                    <div className="col-6">
                                        <span className="font-semibold block">Tanggal Pinjam:</span>
                                        <span>{formatDateCalendar(state.trackingResult.active_loan.tanggal_pinjam)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Divider className="my-2" />

                        {/* Update Physical Location Panel */}
                        <div className="flex flex-column gap-2">
                            <span className="font-bold text-900 text-sm flex align-items-center gap-2">
                                <i className="pi pi-map-marker text-primary" />
                                Pembaruan Lokasi Penyimpanan Fisik (Rak / Lemari)
                            </span>
                            <div className="p-inputgroup mt-1">
                                <InputText
                                    id="lokasi_fisik_update"
                                    defaultValue={state.trackingResult.document.lokasi_fisik || ''}
                                    placeholder="Contoh: Lemari A, Rak 3, Baris 2"
                                    className="text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            handleUpdateLocation(state.trackingResult.document.id_dokumen, val);
                                        }
                                    }} />
                                <Button icon="pi pi-save"
                                    label="Simpan Lokasi"

                                    loading={state.updatingLocation}
                                    onClick={() => {
                                        const el = document.getElementById('lokasi_fisik_update') as HTMLInputElement;
                                        if (el) {
                                            handleUpdateLocation(state.trackingResult.document.id_dokumen, el.value);
                                        }
                                    }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    </>
}

export default Table
