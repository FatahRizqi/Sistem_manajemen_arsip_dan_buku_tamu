'use client'

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { GeneratedCardData } from "@/app/(main)/buku_tamu/registrasi/components/interfaces";
import { usePermissions } from '@/layout/context/permissionContext';

interface TableProps {
    visible: boolean;
    onHide: () => void;
    cardData: GeneratedCardData | null;
}

export default function VisitorCardModal({ visible, onHide, cardData }: TableProps) {
    return (
        <Dialog 
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-id-card text-primary text-xl" />
                    <span className="font-bold text-900">Kartu Akses Tamu</span>
                </div>
            }
            visible={visible} 
            modal 
            style={{ width: '420px' }} 
            onHide={onHide}
            className="border-round-2xl overflow-hidden"
            pt={{
                root: { className: 'border-round-2xl' },
                header: { className: 'surface-50 border-bottom-1 surface-border py-3 px-4' },
                content: { className: 'p-4' }
            }}>
            {cardData && (
                <div className="flex flex-column align-items-center text-center">
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #printable-card-area, #printable-card-area * {
                                visibility: visible;
                            }
                            #printable-card-area {
                                position: absolute;
                                left: 50%;
                                top: 50px;
                                transform: translateX(-50%);
                                width: 340px;
                                box-shadow: none !important;
                                border: none !important;
                                background: white !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            /* Hides default browser header/footer margins (URL, Page count) */
                            @page {
                                size: auto;
                                margin: 0;
                            }
                        }
                    `}</style>
                    {/* Visitor Card Container */}
                    <div 
                        id="printable-card-area"
                        className="w-full border-1 border-300 border-round-2xl overflow-hidden shadow-2 bg-white relative"
                        style={{ maxWidth: '340px' }}>
                        {/* Card Header Gradient */}
                        <div 
                            className="py-3 px-3 text-white flex flex-column align-items-center justify-content-center"
                            style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%)' }}>
                            <span className="font-black text-lg tracking-widest text-white-alpha-90" style={{ letterSpacing: '0.15em' }}>KARTU TAMU</span>
                            <span className="text-xs text-white-alpha-70 uppercase font-semibold mt-1" style={{ letterSpacing: '0.05em' }}>Sistem Manajemen Tamu</span>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex flex-column align-items-center bg-white">
                            {/* QR Code Frame */}
                            <div 
                                className="p-3 border-round-xl border-1 surface-border bg-slate-50 flex align-items-center justify-content-center shadow-1 mb-4"
                                style={{ width: '170px', height: '170px', background: '#F8FAFC' }}>
                                <img 
                                    src={cardData.qr_image_url} 
                                    alt="QR Code Tamu" 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>

                            {/* Guest Details */}
                            <h3 className="m-0 font-extrabold text-xl text-900 tracking-tight leading-tight">{cardData.guest_name}</h3>
                            <p className="m-0 text-sm text-color-secondary mt-1 font-semibold">{cardData.guest_company}</p>
                            
                            <Divider className="my-3" style={{ borderColor: '#F1F5F9' }} />

                            {/* Access Code */}
                            <div className="flex flex-column gap-1 align-items-center">
                                <span className="text-xs uppercase text-500 font-bold tracking-wider" style={{ letterSpacing: '0.05em' }}>Kode Kunjungan</span>
                                <div 
                                    className="text-lg font-black px-4 py-1.5 border-round-lg shadow-sm"
                                    style={{ background: '#EFF6FF', color: 'var(--primary-color)', border: '1px solid #BFDBFE' }}>
                                    {cardData.visit_code}
                                </div>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="py-2.5 px-3 border-top-1 surface-border bg-slate-50 text-xs text-color-secondary flex align-items-center justify-content-center gap-2" style={{ background: '#F8FAFC' }}>
                            <i className="pi pi-whatsapp text-emerald-500 font-bold text-base" style={{ color: '#25D366' }} />
                            <span className="font-medium text-800">Notifikasi otomatis terkirim ke host (WhatsApp)</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 w-full mt-4" style={{ maxWidth: '340px' }}>
                        <Button label="Tutup" 
                            severity="secondary" 
                            outlined 
                            className="flex-1 py-2 font-semibold text-sm border-round-lg"
                            onClick={onHide} />
                        <Button label="Cetak Kartu Akses" 
                            icon="pi pi-print" 
                            className="flex-1 py-2 font-semibold text-sm border-round-lg text-white" 
                            style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%)', border: 'none' }}
                            onClick={() => window.print()} />
                    </div>
                </div>
            )}
        </Dialog>
    );
}
