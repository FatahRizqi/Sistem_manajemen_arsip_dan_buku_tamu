'use client'

import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { FormProps, initValue } from "../interfaces";

const Form = ({
    state,
    setState,
    formik,
    handleGenerateAutoNumber,
}: FormProps) => {

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name)
            ? <small className="p-error flex align-items-center gap-1 mt-1"><i className="pi pi-exclamation-circle text-xs" />{formik?.errors[name]}</small>
            : null;
    };

    return (
        <Dialog
            visible={state.add || state.edit}
            header={
                <div className="flex align-items-center gap-2">
                    <i className={`pi ${state.edit ? 'pi-pencil' : 'pi-file-plus'} text-primary`} />
                    <span className="font-bold text-900">{state.edit ? 'Edit Dokumen Arsip' : 'Tambah Dokumen Arsip'}</span>
                </div>
            }
            modal
            style={{ width: '44rem', maxWidth: '95vw' }}
            onHide={() => { setState((p) => ({ ...p, add: false, edit: false })); formik?.resetForm(); }}
            pt={{ header: { className: 'border-bottom-1 surface-border pb-3' } }}>
            <form onSubmit={formik?.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">

                <div className="flex flex-column md:flex-row gap-3 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_klasifikasi" className="text-sm">
                            Klasifikasi Arsip <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="kode_klasifikasi"
                            value={formik.values.kode_klasifikasi}
                            options={state.classifications.map((item: any) => ({
                                label: `${item.kode_klasifikasi} - ${item.nama_klasifikasi}`,
                                value: item.kode_klasifikasi
                            }))}
                            onChange={(e) => {
                                formik.setFieldValue('kode_klasifikasi', e.value);
                                formik.setFieldValue('kode_kategori_dokumen', '');
                                formik.setFieldValue('kode_retensi', '');
                            }}
                            placeholder="Pilih Klasifikasi"
                            className={`w-full ${isFormFieldInvalid('kode_klasifikasi') ? 'p-invalid' : ''}`}
                            filter />
                        {getFormErrorMessage('kode_klasifikasi')}
                    </div>
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_jenis_dokumen" className="text-sm">
                            Jenis Dokumen <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="kode_jenis_dokumen"
                            value={formik.values.kode_jenis_dokumen}
                            options={state.documentTypes.map((item: any) => ({
                                label: `${item.kode_jenis_dokumen} - ${item.nama_jenis_dokumen}`,
                                value: item.kode_jenis_dokumen
                            }))}
                            onChange={(e) => formik.setFieldValue('kode_jenis_dokumen', e.value)}
                            placeholder="Pilih Jenis Dokumen"
                            className={`w-full ${isFormFieldInvalid('kode_jenis_dokumen') ? 'p-invalid' : ''}`}
                            filter />
                        {getFormErrorMessage('kode_jenis_dokumen')}
                    </div>
                </div>

                <div className="flex flex-column md:flex-row gap-3 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_kategori_dokumen" className="text-sm">
                            Kategori Dokumen <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="kode_kategori_dokumen"
                            value={formik.values.kode_kategori_dokumen}
                            options={state.categories
                                .filter((item: any) => item.kode_klasifikasi === formik.values.kode_klasifikasi)
                                .map((item: any) => ({
                                    label: `${item.kode_kategori_dokumen} - ${item.nama_kategori_dokumen}`,
                                    value: item.kode_kategori_dokumen
                                }))}
                            onChange={(e) => {
                                formik.setFieldValue('kode_kategori_dokumen', e.value);
                                const matched = state.retentions?.find((item: any) => item.kode_kategori_dokumen === e.value);
                                if (matched) {
                                    formik.setFieldValue('kode_retensi', matched.kode_retensi);
                                } else {
                                    formik.setFieldValue('kode_retensi', '');
                                }
                                if (handleGenerateAutoNumber && !state.edit) {
                                    setTimeout(() => handleGenerateAutoNumber(), 150);
                                }
                            }}
                            placeholder={formik.values.kode_klasifikasi ? "Pilih Kategori" : "Pilih Klasifikasi Terlebih Dahulu"}
                            disabled={!formik.values.kode_klasifikasi}
                            className={`w-full ${isFormFieldInvalid('kode_kategori_dokumen') ? 'p-invalid' : ''}`}
                            filter />
                        {getFormErrorMessage('kode_kategori_dokumen')}
                        {state.retentions?.find((item: any) => item.kode_kategori_dokumen === formik.values.kode_kategori_dokumen) && (
                            <div className="text-xs text-primary mt-1 flex align-items-center gap-1 font-semibold">
                                <i className="pi pi-info-circle text-xs" />
                                <span>Retensi: {(() => {
                                    const ret = state.retentions.find((item: any) => item.kode_kategori_dokumen === formik.values.kode_kategori_dokumen);
                                    return `${ret.nama_retensi} (${ret.tahun_retensi} Thn - ${ret.tindakan_retensi === 'destroy' ? 'Musnahkan' : 'Tinjau'})`;
                                })()}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_tingkat_kerahasiaan" className="text-sm">
                            Tingkat Kerahasiaan <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="kode_tingkat_kerahasiaan"
                            value={formik.values.kode_tingkat_kerahasiaan}
                            options={state.confidentialities.map((item: any) => ({
                                label: item.nama_tingkat_kerahasiaan,
                                value: item.kode_tingkat_kerahasiaan
                            }))}
                            onChange={(e) => formik.setFieldValue('kode_tingkat_kerahasiaan', e.value)}
                            placeholder="Pilih Kerahasiaan"
                            className={`w-full ${isFormFieldInvalid('kode_tingkat_kerahasiaan') ? 'p-invalid' : ''}`} />
                        {getFormErrorMessage('kode_tingkat_kerahasiaan')}
                    </div>
                </div>

                <div className="flex flex-column gap-2 w-full">
                    <div className="flex justify-content-between align-items-center">
                        <label htmlFor="nomor_dokumen" className="text-sm">
                            Nomor Dokumen <span className="text-red-500">*</span>
                        </label>
                        {handleGenerateAutoNumber && !state.edit && (
                            <Button type="button"
                                label="Auto-Generate Nomor"
                                icon="pi pi-cog"
                                text
                                className="text-xs p-0 text-primary font-semibold hover:underline"
                                onClick={() => handleGenerateAutoNumber()} />
                        )}
                    </div>
                    <InputText
                        id="nomor_dokumen"
                        value={formik.values.nomor_dokumen}
                        onChange={(e) => formik.setFieldValue('nomor_dokumen', e.target.value)}
                        className={`w-full ${isFormFieldInvalid('nomor_dokumen') ? 'p-invalid' : ''}`}
                        placeholder="Contoh: JKT/ADM/KONTRAK/20260724/0001" />
                    {getFormErrorMessage('nomor_dokumen')}
                </div>

                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="nama_dokumen" className="text-sm">
                        Nama Dokumen <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="nama_dokumen"
                        value={formik.values.nama_dokumen}
                        onChange={(e) => formik.setFieldValue('nama_dokumen', e.target.value)}
                        className={`w-full ${isFormFieldInvalid('nama_dokumen') ? 'p-invalid' : ''}`}
                        placeholder="Masukkan nama lengkap dokumen" />
                    {getFormErrorMessage('nama_dokumen')}
                </div>

                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="tanggal" className="text-sm">
                        Tanggal Dokumen <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="tanggal"
                        type="date"
                        value={formik.values.tanggal}
                        onChange={(e) => formik.setFieldValue('tanggal', e.target.value)}
                        className={`w-full ${isFormFieldInvalid('tanggal') ? 'p-invalid' : ''}`} />
                    {getFormErrorMessage('tanggal')}
                </div>

                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="lokasi_fisik" className="text-sm">
                        Lokasi Fisik <span className="text-color-secondary font-normal">(Opsional)</span>
                    </label>
                    <InputText
                        id="lokasi_fisik"
                        value={formik.values.lokasi_fisik}
                        onChange={(e) => formik.setFieldValue('lokasi_fisik', e.target.value)}
                        placeholder="Contoh: Rak A, Baris 2"
                        className="w-full" />
                    {getFormErrorMessage('lokasi_fisik')}
                </div>



                {!state.edit && (
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="file" className="text-sm">
                            Upload Dokumen (PDF/Word) <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="file"
                            type="file"
                            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="p-inputtext w-full text-sm"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0] || null;
                                formik.setFieldValue('file', selectedFile);
                            }} />
                        {getFormErrorMessage('file')}
                    </div>
                )}

                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="nama_pic" className="text-sm">
                        Nama PIC <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="nama_pic"
                        value={formik.values.nama_pic}
                        disabled
                        className="w-full bg-gray-100"
                        placeholder="Mengambil data dari session..." />
                    {getFormErrorMessage('nama_pic')}
                </div>

                <div className="mt-2">
                    <Button type="submit" label={state?.edit ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={state?.load} disabled={state?.load} />
                </div>
            </form>
        </Dialog>
    );
}

export default Form
