import { FilterMatchMode } from "primereact/api";

export interface State {
    load: boolean;
    data: any[];
    searchVal: string;
    filters: { global: { value: any; matchMode: FilterMatchMode } };
    statusFilter: string;
    showCheckoutDialog: boolean;
    checkoutToken: string;
    checkoutNotes: string;
    detailRecord: any | null;
    startDate?: string | null;
    endDate?: string | null;
}