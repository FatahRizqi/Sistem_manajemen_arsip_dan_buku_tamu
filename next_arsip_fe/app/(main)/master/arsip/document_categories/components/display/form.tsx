"use client";
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';

const Form = ({ state, setState, formik, handleDelete }: any) => {
    const isDialogVisible = state.add || state.edit;
    const isFormFieldInvalid = (name: string) => !!(formik?.touched && formik.touched[name] && formik?.errors && formik.errors[name]);
    const getFormErrorMessage = (name: string) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik.errors[name] as string}</small> : null;
    };

    const hideDialog = () => {
        setState((p: any) => ({ ...p, add: false, edit: false, delete: false }));
        formik.resetForm();
    };

    const deleteFooterTemplate = (
        <div className="flex justify-content-center gap-2">
            <Button type="button" label="Batal" icon="pi pi-times" className="p-button-outlined p-button-secondary" onClick={hideDialog} />
            <Button type="button" label="Ya, Hapus" icon="pi pi-trash" severity="danger" loading={state?.load} disabled={state?.load} onClick={handleDelete} />
        </div>
    );

    return (
        <>
            <Dialog visible={isDialogVisible} style={{ width: '450px' }} breakpoints={{ '960px': '75vw', '641px': '90vw' }} header={state.add ? 'Tambah Kategori Dokumen' : 'Ubah Kategori Dokumen'} modal onHide={hideDialog}>
                <form onSubmit={formik?.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_klasifikasi" className="text-sm">Klasifikasi Arsip</label>
                        <Dropdown 
                            id="kode_klasifikasi" 
                            name="kode_klasifikasi" 
                            value={formik?.values.kode_klasifikasi} 
                            options={state.classifications.filter((item: any) => item.status === 'active' || item.kode_klasifikasi === formik?.values.kode_klasifikasi).map((item: any) => ({
                                label: `${item.kode_klasifikasi} - ${item.nama_klasifikasi}`,
                                value: item.kode_klasifikasi
                            }))} 
                            onChange={formik?.handleChange} 
                            className={isFormFieldInvalid('kode_klasifikasi') ? 'p-invalid w-full' : 'w-full'} 
                            placeholder="Pilih Klasifikasi Arsip"
                            filter />
                        {getFormErrorMessage('kode_klasifikasi')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_kategori_dokumen" className="text-sm">Kode Kategori</label>
                        <InputText id="kode_kategori_dokumen" name="kode_kategori_dokumen" value={formik?.values.kode_kategori_dokumen} onChange={formik?.handleChange} className={isFormFieldInvalid('kode_kategori_dokumen') ? 'p-invalid w-full' : 'w-full'} placeholder="Contoh: ADM-UMUM, KEU-TRANS" />
                        {getFormErrorMessage('kode_kategori_dokumen')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="nama_kategori_dokumen" className="text-sm">Nama Kategori</label>
                        <InputText id="nama_kategori_dokumen" name="nama_kategori_dokumen" value={formik?.values.nama_kategori_dokumen} onChange={formik?.handleChange} className={isFormFieldInvalid('nama_kategori_dokumen') ? 'p-invalid w-full' : 'w-full'} placeholder="Contoh: Administrasi Umum, Keuangan Transaksi" />
                        {getFormErrorMessage('nama_kategori_dokumen')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="deskripsi" className="text-sm">Deskripsi</label>
                        <InputText id="deskripsi" name="deskripsi" value={formik?.values.deskripsi} onChange={formik?.handleChange} className={isFormFieldInvalid('deskripsi') ? 'p-invalid w-full' : 'w-full'} placeholder="Keterangan singkat kategori dokumen" />
                        {getFormErrorMessage('deskripsi')}
                    </div>

                    <div className="mt-2">
                        <Button type="submit" label={state?.edit ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={state?.load} disabled={state?.load} />
                    </div>
                </form>
            </Dialog>

            <Dialog header="Konfirmasi Hapus" visible={state.delete} onHide={hideDialog} modal style={{ width: '25rem' }} footer={deleteFooterTemplate}>
                <div className="flex flex-column align-items-center text-center gap-4 py-4">
                    <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
                    <div>
                        <h3 className="font-bold mb-2">Hapus data ini?</h3>
                        <p className="text-color-secondary">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                </div>
            </Dialog>
        </>
    );
};
export default Form;
