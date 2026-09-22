'use client';

import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';


const ProfileForm = ({ formik, state, setState }: any) => {
    const isFormFieldInvalid = (name: string) => !!(formik.touched[name] && formik.errors[name]);

    const getFormErrorMessage = (name: string) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik.errors[name]}</small> : null;
    };

    return (
        <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2 mt-2 fadein animation-duration-500">
            {/* Informasi Dasar */}
            <div className="surface-card p-4 shadow-1 border-round-xl">
                <div className="flex align-items-center gap-3 pb-3 mb-4 border-bottom-1 surface-border">
                    <div className="flex align-items-center justify-content-center border-circle" style={{ width: '3rem', height: '3rem', backgroundColor: '#e2e8f0' }}>
                        <i className="pi pi-user text-700 text-xl"></i>
                    </div>
                    <div className="flex flex-column gap-1 text-left">
                        <span className="font-semibold text-xl text-900">Informasi Dasar</span>
                        <span className="text-sm text-500">Perbarui informasi data diri Anda.</span>
                    </div>
                </div>

                <div className="grid formgrid p-fluid">
                    <div className="field col-12 md:col-6">
                        <label htmlFor="nama_lengkap" className="font-medium text-700 text-sm">Nama Lengkap</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-id-card text-500" />
                            <InputText
                                id="nama_lengkap"
                                name="nama_lengkap"
                                value={formik.values.nama_lengkap || ''}
                                onChange={formik.handleChange}
                                className={`w-full ${isFormFieldInvalid('nama_lengkap') ? 'p-invalid' : ''}`}
                                placeholder="Masukkan nama lengkap"
                            />
                        </span>
                        {getFormErrorMessage('nama_lengkap')}
                    </div>
                    
                    <div className="field col-12 md:col-6">
                        <label htmlFor="nama_pengguna" className="font-medium text-700 text-sm">Nama Pengguna (Username)</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-at text-500" />
                            <InputText
                                id="nama_pengguna"
                                name="nama_pengguna"
                                value={formik.values.nama_pengguna || ''}
                                onChange={formik.handleChange}
                                className={`w-full ${isFormFieldInvalid('nama_pengguna') ? 'p-invalid' : ''}`}
                                placeholder="Masukkan username"
                            />
                        </span>
                        {getFormErrorMessage('nama_pengguna')}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="telepon" className="font-medium text-700 text-sm">Nomor Telepon</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-phone text-500" />
                            <InputText
                                id="telepon"
                                name="telepon"
                                keyfilter="int"
                                value={formik.values.telepon || ''}
                                onChange={formik.handleChange}
                                className={`w-full ${isFormFieldInvalid('telepon') ? 'p-invalid' : ''}`}
                                placeholder="Contoh: 08123456789"
                            />
                        </span>
                        {getFormErrorMessage('telepon')}
                    </div>
                    
                    <div className="field col-12 md:col-6">
                        <label htmlFor="surel" className="font-medium text-700 text-sm">Alamat Surel (Email)</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-envelope text-500" />
                            <InputText
                                id="surel"
                                name="surel"
                                type="email"
                                value={formik.values.surel || ''}
                                onChange={formik.handleChange}
                                className={`w-full ${isFormFieldInvalid('surel') ? 'p-invalid' : ''}`}
                                placeholder="email@contoh.com"
                            />
                        </span>
                        {getFormErrorMessage('surel')}
                    </div>
                </div>
            </div>

            {/* Keamanan Sandi */}
            <div className="surface-card p-4 shadow-1 border-round-xl">
                <div className="flex align-items-center gap-3 pb-3 mb-4 border-bottom-1 surface-border">
                    <div className="flex align-items-center justify-content-center border-circle" style={{ width: '3rem', height: '3rem', backgroundColor: '#e2e8f0' }}>
                        <i className="pi pi-lock text-700 text-xl"></i>
                    </div>
                    <div className="flex flex-column gap-1 text-left">
                        <span className="font-semibold text-xl text-900">Keamanan Sandi</span>
                        <span className="text-sm text-500">Kosongkan jika Anda tidak ingin mengubah kata sandi.</span>
                    </div>
                </div>

                <div className="grid formgrid p-fluid">
                    <div className="field col-12">
                        <label htmlFor="sandi_lama" className="font-medium text-700 text-sm">Kata Sandi Lama</label>
                        <Password
                            id="sandi_lama"
                            name="sandi_lama"
                            value={formik.values.sandi_lama || ''}
                            onChange={formik.handleChange}
                            toggleMask
                            className={`w-full ${isFormFieldInvalid('sandi_lama') ? 'p-invalid' : ''}`}
                            inputClassName="w-full"
                            placeholder="Masukkan sandi lama untuk verifikasi"
                            feedback={false}
                        />
                        {getFormErrorMessage('sandi_lama')}
                    </div>
                    
                    <div className="field col-12 md:col-6">
                        <label htmlFor="sandi_baru" className="font-medium text-700 text-sm">Kata Sandi Baru</label>
                        <Password
                            id="sandi_baru"
                            name="sandi_baru"
                            value={formik.values.sandi_baru || ''}
                            onChange={formik.handleChange}
                            toggleMask
                            className={`w-full ${isFormFieldInvalid('sandi_baru') ? 'p-invalid' : ''}`}
                            inputClassName="w-full"
                            promptLabel="Masukkan kata sandi baru"
                            weakLabel="Lemah"
                            mediumLabel="Sedang"
                            strongLabel="Kuat"
                            placeholder="Sandi baru Anda"
                        />
                        {getFormErrorMessage('sandi_baru')}
                    </div>
                    
                    <div className="field col-12 md:col-6">
                        <label htmlFor="validasi_sandi_baru" className="font-medium text-700 text-sm">Validasi Sandi Baru</label>
                        <Password
                            id="validasi_sandi_baru"
                            name="validasi_sandi_baru"
                            value={formik.values.validasi_sandi_baru || ''}
                            onChange={formik.handleChange}
                            toggleMask
                            className={`w-full ${isFormFieldInvalid('validasi_sandi_baru') ? 'p-invalid' : ''}`}
                            inputClassName="w-full"
                            feedback={false}
                            placeholder="Ketik ulang sandi baru"
                        />
                        {getFormErrorMessage('validasi_sandi_baru')}
                    </div>
                </div>
            </div>

            <div className="flex justify-content-end mt-2">
                <Button type="submit" 
                    label="Simpan Perubahan" 
                    icon="pi pi-check" 
                   
                    className="shadow-2 px-4 w-auto" 
                    loading={state?.load} 
                    disabled={state?.load} 
                />
            </div>
        </form>
    );
};

export default ProfileForm;
