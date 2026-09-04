'use client';

import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { TabView, TabPanel } from 'primereact/tabview';
import { useMemo, useState } from 'react';
import { initValue } from '../interfaces';

const statusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

const placeholderOptions = [
  '{{nomor_surat}}',
  '{{nomor_agenda}}',
  '{{tanggal_surat}}',
  '{{tanggal_kirim}}',
  '{{nama_jenis_surat}}',
  '{{tujuan}}',
  '{{instansi_tujuan}}',
  '{{perihal}}',
  '{{media_pengiriman}}',
  '{{isi_surat}}',
  '{{nama_pengirim}}',
  '{{jabatan}}',
];

const defaultReplyTemplate = `Nomor    : {{nomor_surat}}
Lampiran : -
Perihal  : {{perihal}}

Kepada Yth.
{{tujuan}}
{{instansi_tujuan}}
di Tempat

Dengan hormat,

{{isi_surat}}

Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.

Hormat kami,


{{nama_pengirim}}
{{jabatan}}`;

const Form = ({ state, setState, formik, handleDelete }: any) => {
  const letterTypeOptions = (state.letterTypes || []).filter((item: any) => item.status === 'active' || item.jenis_surat_id === formik.values.jenis_surat_id).map((item: any) => ({ label: item.nama_jenis_surat, value: item.jenis_surat_id }));

  const previewText = useMemo(() => {
    return (formik.values.isi_template || '').trim() || 'Isi template akan muncul di sini';
  }, [formik.values.isi_template]);

  const handleCancel = () => {
    setState((p: any) => ({ ...p, add: false, edit: false, delete: false, activeStep: 0 }));
    formik.resetForm();
  };

  const insertPlaceholder = (placeholder: string) => {
    const currentValue = formik.values.isi_template || '';
    formik.setFieldValue('isi_template', `${currentValue}${currentValue ? '\n' : ''}${placeholder}`);
  };

  const applyDefaultReplyTemplate = () => {
    formik.setFieldValue('isi_template', defaultReplyTemplate);
  };

  const getTabForField = (fieldName: string): number => {
    if (['kode_template', 'nama_template', 'jenis_surat_id', 'status', 'deskripsi'].includes(fieldName)) {
      return 0;
    }
    if (['isi_template'].includes(fieldName)) {
      return 1;
    }
    return 0;
  };

  const hasTabErrors = (tabIndex: number): boolean => {
    if (!formik || formik.submitCount === 0) return false;
    if (!formik?.errors) return false;
    const errorFields = Object.keys(formik.errors);
    return errorFields.some((field) => getTabForField(field) === tabIndex);
  };

  const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);
  const getFormErrorMessage = (name: keyof initValue) => {
    return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name] as string}</small> : null;
  };

  const deleteFooterTemplate = (
    <div className="flex justify-content-center gap-2">
      <Button type="button" label="Batal" icon="pi pi-times" className="p-button-outlined p-button-secondary" onClick={handleCancel} />
      <Button type="button" label="Ya, Hapus" icon="pi pi-trash" severity="danger" loading={state?.load} disabled={state?.load} onClick={handleDelete} />
    </div>
  );

  return (
    <>
      <Dialog 
        visible={state.add || state.edit} 
        onHide={handleCancel}
        header={state.edit ? 'Perubahan Template Surat' : 'Penambahan Template Surat Baru'}
        modal
        style={{ width: '60vw' }}
        breakpoints={{ '960px': '85vw', '641px': '100vw' }}
      >
        <p className="text-500 text-sm m-0 mb-4">
          Atur konfigurasi template surat lengkap dengan variabel placeholder dan editor isi surat.
        </p>
        <form onSubmit={formik.handleSubmit}>
        <div className="py-2">
          <TabView activeIndex={state.activeStep} onTabChange={(e) => setState((p: any) => ({ ...p, activeStep: e.index }))}>
            {/* TAB 0: INFORMASI DASAR */}
            <TabPanel
              header={
                <div className={`flex align-items-center gap-2 ${hasTabErrors(0) ? 'text-red-500' : ''}`}>
                  <i className="pi pi-info-circle"></i>
                  <span>Informasi Dasar</span>
                  {hasTabErrors(0) && <i className="pi pi-exclamation-circle text-red-500 animation-duration-300 fadein" style={{ fontSize: '0.95rem' }}></i>}
                </div>
              }
            >
              <div className="pt-4 pb-2 animation-duration-300 fadein">
                <div className="mb-3">
                  <h3 className="m-0 text-lg font-bold text-900">
                    Informasi Identitas Template
                  </h3>
                  <span className="text-sm text-500 mt-1 block">Kode unik, nama template, dan asosiasi jenis surat.</span>
                </div>

                <div className="grid formgrid p-fluid">
                  <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                    <label htmlFor="kode_template" className="font-bold text-xs text-700 uppercase tracking-wider">KODE TEMPLATE <span className="text-red-500">*</span></label>
                    <InputText id="kode_template" name="kode_template" placeholder="Contoh: TPL-UND-01" value={formik.values.kode_template} onChange={formik.handleChange} className={isFormFieldInvalid('kode_template') ? 'p-invalid w-full' : 'w-full'} />
                    {getFormErrorMessage('kode_template')}
                  </div>
                  
                  <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                    <label htmlFor="nama_template" className="font-bold text-xs text-700 uppercase tracking-wider">NAMA TEMPLATE <span className="text-red-500">*</span></label>
                    <InputText id="nama_template" name="nama_template" placeholder="Contoh: Template Undangan Resmi" value={formik.values.nama_template} onChange={formik.handleChange} className={isFormFieldInvalid('nama_template') ? 'p-invalid w-full' : 'w-full'} />
                    {getFormErrorMessage('nama_template')}
                  </div>

                  <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                    <label htmlFor="jenis_surat_id" className="font-bold text-xs text-700 uppercase tracking-wider">JENIS SURAT</label>
                    <Dropdown id="jenis_surat_id" name="jenis_surat_id" value={formik.values.jenis_surat_id} options={letterTypeOptions} onChange={(e) => formik.setFieldValue('jenis_surat_id', e.value)} placeholder="Pilih jenis surat" />
                  </div>

                  <div className="col-12 md:col-6 flex flex-column gap-1 mb-2">
                    <label htmlFor="status" className="font-bold text-xs text-700 uppercase tracking-wider">STATUS KEAKTIFAN <span className="text-red-500">*</span></label>
                    <Dropdown id="status" name="status" value={formik.values.status} options={statusOptions} onChange={formik.handleChange} />
                  </div>

                  <div className="col-12 flex flex-column gap-1 mb-2">
                    <label htmlFor="deskripsi" className="font-bold text-xs text-700 uppercase tracking-wider">DESKRIPSI</label>
                    <InputText id="deskripsi" name="deskripsi" placeholder="Keterangan peruntukan template" value={formik.values.deskripsi} onChange={formik.handleChange} className="w-full" />
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* TAB 1: EDITOR ISI & PLACEHOLDER */}
            <TabPanel
              header={
                <div className={`flex align-items-center gap-2 ${hasTabErrors(1) ? 'text-red-500' : ''}`}>
                  <i className="pi pi-file-edit"></i>
                  <span>Editor Isi & Placeholder</span>
                  {hasTabErrors(1) && <i className="pi pi-exclamation-circle text-red-500 animation-duration-300 fadein" style={{ fontSize: '0.95rem' }}></i>}
                </div>
              }
            >
              <div className="pt-4 pb-2 animation-duration-300 fadein">
                <div className="mb-3">
                  <h3 className="m-0 text-lg font-bold text-900">
                    Editor Isi Surat
                  </h3>
                  <span className="text-sm text-500 mt-1 block">Gunakan placeholder variabel untuk menghasilkan konten surat dinamis.</span>
                </div>

                <div className="flex flex-column gap-3">
                  <div className="flex flex-column gap-2">
                    <label className="font-bold text-xs text-700 uppercase tracking-wider">PLACEHOLDER VARIABEL</label>
                    <div className="flex flex-wrap gap-2">
                      {placeholderOptions.map((item) => (
                        <Button key={item} type="button" size="small" outlined severity="secondary" onClick={() => insertPlaceholder(item)} label={item} className="p-2 text-sm text-600 bg-white" />
                      ))}
                      <Button type="button" size="small" icon="pi pi-file-edit" label="Susunan Balasan Standard" onClick={applyDefaultReplyTemplate} className="p-button-primary p-2 text-sm" />
                    </div>
                  </div>

                  <div className="flex flex-column gap-2">
                    <label htmlFor="isi_template" className="font-bold text-xs text-700 uppercase tracking-wider">ISI TEMPLATE SURAT <span className="text-red-500">*</span></label>
                    <InputTextarea id="isi_template" name="isi_template" rows={10} value={formik.values.isi_template} onChange={formik.handleChange} className={isFormFieldInvalid('isi_template') ? 'p-invalid w-full' : 'w-full'} autoResize style={{ fontFamily: "monospace", fontSize: "14px" }} />
                    {getFormErrorMessage('isi_template')}
                  </div>

                  <div className="flex flex-column gap-2">
                    <label className="font-bold text-sm text-600 flex align-items-center gap-2 mb-1">
                      <i className="pi pi-eye text-blue-500"></i> Pratinjau Hasil Template
                    </label>
                    <div className="bg-white border-round p-3 border-1 surface-border">
                      <pre className="m-0 text-sm text-700" style={{ whiteSpace: 'pre-wrap', fontFamily: "Georgia, 'Times New Roman', serif" }}>{previewText}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabView>
        </div>

        <div className="mt-4 pt-4 border-top-1 surface-border flex justify-content-between align-items-center">
          <Button
            type="button"
            icon="pi pi-arrow-left"
            label="Kembali ke Daftar"
            outlined
            className="p-button-secondary text-sm"
            onClick={handleCancel}
          />
          {state.activeStep < 1 && (
            <Button
              type="button"
              label="Selanjutnya"
              icon="pi pi-arrow-right"
              iconPos="right"
              className="text-sm px-4 p-button-primary"
              onClick={(e) => {
                e.preventDefault();
                setState((p: any) => ({ ...p, activeStep: p.activeStep + 1 }));
              }}
            />
          )}
          {state.activeStep >= 1 && (
            <Button
              type="submit"
              label={state.edit ? "Perbarui Data" : "Simpan Data"}
              icon="pi pi-check"
              className="text-sm px-4 p-button-primary"
              loading={state.load}
            />
          )}
        </div>
      </form>
      </Dialog>
      
      <Dialog header="Konfirmasi Hapus" visible={state.delete} onHide={handleCancel} modal style={{ width: '25rem' }} footer={deleteFooterTemplate}>
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
