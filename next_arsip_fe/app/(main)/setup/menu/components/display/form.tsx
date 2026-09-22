// app/(main)/setup/menu/components/display/form.tsx
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { MultiSelect } from 'primereact/multiselect';
import { State } from '../interfaces';

interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: any;
    toast: any;
    getData: (endpoint: string) => void;
    handleSave: (data: any) => void;
    handleDelete: () => void;
}

const Form = ({ state, setState, formik, toast, getData, handleSave, handleDelete }: FormProps) => {
    
    const hideDialog = () => {
        formik.resetForm();
        setState(p => ({ ...p, add: false, edit: false }));
    };

    const isFormFieldInvalid = (name: string) => !!(formik.touched[name] && formik.errors[name]);
    const getFormErrorMessage = (name: string) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik.errors[name]}</small> : null;
    };

    const footerDialog = (
        <div className="flex justify-content-center gap-2 w-full">
            <Button label="Simpan" icon="pi pi-check" onClick={() => formik.handleSubmit()} loading={state.load} disabled={state.load} className="w-full" />
        </div>
    );

    const statusOptions = [
        { label: 'Aktif', value: 1 },
        { label: 'Nonaktif', value: 0 }
    ];

    return (
        <>
        <Dialog 
            visible={state.add || state.edit} 
            style={{ width: '45%' }} 
            header={state.edit ? "Edit Menu" : "Tambah Menu Baru"} 
            modal 
            footer={footerDialog} 
            onHide={hideDialog}>
            <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                <div className="flex flex-column md:flex-row gap-3 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="kode_menu" className="text-sm">Kode Menu</label>
                        <InputText 
                                id="kode_menu" 
                                name="kode_menu" 
                                value={formik.values.kode_menu} 
                                
                                onChange={formik.handleChange} 
                                className={isFormFieldInvalid('kode_menu') ? 'p-invalid' : ''} />
                        {getFormErrorMessage('kode_menu')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="nama_menu" className="text-sm">Nama Menu</label>
                        <InputText 
                                id="nama_menu" 
                                name="nama_menu" 
                                value={formik.values.nama_menu} 
                                
                                onChange={formik.handleChange} 
                                className={isFormFieldInvalid('nama_menu') ? 'p-invalid' : ''} />
                        {getFormErrorMessage('nama_menu')}
                    </div>
                </div>

                <div className="flex flex-column md:flex-row gap-3 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="jalur_menu" className="text-sm">URL (Jalur)</label>
                        <InputText 
                                id="jalur_menu" 
                                name="jalur_menu" 
                                value={formik.values.jalur_menu} 
                                
                                onChange={formik.handleChange} 
                                placeholder="Contoh: /dashboard" />
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="ikon_menu" className="text-sm">Ikon (PrimeIcons)</label>
                        <InputText 
                                id="ikon_menu" 
                                name="ikon_menu" 
                                value={formik.values.ikon_menu} 
                                
                                onChange={formik.handleChange} 
                                placeholder="Contoh: pi pi-home" />
                    </div>
                </div>

                <div className="flex flex-column md:flex-row gap-3 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="id_menu_induk" className="text-sm">Induk Menu (Kosongkan jika ini menu utama)</label>
                        <Dropdown 
                                id="id_menu_induk" 
                                name="id_menu_induk" 
                                value={formik.values.id_menu_induk} 
                                options={((state as any).masterData?.parentMenus || []).filter((m: any) => !m.id_menu_induk || !m.jalur_menu)} 
                                optionLabel="nama_menu" 
                                optionValue="id_menu" 
                                onChange={(e) => formik.setFieldValue('id_menu_induk', e.value)}
                                placeholder="Pilih Induk Menu" 
                                filter
                                showClear
                                className="w-full" />
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="id_peran" className="text-sm">Hak Akses Peran</label>
                        <MultiSelect 
                                id="id_peran" 
                                name="id_peran" 
                                value={formik.values.id_peran} 
                                options={(state as any).masterData?.roles || []} 
                                optionLabel="nama_peran" 
                                optionValue="id_peran" 
                                onChange={(e) => formik.setFieldValue('id_peran', e.value)}
                                placeholder="Pilih Peran yang Boleh Akses" 
                                display="chip"
                                filter
                                className="w-full" />
                    </div>
                </div>

                <div className="flex flex-column md:flex-row gap-3 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="urutan" className="text-sm">Urutan Tampil</label>
                        <InputNumber 
                                id="urutan" 
                                value={formik.values.urutan} 
                                onValueChange={(e) => formik.setFieldValue('urutan', e.value)} 
                                min={0} 
                                className="w-full" />
                        {getFormErrorMessage('urutan')}
                    </div>

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="status_aktif" className="text-sm">Status</label>
                        <Dropdown 
                                id="status_aktif" 
                                name="status_aktif" 
                                value={formik.values.status_aktif} 
                                options={statusOptions} 
                                onChange={formik.handleChange} 
                                className="w-full" />
                    </div>
                </div>
            </form>
        </Dialog>

        <Dialog visible={state.delete} style={{ width: '450px' }} header="Konfirmasi" modal onHide={() => setState(p => ({ ...p, delete: false }))}
            footer={
                <div className="flex mt-4 pt-3 border-top-1 surface-border">
                    <Button label="Batal" icon="pi pi-times" outlined onClick={() => setState(p => ({ ...p, delete: false }))} />
                    <Button label="Ya, Hapus" icon="pi pi-trash" severity="danger" onClick={handleDelete} loading={state.load} />
                </div>
            }>
            <div className="flex align-items-center justify-content-center">
                <i className="pi pi-exclamation-triangle mr-3" style={{ fontSize: '2rem' }} />
                {state.selectedData && (
                    <span>
                        Apakah Anda yakin ingin menghapus <b>{state.selectedData.length}</b> menu yang dipilih?
                    </span>
                )}
            </div>
        </Dialog>
        </>
    );
};

export default Form;
