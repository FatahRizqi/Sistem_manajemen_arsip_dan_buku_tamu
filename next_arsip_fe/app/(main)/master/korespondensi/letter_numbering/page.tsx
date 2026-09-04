'use client';

import deleteData from '@/lib/axios/deleteData';
import getDataRequest from '@/lib/axios/getData';
import postData from '@/lib/axios/postData';
import putData from '@/lib/axios/putData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { usePermissions } from '@/hooks/usePermissions';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useFormik } from 'formik';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const apiEndpoint = '/master/surat/penomoran-surat';
const letterTypeEndpoint = '/correspondence/letter-type-management';

const periodeOptions = [
  { label: 'Tidak Pernah', value: 'tidak_pernah' },
  { label: 'Tahunan', value: 'tahunan' },
  { label: 'Bulanan', value: 'bulanan' },
];

const cakupanOptions = [
  { label: 'Global', value: 'global' },
  { label: 'Per Jenis Surat', value: 'per_jenis_surat' },
  { label: 'Per Unit Kerja', value: 'per_unit_kerja' },
  { label: 'Per Jenis Surat & Unit Kerja', value: 'per_jenis_surat_unit_kerja' },
];

const tahapOptions = [
  { label: 'Saat Draft Dibuat', value: 'saat_draft_dibuat' },
  { label: 'Setelah Approval Final', value: 'setelah_approval_final' },
  { label: 'Saat Diterbitkan', value: 'saat_diterbitkan' },
];

const statusOptions = [
  { label: 'Aktif', value: 1 },
  { label: 'Nonaktif', value: 0 },
];

const initialValues = {
  id_penomoran_surat: null as number | null,
  nama_penomoran: '',
  jenis_surat_id: null as number | null,
  format_nomor: '{NOMOR_URUT}/{KODE_JENIS_SURAT}/{KODE_UNIT}/{BULAN_ROMAWI}/{TAHUN}',
  jumlah_digit: 3,
  nomor_awal: 1,
  periode_reset: 'tahunan',
  cakupan_sequence: 'per_jenis_surat',
  tahap_penerbitan_nomor: 'saat_draft_dibuat',
  status_aktif: 1,
};

const optionLabel = (options: { label: string; value: any }[], value: any) =>
  options.find((item) => item.value === value)?.label || value || '-';

const Page = () => {
  const toast = useRef<Toast>(null);
  const { data: session } = useSession();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [data, setData] = useState<any[]>([]);
  const [letterTypes, setLetterTypes] = useState<any[]>([]);
  const [tokens, setTokens] = useState<string[]>([]);
  const [load, setLoad] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [searchVal, setSearchVal] = useState('');
  const [preview, setPreview] = useState('');
  const [filters, setFilters] = useState({ global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS } });

  const formik = useFormik({
    initialValues,
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.nama_penomoran) errors.nama_penomoran = 'Nama penomoran wajib diisi';
      if (!values.jenis_surat_id) errors.jenis_surat_id = 'Jenis surat wajib dipilih';
      if (!values.format_nomor) errors.format_nomor = 'Format nomor wajib diisi';
      if (!values.format_nomor.includes('{NOMOR_URUT}')) errors.format_nomor = 'Format wajib memiliki {NOMOR_URUT}';
      if (!values.jumlah_digit || values.jumlah_digit < 1) errors.jumlah_digit = 'Jumlah digit tidak valid';
      if (!values.nomor_awal || values.nomor_awal < 1) errors.nomor_awal = 'Nomor awal tidak valid';
      return errors;
    },
    onSubmit: async (values) => {
      await handleSave(values);
    },
  });

  const selectedLetterType = useMemo(
    () => letterTypes.find((item) => item.jenis_surat_id === formik.values.jenis_surat_id),
    [letterTypes, formik.values.jenis_surat_id]
  );

  const userId = (session?.user as any)?.IdPengguna || (session?.user as any)?.id || null;

  const getData = async () => {
    setLoad(true);
    try {
      const res = await getDataRequest(apiEndpoint);
      setData(res.data?.data || []);
    } catch (error: any) {
      showError(toast, error?.response?.data?.message || 'Data penomoran surat gagal diambil');
    } finally {
      setLoad(false);
    }
  };

  const getMasterData = async () => {
    try {
      const [letterRes, tokenRes] = await Promise.all([
        getDataRequest(letterTypeEndpoint),
        getDataRequest(`${apiEndpoint}/tokens`),
      ]);
      setLetterTypes(letterRes.data?.data || []);
      setTokens(tokenRes.data?.data || []);
    } catch (error: any) {
      showError(toast, error?.response?.data?.message || 'Master data gagal diambil');
    }
  };

  const getPreview = async () => {
    try {
      const res = await postData(`${apiEndpoint}/preview`, {
        format_nomor: formik.values.format_nomor,
        jumlah_digit: formik.values.jumlah_digit,
        nomor: formik.values.nomor_awal || 1,
        jenis_surat_id: formik.values.jenis_surat_id,
        tanggal_surat: new Date().toISOString().slice(0, 10),
      });
      setPreview(res.data?.data?.nomor_surat || '');
    } catch (error: any) {
      setPreview('');
      showError(toast, error?.response?.data?.message || 'Preview nomor gagal dibuat');
    }
  };

  const handleSave = async (values: typeof initialValues) => {
    setLoad(true);
    try {
      const body = {
        ...values,
        created_by: userId,
        updated_by: userId,
      };

      if (values.id_penomoran_surat) {
        await putData(`${apiEndpoint}/${values.id_penomoran_surat}`, body);
        showSuccess(toast, 'Penomoran surat berhasil diperbarui');
      } else {
        await postData(apiEndpoint, body);
        showSuccess(toast, 'Penomoran surat berhasil disimpan');
      }

      setDialogVisible(false);
      formik.resetForm();
      setPreview('');
      await getData();
    } catch (error: any) {
      showError(toast, error?.response?.data?.message || 'Penomoran surat gagal disimpan');
    } finally {
      setLoad(false);
    }
  };

  const confirmDelete = (row: any) => {
    setDeleteRow(row);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoad(true);
    try {
      await deleteData(`${apiEndpoint}/${deleteRow.id_penomoran_surat}`, { updated_by: userId });
      showSuccess(toast, 'Penomoran surat berhasil dinonaktifkan');
      setDeleteVisible(false);
      setDeleteRow(null);
      await getData();
    } catch (error: any) {
      showError(toast, error?.response?.data?.message || 'Penomoran surat gagal dinonaktifkan');
      setDeleteVisible(false);
    } finally {
      setLoad(false);
    }
  };

  const deleteFooterTemplate = (
    <div className="flex justify-content-center gap-2">
      <Button type="button" label="Batal" icon="pi pi-times" className="p-button-outlined p-button-secondary" onClick={() => setDeleteVisible(false)} />
      <Button type="button" label="Ya, Nonaktifkan" icon="pi pi-trash" severity="danger" loading={load} disabled={load} onClick={handleDelete} />
    </div>
  );

  const insertToken = (token: string) => {
    formik.setFieldValue('format_nomor', `${formik.values.format_nomor || ''}${token}`);
  };

  const actionTemplate = (row: any) => (
    <div className="flex gap-2 justify-content-center">
      {canUpdate && (
        <Button icon="pi pi-pencil"
          outlined
          size="small"
          tooltip="Edit"
          onClick={() => {
            formik.setValues({
              id_penomoran_surat: row.id_penomoran_surat,
              nama_penomoran: row.nama_penomoran,
              jenis_surat_id: row.jenis_surat_id,
              format_nomor: row.format_nomor,
              jumlah_digit: row.jumlah_digit,
              nomor_awal: row.nomor_awal,
              periode_reset: row.periode_reset,
              cakupan_sequence: row.cakupan_sequence,
              tahap_penerbitan_nomor: row.tahap_penerbitan_nomor,
              status_aktif: row.status_aktif,
            });
            setPreview('');
            setDialogVisible(true);
          }} />
      )}
      {canDelete && (
        <Button icon="pi pi-trash" outlined severity="danger" size="small" tooltip="Nonaktifkan" onClick={() => confirmDelete(row)} />
      )}
    </div>
  );

  useEffect(() => {
    getData();
    getMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>

      <Toast ref={toast} position="top-right" />

      <div className="card shadow-2 border-round-lg p-4 bg-white">
        <div className="flex justify-content-between align-align-items-center gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-2xl font-bold m-0 text-900">Master Penomoran Surat</h3>
            <p className="text-sm text-600 mt-1">Kelola format nomor surat keluar berdasarkan jenis surat.</p>
          </div>
          {canCreate && (
            <Button type="button"
              size="small"
              label="Tambah"
              icon="pi pi-plus"
              outlined
             
              onClick={() => {
                formik.resetForm();
                setPreview('');
                setDialogVisible(true);
              }} />
          )}
        </div>

        {/* KETERANGAN STATUS BAR */}
        <div className="flex align-items-center gap-3 px-3 py-2 border-1 surface-border border-round-xl bg-white mb-3 shadow-1" style={{ width: 'fit-content' }}>
            <div className="flex align-items-center gap-2 font-bold text-xs text-700 uppercase tracking-wider">
                <i className="pi pi-info-circle text-primary text-base"></i> KETERANGAN STATUS:
            </div>
            <div className="flex align-items-center gap-2 text-xs font-semibold">
                <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#22c55e', borderRadius: '3px' }}></span>
                <span className="text-700">Aktif</span>
            </div>
            <div className="flex align-items-center gap-2 text-xs font-semibold">
                <span className="inline-block flex-shrink-0" style={{ width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '3px' }}></span>
                <span className="text-700">Tidak Aktif</span>
            </div>
        </div>

        <DataTable
          value={data}
          dataKey="id_penomoran_surat"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          loading={load}
          filters={filters}
          globalFilterFields={['nama_penomoran', 'nama_jenis_surat', 'format_nomor']}
          header={
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                value={searchVal}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchVal(value);
                  setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
                }}
                placeholder="Cari penomoran..." />
            </span>
          }
          emptyMessage="Tidak ada data penomoran surat.">
          <Column body={(row) => {
            const isActive = Boolean(row.status_aktif || row.status === 'active' || row.status === 'Aktif');
            return (
              <div className="flex align-items-center justify-content-center">
                <div 
                  className="w-2rem h-2rem border-round flex align-items-center justify-content-center text-white shadow-1"
                  style={{ background: isActive ? '#22c55e' : '#ef4444', borderRadius: '8px' }}
                  title={isActive ? 'Aktif' : 'Tidak Aktif'}
                >
                  <i className={`pi ${isActive ? 'pi-chevron-down' : 'pi-times'} text-xs font-bold`} />
                </div>
              </div>
            );
          }} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
          <Column field="nama_penomoran" header="Nama Penomoran" sortable />
          <Column field="nama_jenis_surat" header="Jenis Surat" sortable />
          <Column field="format_nomor" header="Format Nomor" style={{ minWidth: '18rem' }} />
          <Column field="jumlah_digit" header="Digit" style={{ width: '6rem' }} />
          <Column header="Reset" body={(row) => optionLabel(periodeOptions, row.periode_reset)} />
          <Column header="Cakupan" body={(row) => optionLabel(cakupanOptions, row.cakupan_sequence)} />
          <Column header="Tahap" body={(row) => optionLabel(tahapOptions, row.tahap_penerbitan_nomor)} />
          <Column header="Aksi" body={actionTemplate} style={{ width: '9rem', textAlign: 'center' }} />
        </DataTable>
      </div>

      <Dialog
        visible={dialogVisible}
        header={formik.values.id_penomoran_surat ? 'Edit Penomoran Surat' : 'Tambah Penomoran Surat'}
        modal
        style={{ width: '760px', maxWidth: '95vw' }}
        onHide={() => {
          setDialogVisible(false);
          setPreview('');
          formik.resetForm();
        }}
        className="p-fluid">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            formik.setTouched({
              nama_penomoran: true,
              jenis_surat_id: true,
              format_nomor: true,
              jumlah_digit: true,
              nomor_awal: true,
            });
            if (Object.keys(formik.errors).length> 0) {
              showError(toast, Object.values(formik.errors)[0] || 'Harap lengkapi formulir dengan benar');
              return;
            }
            formik.handleSubmit(e);
          }}
          className="flex flex-column gap-2 mt-0">
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-2">
              <label htmlFor="nama_penomoran" className="text-sm">Nama Penomoran</label>
              <InputText
                id="nama_penomoran"
                value={formik.values.nama_penomoran}
                className={formik.touched.nama_penomoran && formik.errors.nama_penomoran ? 'p-invalid' : ''}
                onChange={(e) => formik.setFieldValue('nama_penomoran', e.target.value)} />
              {formik.touched.nama_penomoran && formik.errors.nama_penomoran && (
                <small className="p-error">{formik.errors.nama_penomoran}</small>
              )}
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-2">
              <label htmlFor="jenis_surat_id" className="text-sm">Jenis Surat</label>
              <Dropdown
                id="jenis_surat_id"
                value={formik.values.jenis_surat_id}
                options={letterTypes.filter((item: any) => item.status === 'active' || item.jenis_surat_id === formik.values.jenis_surat_id)}
                optionLabel="nama_jenis_surat"
                optionValue="jenis_surat_id"
                className={formik.touched.jenis_surat_id && formik.errors.jenis_surat_id ? 'p-invalid' : ''}
                onChange={(e) => formik.setFieldValue('jenis_surat_id', e.value)}
                placeholder="Pilih jenis surat"
                filter />
              {formik.touched.jenis_surat_id && formik.errors.jenis_surat_id && (
                <small className="p-error">{formik.errors.jenis_surat_id}</small>
              )}
            </div>
            <div className="col-12 flex flex-column gap-2">
              <label htmlFor="format_nomor" className="text-sm">Format Nomor</label>
              <InputText
                id="format_nomor"
                value={formik.values.format_nomor}
                className={formik.touched.format_nomor && formik.errors.format_nomor ? 'p-invalid' : ''}
                onChange={(e) => formik.setFieldValue('format_nomor', e.target.value)} />
              {formik.touched.format_nomor && formik.errors.format_nomor && (
                <small className="p-error">{formik.errors.format_nomor}</small>
              )}
              <div className="flex flex-wrap gap-2">
                {tokens.map((token) => (
                  <Button key={token} type="button" size="small" text label={token} onClick={() => insertToken(token)} />
                ))}
              </div>
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-2">
              <label htmlFor="jumlah_digit" className="text-sm">Jumlah Digit</label>
              <InputNumber
                inputId="jumlah_digit"
                value={formik.values.jumlah_digit}
                className={formik.touched.jumlah_digit && formik.errors.jumlah_digit ? 'p-invalid' : ''}
                onValueChange={(e) => formik.setFieldValue('jumlah_digit', e.value || 1)}
                min={1} />
              {formik.touched.jumlah_digit && formik.errors.jumlah_digit && (
                <small className="p-error">{formik.errors.jumlah_digit}</small>
              )}
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-2">
              <label htmlFor="nomor_awal" className="text-sm">Nomor Awal</label>
              <InputNumber
                inputId="nomor_awal"
                value={formik.values.nomor_awal}
                className={formik.touched.nomor_awal && formik.errors.nomor_awal ? 'p-invalid' : ''}
                onValueChange={(e) => formik.setFieldValue('nomor_awal', e.value || 1)}
                min={1} />
              {formik.touched.nomor_awal && formik.errors.nomor_awal && (
                <small className="p-error">{formik.errors.nomor_awal}</small>
              )}
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-2">
              <label htmlFor="status_aktif" className="text-sm">Status</label>
              <Dropdown id="status_aktif" value={formik.values.status_aktif} options={statusOptions} onChange={(e) => formik.setFieldValue('status_aktif', e.value)} />
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-2">
              <label htmlFor="periode_reset" className="text-sm">Periode Reset</label>
              <Dropdown id="periode_reset" value={formik.values.periode_reset} options={periodeOptions} onChange={(e) => formik.setFieldValue('periode_reset', e.value)} />
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-2">
              <label htmlFor="cakupan_sequence" className="text-sm">Cakupan Sequence</label>
              <Dropdown id="cakupan_sequence" value={formik.values.cakupan_sequence} options={cakupanOptions} onChange={(e) => formik.setFieldValue('cakupan_sequence', e.value)} />
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-2">
              <label htmlFor="tahap_penerbitan_nomor" className="text-sm">Tahap Penerbitan</label>
              <Dropdown id="tahap_penerbitan_nomor" value={formik.values.tahap_penerbitan_nomor} options={tahapOptions} onChange={(e) => formik.setFieldValue('tahap_penerbitan_nomor', e.value)} />
            </div>
          </div>

          <div className="surface-50 border-round p-3 border-1 surface-border">
            <div className="flex justify-content-between align-items-center gap-2 flex-wrap">
              <div>
                <div className="font-semibold text-sm mb-1">Preview Nomor</div>
                <div className="text-sm font-mono">{preview || '-'}</div>
                {selectedLetterType && <div className="text-xs text-color-secondary mt-1">{selectedLetterType.kode_jenis_surat}</div>}
              </div>
              <Button type="button" size="small" icon="pi pi-eye" label="Preview" outlined onClick={getPreview} />
            </div>
          </div>

          <div className="mt-2">
            
            <Button type="submit" label={formik.values.id_penomoran_surat ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={load} disabled={load} />
          </div>
        </form>
      </Dialog>

      <Dialog header="Konfirmasi Nonaktifkan" visible={deleteVisible} onHide={() => setDeleteVisible(false)} modal style={{ width: '25rem' }} footer={deleteFooterTemplate}>
        <div className="flex flex-column align-items-center text-center gap-4 py-4">
            <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
            <div>
                <h3 className="font-bold mb-2">Nonaktifkan data ini?</h3>
                <p className="text-color-secondary">Tindakan ini akan menonaktifkan penomoran <b>{deleteRow?.nama_penomoran}</b>.</p>
            </div>
        </div>
      </Dialog>
    </>
  );
};

export default Page;
