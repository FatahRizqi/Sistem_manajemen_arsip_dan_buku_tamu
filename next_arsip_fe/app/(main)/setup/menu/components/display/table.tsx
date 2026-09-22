// app/(main)/setup/menu/components/display/table.tsx
import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { State, initValueMenu } from '../interfaces';
import { usePermissions } from '@/layout/context/permissionContext';

interface TableProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: any;
    getData: (endpoint: string) => void;
    handleDelete: () => void;
    handleSave: (data: initValueMenu) => void;
    toast: any;
}

const Table = ({ state, setState, formik, handleDelete, getData }: TableProps) => {
    const permissions = usePermissions();
    const { canCreate, canUpdate, canDelete } = usePermissions();

    // Header tabel hanya untuk search
    const renderHeader = () => {
        return (
            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-xl font-bold">Manajemen Menu Navigasi</span>
                <div className="flex gap-2">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            value={state.searchVal}
                            onChange={(e) => {
                                const value = e.target.value;
                                let _filters = { ...state.filters };
                                if (_filters['global']) {
                                    _filters['global'].value = value;
                                }
                                setState(p => ({ ...p, searchVal: value, filters: _filters }));
                            }}
                            placeholder="Cari menu..." className="w-full sm:w-24rem" />
                    </span>
                </div>
            </div>
        );
    };

    // Tombol Aksi (Edit) di setiap baris
    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="flex gap-2 justify-content-center">
                {canUpdate && (
                    <Button icon="pi pi-pencil"
                        outlined
                        onClick={() => {
                            // Isi formik dengan data baris yang diklik
                            formik.setValues({
                                id_menu: rowData.id_menu,
                                kode_menu: rowData.kode_menu,
                                nama_menu: rowData.nama_menu,
                                jalur_menu: rowData.jalur_menu || '',
                                ikon_menu: rowData.ikon_menu || '',
                                urutan: rowData.urutan,
                                status_aktif: rowData.status_aktif,
                                id_menu_induk: rowData.id_menu_induk || '',
                                // Kalau backend ngirim array id_peran, taruh di sini
                                id_peran: rowData.id_peran || []
                            });
                            setState(p => ({ ...p, edit: true }));
                        }} />
                )}
                {canDelete && (
                    <Button icon="pi pi-trash"
                        outlined
                        severity="danger"
                        onClick={() => setState((p) => ({ ...p, selectedData: [rowData], delete: true }))} />
                )}
            </div>
        );
    };

    // Render Ikon biar kelihatan visualnya
    const iconBodyTemplate = (rowData: any) => {
        return rowData.ikon_menu ? <i className={rowData.ikon_menu} style={{ fontSize: '1.2rem', color: '#6366f1' }}></i> : '-';
    };

    // Render Status
    const statusBodyTemplate = (rowData: any) => {
        const isActive = rowData.status_aktif === 1 || rowData.status_aktif === 'active' || rowData.status === 'active' || rowData.status === 'in';
        return (
            <div className="flex align-items-center justify-content-center">
                <div 
                    className="w-2rem h-2rem border-round flex align-items-center justify-content-center text-white shadow-1"
                    style={{ background: isActive ? '#22c55e' : '#ef4444', borderRadius: '8px' }}
                    title={isActive ? 'Aktif' : 'Tidak Aktif'}
                >
                    <i className={`pi ${isActive ? 'pi-check' : 'pi-times'} text-xs font-bold`} />
                </div>
            </div>
        );
    };

    return (
        <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
            {/* Page Header */}
            <div className="flex flex-column gap-2 mb-4 px-1">
                <h3 className="text-2xl font-semibold m-0 text-900">Manajemen Menu Navigasi</h3>
                <div className="text-sm text-600">
                    Kelola data master menu navigasi.
                </div>
            </div>

            <div className="flex justify-content-between mb-4">
                <div className="flex flex-row align-items-center gap-2">
                {canCreate && (
                    <>
                        <Button label="Tambah"
                            icon="pi pi-plus"
                            outlined
                            onClick={() => {
                                formik.resetForm();
                                setState(p => ({ ...p, add: true, selectedData: [] }));
                            }} />
                        <Divider layout="vertical" />
                    </>
                )}
                {canDelete && (
                    <>
                        <Button label={`Hapus${state.selectedData.length> 0 ? ` (${state.selectedData.length})` : ''}`}
                            icon="pi pi-trash"
                            outlined
                            severity="danger"
                            onClick={() => setState(p => ({ ...p, delete: true }))}
                            disabled={!state.selectedData || state.selectedData.length === 0} />
                        <Divider layout="vertical" />
                    </>
                )}
                <Button label="Refresh"
                    icon="pi pi-refresh"
                    outlined
                    onClick={() => getData('/setup/menu/data')}
                    loading={state.load} />
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

            <DataTable
                value={state.data}
                selection={state.selectedData}
                onSelectionChange={(e) => setState(p => ({ ...p, selectedData: e.value }))}
                dataKey="id_menu"
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25]}
                filters={state.filters}
                globalFilterFields={["kode_menu", "nama_menu", "jalur_menu"]}
                header={renderHeader()}
                emptyMessage="Tidak ada data menu ditemukan."
                loading={state.load}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data">
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                <Column body={statusBodyTemplate} header="" style={{ width: '3.5rem', textAlign: 'center' }}></Column>
                <Column field="kode_menu" header="Kode Menu" sortable></Column>
                <Column field="nama_menu" header="Nama Menu" sortable></Column>
                <Column field="jalur_menu" header="URL (Jalur)"></Column>
                <Column body={iconBodyTemplate} header="Ikon" align="center"></Column>
                <Column field="urutan" header="Urutan" sortable align="center"></Column>
                <Column body={actionBodyTemplate} exportable={false} align="center" header="Aksi" style={{ minWidth: '8rem', textAlign: 'center' }}></Column>
            </DataTable>
        </div>
    );
};

export default Table;
