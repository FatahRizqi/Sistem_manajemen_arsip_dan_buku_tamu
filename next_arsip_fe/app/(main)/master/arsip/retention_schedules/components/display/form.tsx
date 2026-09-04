"use client";
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { FormProps, initValue } from '../interfaces';

const Form = ({ state, setState, formik, handleDelete }: any) => {
    const isDialogVisible = state.add || state.edit;
    const isFormFieldInvalid = (name: string) => !!(formik?.touched && formik.touched[name] && formik?.errors && formik.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name)
            ? <small className="p-error flex align-items-center gap-1 mt-1"><i className="pi pi-exclamation-circle text-xs" />{formik.errors[name] as string}</small>
            : null;
    };

    const actionOptions = [
        { label: 'Musnahkan (Destroy)', value: 'destroy' },
        { label: 'Tinjau Kembali (Review)', value: 'review' }
    ];

    const hideDialog = () => {
        setState((p: any) => ({ ...p, add: false, edit: false, delete: false }));
        formik.resetForm();
    };

    const deleteFooterTemplate = (
        <div className="flex justify-content-center gap-2">
            <Button type="button" label="Batal" icon="pi pi-times" outlined onClick={hideDialog} className="p-button-secondary" />
            <Button type="button" label="Ya, Hapus" icon="pi pi-trash" severity="danger" loading={state?.load} disabled={state?.load} onClick={handleDelete} />
        </div>
    );

    return (
        <>
            <Dialog
                visible={isDialogVisible}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${state.edit ? 'pi-pencil' : 'pi-plus-circle'} text-primary`} />
                        <span className="font-bold text-900">{state.edit ? 'Edit Jadwal Retensi' : 'Tambah Jadwal Retensi'}</span>
                    </div>
                }
                modal
                style={{ width: '40rem', maxWidth: '95vw' }}
                onHide={hideDialog}
                pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
                <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                    
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_retensi" className="text-sm">
                            Kode Retensi <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="kode_retensi"
                            value={formik.values.kode_retensi}
                            onChange={(e) => formik.setFieldValue('kode_retensi', e.target.value.toUpperCase())}
                            className={`w-full ${isFormFieldInvalid('kode_retensi') ? 'p-invalid' : ''}`}
                            placeholder="Contoh: RET-ADM-05" />
                        {getFormErrorMessage('kode_retensi')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="nama_retensi" className="text-sm">
                            Nama Jadwal Retensi <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="nama_retensi"
                            value={formik.values.nama_retensi}
                            onChange={(e) => formik.setFieldValue('nama_retensi', e.target.value)}
                            className={`w-full ${isFormFieldInvalid('nama_retensi') ? 'p-invalid' : ''}`}
                            placeholder="Contoh: Retensi Administrasi 5 Tahun" />
                        {getFormErrorMessage('nama_retensi')}
                    </div>

                    <div className="flex flex-column md:flex-row gap-3 w-full">
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="kode_kategori_dokumen" className="text-sm">
                                Kategori Dokumen <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="kode_kategori_dokumen"
                                value={formik.values.kode_kategori_dokumen}
                                options={state.categories.filter((item: any) => item.status === 'active' || item.kode_kategori_dokumen === formik?.values.kode_kategori_dokumen).map((item: any) => ({
                                    label: `${item.kode_kategori_dokumen} - ${item.nama_kategori_dokumen}`,
                                    value: item.kode_kategori_dokumen
                                }))}
                                onChange={(e) => formik.setFieldValue('kode_kategori_dokumen', e.value)}
                                placeholder="Pilih Kategori Dokumen"
                                className={`w-full ${isFormFieldInvalid('kode_kategori_dokumen') ? 'p-invalid' : ''}`}
                                filter />
                            {getFormErrorMessage('kode_kategori_dokumen')}
                        </div>
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="tahun_retensi" className="text-sm">
                                Masa Retensi (Tahun) <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="tahun_retensi"
                                type="number"
                                value={formik.values.tahun_retensi === '' ? '' : String(formik.values.tahun_retensi)}
                                onChange={(e) => formik.setFieldValue('tahun_retensi', e.target.value === '' ? '' : Number(e.target.value))}
                                className={`w-full ${isFormFieldInvalid('tahun_retensi') ? 'p-invalid' : ''}`}
                                placeholder="Contoh: 5"
                                min={0} />
                            {getFormErrorMessage('tahun_retensi')}
                        </div>
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="tindakan_retensi" className="text-sm">
                            Tindakan Akhir Retensi <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="tindakan_retensi"
                            value={formik.values.tindakan_retensi}
                            options={actionOptions}
                            onChange={(e) => formik.setFieldValue('tindakan_retensi', e.value)}
                            placeholder="Pilih Tindakan Akhir"
                            className={`w-full ${isFormFieldInvalid('tindakan_retensi') ? 'p-invalid' : ''}`} />
                        {getFormErrorMessage('tindakan_retensi')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="deskripsi" className="text-sm">
                            Deskripsi
                        </label>
                        <InputTextarea
                            id="deskripsi"
                            value={formik.values.deskripsi}
                            onChange={(e) => formik.setFieldValue('deskripsi', e.target.value)}
                            rows={3}
                            className="w-full"
                            placeholder="Keterangan mengenai jadwal retensi..." />
                    </div>

                    <div className="flex justify-content-end gap-2 w-full">
                        <Button type="button" label="Batal" icon="pi pi-times" onClick={hideDialog} className="w-full p-button-secondary p-button-outlined" />
                        <Button type="submit" label={state?.edit ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={state?.load} disabled={state?.load} />
                    </div>
                </form>
            </Dialog>

            <Dialog header="Konfirmasi Hapus" visible={state.delete} onHide={hideDialog} modal style={{ width: '25rem' }} footer={deleteFooterTemplate}>
                <div className="flex flex-column align-items-center text-center gap-4 py-4">
                    <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
                    <div className="flex flex-column gap-2">
                        <span className="font-bold text-xl text-900">Peringatan!</span>
                        <span className="text-600 line-height-3">
                            Apakah Anda yakin ingin menghapus <b>{state.selectedData?.length}</b> data jadwal retensi yang dipilih? Tindakan ini tidak dapat dibatalkan.
                        </span>
                    </div>
                </div>
            </Dialog>
        </>
    );
};
export default Form;
