"use client";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import ExpiredTable from './components/expiredTable';
import ProposalTable from './components/proposalTable';
import getData from '@/lib/axios/getData';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import {
    apiEndpointExpiredGet,
    apiEndpointDocumentCategoryGet,
    apiEndpointProposalCreate,
    apiEndpointProposalGet,
    apiEndpointProposalReview,
    apiEndpointProposalExecute
} from './components/endpoints';

export default function DestructionPage() {
    const toast = useRef<Toast>(null);
    
    // States for ExpiredTable
    const [expiredData, setExpiredData] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [expiredLoading, setExpiredLoading] = useState<boolean>(false);

    // States for ProposalTable
    const [proposalData, setProposalData] = useState<any[]>([]);
    const [proposalLoading, setProposalLoading] = useState<boolean>(false);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await getData(apiEndpointDocumentCategoryGet);
            setCategories(res.data?.data || []);
        } catch (error) {
            console.error("Gagal mengambil data kategori:", error);
        }
    }, []);

    const fetchExpiredData = useCallback(async (selectedCategory: string) => {
        setExpiredLoading(true);
        try {
            const params = selectedCategory ? { kode_kategori_dokumen: selectedCategory } : {};
            const res = await getData(apiEndpointExpiredGet, params);
            setExpiredData(res.data?.data || []);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat dokumen kedaluwarsa');
        } finally {
            setExpiredLoading(false);
        }
    }, []);

    const fetchProposals = useCallback(async (statusFilter: string) => {
        setProposalLoading(true);
        try {
            const params = statusFilter ? { status: statusFilter } : {};
            const res = await getData(apiEndpointProposalGet, params);
            setProposalData(res.data?.data || []);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat daftar usulan pemusnahan');
        } finally {
            setProposalLoading(false);
        }
    }, []);

    const proposeDestruction = async (kode_dokumen: string, alasan_usulan: string) => {
        try {
            const res = await postData(apiEndpointProposalCreate, { kode_dokumen, alasan_usulan });
            showSuccess(toast, res.data?.message || 'Proposal pemusnahan berhasil diajukan');
            return true;
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal mengajukan proposal pemusnahan');
            throw error;
        }
    };

    const reviewProposal = async (id_usulan: number, status: string, catatan_tinjauan: string) => {
        try {
            const res = await postData(apiEndpointProposalReview, { id_usulan, status, catatan_tinjauan });
            showSuccess(toast, res.data?.message || 'Tinjauan usulan berhasil disimpan');
            return true;
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memproses tinjauan usulan');
            throw error;
        }
    };

    const executeProposal = async (id_usulan: number, file_berita_acara: string) => {
        try {
            const res = await postData(apiEndpointProposalExecute, { id_usulan, file_berita_acara });
            showSuccess(toast, res.data?.message || 'Pemusnahan berhasil dieksekusi');
            return true;
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal mengeksekusi pemusnahan');
            throw error;
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return (
        <>

            <Toast ref={toast} position="top-right" />
            
            <div className="mb-3">
                <h2 className="m-0 text-900 font-bold text-2xl mb-1 flex align-items-center gap-2">
                    <i className="pi pi-trash text-primary"></i>
                    <span>Pemusnahan & Retensi Arsip</span>
                </h2>
                <p className="m-0 text-color-secondary text-sm">Pantau arsip yang telah habis masa retensinya, ajukan usulan pemusnahan, dan tinjau berkas berita acara pemusnahan.</p>
            </div>

            <Card className="border-none shadow-1 border-round-2xl overflow-hidden" pt={{ body: { className: 'p-0' }, content: { className: 'p-0' } }}>
                <TabView className="custom-tabview">
                    <TabPanel header="Arsip Kedaluwarsa" leftIcon="pi pi-exclamation-triangle mr-2">
                        <ExpiredTable 
                            toast={toast} 
                            data={expiredData}
                            categories={categories}
                            loading={expiredLoading}
                            fetchExpiredData={fetchExpiredData}
                            proposeDestruction={proposeDestruction}
                            refreshProposals={() => fetchProposals("")} />
                    </TabPanel>
                    <TabPanel header="Usulan Pemusnahan" leftIcon="pi pi-file-export mr-2">
                        <ProposalTable 
                            toast={toast} 
                            data={proposalData}
                            loading={proposalLoading}
                            fetchProposals={fetchProposals}
                            reviewProposal={reviewProposal}
                            executeProposal={executeProposal} />
                    </TabPanel>
                </TabView>
            </Card>
        </>
    );
}
