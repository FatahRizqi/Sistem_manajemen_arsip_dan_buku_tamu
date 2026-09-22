'use client'

import { showError } from "@/lib/tools/generalTools";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { FileUpload, FileUploadHandlerEvent } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";

import { useEffect, useState } from "react";
import { FormProps, initValue } from "../interfaces";

const statusOptions = [
    { label: "Baru", value: "baru" },
    { label: "Diproses", value: "diproses" },
    { label: "Didisposisi", value: "didisposisi" },
    { label: "Selesai", value: "selesai" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface LetterTypeOption {
    jenis_surat_id: number;
    kode_jenis_surat: string;
    nama_jenis_surat: string;
    arah_surat: string;
}

const Form = ({
    state,
    setState,
    formik,
    toast,
    getData,
    handleSave,
    handleDelete,
    getLetterTypeOptions
}: FormProps) => {
    const [letterTypeOptions, setLetterTypeOptions] = useState<LetterTypeOption[]>([]);

    const fetchLetterTypeOptions = async () => {
        if (getLetterTypeOptions) {
            const data = await getLetterTypeOptions();
            setLetterTypeOptions(data);
        }
    };

    const onSubmit = async (input: initValue) => {
        if (handleSave) {
            setState((p) => ({ ...p, load: true }));
            try {
                await handleSave(input);
            } finally {
                setState((p) => ({ ...p, load: false, submittedData: null }));
            }
        }
    };

    const onDelete = async () => {
        if (handleDelete) {
            setState((p) => ({ ...p, load: true }));
            try {
                await handleDelete();
            } finally {
                setState((p) => ({ ...p, load: false }));
            }
        }
    };

    const isFormFieldInvalid = (name: keyof initValue) => Boolean(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name)
            ? <small className="p-error flex align-items-center gap-1 mt-1"><i className="pi pi-exclamation-circle text-xs" />{formik?.errors[name] as string}</small>
            : null;
    };

    const deleteFooterTemplate = (
        <div className="flex mt-4 pt-3 border-top-1 surface-border">
            <Button label="Batal" icon="pi pi-times" severity="secondary" outlined onClick={() => setState((p: any) => ({ ...p, add: false, edit: false, delete: false }))}
                disabled={state.load} />
            <Button label="Ya, Hapus" icon="pi pi-trash" severity="danger" onClick={onDelete} loading={state.load} />
        </div>
    );

    useEffect(() => {
        if (state.submittedData) onSubmit(state.submittedData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.submittedData]);

    useEffect(() => {
        fetchLetterTypeOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {/* ─── Add / Edit Dialog ─────────────────────────── */}
            <Dialog
                visible={state.add || state.edit}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${state.edit ? "pi-pencil" : "pi-envelope"} text-primary`} />
                        <span className="font-bold text-900">{state.edit ? "Edit Surat Masuk" : "Tambah Surat Masuk"}</span>
                    </div>
                }
                modal
                style={{ width: "60rem", maxWidth: "95vw" }}
                onHide={() => { setState((p: any) => ({ ...p, add: false, edit: false, delete: false })); formik.resetForm(); }}
                pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
                <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                    <div className="grid">
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="nomor_agenda" className="text-sm">
                                Nomor Agenda {state.edit && <span className="text-red-500">*</span>}
                            </label>
                            <InputText
                                id="nomor_agenda"
                                className={`w-full ${isFormFieldInvalid("nomor_agenda") ? "p-invalid" : ""}`}
                                value={state.edit ? formik.values.nomor_agenda : "Otomatis saat disimpan"}
                                onChange={(e) => {
                                    if (state.edit) formik.setFieldValue("nomor_agenda", e.target.value);
                                }}
                                placeholder="AGD-2026-0001"
                                disabled={!state.edit} />
                            {getFormErrorMessage("nomor_agenda")}
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="nomor_surat" className="text-sm">Nomor Surat <span className="text-red-500">*</span></label>
                            <InputText
                                id="nomor_surat"
                                className={`w-full ${isFormFieldInvalid("nomor_surat") ? "p-invalid" : ""}`}
                                value={formik.values.nomor_surat}
                                onChange={(e) => formik.setFieldValue("nomor_surat", e.target.value)}
                                placeholder="Contoh: 001/MEN/VI/2024" />
                            {getFormErrorMessage("nomor_surat")}
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="tanggal_surat" className="text-sm">Tanggal Surat <span className="text-red-500">*</span></label>
                            <InputText
                                id="tanggal_surat" type="date"
                                className={`w-full ${isFormFieldInvalid("tanggal_surat") ? "p-invalid" : ""}`}
                                value={formik.values.tanggal_surat}
                                onChange={(e) => formik.setFieldValue("tanggal_surat", e.target.value)} />
                            {getFormErrorMessage("tanggal_surat")}
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="tanggal_diterima" className="text-sm">Tanggal Diterima <span className="text-red-500">*</span></label>
                            <InputText
                                id="tanggal_diterima" type="date"
                                className={`w-full ${isFormFieldInvalid("tanggal_diterima") ? "p-invalid" : ""}`}
                                value={formik.values.tanggal_diterima}
                                onChange={(e) => formik.setFieldValue("tanggal_diterima", e.target.value)} />
                            {getFormErrorMessage("tanggal_diterima")}
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="jenis_surat_id" className="text-sm">Jenis Surat <span className="text-red-500">*</span></label>
                            <Dropdown
                                id="jenis_surat_id"
                                className={`w-full ${isFormFieldInvalid("jenis_surat_id") ? "p-invalid" : ""}`}
                                value={formik.values.jenis_surat_id}
                                options={letterTypeOptions}
                                optionLabel="nama_jenis_surat"
                                optionValue="jenis_surat_id"
                                onChange={(e) => formik.setFieldValue("jenis_surat_id", e.value)}
                                onBlur={() => formik.setFieldTouched("jenis_surat_id", true)}
                                placeholder="Pilih jenis surat"
                                filter
                                showClear />
                            {getFormErrorMessage("jenis_surat_id")}
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="nama_pengirim" className="text-sm">Nama Pengirim <span className="text-red-500">*</span></label>
                            <InputText
                                id="nama_pengirim"
                                className={`w-full ${isFormFieldInvalid("nama_pengirim") ? "p-invalid" : ""}`}
                                value={formik.values.nama_pengirim}
                                onChange={(e) => formik.setFieldValue("nama_pengirim", e.target.value)}
                                placeholder="Nama pengirim surat" />
                            {getFormErrorMessage("nama_pengirim")}
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="instansi_pengirim" className="text-sm">Instansi Pengirim</label>
                            <InputText
                                id="instansi_pengirim"
                                className="w-full"
                                value={formik.values.instansi_pengirim}
                                onChange={(e) => formik.setFieldValue("instansi_pengirim", e.target.value)}
                                placeholder="Nama instansi / lembaga" />

                        </div>
                        <div className="col-12 flex flex-column gap-2">
                            <label htmlFor="perihal" className="text-sm">Perihal <span className="text-red-500">*</span></label>
                            <InputTextarea
                                id="perihal"
                                className={`w-full ${isFormFieldInvalid("perihal") ? "p-invalid" : ""}`}
                                value={formik.values.perihal}
                                onChange={(e) => formik.setFieldValue("perihal", e.target.value)}
                                placeholder="Perihal / pokok isi surat"
                                rows={3}
                                style={{ resize: "none" }} />
                            {getFormErrorMessage("perihal")}
                        </div>
                        <div className="col-12 flex flex-column gap-2">
                            <label htmlFor="keterangan_lampiran" className="text-sm">Keterangan Lampiran</label>
                            <InputTextarea
                                id="keterangan_lampiran"
                                className="w-full"
                                rows={2}
                                value={formik.values.keterangan_lampiran}
                                onChange={(e) => formik.setFieldValue("keterangan_lampiran", e.target.value)}
                                placeholder="Deskripsi lampiran surat (opsional)"
                                style={{ resize: "none" }} />

                        </div>

                        {/* File Upload */}
                        <div className="col-12 flex flex-column gap-2">
                            <label className="text-sm">Upload File Surat</label>
                            <FileUpload
                                name="file_surat"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                maxFileSize={MAX_FILE_SIZE}
                                mode="basic"
                                chooseLabel={formik.values.file_surat ? formik.values.file_surat.name : "Pilih File..."}
                                chooseOptions={{ icon: "pi pi-upload" }}
                                auto={false}
                                customUpload
                                uploadHandler={(e: FileUploadHandlerEvent) => {
                                    const file = e.files[0] || null;
                                    formik.setFieldValue("file_surat", file);
                                }}
                                onSelect={(e) => {
                                    const file = e.files[0] || null;
                                    if (file && file.size> MAX_FILE_SIZE) {
                                        showError(toast, "Ukuran file maksimal 10 MB");
                                        formik.setFieldValue("file_surat", null);
                                        return;
                                    }
                                    formik.setFieldValue("file_surat", file);
                                }}
                                className="w-full"
                                pt={{ basicButton: { className: "w-full justify-content-start" } }} />
                            <small className="text-color-secondary mt-1">PDF, Word, Excel, JPG, atau PNG · Maks. 10 MB</small>
                            {formik.values.file_surat && (
                                <div className="flex align-items-center gap-2 mt-1 p-2 surface-50 border-round border-1 surface-border">
                                    <i className="pi pi-file-check text-green-500" />
                                    <span className="text-xs text-900 font-semibold">{formik.values.file_surat.name}</span>
                                    <Button icon="pi pi-times" text severity="danger" className="ml-auto p-0"
                                        onClick={() => formik.setFieldValue("file_surat", null)} />
                                </div>
                            )}
                        </div>

                        {state.edit && (
                            <div className="col-12 md:col-6 flex flex-column gap-2">
                                <label htmlFor="status" className="text-sm">Status</label>
                                <Dropdown
                                    id="status"
                                    className="w-full"
                                    value={formik.values.status}
                                    options={statusOptions}
                                    onChange={(e) => formik.setFieldValue("status", e.value)} />
                                {getFormErrorMessage("status")}
                            </div>
                        )}
                    </div>

                    <div className="mt-2">
                        <Button type="submit" label={state?.edit ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={state?.load} disabled={state?.load} />
                    </div>
                </form>
            </Dialog>

            {/* ─── Delete Confirmation Dialog ──────────────────── */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-exclamation-triangle text-red-500" />
                        <span className="font-bold text-900">Konfirmasi Hapus</span>
                    </div>
                }
                visible={state.delete}
                onHide={() => setState((p: any) => ({ ...p, add: false, edit: false, delete: false }))}
                modal
                style={{ width: "26rem", maxWidth: "95vw" }}
                footer={deleteFooterTemplate}
                pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
                <div className="flex flex-column align-items-center text-center gap-3 py-4">
                    <div className="flex align-items-center justify-content-center border-circle bg-red-50 border-1 border-red-100" style={{ width: "4rem", height: "4rem" }}>
                        <i className="pi pi-trash text-red-500 text-2xl" />
                    </div>
                    <div>
                        <h4 className="font-bold text-900 m-0 mb-2 text-lg">
                            {state.selectedLetters.length> 1 ? `Hapus ${state.selectedLetters.length} surat?` : "Hapus surat ini?"}
                        </h4>
                        <p className="text-color-secondary text-sm m-0">
                            {state.selectedLetters.length> 1
                                ? `${state.selectedLetters.length} surat yang dipilih akan dihapus secara permanen.`
                                : <>Surat <strong>{state.selectedLetters[0]?.nomor_agenda || ""}</strong> akan dihapus secara permanen.</>
                            }
                        </p>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default Form;
