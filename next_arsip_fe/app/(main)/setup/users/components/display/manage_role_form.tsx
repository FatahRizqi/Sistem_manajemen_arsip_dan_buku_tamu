'use client';

import { Dialog } from 'primereact/dialog';
import { FormProps, initValue } from '../interfaces';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';

const ManageRoleForm = ({ state, setState, formik, handleSave }: FormProps) => {
    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name]}</small> : null;
    };

    const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Hanya trigger save jika ada id_peran
        if (!formik?.values.id_peran || (Array.isArray(formik?.values.id_peran) && formik?.values.id_peran.length === 0)) {
            formik?.setFieldError('id_peran', 'Role wajib diisi');
            return;
        }
        
        // Validasi formik seringkali gagal secara sembunyi-sembunyi pada field lain yang tidak dirender (misal: format telepon lama dari DB)
        // Karena kita hanya peduli dengan update Role, kita panggil handleSave langsung.
        await handleSave(formik.values);
    };

    return (
        <Dialog
            visible={state.manageRole}
            header="Atur Peran (Role)"
            modal
            style={{ width: '30rem' }}
            onHide={() => {
                setState((p: any) => ({ ...p, manageRole: false }));
                formik?.resetForm();
            }}>
            <form onSubmit={handleSaveRole} className="flex flex-column gap-4 mt-2 fadein animation-duration-300">
                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="role_peran" className="font-medium text-sm">Pilih Role Akses</label>
                    <MultiSelect 
                        id="role_peran" 
                        name="role_peran" 
                        options={state.masterData?.roles?.filter((d: any) => d.status === 'active' || (Array.isArray(formik?.values.id_peran) && formik?.values.id_peran.includes(d.id_peran))) || []} 
                        optionLabel="nama_peran" 
                        optionValue="id_peran" 
                        value={formik?.values.id_peran || []} 
                        onChange={(e) => formik?.setFieldValue('id_peran', e.value)} 
                        placeholder="Pilih Role (Bisa > 1)" 
                        display="chip" 
                        className={isFormFieldInvalid('id_peran') ? 'p-invalid w-full' : 'w-full'} 
                        filter 
                    />
                    {getFormErrorMessage('id_peran')}
                    <small className="text-color-secondary mt-1 line-height-3">
                        Hak akses pengguna akan digabungkan dari seluruh role yang dipilih di atas. Role pertama yang dipilih akan menjadi Peran Utama.
                    </small>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button 
                        type="button" 
                        label="Batal" 
                        severity="secondary" 
                        outlined 
                        onClick={() => {
                            setState((p: any) => ({ ...p, manageRole: false }));
                            formik?.resetForm();
                        }}
                        disabled={state.load} 
                    />
                    <Button 
                        type="submit" 
                        label="Simpan Peran" 
                        icon="pi pi-check" 
                        loading={state.load} 
                        disabled={state.load} 
                    />
                </div>
            </form>
        </Dialog>
    );
};

export default ManageRoleForm;
