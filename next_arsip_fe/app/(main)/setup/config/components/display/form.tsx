'use client';

import { FormProps, initValue } from '../interfaces';
import { InputText } from 'primereact/inputtext';

import { Button } from 'primereact/button';
import { showError } from '@/lib/tools/generalTools';
import { useEffect, useRef } from 'react';
import { Toolbar } from 'primereact/toolbar';
import { ProgressBar } from 'primereact/progressbar';
import { InputTextarea } from 'primereact/inputtextarea';

const Form = ({ state, setState, formik, toast, getData }: FormProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchComponentData = async () => {
        setState((p) => ({ ...p, load: true }));

        try {
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    // API call dipindahkan ke page.tsx

    const onFileSelect = (event: any) => {
        const file = event?.target?.files[0];
        if (!file) return;

        if (file.size> 1024 * 1024) {
            // 1MB
            formik.setFieldValue('msLogoPerusahaan', null);
            return showError(toast, 'File tidak boleh lebih dari 1MB.');
        }

        // langsung simpan file object ke formik
        formik.setFieldValue('msLogoPerusahaan', file);
        setState((p) => ({ ...p, imgPrev: URL.createObjectURL(file) }));
    };

    const konfigurasiFooter = (
        <>
            <Button type="submit" label="Simpan" icon="pi pi-check" className=" w-full p-button-text" onClick={() => formik.handleSubmit()} />
        </>
    );

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name] as string}</small> : null;
    };
    useEffect(() => {
        return () => {
            if (state.imgPrev) URL.revokeObjectURL(state.imgPrev);
        };
    }, [state.imgPrev]);

    // Initial load getData (apiEndpointGet has been passed from parent, or handled in parent)
    // Wait, getData expects apiEndpoint. Since we removed apiEndpointGet here, we should 
    // let parent handle the initial data fetching, or pass apiEndpointGet as prop? 
    // Actually, parent can just do getData() inside useEffect!

    return (
        <>
            <div className="grid crud-demo">
                <div className="col-12">
                    <div className="card">
                        <h4>Konfigurasi Sistem</h4>
                        <hr />
                        {state.load && <ProgressBar mode="indeterminate" style={{ height: '6px' }} />}

                        <div className="flex flex-column sm:flex-row gap-3">
                            <div className="flex flex-column gap-3 align-items-center" style={{ width: '250px' }}>
                                <div className="p-image-preview-container" style={{ width: '250px', height: '250px', borderRadius: '6px', position: 'relative' }}>
                                    <img src={state.imgPrev ? state.imgPrev : '/layout/images/profile.png'} alt="logo_perusahaan" style={{ width: '100%', height: '250px', objectFit: 'cover', objectPosition: 'center', borderRadius: '6px' }} />
                                    <input type="file" ref={fileInputRef} id="fileInput" accept="image/*" style={{ display: 'none' }} onChange={onFileSelect} />
                                </div>
                                <Button type="button" label="Ganti Logo" icon="pi pi-upload" outlined className="w-full" onClick={() => fileInputRef.current?.click()} />
                            </div>
                            <div className="flex flex-column w-full gap-2">
                                <div className="flex gap-2 w-full">
                                    <div className="flex flex-column gap-2 w-full">
                                        <label htmlFor="msNamaPerusahaan" className="text-sm">Nama Perusahaan</label>
                                        <InputText
                                                style={{ width: '100%' }}
                                                id="msNamaPerusahaan"
                                                name="msNamaPerusahaan"
                                                value={formik.values.msNamaPerusahaan}
                                                onChange={(e) => {
                                                    formik.setFieldValue('msNamaPerusahaan', e.target.value);
                                                }}
                                                className={isFormFieldInvalid('msNamaPerusahaan') ? 'p-invalid' : ''} />
                                        {isFormFieldInvalid('msNamaPerusahaan') ? getFormErrorMessage('msNamaPerusahaan') : ''}
                                    </div>

                                </div>

                                <div className="flex flex-column gap-2 w-full">
                                    <label htmlFor="msAlamatPerusahaan" className="text-sm">Alamat Perusahaan</label>
                                    <InputTextarea
                                            autoResize
                                            value={formik.values.msAlamatPerusahaan}
                                            onChange={(e) => {
                                                formik.setFieldValue('msAlamatPerusahaan', e.target.value);
                                            }}
                                            rows={3}
                                            cols={30}
                                            className={`w-full ${isFormFieldInvalid('msAlamatPerusahaan') ? 'p-invalid' : ''}`} />
                                    {isFormFieldInvalid('msAlamatPerusahaan') ? getFormErrorMessage('msAlamatPerusahaan') : ''}
                                </div>
                                <div className="flex flex-column sm:flex-row gap-3 w-full">
                                    <div className="flex flex-column gap-2 w-full">
                                        <label htmlFor="msKotaPerusahaan" className="text-sm">Kota Perusahaan</label>
                                        <InputText
                                                style={{ width: '100%' }}
                                                id="msKotaPerusahaan"
                                                name="msKotaPerusahaan"
                                                value={formik.values.msKotaPerusahaan}
                                                onChange={(e) => {
                                                    formik.setFieldValue('msKotaPerusahaan', e.target.value);
                                                }}
                                                className={isFormFieldInvalid('msKotaPerusahaan') ? 'p-invalid' : ''} />
                                        {isFormFieldInvalid('msKotaPerusahaan') ? getFormErrorMessage('msKotaPerusahaan') : ''}
                                    </div>
                                    <div className="flex flex-column gap-2 w-full">
                                        <label htmlFor="msTeleponPerusahaan" className="text-sm">Telepon Perusahaan</label>
                                        <InputText
                                                style={{ width: '100%' }}
                                                id="msTeleponPerusahaan"
                                                name="msTeleponPerusahaan"
                                                value={formik.values.msTeleponPerusahaan}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                                    formik.setFieldValue('msTeleponPerusahaan', value);
                                                }}
                                                className={isFormFieldInvalid('msTeleponPerusahaan') ? 'p-invalid' : ''} />
                                        {isFormFieldInvalid('msTeleponPerusahaan') ? getFormErrorMessage('msTeleponPerusahaan') : ''}
                                    </div>
                                </div>
                                <div className="flex flex-column sm:flex-row gap-3 w-full">
                                    <div className="flex flex-column gap-2 w-full">
                                        <label htmlFor="msEmailPerusahaan" className="text-sm">Email Perusahaan</label>
                                        <InputText
                                                style={{ width: '100%' }}
                                                id="msEmailPerusahaan"
                                                name="msEmailPerusahaan"
                                                value={formik.values.msEmailPerusahaan}
                                                onChange={(e) => {
                                                    formik.setFieldValue('msEmailPerusahaan', e.target.value);
                                                }}
                                                className={isFormFieldInvalid('msEmailPerusahaan') ? 'p-invalid' : ''} />
                                        {isFormFieldInvalid('msEmailPerusahaan') ? getFormErrorMessage('msEmailPerusahaan') : ''}
                                    </div>
                                    <div className="flex flex-column gap-2 w-full">
                                        <label htmlFor="msWebsitePerusahaan" className="text-sm">Website Perusahaan</label>
                                        <InputText
                                                style={{ width: '100%' }}
                                                id="msWebsitePerusahaan"
                                                name="msWebsitePerusahaan"
                                                value={formik.values.msWebsitePerusahaan}
                                                onChange={(e) => {
                                                    formik.setFieldValue('msWebsitePerusahaan', e.target.value);
                                                }}
                                                className={isFormFieldInvalid('msWebsitePerusahaan') ? 'p-invalid' : ''} />
                                        {isFormFieldInvalid('msWebsitePerusahaan') ? getFormErrorMessage('msWebsitePerusahaan') : ''}
                                    </div>
                                </div>
                                <div className="flex flex-column sm:flex-row gap-3 w-full">
                                    <div className="flex flex-column gap-2 w-full">
                                        <label htmlFor="msNamaPimpinan" className="text-sm">Pimpinan Utama</label>
                                        <InputText
                                                style={{ width: '100%' }}
                                                id="msNamaPimpinan"
                                                name="msNamaPimpinan"
                                                value={formik.values.msNamaPimpinan}
                                                onChange={(e) => {
                                                    formik.setFieldValue('msNamaPimpinan', e.target.value);
                                                }}
                                                className={isFormFieldInvalid('msNamaPimpinan') ? 'p-invalid' : ''} />
                                        {isFormFieldInvalid('msNamaPimpinan') ? getFormErrorMessage('msNamaPimpinan') : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Toolbar className="mt-6 mb-4" end={konfigurasiFooter}></Toolbar>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Form;
