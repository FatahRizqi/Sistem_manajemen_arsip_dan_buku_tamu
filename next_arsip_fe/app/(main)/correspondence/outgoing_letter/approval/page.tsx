'use client'

import getDataRequest from "@/lib/axios/getData";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useSession } from "next-auth/react";
import { FilterMatchMode } from "primereact/api";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import Table from "./components/display/table";
import {
    apiEndpointApprove,
    apiEndpointReject,
    apiEndpointDetail,
    apiEndpointLetterTypeManagement,
    apiEndpointGet
} from "./components/endpoints";

interface State {
    load: boolean;
    detail: boolean;
    detailLoad: boolean;
    detailData: any;
    data: any[];
    selectedLetters: any[];
    searchVal: string;
    statusFilter: string;
    jenisSuratFilter: number | null;
    startDate?: string | null;
    endDate?: string | null;
    filters: any;
    session: any;
    config?: {
        COMPANY_NAME: string;
        COMPANY_ADDRESS: string;
        COMPANY_CONTACT: string;
        COMPANY_LOGO: string;
    };
}

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        detail: false,
        detailLoad: false,
        detailData: null,
        data: [],
        selectedLetters: [],
        searchVal: "",
        statusFilter: "menunggu_approval", // Default filter to waiting approval
        jenisSuratFilter: null,
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        config: {
            COMPANY_NAME: "",
            COMPANY_ADDRESS: "",
            COMPANY_CONTACT: "",
            COMPANY_LOGO: ""
        }
    });

    const getData = async (apiEndpoint: string, payload: Record<string, any> = {}) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const [res, logo, nama, alamat, telepon] = await Promise.all([
                getDataRequest(apiEndpoint, payload),
                postData("/function/db-config", { Key: "msLogoPerusahaan" }),
                postData("/function/db-config", { Key: "msNamaPerusahaan" }),
                postData("/function/db-config", { Key: "msAlamatPerusahaan" }),
                postData("/function/db-config", { Key: "msTeleponPerusahaan" })
            ]);
            
            const tlp = telepon.data?.data || "0351-2812555";

            setState((p) => ({
                ...p,
                data: res.data?.data || [],
                config: {
                    COMPANY_LOGO: logo.data?.data || "",
                    COMPANY_NAME: nama.data?.data || "PT. MARSTECH GLOBAL",
                    COMPANY_ADDRESS: alamat.data?.data || "JL. MARGATAMA ASRI IV NO. 3 KANIGORO, KARTOHARJO, MADIUN, JAWA TIMUR",
                    COMPANY_CONTACT: `Telp. ${tlp}`
                }
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Data approval surat keluar gagal diambil");
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const fetchLetterTypes = async () => {
        try {
            const res = await getDataRequest(apiEndpointLetterTypeManagement);
            return [
                { jenis_surat_id: 0, nama_jenis_surat: "Semua Jenis" },
                ...(res.data?.data || []),
            ];
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Jenis surat gagal diambil");
            return [{ jenis_surat_id: 0, nama_jenis_surat: "Semua Jenis" }];
        }
    };

    const fetchDetail = async (idSuratKeluar: number) => {
        try {
            const res = await getDataRequest(`${apiEndpointDetail}/${idSuratKeluar}`);
            return res.data?.data || null;
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Detail surat keluar gagal diambil");
            return null;
        }
    };

    const handleProcessApproval = async (
        type: "approve" | "reject", 
        targets: any[], 
        actionComment: string, 
        buildPayload: () => any
    ) => {
        const endpoint = type === "approve" ? apiEndpointApprove : apiEndpointReject;
        let successCount = 0;
        
        try {
            for (const target of targets) {
                const payload = {
                    id_surat_keluar: target.id_surat_keluar,
                    ...(type === "reject" ? { alasan_penolakan: actionComment } : {}),
                };
                await postData(endpoint, payload);
                successCount++;
            }

            if (successCount> 0) {
                showSuccess(toast, `${successCount} surat berhasil di${type === "approve" ? "setujui" : "tolak"}`);
                await getData(apiEndpointGet, buildPayload());
            }
            return true;
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || `Proses ${type === "approve" ? "approval" : "penolakan"} gagal`);
            return false;
        }
    };

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session,
            }));
        }
    }, [session]);

    return (
        <>
            <Toast ref={toast} position="top-right" />
            <Table 
                getData={getData} 
                state={state} 
                setState={setState} 
                toast={toast} 
                fetchLetterTypes={fetchLetterTypes}
                fetchDetail={fetchDetail}
                handleProcessApproval={handleProcessApproval} />
        </>

    );
};

export default Page;
