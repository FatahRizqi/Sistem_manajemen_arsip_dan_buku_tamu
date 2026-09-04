import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { FileUpload } from 'primereact/fileupload';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { RegistrasiFormData } from '@/app/(main)/buku_tamu/registrasi/components/interfaces';
import SignaturePad from './SignaturePad';

interface FormProps {
    formData: RegistrasiFormData;
    handleChange: (field: string, value: any) => void;
    setIdentityFile: (file: File | null) => void;
    setSelfieFile: (file: File | null) => void;
    identityFile: File | null;
    selfieFile: File | null;
    visitPurposeOptions: any[];
    hostUserOptions: any[];
    branchOptions?: any[];
    loading: boolean;
    disableBranchSelect?: boolean;
    handleSubmit: (e: React.FormEvent) => void;
}

export default function RegistrasiForm({ 
    formData, 
    handleChange, 
    setIdentityFile, 
    setSelfieFile, 
    identityFile,
    selfieFile,
    visitPurposeOptions, 
    hostUserOptions, 
    branchOptions = [], 
    loading, 
    disableBranchSelect, 
    handleSubmit 
}: FormProps) {
    const identityTypes = [
        { label: 'KTP', value: 'ktp' },
        { label: 'SIM', value: 'sim' },
        { label: 'Paspor', value: 'paspor' }
    ];

    const [activeIndex, setActiveIndex] = useState(0);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [identityPreview, setIdentityPreview] = useState<string | null>(null);

    useEffect(() => {
        if (selfieFile) {
            const objectUrl = URL.createObjectURL(selfieFile);
            setSelfiePreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setSelfiePreview(null);
        }
    }, [selfieFile]);

    useEffect(() => {
        if (identityFile) {
            const objectUrl = URL.createObjectURL(identityFile);
            setIdentityPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setIdentityPreview(null);
        }
    }, [identityFile]);

    const openCamera = async () => {
        setIsCameraOpen(true);
        setTimeout(async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert("Kamera tidak didukung di browser ini.");
                    setIsCameraOpen(false);
                    return;
                }
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 }
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Gagal mengakses kamera:", err);
                alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
                setIsCameraOpen(false);
            }
        }, 100);
    };

    const closeCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setSelfieFile(file);
                    }
                }, 'image/jpeg', 0.95);
            }
        }
        closeCamera();
    };

    return (
        <div className="card shadow-2 border-round-xl p-4 bg-white mb-4">
            {/* Header Banner */}
            <div className="flex align-items-center justify-content-between mb-4 border-bottom-1 surface-border pb-3">
                <div>
                    <h2 className="text-xl font-bold text-900 m-0">Registrasi Kunjungan Tamu Baru</h2>
                    <p className="text-color-secondary text-sm m-0 mt-1">
                        Daftarkan kunjungan tamu baru lengkap dengan data identitas, foto selfie, pegawai tujuan, serta tanda tangan.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        type="button" 
                        icon="pi pi-external-link" 
                        label="Halaman Visitor (Publik)" 
                        severity="info" 
                        outlined 
                        size="small"
                        onClick={() => window.open('/visitor/booking', '_blank')} 
                    />
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    {/* TAB 1: INFORMASI TAMU & IDENTITAS */}
                    <TabPanel header="Informasi Tamu & Identitas" leftIcon="pi pi-user mr-2">
                        <div className="pt-2 pb-1 px-1">
                            <h4 className="font-bold text-900 mb-1">Informasi Identitas & Kontak Tamu</h4>
                            <p className="text-color-secondary text-sm mb-3">Data diri lengkap tamu, kontak aktif, foto identitas, selfie, serta tanda tangan digital.</p>

                            <div className="grid p-fluid">
                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="guest_name" className="font-semibold text-sm">
                                        Nama Lengkap Tamu <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <InputText 
                                        id="guest_name" 
                                        value={formData.guest_name || ''} 
                                        onChange={(e) => handleChange('guest_name', e.target.value)} 
                                        placeholder="Contoh: Budi Santoso" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="phone_number" className="font-semibold text-sm">
                                        Nomor Telepon / WhatsApp <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <InputText 
                                        id="phone_number" 
                                        value={formData.phone_number || ''} 
                                        onChange={(e) => handleChange('phone_number', e.target.value)} 
                                        placeholder="Contoh: 081234567890" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="guest_email" className="font-semibold text-sm">
                                        Email Tamu
                                    </label>
                                    <InputText 
                                        id="guest_email" 
                                        value={formData.guest_email || ''} 
                                        onChange={(e) => handleChange('guest_email', e.target.value)} 
                                        placeholder="Contoh: tamu@perusahaan.com" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="guest_company" className="font-semibold text-sm">
                                        Instansi / Perusahaan
                                    </label>
                                    <InputText 
                                        id="guest_company" 
                                        value={formData.guest_company || ''} 
                                        onChange={(e) => handleChange('guest_company', e.target.value)} 
                                        placeholder="Contoh: PT Sumber Alam" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-4 md:col-2 flex flex-column gap-1 mb-2">
                                    <label htmlFor="identity_type" className="font-semibold text-sm">Jenis ID</label>
                                    <Dropdown 
                                        id="identity_type" 
                                        value={formData.identity_type} 
                                        options={identityTypes} 
                                        onChange={(e) => handleChange('identity_type', e.value)} 
                                        placeholder="Pilih" 
                                        showClear 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-8 md:col-4 flex flex-column gap-1 mb-2">
                                    <label htmlFor="identity_number" className="font-semibold text-sm">Nomor ID / KTP</label>
                                    <InputText 
                                        id="identity_number" 
                                        value={formData.identity_number || ''} 
                                        onChange={(e) => handleChange('identity_number', e.target.value)} 
                                        placeholder="Contoh: 3171234567890001" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label className="font-semibold text-sm">Unggah Foto Identitas (KTP/SIM)</label>
                                    {identityPreview ? (
                                        <div className="flex flex-column align-items-center gap-2 p-3 surface-50 border-round-lg border-1 border-200">
                                            <img 
                                                src={identityPreview} 
                                                alt="Identity Preview" 
                                                className="border-round-lg shadow-2"
                                                style={{ maxWidth: '100%', maxHeight: '130px', objectFit: 'contain' }} 
                                            />
                                            <Button 
                                                type="button" 
                                                label="Hapus Foto Identitas" 
                                                icon="pi pi-trash" 
                                                className="p-button-danger p-button-text p-button-sm mt-1"
                                                onClick={() => setIdentityFile(null)} 
                                            />
                                        </div>
                                    ) : (
                                        <FileUpload 
                                            mode="basic" 
                                            accept="image/*" 
                                            maxFileSize={2000000} 
                                            onSelect={(e) => setIdentityFile(e.files[0])} 
                                            chooseLabel="Pilih File Foto KTP/SIM" 
                                            className="w-full text-sm" 
                                        />
                                    )}
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label className="font-semibold text-sm">Foto Selfie Tamu</label>
                                    {selfiePreview ? (
                                        <div className="flex flex-column align-items-center gap-2 p-3 surface-50 border-round-lg border-1 border-200">
                                            <img 
                                                src={selfiePreview} 
                                                alt="Selfie Preview" 
                                                className="border-round-lg shadow-2"
                                                style={{ width: '130px', height: '130px', objectFit: 'cover' }} 
                                            />
                                            <div className="flex gap-2 mt-1">
                                                <Button 
                                                    type="button" 
                                                    label="Hapus Foto" 
                                                    icon="pi pi-trash" 
                                                    className="p-button-danger p-button-text p-button-sm"
                                                    onClick={() => setSelfieFile(null)} 
                                                />
                                                <Button 
                                                    type="button" 
                                                    label="Ambil Ulang" 
                                                    icon="pi pi-refresh" 
                                                    className="p-button-secondary p-button-text p-button-sm"
                                                    onClick={openCamera} 
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-column sm:flex-row gap-2">
                                            <Button 
                                                type="button" 
                                                label="Ambil Live Kamera" 
                                                icon="pi pi-camera" 
                                                className="p-button-outlined p-button-primary flex-1 p-button-sm"
                                                onClick={openCamera} 
                                            />
                                            <div className="flex-1 relative">
                                                <FileUpload 
                                                    mode="basic" 
                                                    accept="image/*" 
                                                    maxFileSize={2000000} 
                                                    onSelect={(e) => setSelfieFile(e.files[0])} 
                                                    chooseLabel="Unggah File Foto" 
                                                    className="w-full text-sm p-button-sm" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="col-12 flex flex-column gap-1 mb-2">
                                    <SignaturePad 
                                        value={formData.signature_data}
                                        onChange={(val) => handleChange('signature_data', val)} 
                                    />
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    {/* TAB 2: TUJUAN KUNJUNGAN & DOKUMEN */}
                    <TabPanel header="Tujuan Kunjungan & Pegawai" leftIcon="pi pi-building mr-2">
                        <div className="pt-2 pb-1 px-1">
                            <h4 className="font-bold text-900 mb-1">Detail Kantor, Tujuan & Pegawai yang Dituju</h4>
                            <p className="text-color-secondary text-sm mb-3">Pilih cabang tujuan, pegawai yang ditemui, jenis kunjungan, serta rencana kedatangan.</p>

                            <div className="grid p-fluid">
                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="id_cabang" className="font-semibold text-sm">
                                        Kantor / Cabang Tujuan <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Dropdown 
                                        id="id_cabang" 
                                        value={formData.id_cabang} 
                                        options={branchOptions} 
                                        optionLabel="name" 
                                        optionValue="id" 
                                        optionGroupLabel="label" 
                                        optionGroupChildren="items" 
                                        onChange={(e) => handleChange('id_cabang', e.value)} 
                                        placeholder="Pilih Kantor / Cabang Tujuan" 
                                        disabled={disableBranchSelect} 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="visit_purpose_id" className="font-semibold text-sm">
                                        Tujuan Kunjungan <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Dropdown 
                                        id="visit_purpose_id" 
                                        value={formData.visit_purpose_id} 
                                        options={visitPurposeOptions} 
                                        optionLabel="name" 
                                        optionValue="id" 
                                        onChange={(e) => handleChange('visit_purpose_id', e.value)} 
                                        placeholder="Pilih Tujuan Kunjungan" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="visit_type" className="font-semibold text-sm">
                                        Tipe Kunjungan <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Dropdown
                                        id="visit_type"
                                        value={formData.visit_type || 'personal'}
                                        options={[
                                            { label: 'Personal (Individu)', value: 'personal' },
                                            { label: 'Group (Rombongan)', value: 'group' }
                                        ]}
                                        onChange={(e) => handleChange('visit_type', e.value)}
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="check_in_time" className="font-semibold text-sm">
                                        Rencana Waktu Kedatangan <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="check_in_time"
                                        value={formData.check_in_time instanceof Date ? new Date(formData.check_in_time.getTime() - formData.check_in_time.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            handleChange('check_in_time', val ? new Date(val) : null);
                                        }}
                                        className="p-inputtext p-component w-full"
                                        style={{ 
                                            padding: '0.429rem 0.75rem', 
                                            borderRadius: '6px', 
                                            border: '1px solid #ced4da',
                                            minHeight: '38px',
                                            fontSize: '0.875rem'
                                        }} 
                                    />
                                </div>

                                {formData.visit_type === 'group' && (
                                    <div className="col-12 flex flex-column gap-3 mt-2 border-top-1 border-300 pt-3 mb-2">
                                        <div className="flex justify-content-between align-items-center mb-2">
                                            <span className="font-semibold text-color text-sm">Daftar Anggota Rombongan</span>
                                            <Button 
                                                type="button"
                                                label="Tambah Anggota"
                                                icon="pi pi-plus"
                                                className="p-button-outlined p-button-sm py-1 px-2 text-xs"
                                                onClick={() => {
                                                    const currentMembers = formData.group_members || [];
                                                    const updated = [...currentMembers, { name: '', phone: '', idNumber: '', identityFile: null }];
                                                    handleChange('group_members', updated);
                                                    handleChange('guest_count', updated.length + 1);
                                                }} 
                                            />
                                        </div>

                                        {(formData.group_members || []).map((member, index) => (
                                            <div key={index} className="p-3 surface-50 border-round-lg border-1 border-200 flex flex-column gap-2 mb-2 relative">
                                                <Button 
                                                    type="button"
                                                    icon="pi pi-times"
                                                    className="p-button-rounded p-button-text p-button-danger absolute p-1 text-xs"
                                                    style={{ top: '8px', right: '8px', width: '24px', height: '24px' }}
                                                    onClick={() => {
                                                        const currentMembers = formData.group_members || [];
                                                        const updated = currentMembers.filter((_, i) => i !== index);
                                                        handleChange('group_members', updated);
                                                        handleChange('guest_count', updated.length + 1);
                                                    }} 
                                                />
                                                <div className="font-semibold text-xs text-600 mb-1 flex align-items-center gap-2">
                                                    <span>Anggota #{index + 1}</span>
                                                    <Button 
                                                        type="button"
                                                        label="Salin dari Tamu Utama"
                                                        className="p-button-text p-button-sm p-0 text-xs font-medium text-primary hover:underline ml-2"
                                                        style={{ height: 'auto', minWidth: 'auto' }}
                                                        onClick={() => {
                                                            const currentMembers = [...(formData.group_members || [])];
                                                            currentMembers[index] = {
                                                                ...currentMembers[index],
                                                                name: formData.guest_name,
                                                                phone: formData.phone_number,
                                                                idNumber: formData.identity_number,
                                                            };
                                                            handleChange('group_members', currentMembers);
                                                        }} 
                                                    />
                                                </div>
                                                <div className="grid">
                                                    <div className="col-12 md:col-4 field m-0">
                                                        <label className="text-xs font-semibold mb-1 block">Nama Lengkap</label>
                                                        <InputText
                                                            value={member.name}
                                                            onChange={(e) => {
                                                                const currentMembers = [...(formData.group_members || [])];
                                                                currentMembers[index].name = e.target.value;
                                                                handleChange('group_members', currentMembers);
                                                            }}
                                                            placeholder="Nama lengkap"
                                                            className="p-inputtext-sm w-full" 
                                                        />
                                                    </div>
                                                    <div className="col-12 md:col-4 field m-0">
                                                        <label className="text-xs font-semibold mb-1 block">No. HP (Opsional)</label>
                                                        <InputText
                                                            value={member.phone}
                                                            onChange={(e) => {
                                                                const currentMembers = [...(formData.group_members || [])];
                                                                currentMembers[index].phone = e.target.value;
                                                                handleChange('group_members', currentMembers);
                                                            }}
                                                            placeholder="No. HP"
                                                            className="p-inputtext-sm w-full" 
                                                        />
                                                    </div>
                                                    <div className="col-12 md:col-4 field m-0">
                                                        <label className="text-xs font-semibold mb-1 block">No. ID / KTP (Opsional)</label>
                                                        <InputText
                                                            value={member.idNumber}
                                                            onChange={(e) => {
                                                                const currentMembers = [...(formData.group_members || [])];
                                                                currentMembers[index].idNumber = e.target.value;
                                                                handleChange('group_members', currentMembers);
                                                            }}
                                                            placeholder="No. ID"
                                                            className="p-inputtext-sm w-full" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="field m-0 mt-2">
                                                    <label className="text-xs font-semibold mb-1 block">Foto KTP/SIM (Opsional)</label>
                                                    <FileUpload
                                                        mode="basic"
                                                        accept="image/*"
                                                        maxFileSize={2000000}
                                                        onSelect={(e) => {
                                                            const currentMembers = [...(formData.group_members || [])];
                                                            currentMembers[index].identityFile = e.files[0];
                                                            handleChange('group_members', currentMembers);
                                                        }}
                                                        chooseLabel={member.identityFile ? member.identityFile.name : "Pilih Foto KTP"}
                                                        className="w-full text-xs" 
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        <div className="field">
                                            <label htmlFor="guest_count" className="font-semibold block mb-2 text-sm text-800">
                                                Total Jumlah Tamu (Orang) <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <InputText
                                                id="guest_count"
                                                type="number"
                                                readOnly
                                                disabled
                                                value={String(formData.guest_count || 1)}
                                                className="p-inputtext-sm bg-gray-100" 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="host_user_id" className="font-semibold text-sm">Pegawai yang Ditemui (Internal)</label>
                                    <Dropdown 
                                        id="host_user_id" 
                                        value={formData.host_user_id} 
                                        options={hostUserOptions} 
                                        optionLabel="nama_lengkap" 
                                        optionValue="id_pengguna" 
                                        onChange={(e) => handleChange('host_user_id', e.value)} 
                                        placeholder="Cari & pilih pegawai internal" 
                                        filter 
                                        showClear 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                                    <label htmlFor="host_name" className="font-semibold text-sm">Nama Pegawai Manual</label>
                                    <InputText 
                                        id="host_name" 
                                        value={formData.host_name || ''} 
                                        onChange={(e) => handleChange('host_name', e.target.value)} 
                                        placeholder="Isi manual jika tidak terdaftar di sistem" 
                                        className="w-full" 
                                    />
                                </div>

                                <div className="col-12 flex flex-column gap-1 mb-2">
                                    <label htmlFor="visit_notes" className="font-semibold text-sm">Catatan Kunjungan / Keperluan</label>
                                    <InputTextarea 
                                        id="visit_notes" 
                                        value={formData.visit_notes || ''} 
                                        onChange={(e) => handleChange('visit_notes', e.target.value)} 
                                        rows={4} 
                                        placeholder="Tuliskan poin pembahasan atau keperluan khusus..." 
                                        autoResize 
                                        className="w-full" 
                                    />
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>

                {/* Footer Action Buttons */}
                <div className="flex align-items-center justify-content-between mt-5 pt-3 border-top-1 surface-border">
                    <Button
                        type="button"
                        label="Reset Form"
                        icon="pi pi-refresh"
                        className="p-button-outlined p-button-secondary"
                        onClick={() => handleChange('reset', null)}
                    />

                    <div className="flex gap-2">
                        {activeIndex > 0 && (
                            <Button
                                type="button"
                                label="Kembali"
                                icon="pi pi-arrow-left"
                                className="p-button-outlined p-button-secondary"
                                onClick={() => setActiveIndex(activeIndex - 1)}
                            />
                        )}

                        {activeIndex === 0 && (
                            <Button
                                type="button"
                                label="Selanjutnya"
                                icon="pi pi-arrow-right"
                                iconPos="right"
                                className="p-button-primary px-4"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveIndex(1);
                                }}
                            />
                        )}

                        {activeIndex > 0 && (
                            <Button
                                type="submit"
                                label="Simpan & Check-In"
                                icon="pi pi-check"
                                className="p-button-primary px-4"
                                loading={loading}
                                disabled={loading}
                            />
                        )}
                    </div>
                </div>
            </form>

            {/* Modal Live Camera */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-camera text-primary text-xl" />
                        <span className="font-bold text-900">Kamera Selfie Live</span>
                    </div>
                }
                visible={isCameraOpen}
                modal
                style={{ width: '95vw', maxWidth: '480px' }}
                onHide={closeCamera}
                className="border-round-2xl overflow-hidden"
                pt={{
                    root: { className: 'border-round-2xl shadow-6' },
                    header: { className: 'surface-50 border-bottom-1 surface-border py-3 px-4' },
                    content: { className: 'p-4 flex flex-column align-items-center' }
                }}
            >
                <div className="relative w-full aspect-video border-round-xl overflow-hidden bg-black shadow-inner mb-4">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }} 
                    />
                </div>
                
                <div className="flex gap-3 w-full">
                    <Button 
                        type="button" 
                        label="Ambil Foto" 
                        icon="pi pi-camera" 
                        className="flex-1 py-2 font-semibold text-sm border-round-lg text-white" 
                        style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%)', border: 'none' }}
                        onClick={capturePhoto} 
                    />
                </div>
            </Dialog>
        </div>
    );
}
