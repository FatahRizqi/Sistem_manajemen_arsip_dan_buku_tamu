'use client';

import { Dialog } from 'primereact/dialog';
import { FormProps, initValue } from '../interfaces';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { useEffect } from 'react';

// Form sekarang menerima handleSave dan handleDelete dari page.tsx
const Form = ({ state, setState, formik, handleSave, handleDelete }: FormProps) => {
    const deleteFooterTemplate = (
        <div className="flex justify-content-center gap-2">
            <Button label="Batal"
                icon="pi pi-times"
                severity="secondary"
                outlined
                onClick={() => {
                    setState((p: any) => ({ ...p, add: false, edit: false, delete: false }));
                }}
                disabled={state.load} />
            <Button type="button"
                label="Ya, Hapus" icon="pi pi-trash" severity="danger"
                className="mt-2"
                loading={state?.load}
                disabled={state?.load}
                onClick={handleDelete} />
        </div>
    );

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name]}</small> : null;
    };

    // Logika Cascading Dropdown (Hierarki Organisasi)
    const filteredDepartments = (state.masterData?.departments || []).filter((d: any) =>
        (d.status === 'active' || d.id_departemen === formik?.values.id_departemen) && (!formik?.values.id_cabang || d.id_cabang === formik?.values.id_cabang)
    );
    const validDeptIds = filteredDepartments.map((d: any) => d.id_departemen || d.id);

    const filteredDivisions = (state.masterData?.divisions || []).filter((div: any) => {
        if (div.status !== 'active' && div.id_divisi !== formik?.values.id_divisi) return false;
        if (formik?.values.id_departemen) return div.id_departemen === formik?.values.id_departemen;
        if (formik?.values.id_cabang) return validDeptIds.includes(div.id_departemen);
        return true;
    });
    const validDivIds = filteredDivisions.map((div: any) => div.id_divisi || div.id);

    const filteredWorkUnits = (state.masterData?.workUnits || []).filter((u: any) => {
        if (u.status !== 'active' && u.id_unit_kerja !== formik?.values.id_unit_kerja) return false;
        if (formik?.values.id_divisi) return u.id_divisi === formik?.values.id_divisi;
        if (formik?.values.id_departemen || formik?.values.id_cabang) return validDivIds.includes(u.id_divisi);
        return true;
    });

    return (
        <>
            <Dialog
                visible={state.add || state.edit}
                header={state.edit ? 'Edit Data User' : 'Tambah Data User'}
                modal
                style={{ width: '45%' }}
                onHide={() => {
                    setState((p: any) => ({ ...p, add: false, edit: false, delete: false }));
                    formik?.resetForm();
                }}>
                <form onSubmit={formik?.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                    <div className="flex flex-column md:flex-row gap-3 w-full">
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="nama_lengkap" className="text-sm">Name</label>
                            <InputText id="nama_lengkap" name="nama_lengkap" value={formik?.values.nama_lengkap} placeholder="fullname" autoComplete="off" onChange={(e) => formik?.setFieldValue('nama_lengkap', e.target.value)} className={isFormFieldInvalid('nama_lengkap') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('nama_lengkap')}
                        </div>
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="nama_pengguna" className="text-sm">Username</label>
                            <InputText id="nama_pengguna" name="nama_pengguna" value={formik?.values.nama_pengguna} placeholder="username" autoComplete="off" onChange={(e) => formik?.setFieldValue('nama_pengguna', e.target.value)} className={isFormFieldInvalid('nama_pengguna') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('nama_pengguna')}
                        </div>
                    </div>

                    <div className="flex flex-column md:flex-row gap-3 w-full">
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="telepon" className="text-sm">Telp</label>
                            <InputText id="telepon" name="telepon" keyfilter={'int'} value={formik?.values.telepon} autoComplete="off" onChange={(e) => formik?.setFieldValue('telepon', e.target.value)} placeholder="089222333444" className={isFormFieldInvalid('telepon') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('telepon')}
                        </div>
                        
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="kata_sandi" className="text-sm">Password</label>
                            <Password id="kata_sandi" name="kata_sandi" toggleMask value={formik?.values.kata_sandi} autoComplete="new-password" onChange={(e) => formik?.setFieldValue('kata_sandi', e.target.value)} className={isFormFieldInvalid('kata_sandi') ? 'p-invalid w-full' : 'w-full'} inputClassName="w-full" />
                            {getFormErrorMessage('kata_sandi')}
                        </div>
                    </div>

                    <div className="flex flex-column md:flex-row gap-3 w-full">
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="id_cabang" className="text-sm">Cabang</label>
                            <Dropdown id="id_cabang" name="id_cabang" value={formik?.values.id_cabang} options={state.masterData?.branches?.filter((d: any) => d.status === 'active' || d.id_cabang === formik?.values.id_cabang) || []} optionLabel="nama_cabang" optionValue="id_cabang" onChange={(e) => { formik?.setFieldValue('id_cabang', e.value || ''); formik?.setFieldValue('id_departemen', ''); formik?.setFieldValue('id_divisi', ''); formik?.setFieldValue('id_unit_kerja', ''); }} placeholder="Pilih Cabang" className="w-full" filter showClear />
                        </div>
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="id_departemen" className="text-sm">Departemen</label>
                            <Dropdown id="id_departemen" name="id_departemen" value={formik?.values.id_departemen} options={filteredDepartments} optionLabel="nama_departemen" optionValue="id_departemen" onChange={(e) => { formik?.setFieldValue('id_departemen', e.value || ''); formik?.setFieldValue('id_divisi', ''); formik?.setFieldValue('id_unit_kerja', ''); if (e.value && !formik?.values.id_cabang) { const selectedDept = (state.masterData?.departments || []).find((d: any) => (d.id_departemen || d.id) === e.value); if (selectedDept?.id_cabang) { formik?.setFieldValue('id_cabang', selectedDept.id_cabang); } } }} placeholder="Pilih Departemen" className="w-full" filter showClear />
                        </div>
                    </div>

                    <div className="flex flex-column md:flex-row gap-3 w-full">
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="id_divisi" className="text-sm">Divisi</label>
                            <Dropdown id="id_divisi" name="id_divisi" value={formik?.values.id_divisi} options={filteredDivisions} optionLabel="nama_divisi" optionValue="id_divisi" onChange={(e) => { formik?.setFieldValue('id_divisi', e.value || ''); formik?.setFieldValue('id_unit_kerja', ''); if (e.value) { const selectedDiv = (state.masterData?.divisions || []).find((div: any) => (div.id_divisi || div.id) === e.value); if (selectedDiv?.id_departemen && !formik?.values.id_departemen) { formik?.setFieldValue('id_departemen', selectedDiv.id_departemen); const selectedDept = (state.masterData?.departments || []).find((d: any) => (d.id_departemen || d.id) === selectedDiv.id_departemen); if (selectedDept?.id_cabang && !formik?.values.id_cabang) { formik?.setFieldValue('id_cabang', selectedDept.id_cabang); } } } }} placeholder="Pilih Divisi" className="w-full" filter showClear />
                        </div>
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="id_unit_kerja" className="text-sm">Unit Kerja</label>
                            <Dropdown id="id_unit_kerja" name="id_unit_kerja" value={formik?.values.id_unit_kerja} options={filteredWorkUnits} optionLabel="nama_unit_kerja" optionValue="id_unit_kerja" onChange={(e) => { formik?.setFieldValue('id_unit_kerja', e.value || ''); if (e.value) { const selectedUnit = (state.masterData?.workUnits || []).find((u: any) => (u.id_unit_kerja || u.id) === e.value); if (selectedUnit?.id_divisi && !formik?.values.id_divisi) { formik?.setFieldValue('id_divisi', selectedUnit.id_divisi); const selectedDiv = (state.masterData?.divisions || []).find((div: any) => (div.id_divisi || div.id) === selectedUnit.id_divisi); if (selectedDiv?.id_departemen && !formik?.values.id_departemen) { formik?.setFieldValue('id_departemen', selectedDiv.id_departemen); const selectedDept = (state.masterData?.departments || []).find((d: any) => (d.id_departemen || d.id) === selectedDiv.id_departemen); if (selectedDept?.id_cabang && !formik?.values.id_cabang) { formik?.setFieldValue('id_cabang', selectedDept.id_cabang); } } } } }} placeholder="Pilih Unit Kerja" className="w-full" filter showClear />
                        </div>
                    </div>

                    <div className="flex flex-column md:flex-row gap-3 w-full">
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="id_jabatan" className="text-sm">Posisi</label>
                            <Dropdown id="id_jabatan" name="id_jabatan" value={formik?.values.id_jabatan} options={state.masterData?.positions?.filter((d: any) => d.status === 'active' || d.id_jabatan === formik?.values.id_jabatan) || []} optionLabel="nama_jabatan" optionValue="id_jabatan" onChange={(e) => formik?.setFieldValue('id_jabatan', e.value || '')} placeholder="Pilih Posisi" className="w-full" filter showClear />
                        </div>
                        {state.add ? (
                            <div className="flex flex-column gap-2 w-full">
                                <label htmlFor="role" className="text-sm">Role Utama</label>
                                <Dropdown id="role_peran" name="role_peran" options={state.masterData?.roles?.filter((d: any) => d.status === 'active' || d.id_peran === (Array.isArray(formik?.values.id_peran) ? formik?.values.id_peran[0] : formik?.values.id_peran)) || []} optionLabel="nama_peran" optionValue="id_peran" value={Array.isArray(formik?.values.id_peran) ? (formik?.values.id_peran[0] || '') : formik?.values.id_peran} onChange={(e) => formik?.setFieldValue('id_peran', e.value || '')} placeholder="Pilih 1 Role Utama" className={isFormFieldInvalid('id_peran') ? 'p-invalid w-full' : 'w-full'} filter showClear />
                                {getFormErrorMessage('id_peran')}
                            </div>
                        ) : (
                            <div className="flex flex-column gap-2 w-full">
                                <label htmlFor="status" className="text-sm">Status</label>
                                <Dropdown id="status" name="status" optionValue="kode" optionLabel="label" options={[{ kode: 'active', label: 'Aktif' }, { kode: 'nonactive', label: 'Nonaktif' }]} value={formik?.values.status} onChange={(e) => formik?.setFieldValue('status', e.value)} className={isFormFieldInvalid('status') ? 'p-invalid w-full' : 'w-full'} />
                                {getFormErrorMessage('status')}
                            </div>
                        )}
                    </div>

                    {state.add && (
                        <div className="flex flex-column gap-2 w-full">
                            <label htmlFor="status" className="text-sm">Status</label>
                            <Dropdown id="status" name="status" optionValue="kode" optionLabel="label" options={[{ kode: 'active', label: 'Aktif' }, { kode: 'nonactive', label: 'Nonaktif' }]} value={formik?.values.status} onChange={(e) => formik?.setFieldValue('status', e.value)} className={isFormFieldInvalid('status') ? 'p-invalid w-full' : 'w-full'} />
                            {getFormErrorMessage('status')}
                        </div>
                    )}

                    <div className="mt-2">
                        <Button type="submit" label={state.edit ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={state?.load} disabled={state?.load} />
                    </div>
                </form>
            </Dialog>

            <Dialog
                header="Konfirmasi Hapus"
                visible={state.delete}
                onHide={() => {
                    setState((p: any) => ({ ...p, add: false, edit: false, delete: false }));
                }}
                modal
                style={{ width: '25rem' }}
                footer={deleteFooterTemplate}>
                <div className="flex flex-column align-items-center text-center gap-4 py-4">
                    <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
                    <div>
                        <h3 className="font-bold mb-2">{state.selectedUsers.length> 1 ? `Hapus ${state.selectedUsers.length} pengguna?` : 'Hapus pengguna ini?'}</h3>
                        <p className="text-color-secondary">
                            {state.selectedUsers.length> 1 ? (
                                `Anda akan menghapus ${state.selectedUsers.length} pengguna yang dipilih`
                            ) : (
                                <>
                                    You are going to delete this unit as follow : <strong>{state.selectedUsers[0]?.id_pengguna || ''}</strong>
                                    {`(${state.selectedUsers[0]?.nama_lengkap})`}.
                                </>
                            )}
                            <br />
                            Data yang telah dihapus tidak dapat dikembalikan.
                        </p>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default Form;
