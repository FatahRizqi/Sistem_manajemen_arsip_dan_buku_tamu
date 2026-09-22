"use client";
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { TableProps } from '../interfaces';

const Form = ({ state, setState, formik, handleDelete, handleSave }: any) => {
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
            <Button label="Batal" icon="pi pi-times" severity="secondary" outlined onClick={hideDialog} disabled={state.load} />
            <Button type="button" label="Ya, Hapus" icon="pi pi-trash" severity="danger" loading={state?.load} disabled={state?.load} onClick={handleDelete} />
        </div>
    );
            return (
        <>
            <Dialog visible={isDialogVisible} style={{ width: '450px' }} breakpoints={{ '960px': '75vw', '641px': '90vw' }} header={state.add ? 'Tambah Data' : 'Ubah Data'} modal onHide={hideDialog}>
                <form onSubmit={formik?.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="kode_cabang" className="text-sm">Kode Cabang</label>
                            <InputText id="kode_cabang" name="kode_cabang" value={formik?.values.kode_cabang}  onChange={formik?.handleChange} className={isFormFieldInvalid('kode_cabang') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('kode_cabang')}
                        </div>
<div className="flex flex-column gap-2 w-full">
                            <label htmlFor="nama_cabang" className="text-sm">Nama Cabang</label>
                            <InputText id="nama_cabang" name="nama_cabang" value={formik?.values.nama_cabang}  onChange={formik?.handleChange} className={isFormFieldInvalid('nama_cabang') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('nama_cabang')}
                        </div>
                    <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="id_induk" className="text-sm">Induk Cabang (Opsional)</label>
                            <Dropdown 
                                id="id_induk" 
                                name="id_induk" 
                                value={formik?.values.id_induk} 
                                options={state.data.filter((b: any) => b.id_cabang !== formik?.values.id_cabang)} 
                                optionLabel="nama_cabang" 
                                optionValue="id_cabang" 
                                onChange={formik?.handleChange} 
                                placeholder="Pilih Induk Cabang (Kosongkan jika Cabang Utama)" 
                                showClear 
                                filter 
                                className={isFormFieldInvalid('id_induk') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('id_induk')}
                        </div>
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="alamat" className="text-sm">Alamat</label>
                            <InputTextarea 
                                id="alamat" 
                                name="alamat" 
                                value={formik?.values.alamat}  
                                onChange={formik?.handleChange} 
                                autoResize 
                                rows={3}
                                className={isFormFieldInvalid('alamat') ? 'p-invalid w-full' : 'w-full'} 
                            />
                            {getFormErrorMessage('alamat')}
                        </div>
                    <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="telepon" className="text-sm">Telepon</label>
                            <InputText id="telepon" name="telepon" value={formik?.values.telepon}  onChange={formik?.handleChange} className={isFormFieldInvalid('telepon') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('telepon')}
                        </div>
<div className="flex flex-column gap-2 w-full">
                            <label htmlFor="surel" className="text-sm">Surel</label>
                            <InputText id="surel" name="surel" value={formik?.values.surel}  onChange={formik?.handleChange} className={isFormFieldInvalid('surel') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('surel')}
                        </div>
                    <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="status" className="text-sm">Status</label>
                            <Dropdown id="status" name="status" value={formik?.values.status} options={[{label: "Aktif", value: "active"}, {label: "Nonaktif", value: "nonactive"}]} onChange={formik?.handleChange} className={isFormFieldInvalid('status') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('status')}
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
                        <p className="text-color-secondary">Data yang telah dihapus tidak dapat dikembalikan.</p>
                    </div>
                </div>
            </Dialog>
        </>
    );
};
export default Form;
