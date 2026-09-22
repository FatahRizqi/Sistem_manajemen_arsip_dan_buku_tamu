'use client'

import React from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { useRouter } from "next/navigation";
import { formatDateCalendar } from "@/lib/tools/dateTools";
import { SearchResultData } from "../../../components/interfaces";

interface SearchResultProps {
    results: SearchResultData[];
    load: boolean;
    onPreview: (filePath: string) => void;
}

const SearchResult: React.FC<SearchResultProps> = ({ results, load, onPreview }) => {
    const router = useRouter();

    if (load) {
        return (
            <div className="flex flex-column align-items-center justify-content-center py-6">
                <i className="pi pi-spin pi-spinner text-4xl text-blue-600 mb-3" />
                <span className="text-700 font-semibold text-base">Sedang mencari & menganalisis konten dokumen...</span>
                <span className="text-500 text-xs mt-1">Sistem memeriksa metadata dan teks OCR di seluruh berkas</span>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="text-center py-6">
                <div
                    className="inline-flex align-items-center justify-content-center border-round-circle mb-3 bg-blue-50"
                    style={{ width: '4.5rem', height: '4.5rem' }}>
                    <i className="pi pi-search-minus text-4xl text-blue-500" />
                </div>
                <h4 className="text-xl font-bold text-900 mb-2">Dokumen Tidak Ditemukan</h4>
                <p className="text-600 text-sm max-w-26rem mx-auto mb-4 leading-relaxed">
                    Tidak ada dokumen yang cocok dengan kata kunci tersebut. Coba gunakan kata kunci lain, nomor dokumen, atau ubah mode pencarian ke <span className="font-semibold text-900">Semua Mode</span>.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-column gap-4">
            <div className="flex align-items-center justify-content-between text-sm text-600 border-bottom-1 border-gray-200 pb-3">
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-check-circle text-green-600 text-base" />
                    <span>Ditemukan <strong className="text-900 font-bold">{results.length}</strong> dokumen yang sesuai</span>
                </div>
                <span className="text-xs text-500 font-mono">Hasil Pencarian Real-Time</span>
            </div>

            <div className="flex flex-column gap-3">
                {results.map((doc) => {
                    const isContent = doc.source === 'content';

                    return (
                        <div
                            key={`${doc.id_dokumen}-${doc.source}`}
                            className="p-4 border-round-xl border-1 surface-border bg-white shadow-1 hover:shadow-2 transition-all"
                            style={{
                                borderLeft: isContent ? '4px solid #3B82F6' : '4px solid #10B981'
                            }}>
                            <div className="flex flex-column md:flex-row justify-content-between md:align-align-items-center gap-4">
                                <div className="flex-1">
                                    {/* Header Tags & Metadata */}
                                    <div className="flex flex-wrap align-items-center gap-2 mb-2">
                                        <Tag
                                            value={isContent ? 'Match: Isi Teks Dokumen (OCR)' : 'Match: Metadata Dokumen'}
                                            severity={isContent ? 'info' : 'success'}
                                            icon={isContent ? 'pi pi-file-word' : 'pi pi-tag'}
                                            className="font-bold px-2 py-1 text-xs" />
                                        {doc.nama_kategori_dokumen && (
                                            <Tag
                                                value={doc.nama_kategori_dokumen}
                                                severity="warning"
                                                className="px-2 py-1 text-xs font-semibold" />
                                        )}
                                        <span className="text-xs font-mono px-2 py-1 border-round bg-gray-100 text-700 font-semibold border-1 border-gray-200">
                                            {doc.nomor_dokumen}
                                        </span>
                                    </div>

                                    {/* Document Title */}
                                    <h3
                                        className="text-lg md:text-xl font-extrabold text-900 hover:text-blue-600 cursor-pointer transition-colors mb-2"
                                        onClick={() => router.push(`/edms/archive_document/${doc.id_dokumen}/versions`)}>
                                        {doc.nama_dokumen}
                                    </h3>

                                    {/* Matched Snippet Highlight */}
                                    {doc.snippet && (
                                        <div className={`p-3 border-round-lg text-sm mb-3 ${isContent ? 'bg-blue-50 text-blue-900 border-1 border-blue-200 font-mono' : 'bg-gray-50 text-800 border-1 border-gray-200'}`}>
                                            <div className="text-xs font-bold text-500 mb-1 uppercase tracking-wider flex align-items-center gap-1">
                                                <i className="pi pi-align-left text-xs" />
                                                <span>{doc.matched_field || 'Matched Snippet'}</span>
                                            </div>
                                            <div className="line-height-3 text-sm">{doc.snippet}</div>
                                        </div>
                                    )}

                                    {/* Metadata Footer */}
                                    <div className="flex flex-wrap gap-4 text-xs text-600 font-medium">
                                        <div className="flex align-items-center gap-1">
                                            <i className="pi pi-user text-400" />
                                            <span>PIC: <strong className="text-800">{doc.nama_pic || '-'}</strong></span>
                                        </div>
                                        <div className="flex align-items-center gap-1">
                                            <i className="pi pi-calendar text-400" />
                                            <span>Tanggal: <strong className="text-800">{doc.tanggal ? formatDateCalendar(doc.tanggal, 'yyyy-MM-dd') : '-'}</strong></span>
                                        </div>
                                        {doc.lokasi_fisik && (
                                            <div className="flex align-items-center gap-1">
                                                <i className="pi pi-map-marker text-400" />
                                                <span>Lokasi Fisik: <strong className="text-800">{doc.lokasi_fisik}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons Column */}
                                <div className="flex md:flex-column gap-2 justify-content-end align-items-stretch min-w-10rem">
                                    <Button label="Lihat Versi"
                                        icon="pi pi-history"
                                        outlined
                                        className="p-button-sm font-semibold"
                                        onClick={() => router.push(`/edms/archive_document/${doc.id_dokumen}/versions`)} />
                                    <Button label="Audit Trail"
                                        icon="pi pi-clock"
                                        severity="secondary"
                                        outlined
                                        className="p-button-sm font-semibold"
                                        onClick={() => router.push(`/edms/archive_document/${doc.id_dokumen}/history`)} />
                                    {doc.file_path && (
                                        <Button label="Pratinjau"
                                            icon="pi pi-eye"
                                            severity="info"
                                            className="p-button-sm font-bold shadow-1"
                                            onClick={() => onPreview(doc.file_path!)} />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SearchResult;
