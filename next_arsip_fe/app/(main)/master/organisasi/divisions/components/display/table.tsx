"use client";
import { usePermissions } from '@/layout/context/permissionContext';
import React, { useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { TableProps } from '../interfaces';
import { apiEndpointGet, apiEndpointCreate } from '../endpoints';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { useContext } from 'react';
import ExcelBulkAction from '@/app/components/excel_components/ExcelBulkAction';

const Table = ({ state, setState, formik, handleDelete, getData, toast }: TableProps) => {
    const permissions = usePermissions();
    const { canCreate, canUpdate, canDelete, canApprove } = usePermissions();
    const { layoutState } = useContext(LayoutContext);
    const cabangName = (layoutState.globalFilter as any)?.nama_cabang;
    const titleSuffix = cabangName ? ` - ${cabangName}` : (permissions?.activeRole?.toUpperCase() === 'SUPERADMIN' ? ' Pusat' : '');

    const renderHeader = () => {
        return (
            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-xl font-bold">Manajemen Divisi{titleSuffix}</span>
                <div className="flex gap-2">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText value={state.searchVal} onChange={(e) => {
                            const value = e.target.value;
                            let _filters = { ...state.filters };
                            _filters['global'].value = value;
                            setState(p => ({ ...p, filters: _filters, searchVal: value }));
                        }} placeholder="Cari..." className="w-full sm:w-24rem" />
                    </span>
                </div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="flex gap-2 justify-content-center">
                {canUpdate && <Button icon="pi pi-pencil" outlined onClick={() => { formik.setValues((p: any) => ({ ...p, ...rowData })); setState(p => ({ ...p, edit: true, add: false })); }} tooltip="Edit" tooltipOptions={{ position: 'top' }} />}

                {canDelete && <Button icon="pi pi-trash" outlined severity="danger" onClick={() => setState((p) => ({ ...p, selectedData: [rowData], delete: true }))} tooltip="Delete" tooltipOptions={{ position: 'top' }} />}
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        getData(apiEndpointGet);
    }, []);

    const renderInduk = (rowData: any) => {
        const parent = state.masterData?.find((d: any) => d.id_departemen === rowData.id_departemen);
        return parent ? parent.nama_departemen : rowData.id_departemen;
    };

    return (
        <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
            <div className="flex flex-column gap-2 mb-4 px-1">
                <h3 className="text-2xl font-semibold m-0 text-900">Data Master Divisi{titleSuffix}</h3>
                <div className="text-sm text-600">
                    Kelola data master divisi.
                </div>
            </div>

            <div className="flex justify-content-between mb-4">
                <div className="flex flex-row align-items-center gap-2">
                    {canCreate && (
                        <Button label="Tambah" icon="pi pi-plus" outlined onClick={() => {
                            formik.resetForm();
                            setState(p => ({ ...p, add: true, selectedData: [] }));
                        }} />
                    )}
                    {canCreate && canDelete && <Divider layout="vertical" className="hidden md:inline m-0" />}
                    {canDelete && (
                        <Button label={"Hapus" + (state.selectedData.length> 0 ? " (" + state.selectedData.length + ")" : "")} icon="pi pi-trash" outlined severity="danger" onClick={() => setState(p => ({ ...p, delete: true }))} disabled={state.selectedData.length === 0} />
                    )}
                    {(canCreate || canDelete) && <Divider layout="vertical" className="hidden md:inline m-0" />}
                    <Button label="Refresh" icon="pi pi-refresh" outlined onClick={() => getData(apiEndpointGet)} loading={state.load} />
                </div>

                <div className="flex flex-row flex-wrap align-items-center gap-2">
                    
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

            <DataTable value={state.data} selection={state.selectedData} onSelectionChange={(e) => setState(p => ({ ...p, selectedData: e.value }))} dataKey="id_divisi" paginator rows={10} rowsPerPageOptions={[5, 10, 25]} globalFilterFields={["id_departemen", "kode_divisi", "nama_divisi", "deskripsi", "status"]} filters={state.filters} header={renderHeader()} emptyMessage="Tidak ada data ditemukan." loading={state.load} paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown" currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data">
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }}></Column>
                <Column body={renderInduk} header="Departemen" sortable></Column>
                <Column field="kode_divisi" header="Kode" sortable></Column>
                <Column field="nama_divisi" header="Nama Divisi" sortable></Column>
                <Column field="deskripsi" header="Deskripsi" sortable></Column>
                <Column body={actionBodyTemplate} exportable={false} align="center" header="Aksi" style={{ minWidth: '8rem', textAlign: 'center' }}></Column>
            </DataTable>
        </div>
    );
};
export default Table;
