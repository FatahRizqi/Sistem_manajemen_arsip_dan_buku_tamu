'use client'

import { DataTable } from "primereact/datatable"
import { RoleColors, TableData, TableProps } from "../interfaces"
import { Column } from "primereact/column"
import { InputText } from "primereact/inputtext"
import { formatDateCalendar } from "@/lib/tools/dateTools"
import { Tag } from "primereact/tag"
import { Button } from "primereact/button"
import { Tooltip } from "primereact/tooltip"
import { useEffect } from "react"
import { apiEndpointGet } from "../endpoints"
import { Divider } from "primereact/divider"
import Form from "./form"
import { usePermissions } from '@/layout/context/permissionContext';

const Table = ({
    state,
    setState,
    formik,
    getData,
    toast,
    handleDelete
}: TableProps) => {
    const permissions = usePermissions();

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-xl font-bold">Data Tabel</span>

            <div className="flex gap-2">
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
                        placeholder="Cari kategori..." />
                </span>
            </div>
        </div>
    )

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex gap-2 justify-content-center">
            <Button icon="pi pi-pencil"
                outlined
                onClick={() => {
                    formik.setValues(p => ({
                        ...p,
                        ...rowData
                    }))

                    setState(p => ({ ...p, add: false, delete: false, edit: true }))
                }}
                tooltip="Ubah" />
            <Button icon="pi pi-trash"
                outlined
                severity="danger"
                onClick={() => setState(p => ({ ...p, delete: true, selectedUsers: [rowData] }))}
                tooltip="Hapus" />
        </div>
    );

    useEffect(() => {
        getData(apiEndpointGet)
    }, [])


    return <>
        <div className="card">
            <div className="flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 className="m-0 text-900 font-bold text-2xl mb-1">Manajemen Kategori Aset</h2>
                </div>
            </div>

            <div className="flex flex-row flex-wrap align-items-center gap-2 mb-3">
                <Button size="small"
                    label="Tambah"
                    icon="pi pi-plus"
                    outlined
                   
                    onClick={() => {
                        setState(p => ({ ...p, selectedUser: [], add: true }))
                    }} />
                <Button size="small"
                    label="Impor"
                    icon="pi pi-file-import"
                    outlined
                // onClick={() => fileInputRef.current?.click()} 
                />

                <Button size="small"
                    label="Cetak"
                    icon="pi pi-print"
                    outlined
                // onClick={() => setAdjustDialog(true)} 
                />
                <Divider layout="vertical" />
                <Button size="small"
                    label={`Hapus${state.selectedUsers.length> 0 ? ` (${state.selectedUsers.length})` : ''}`}
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    onClick={() => {
                        if (state.selectedUsers.length < 1) {
                            setState(p => ({ ...p, selectedUser: [], delete: false }))
                            return
                        }

                        setState(p => ({ ...p, delete: true }))
                    }}
                    disabled={state.selectedUsers.length === 0} />
                <Divider layout="vertical" />
                <Button size="small"
                    label="Refresh"
                    icon="pi pi-refresh"
                    outlined
                    onClick={() => getData(apiEndpointGet)}
                    loading={state.load} />
            </div>

            <DataTable
                value={state.data}
                paginator
                selectionMode={'multiple'}
                rows={10}
                header={headerTemplate}
                globalFilterFields={['Name', 'Description']}
                filters={state.filters}
                loading={state.load}
                selection={state.selectedUsers}
                onSelectionChange={(e) => setState(p => ({ ...p, selectedUsers: e.value }))}
                dataKey="Code"
                emptyMessage="Data Kosong"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data">
                <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                <Column field="Name" header="Nama Kategori"></Column>
                <Column
                    field="Description"
                    header="Deskripsi"
                    body={(rowData: TableData) => (
                        <>
                            <Tooltip target={`.description-tooltip-${rowData.Code}`} position="bottom" />
                            <span
                                className={`text-sm description-tooltip-${rowData.Code}`}
                                data-pr-tooltip={rowData.Description}
                                style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                    maxWidth: "200px"
                                }}>
                                {rowData.Description}
                            </span>
                        </>
                    )} />
                <Column field="CreatedAt" sortable body={rowData => formatDateCalendar(rowData.CreatedAt)} header="Tanggal & Waktu"></Column>
                <Column headerStyle={{ textAlign: 'center' }} align="center" header="Aksi" body={actionBodyTemplate}></Column>
            </DataTable>
        </div>

        <Form getData={getData} toast={toast} state={state} setState={setState} formik={formik} />

    </>
}

export default Table
