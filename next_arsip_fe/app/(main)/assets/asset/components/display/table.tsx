'use client'

import { DataTable } from "primereact/datatable"
import { StatusType, TableData, TableProps } from "../interfaces"
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
    const { canCreate, canUpdate, canDelete } = permissions;

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
                        placeholder="Cari aset..." className="w-full sm:w-24rem" />
                </span>
            </div>
        </div>
    )

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex gap-2 justify-content-center">
            {canUpdate && (
                <Button icon="pi pi-pencil"
                    outlined
                    onClick={() => {
                        formik.setValues(p => ({
                            ...p,
                            Code: rowData.Code,
                            Location: rowData.Location,
                            CategoryCode: rowData.CategoryCode,
                            DivisionCode: rowData.DivisionCode,
                            Type: rowData.Type,
                            Status: rowData.Status,
                            Name: rowData.Name,
                        }))

                        setState(p => ({ ...p, add: false, delete: false, edit: true }))
                    }}
                    tooltip="Ubah" />
            )}
            {canDelete && (
                <Button icon="pi pi-trash"
                    outlined
                    severity="danger"
                    onClick={() => setState(p => ({ ...p, delete: true, selectedUsers: [rowData] }))}
                    tooltip="Hapus" />
            )}
        </div>
    );

    const StatusBadge = (rowData: TableData) => {
        type SeverityType = "success" | "warning" | "danger" | "info";

        const status = rowData.Status?.toLowerCase() as StatusType;

        const statusConfig: Record<string, { label: string; severity: SeverityType }> = {
            operational: { label: "Operasional", severity: "success" },
            maintenance: { label: "Pemeliharaan", severity: "warning" },
            down: { label: "Rusak", severity: "danger" },
        };

        const config =
            statusConfig[status] ||
            ({
                label: status,
                severity: "info",
            } as { label: string; severity: SeverityType });

        return (
            <Tag
                value={config.label}
                severity={config.severity}
                style={{
                    minWidth: "75px",
                    display: "inline-flex",
                    justifyContent: "center",
                }} />
        );
    };


    useEffect(() => {
        getData(apiEndpointGet)
    }, [])


    return <>
        <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
            <div className="flex flex-column gap-2 mb-6 px-1">
                <h3 className="text-2xl font-semibold m-0 text-900">Data Master Aset</h3>
                <div className="text-sm text-600">
                    Kelola data master aset.
                </div>
            </div>

            <div className="flex flex-row flex-wrap align-items-center gap-2 mb-3">
                {canCreate && (
                    <Button label="New"
                        icon="pi pi-plus"
                        outlined
                       
                        onClick={() => {
                            setState(p => ({ ...p, selectedUser: [], add: true }))
                        }} />
                )}
                {canDelete && (
                    <>
                        <Divider layout="vertical" />
                        <Button label={`Delete${state.selectedUsers.length> 0 ? ` (${state.selectedUsers.length})` : ''}`}
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
                    </>
                )}
                <Divider layout="vertical" />
                <Button label="Refresh"
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
                globalFilterFields={['Name', 'Code', 'Location']}
                filters={state.filters}
                loading={state.load}
                selection={state.selectedUsers}
                onSelectionChange={(e) => setState(p => ({ ...p, selectedUsers: e.value }))}
                dataKey="Code"
                emptyMessage="Data Kosong"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data">
                <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                <Column field="Code" header="Kode Aset"></Column>
                <Column field="Name" header="Nama Aset"></Column>
                <Column field="Location" header="Lokasi"></Column>
                <Column field="Type" header="Tipe"></Column>
                <Column body={StatusBadge} header=""  style={{ width: '3rem', textAlign: 'center' }}></Column>
                <Column field="CategoryName" header="Nama Kategori"></Column>
                <Column field="DivisionName" header="Nama Divisi"></Column>
                <Column field="CreatedAt" sortable body={rowData => formatDateCalendar(rowData.CreatedAt)} header="Tanggal & Waktu"></Column>
                <Column headerStyle={{ textAlign: 'center' }} align="center" header="Aksi" body={actionBodyTemplate}></Column>
            </DataTable>
        </div>

        <Form getData={getData} toast={toast} state={state} setState={setState} formik={formik} />

    </>
}

export default Table
