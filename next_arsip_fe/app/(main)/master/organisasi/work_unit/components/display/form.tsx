"use client";
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
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
                            <label htmlFor="id_divisi" className="text-sm">Divisi</label>
                            <Dropdown id="id_divisi" name="id_divisi" value={formik?.values.id_divisi} options={state?.masterData?.filter((d: any) => d.status === 'active' || d.id_divisi === formik?.values.id_divisi) || []} optionLabel="nama_divisi" optionValue="id_divisi" onChange={formik?.handleChange} placeholder="Pilih Divisi" filter showClear className={isFormFieldInvalid('id_divisi') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('id_divisi')}
                        </div>
                    <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="kode_unit_kerja" className="text-sm">Kode Unit Kerja</label>
                            <InputText id="kode_unit_kerja" name="kode_unit_kerja" value={formik?.values.kode_unit_kerja} onChange={formik?.handleChange} className={isFormFieldInvalid('kode_unit_kerja') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('kode_unit_kerja')}
                        </div>
                    <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="nama_unit_kerja" className="text-sm">Nama Unit Kerja</label>
                            <InputText id="nama_unit_kerja" name="nama_unit_kerja" value={formik?.values.nama_unit_kerja} onChange={formik?.handleChange} className={isFormFieldInvalid('nama_unit_kerja') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('nama_unit_kerja')}
                        </div>
                    
                    <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="deskripsi" className="text-sm">Deskripsi</label>
                            <InputText id="deskripsi" name="deskripsi" value={formik?.values.deskripsi} onChange={formik?.handleChange} className={isFormFieldInvalid('deskripsi') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('deskripsi')}
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
