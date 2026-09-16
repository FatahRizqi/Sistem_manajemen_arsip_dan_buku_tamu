'use client';

import { usePermissions } from '@/layout/context/permissionContext';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Divider } from 'primereact/divider';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { useEffect } from 'react';
import { State } from '../interfaces';
import Form from './form';

const Table = ({ state, setState, formik, getData, handleDelete }: any) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();

  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.add || state.edit) {
    return <Form state={state} setState={setState} formik={formik} handleDelete={handleDelete} />;
  }

  const renderHeader = () => (
    <div className="flex flex-wrap align-items-center justify-content-between gap-3">
      <span className="text-xl font-bold">Daftar Template Surat</span>
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText
          value={state.searchVal}
          onChange={(e) => {
            const value = e.target.value;
            const filters = { ...state.filters } as any;
            filters.global.value = value;
            setState((p: State) => ({ ...p, searchVal: value, filters }));
          }}
          placeholder="Cari template..." />
      </span>
    </div>
  );

  const statusTemplate = (rowData: any) => {
    const isActive = rowData.status === 'active' || rowData.status === 'in' || rowData.status === 'Aktif';
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
  };

  const actionTemplate = (rowData: any) => (
    <div className="flex gap-2 justify-content-center">
      <Button type="button" icon="pi pi-eye" outlined severity="info" size="small" tooltip="Preview" tooltipOptions={{ position: 'top' }} onClick={() => {
        setState((p: State) => ({ ...p, previewVisible: true, previewContent: rowData.isi_template || '' }));
      }} />
      {canUpdate && <Button type="button" icon="pi pi-pencil" outlined size="small" tooltip="Edit" tooltipOptions={{ position: 'top' }} onClick={() => {
        formik.setValues({
          id: rowData.id_template || rowData.id,
          id_template: rowData.id_template || rowData.id,
          kode_template: rowData.kode_template,
          nama_template: rowData.nama_template,
          jenis_surat_id: rowData.jenis_surat_id || null,
          deskripsi: rowData.deskripsi || '',
          isi_template: rowData.isi_template || '',
          status: rowData.status || 'active',
          created_by: rowData.created_by,
          updated_by: rowData.updated_by,
        });
        setState((p: State) => ({ ...p, edit: true, add: false }));
      }} />}
      {canDelete && <Button type="button" icon="pi pi-trash" outlined severity="danger" size="small" tooltip="Nonaktifkan" tooltipOptions={{ position: 'top' }} onClick={() => setState((p: State) => ({ ...p, selectedData: [rowData], delete: true }))} />}
    </div>
  );



  return (
    <div className="card shadow-2 border-round-lg p-4 bg-white">
      <div className="flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="text-2xl font-bold m-0 text-900">Master Template Surat</h3>
          <p className="text-sm text-600 mt-1">Kelola template surat resmi yang dapat dipakai berulang kali untuk surat keluar.</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap align-items-center gap-2 mb-3">
        {canCreate && <Button type="button" size="small" label="Tambah" icon="pi pi-plus" outlined onClick={() => {
          formik.resetForm();
          setState((p: State) => ({ ...p, add: true, selectedData: [] }));
        }} />}
        {canCreate && <Divider layout="vertical" className="hidden md:inline" />}
        {canDelete && <Button type="button" size="small" label={state.selectedData.length> 0 ? `Nonaktifkan (${state.selectedData.length})` : 'Nonaktifkan'} icon="pi pi-trash" outlined severity="danger" onClick={() => setState((p: State) => ({ ...p, delete: true }))} disabled={state.selectedData.length === 0} />}
        {canDelete && <Divider layout="vertical" className="hidden md:inline" />}
        <Button type="button" size="small" label="Refresh" icon="pi pi-refresh" outlined onClick={() => getData()} loading={state.load} />
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

      <DataTable value={state.data} selection={state.selectedData} onSelectionChange={(e) => setState((p: State) => ({ ...p, selectedData: e.value }))} dataKey="id" paginator rows={10} rowsPerPageOptions={[5, 10, 25]} globalFilterFields={['kode_template', 'nama_template', 'status']} filters={state.filters} header={renderHeader()} emptyMessage="Tidak ada data ditemukan." loading={state.load} paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown" currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data">
        {canDelete && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
        <Column body={statusTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }} />
        <Column field="kode_template" header="Kode Template" sortable />
        <Column field="nama_template" header="Nama Template" sortable />
        <Column field="nama_jenis_surat" header="Jenis Surat" />
        <Column field="updated_at" header="Tanggal Update" body={(rowData: any) => rowData.updated_at ? new Date(rowData.updated_at).toLocaleDateString('id-ID') : '-'} />
        <Column body={actionTemplate} header="Aksi" style={{ minWidth: '10rem', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
};

export default Table;
