"use client";
import React, { useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { TableProps } from '../interfaces';
import { apiEndpointGet } from '../endpoints';

const Table = ({ state, setState, formik, handleDelete, getData }: TableProps) => {
    const renderHeader = () => {
        return (
            <div className="flex flex-wrap align-items-center justify-content-between gap-3">
                <span className="text-xl font-bold">Daftar Jenis Dokumen</span>
                <div className="flex gap-2">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText value={state.searchVal} onChange={(e) => {
                            const value = e.target.value;
                            let _filters = { ...state.filters };
                            _filters['global'].value = value;
                            setState(p => ({ ...p, searchVal: value, filters: _filters }));
                        }} placeholder="Cari..." className="w-full sm:w-24rem" />
                    </span>
                </div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="flex gap-2 justify-content-center">
                <Button type="button" icon="pi pi-pencil" outlined onClick={() => { formik.setValues((p: any) => ({ ...p, ...rowData })); setState(p => ({ ...p, edit: true, add: false })); }} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button type="button" icon="pi pi-trash" outlined severity="danger" onClick={() => setState((p) => ({ ...p, selectedData: [rowData], delete: true }))} tooltip="Hapus" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: any) => {
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

    useEffect(() => {
        getData(apiEndpointGet);
    }, []);

    return (
        <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
            <div className="flex flex-column gap-2 mb-4 px-1">
                <h3 className="text-2xl font-semibold m-0 text-900">Manajemen Jenis Dokumen</h3>
                <div className="text-sm text-600">
                    Kelola data jenis dokumen untuk mempermudah kategorisasi dan penomoran dokumen otomatis.
                </div>
            </div>

            <div className="flex justify-content-between mb-4">
                <div className="flex flex-row align-items-center gap-2">
                <Button type="button" label="Tambah" icon="pi pi-plus" outlined onClick={() => {
                    formik.resetForm();
                    setState(p => ({ ...p, add: true, selectedData: [] }));
                }} />
                <Divider layout="vertical" className="hidden md:inline m-0" />
                <Button type="button" label={"Hapus" + (state.selectedData.length> 0 ? " (" + state.selectedData.length + ")" : "")} icon="pi pi-trash" outlined severity="danger" onClick={() => setState(p => ({ ...p, delete: true }))} disabled={state.selectedData.length === 0} />
                <Divider layout="vertical" className="hidden md:inline m-0" />
                <Button type="button" label="Refresh" icon="pi pi-refresh" outlined onClick={() => getData(apiEndpointGet)} loading={state.load} />
                </div>
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

            <DataTable value={state.data} selection={state.selectedData} onSelectionChange={(e) => setState(p => ({ ...p, selectedData: e.value }))} dataKey="id_jenis_dokumen" paginator rows={10} rowsPerPageOptions={[5, 10, 25]} globalFilterFields={["kode_jenis_dokumen","nama_jenis_dokumen","deskripsi","status"]} filters={state.filters} header={renderHeader()} emptyMessage="Tidak ada data ditemukan." loading={state.load} paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown" currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data">
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }}></Column>
                <Column field="kode_jenis_dokumen" header="Kode Jenis" sortable className="font-semibold text-primary"></Column>
                <Column field="nama_jenis_dokumen" header="Nama Jenis Dokumen" sortable></Column>
                <Column field="deskripsi" header="Deskripsi" sortable></Column>
                <Column body={actionBodyTemplate} exportable={false} align="center" header="Aksi" style={{ minWidth: '8rem', textAlign: 'center' }}></Column>
            </DataTable>
        </div>
    );
};
export default Table;
