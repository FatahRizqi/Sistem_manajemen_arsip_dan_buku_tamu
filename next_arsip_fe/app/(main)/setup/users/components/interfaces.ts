import { FilterMatchMode } from 'primereact/api';
import { AppMenuItem, MenuModel, UserRole } from '@/types/layout';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';
import { DataRekap } from '@/types/print-tools';

export interface initValue {
    id_pengguna?: string | number;
    nama_lengkap: string;
    nama_pengguna: string;
    kata_sandi?: string;
    telepon: string;
    status: '0' | '1' | 'active' | 'nonactive';
    id_cabang?: string | number;
    id_jabatan?: string | number;
    id_divisi?: string | number;
    id_departemen?: string | number;
    id_unit_kerja?: string | number;
    id_peran?: string | number | (string | number)[];
}

export interface TableData {
    id_pengguna?: string | number;
    nama_lengkap: string;
    nama_pengguna: string;
    kata_sandi?: string;
    telepon: string;
    status: '0' | '1' | 'active' | 'nonactive';
    role: UserRole | number | string;
    created_at: Date;
}

export interface NavState {
    IdPengguna: string | number;
    load: boolean;
    show: boolean;
    data: MenuModel[];
    menu: MenuModel[];
}

export interface State {
    load: boolean;
    data: TableData[];
    add: boolean;
    edit: boolean;
    delete: boolean;
    manageRole?: boolean;
    selectedUsers: TableData[];
    searchVal: string;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
    submittedData: initValue | null;
    // 1. PERBAIKAN: Mendaftarkan masterData agar Typescript mengenali state dropdown
    masterData?: {
        branches: any[];
        positions: any[];
        divisions: any[];
        departments: any[];
        workUnits: any[];
        roles: any[];
    };
}

export interface TableProps {
    state: State;
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    formik: FormikProps<initValue>;
    setState: React.Dispatch<React.SetStateAction<State>>;
    getData: (apiEndpoint: string, isExact?: boolean) => Promise<void>;
    getNav?: (IdPengguna: string | number) => Promise<void>;
    toast: RefObject<Toast>;
    navBar?: NavState;
    setNavBar?: React.Dispatch<React.SetStateAction<NavState>>;
    handleSave: (input: initValue) => Promise<void>;
    handleDelete: () => Promise<void>;
}

export interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast?: RefObject<Toast>; // Dibuat optional karena logic toast pindah ke page.tsx
    getData?: (apiEndpoint: string, isExact?: boolean) => Promise<void>; // Dibuat optional
    // 2. PERBAIKAN: Mendaftarkan handler yang dikirim dari page.tsx
    handleSave: (input: initValue) => Promise<void>;
    handleDelete: () => Promise<void>;
}

export interface PrintProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    getData?: (apiEndpoint: string, isExact?: boolean) => Promise<void>;
    toast: React.RefObject<Toast>;
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
}

export interface NavbarProps {
    navBar: NavState;
    setNavBar: React.Dispatch<React.SetStateAction<NavState>>;
    handleSaveNavbar: () => Promise<void>;
}

export interface MenuDisplayProps {
    data: AppMenuItem[];
    onEdit: (item: number[]) => void;
}

export interface ListMenuDisplayProps {
    data: AppMenuItem;
    indexPath?: number[];
    onEdit: (item: number[]) => void;
}

export interface RoleColors {
    superadmin: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    pimpinan: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    sekretaris: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    'staff arsip': 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    'staff umum': 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    resepsionis: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    auditor: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
}
