'use client';

import { DataTable } from 'primereact/datatable';
import { RoleColors, TableProps, TableData } from '../interfaces';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { formatDateCalendar } from '@/lib/tools/dateTools';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { apiEndpointGet, apiEndpointCreate } from '../endpoints';
import { Checkbox } from 'primereact/checkbox';
import { useState, useContext, useEffect } from 'react';
import { usePermissions } from '@/layout/context/permissionContext';
import { LayoutContext } from '@/layout/context/layoutcontext';
import ExcelBulkAction from '@/app/components/excel_components/ExcelBulkAction';
import Form from './form';

const Table = ({ state, setState, formik, getData, toast, setDataRekap, setNavBar, navBar, getNav, handleSave, handleDelete }: TableProps) => {
    const permissions = usePermissions();
    const { layoutState } = useContext(LayoutContext);
    const [includeSubBranches, setIncludeSubBranches] = useState(false);

    const cabangName = (layoutState.globalFilter as any)?.nama_cabang;
    const titleSuffix = cabangName ? ` - ${cabangName}` : (permissions?.activeRole?.toUpperCase() === 'SUPERADMIN' ? ' Pusat' : '');
    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-xl font-bold text-900">Master{titleSuffix}</span>

            <div className="flex gap-2 align-items-center">
                <div className="flex align-items-center gap-2 px-3 py-2 border-round surface-100">
                    <Checkbox
                        inputId="subBranchToggle"
                        checked={includeSubBranches}
                        onChange={(e) => {
                            const val = !!e.checked;
                            setIncludeSubBranches(val);
                            getData(apiEndpointGet, !val);
                        }} />
                    <label htmlFor="subBranchToggle" className="text-xs font-semibold text-700 cursor-pointer select-none">
                        Tampilkan Sub-Cabang
                    </label>
                </div>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={state.searchVal}
                        onChange={(e) => {
                            const value = e.target.value;
                            let _filters = { ...state.filters };
                            _filters['global'].value = value;
                            setState((p) => ({ ...p, searchVal: value, filters: _filters }));
                        }}
                        placeholder="Cari..." />
                </span>
            </div>
        </div>
    );

    const roleBodyTemplate = (rowData: TableData) => {
        const roleColors: RoleColors = {
            superadmin: 'danger',
            pimpinan: 'warning',
            sekretaris: 'info',
            'staff arsip': 'success',
            'staff umum': 'success',
            resepsionis: 'info',
            auditor: 'warning'
        };

        const roleStr = String(rowData.role);
        return <Tag value={roleStr} severity={roleColors[roleStr.toLowerCase() as keyof RoleColors] || 'info'} className="text-xs font-semibold px-2 py-1" style={{ minWidth: '105px' }} />;
    };

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex gap-2">
            {permissions.canUpdate && (
                <Button icon="pi pi-pencil"
                    outlined
                    className="p-button-sm"
                    onClick={() => {
                        formik.setValues((p) => ({
                            ...p,
                            ...rowData
                        }));

                        setState((p) => ({ ...p, add: false, delete: false, edit: true }));
                    }}
                    tooltip="Edit" />
            )}
            {permissions.canDelete && (
                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm" onClick={() => setState((p) => ({ ...p, delete: true, selectedUsers: [rowData] }))} tooltip="Delete" />
            )}
            {/* {permissions.canApprove && (
                <Button icon="pi pi-wrench"
                    onClick={() => {
                        getNav?.(rowData?.id_pengguna || '');
                    }}
                    severity="warning"
                    outlined
                    rounded
                    loading={navBar?.load} />
            )} */}
        </div>
    );

    useEffect(() => {
        getData(apiEndpointGet);
    }, []);

    return (
        <>
            <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
                <div className="flex flex-column gap-2 mb-6 px-1">
                    <h3 className="text-2xl font-semibold m-0 text-900">Data Master User</h3>
                    <div className="text-sm text-600">
                        Kelola master user tenant dan admin.
                    </div>
                </div>

                <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {permissions.canCreate && (
                            <>
                                <Button size="small"
                                    label="Tambah"
                                    icon="pi pi-plus"
                                    outlined
                                   
                                    onClick={() => {
                                        setState((p) => ({ ...p, selectedUser: [], add: true }));
                                    }} />
                                <Divider layout="vertical" className="hidden sm:inline-block" />
                            </>
                        )}
                        <Button size="small"
                            label="Cetak"
                            icon="pi pi-print"
                            outlined
                            onClick={() => {
                                let columnStyles = {
                                    2: { halign: 'right' },
                                    3: { halign: 'right' },
                                    4: { halign: 'right' },
                                    5: { halign: 'right' }
                                };

                                setDataRekap((p) => ({
                                    ...p,
                                    data: state.data.map((v) => {
                                        return {
                                            ...v,
                                            created_at: formatDateCalendar(v.created_at)
                                        };
                                    }),
                                    show: true,
                                    adjust: true,
                                    columnStyles
                                }));
                            }} />
                        <Divider layout="vertical" className="hidden sm:inline-block" />
                        {permissions.canDelete && (
                            <>
                                <Button size="small"
                                    label={`Hapus${state.selectedUsers.length> 0 ? ` (${state.selectedUsers.length})` : ''}`}
                                    icon="pi pi-trash"
                                    severity="danger"
                                    outlined
                                    onClick={() => {
                                        if (state.selectedUsers.length < 1) {
                                            setState((p) => ({ ...p, selectedUser: [], delete: false }));
                                            return;
                                        }

                                        setState((p) => ({ ...p, delete: true }));
                                    }}
                                    disabled={state.selectedUsers.length === 0} />
                                <Divider layout="vertical" className="hidden sm:inline-block" />
                            </>
                        )}
                        <Button size="small" label="Refresh" icon="pi pi-refresh" outlined onClick={() => getData(apiEndpointGet)} loading={state.load} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <ExcelBulkAction
                            title="Data Pengguna"
                            data={state.data}
                            columns={[
                                { field: 'nama_lengkap', header: 'Nama Lengkap', required: true, example: 'Budi Santoso' },
                                { field: 'nama_pengguna', header: 'Email (sebagai Username)', required: true, example: 'budi@perusahaan.com' },
                                { field: 'telepon', header: 'Telepon', required: true, example: '081234567890' },
                                { field: 'kata_sandi', header: 'Kata Sandi', required: true, example: 'Rahasia@123' },
                                { field: 'peran_role', header: 'Peran / Role', required: true, example: 'Staff Arsip' },
                                { field: 'nama_cabang', header: 'Nama / Kode Cabang', required: true, example: 'Pusat Jakarta' },
                                { field: 'nama_departemen', header: 'Nama / Kode Departemen', required: true, example: 'Departemen Kearsipan & Umum' },
                                { field: 'nama_divisi', header: 'Nama / Kode Divisi', required: true, example: 'Divisi Arsip Aktif' },
                                { field: 'nama_unit_kerja', header: 'Nama / Kode Unit Kerja', required: true, example: 'Unit Pengolahan Arsip' },
                                { field: 'nama_jabatan', header: 'Nama / Kode Posisi', required: true, example: 'Administrator Pusat' },
                                { field: 'status', header: 'Status', required: true, example: 'active' }
                            ]}
                            apiEndpointCreate={apiEndpointCreate}
                            onSuccess={() => getData(apiEndpointGet)}
                            toast={toast}
                            customExportMap={(data) => data.map((item) => {
                                const branch = state.masterData?.branches?.find((b: any) => String(b.id_cabang) === String(item.id_cabang));
                                const dept = state.masterData?.departments?.find((d: any) => String(d.id_departemen) === String(item.id_departemen));
                                const div = state.masterData?.divisions?.find((d: any) => String(d.id_divisi) === String(item.id_divisi));
                                const workUnit = state.masterData?.workUnits?.find((w: any) => String(w.id_unit_kerja) === String(item.id_unit_kerja));
                                const position = state.masterData?.positions?.find((p: any) => String(p.id_jabatan) === String(item.id_jabatan));
                                return {
                                    ...item,
                                    peran_role: item.role,
                                    nama_cabang: branch ? branch.nama_cabang : item.id_cabang,
                                    nama_departemen: dept ? dept.nama_departemen : item.id_departemen,
                                    nama_divisi: div ? div.nama_divisi : item.id_divisi,
                                    nama_unit_kerja: workUnit ? workUnit.nama_unit_kerja : item.id_unit_kerja,
                                    nama_jabatan: position ? position.nama_jabatan : item.id_jabatan
                                };
                            })}
                            customPayloadMap={(item) => {
                                const branch = state.masterData?.branches?.find((b: any) =>
                                    String(b.nama_cabang || '').toLowerCase() === String(item.nama_cabang || '').toLowerCase() ||
                                    String(b.kode_cabang || '').toLowerCase() === String(item.nama_cabang || '').toLowerCase() ||
                                    String(b.id_cabang) === String(item.nama_cabang)
                                );
                                const dept = state.masterData?.departments?.find((d: any) =>
                                    String(d.nama_departemen || '').toLowerCase() === String(item.nama_departemen || '').toLowerCase() ||
                                    String(d.kode_departemen || '').toLowerCase() === String(item.nama_departemen || '').toLowerCase() ||
                                    String(d.id_departemen) === String(item.nama_departemen)
                                );
                                const div = state.masterData?.divisions?.find((d: any) =>
                                    String(d.nama_divisi || '').toLowerCase() === String(item.nama_divisi || '').toLowerCase() ||
                                    String(d.kode_divisi || '').toLowerCase() === String(item.nama_divisi || '').toLowerCase() ||
                                    String(d.id_divisi) === String(item.nama_divisi)
                                );
                                const workUnit = state.masterData?.workUnits?.find((w: any) =>
                                    String(w.nama_unit_kerja || '').toLowerCase() === String(item.nama_unit_kerja || '').toLowerCase() ||
                                    String(w.kode_unit_kerja || '').toLowerCase() === String(item.nama_unit_kerja || '').toLowerCase() ||
                                    String(w.id_unit_kerja) === String(item.nama_unit_kerja)
                                );
                                const position = state.masterData?.positions?.find((p: any) =>
                                    String(p.nama_jabatan || '').toLowerCase() === String(item.nama_jabatan || '').toLowerCase() ||
                                    String(p.kode_jabatan || '').toLowerCase() === String(item.nama_jabatan || '').toLowerCase() ||
                                    String(p.id_jabatan) === String(item.nama_jabatan)
                                );
                                const role = state.masterData?.roles?.find((r: any) =>
                                    String(r.nama_peran || '').toLowerCase() === String(item.peran_role || '').toLowerCase() ||
                                    String(r.id_peran) === String(item.peran_role)
                                );

                                return {
                                    ...item,
                                    id_cabang: branch ? branch.id_cabang : (isNaN(Number(item.nama_cabang)) ? item.nama_cabang : Number(item.nama_cabang)),
                                    id_departemen: dept ? dept.id_departemen : (isNaN(Number(item.nama_departemen)) ? item.nama_departemen : Number(item.nama_departemen)),
                                    id_divisi: div ? div.id_divisi : (isNaN(Number(item.nama_divisi)) ? item.nama_divisi : Number(item.nama_divisi)),
                                    id_unit_kerja: workUnit ? workUnit.id_unit_kerja : (isNaN(Number(item.nama_unit_kerja)) ? item.nama_unit_kerja : Number(item.nama_unit_kerja)),
                                    id_jabatan: position ? position.id_jabatan : (isNaN(Number(item.nama_jabatan)) ? item.nama_jabatan : Number(item.nama_jabatan)),
                                    id_peran: role ? role.id_peran : (isNaN(Number(item.peran_role)) ? item.peran_role : Number(item.peran_role))
                                };
                            }} />
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
                    scrollable
                    responsiveLayout="scroll"
                    paginator
                    selectionMode={'multiple'}
                    rows={10}
                    header={headerTemplate}
                    globalFilterFields={['nama_lengkap', 'nama_pengguna', 'telepon', 'role']}
                    filters={state.filters}
                    loading={state.load}
                    selection={state.selectedUsers}
                    onSelectionChange={(e) => setState((p) => ({ ...p, selectedUsers: e.value }))}
                    dataKey="id_pengguna"
                    emptyMessage="Data Kosong"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    className="p-datatable-sm"
                    rowHover>
                    <Column align="center" selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column align="center"
                        body={(rowData) => {
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
                        }}
                        header="" style={{ width: '3.5rem' }}></Column>
                    <Column align="center" field="id_pengguna" header="Unique ID" className="font-semibold text-800" style={{ width: '130px' }}></Column>
                    <Column align="center" field="nama_lengkap" header="Name" className="font-medium text-900"></Column>
                    <Column align="center" field="nama_pengguna" header="Username" className="font-medium"></Column>
                    <Column align="center" field="telepon" header="Phone" style={{ width: '150px' }}></Column>
                    <Column align="center" field="role" body={roleBodyTemplate} header="Role" style={{ width: '130px' }}></Column>
                    <Column align="center" field="created_at" sortable body={(rowData) => formatDateCalendar(rowData.created_at)} header="Datetime" style={{ width: '150px' }}></Column>
                    <Column align="center" headerStyle={{ textAlign: 'center' }} header="Action" body={actionBodyTemplate} style={{ width: '120px' }}></Column>
                </DataTable>
            </div>

            <Form getData={getData} toast={toast} state={state} setState={setState} formik={formik} handleSave={handleSave} handleDelete={handleDelete} />
        </>
    );
};

export default Table;
