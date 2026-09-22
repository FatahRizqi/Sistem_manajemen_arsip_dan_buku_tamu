'use client'

import { showError, showSuccess } from "@/lib/tools/generalTools";
import jsPDF from "jspdf";
import dynamic from "next/dynamic";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { SelectButton } from "primereact/selectbutton";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { apiEndpointGet } from "../endpoints";
import { FormProps, initValue } from "../interfaces";
import { mapOutgoingLetterPayload } from "../mappers";

const PDFViewer = dynamic(() => import("@/app/components/print_components/pdfViewer"), { ssr: false });

const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Menunggu Approval", value: "menunggu_approval" },
    { label: "Disetujui", value: "disetujui" },
    { label: "Ditolak", value: "ditolak" },
    { label: "Terkirim", value: "terkirim" },
    { label: "Selesai", value: "selesai" },
];

const mediaPengirimanOptions = [
    { label: "Ekspedisi", value: "Ekspedisi" },
    { label: "Email", value: "Email" },
    { label: "Kurir", value: "Kurir" },
    { label: "Pos", value: "Pos" },
    { label: "Langsung", value: "Langsung" },
];

const suratModeOptions = [
    { label: "Opsi 1: Template Sistem", value: "sistem" },
    { label: "Opsi 2: Upload File Eksternal (PDF/Word)", value: "upload_pdf" },
];

interface LetterTypeOption {
    jenis_surat_id: number;
    kode_jenis_surat: string;
    nama_jenis_surat: string;
    arah_surat: string;
}

interface TemplateOption {
    id_template: number;
    kode_template: string;
    nama_template: string;
    jenis_surat_id: number | null;
    nama_jenis_surat?: string | null;
    isi_template: string;
    status: string;
}

const INTERCEPTOR_BASE_URL = process.env.NEXT_PUBLIC_API_DIR_PATH || "/api/interceptor";
const COMPANY_LOGO_URL = "/marstech-logo.png";
const SIGNER_NAME = "BOSTANUL ASY'ARI";
const SIGNER_TITLE = "DIREKTUR";
const PDF_MIME_TYPE = "application/pdf";

const getUserId = (state: FormProps["state"]) =>
    state.session?.user?.IdPengguna || state.session?.user?.id || null;

const getSessionSenderName = (state: FormProps["state"]) =>
    (state.session?.user as any)?.nama_lengkap ||
    (state.session?.user as any)?.name ||
    (state.session?.user as any)?.nama_pengguna ||
    "";

const getSessionSenderPosition = (state: FormProps["state"]) =>
    (state.session?.user as any)?.jabatan ||
    (state.session?.user as any)?.nama_jabatan ||
    (state.session?.user as any)?.position ||
    "";

const toDateValue = (value: string) => (value ? new Date(value) : null);
const toDateString = (value: Date | Date[] | null | undefined) => {
    if (!(value instanceof Date)) return "";

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatDateId = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
};

const formatFileSize = (size?: number | null) => {
    if (!size || size <= 0) return "-";

    if (size < 1024) return `${size} B`;

    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(1)} MB`;
};

const loadImageAsDataUrl = async (url: string) => {
    if (!url) return "";
    if (url.startsWith("data:image/")) return url;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal mengambil gambar");
        
        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.startsWith("image/")) {
            throw new Error("Bukan format gambar");
        }
        
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        throw error;
    }
};

const getFilterHeaders = () => {
    const filterHeaders: Record<string, string> = {};

    if (typeof window === "undefined") return filterHeaders;

    try {
        const savedFilter = localStorage.getItem("globalFilter");
        if (!savedFilter) return filterHeaders;

        const parsed = JSON.parse(savedFilter);
        if (parsed.id_cabang) filterHeaders["x-filter-cabang"] = String(parsed.id_cabang);
        if (parsed.id_departemen) filterHeaders["x-filter-departemen"] = String(parsed.id_departemen);
        if (parsed.id_divisi) filterHeaders["x-filter-divisi"] = String(parsed.id_divisi);
        if (parsed.id_unit_kerja) filterHeaders["x-filter-unit-kerja"] = String(parsed.id_unit_kerja);
    } catch {
        return filterHeaders;
    }

    return filterHeaders;
};

const getFilenameFromDisposition = (disposition?: string | null) => {
    if (!disposition) return "";

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));

    const regularMatch = disposition.match(/filename="?([^"]+)"?/i);
    return regularMatch?.[1] || "";
};

const buildBodyOnly = (values: initValue) => [
    "Dengan hormat,",
    "",
    values.isi_surat || "",
    "",
    "Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.",
].join("\n");

export const extractIsiSuratFromFinal = (value?: string | null) => {
    let text = String(value || "").trim();
    if (!text) return "";

    const hormatIndex = text.toLowerCase().indexOf("dengan hormat");
    if (hormatIndex>= 0) {
        text = text.slice(hormatIndex).replace(/^dengan hormat,?\s*/i, "").trim();
    }

    text = text
        .replace(/^nomor\s*:.*(?:\r?\n|$)/gim, "")
        .replace(/^lampiran\s*:.*(?:\r?\n|$)/gim, "")
        .replace(/^lamp\s*:.*(?:\r?\n|$)/gim, "")
        .replace(/^perihal\s*:.*(?:\r?\n|$)/gim, "")
        .replace(/^kepada yth\.?\s*(?:\r?\n|$)/gim, "")
        .replace(/^di tempat\s*(?:\r?\n|$)/gim, "")
        .replace(/demikian surat ini[\s\S]*$/i, "")
        .replace(/demikian surat .*?terima kasih\.?[\s\S]*$/i, "")
        .replace(/hormat kami,?[\s\S]*$/i, "")
        .trim();

    return text;
};

const buildFinalLetterText = (values: initValue) => [
    `Nomor    : ${values.nomor_surat || "-"}`,
    "Lampiran : -",
    `Perihal  : ${values.perihal || "-"}`,
    "",
    "Kepada Yth.",
    values.tujuan || "-",
    values.instansi_tujuan || "",
    "di Tempat",
    "",
    ...buildBodyOnly(values).split(/\r?\n/),
    "",
    "Hormat kami,",
    "",
    "",
    values.nama_pengirim || SIGNER_NAME,
    values.jabatan || SIGNER_TITLE,
].filter((line, index, lines) => line || lines[index - 1] !== "").join("\n");

const buildPdfPreviewUrl = async (values: initValue, apiGetConfig?: (payload: any) => Promise<any>) => {
    // Fetch config
    let config: any = {};
    if (apiGetConfig) {
        config = await apiGetConfig({
            kode: [
                "msNamaPerusahaan", "msAlamatPerusahaan", "msTeleponPerusahaan", "msLogoPerusahaan"
            ]
        });
    }

    const cName = config.msNamaPerusahaan || "PT. MARSTECH GLOBAL";
    const cAddress = config.msAlamatPerusahaan || "JL. MARGATAMA ASRI IV NO. 3 KANIGORO, KARTOHARJO, MADIUN, JAWA TIMUR";
    const cContact = `Telp. ${config.msTeleponPerusahaan || "0351-2812555"}`;
    let cLogoUrl = COMPANY_LOGO_URL;
    if (config.msLogoPerusahaan) {
        if (config.msLogoPerusahaan.startsWith('http')) {
            cLogoUrl = config.msLogoPerusahaan;
        } else {
            const basePath = process.env.NEXT_PUBLIC_API_DIR_PATH?.replace('/api', '') || '';
            cLogoUrl = `${basePath}/uploads/config/logo_perusahaan/${config.msLogoPerusahaan}`;
        }
    }

    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
    });
    const logoDataUrl = await loadImageAsDataUrl(cLogoUrl).catch(() => null) || await loadImageAsDataUrl(COMPANY_LOGO_URL).catch(() => null);
    const pageWidth = 210;
    const marginX = 25; // Adjusted margin to fit the logo and text well
    const maxWidth = 160;
    const lineHeight = 6;
    let cursorY = 43;

    const logoSize = 25;
    const textStartX = marginX + logoSize + 5; // Start text next to logo

    if (logoDataUrl) {
        let ratio = 1;
        try {
            ratio = await new Promise<number>((resolve) => {
                const img = new window.Image();
                img.onload = () => resolve(img.naturalHeight / (img.naturalWidth || 1));
                img.onerror = () => resolve(1);
                img.src = logoDataUrl;
            });
        } catch (e) {
            ratio = 1;
        }
        const logoHeight = logoSize * ratio;
        // Center the logo vertically relative to the header text area (which is around height 25)
        const yPos = 8 + (25 - logoHeight) / 2;
        doc.addImage(logoDataUrl, "PNG", marginX, yPos> 8 ? yPos : 8, logoSize, logoHeight);
    }
    
    // Header Text
    doc.setTextColor(11, 46, 89); // Dark blue color for Company Name #0B2E59
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text(cName, textStartX, 14);

    doc.setTextColor(40, 40, 40); // Dark grey for address
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(cAddress, textStartX, 20);

    const email = config.msEmailPerusahaan || "info@marstech.co.id";
    const web = config.msWebsitePerusahaan || "www.marstech.co.id";
    const contactLine = `${cContact}  |  E-mail: ${email}  |  Web: ${web}`;
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.text(contactLine, textStartX, 25);

    // Two underline borders
    doc.setDrawColor(11, 46, 89); // Dark blue lines
    doc.setLineWidth(1.0); // Thick line
    doc.line(marginX, 35, pageWidth - marginX, 35);
    
    doc.setLineWidth(0.3); // Thin line
    doc.line(marginX, 36.5, pageWidth - marginX, 36.5);

    // Reset color for body
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    const metadataRows = [
        ["Nomor", values.nomor_surat || "-"],
        ["Perihal", values.perihal || "-"],
        ["Lamp", "-"],
    ];
    metadataRows.forEach(([label, value]) => {
        doc.text(label, marginX, cursorY);
        doc.text(":", marginX + 22, cursorY);
        doc.text(value, marginX + 27, cursorY);
        cursorY += 7;
    });

    cursorY += 12;
    const destinationLines = ["Kepada Yth.", values.tujuan, values.instansi_tujuan, "di Tempat"].filter(Boolean);
    destinationLines.forEach((line) => {
        doc.text(String(line), marginX, cursorY);
        cursorY += 6;
    });
    cursorY += 8;

    doc.setFont("times", "normal");
    doc.setFontSize(11);

    const body = buildBodyOnly(values);
    const paragraphs = String(body || "").split(/\r?\n/);
    for (const paragraph of paragraphs) {
        const isListLine = /^\s*\d+\./.test(paragraph);
        const startX = paragraph && !isListLine ? marginX + 8 : marginX;
        const wrappedLines = paragraph ? doc.splitTextToSize(paragraph, maxWidth - (startX - marginX)) : [""];

        for (const line of wrappedLines) {
            if (cursorY> 232) {
                doc.addPage();
                cursorY = 22;
            }

            doc.text(line, startX, cursorY);
            cursorY += lineHeight;
        }

        cursorY += 2;
    }

    if (cursorY> 220) {
        doc.addPage();
    }

    const signatureY = 238;
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(`Madiun, ${formatDateId(values.tanggal_surat) || "-"}`, 142, signatureY);
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", 145, signatureY + 9, 26, 21);
    }
    doc.setFont("times", "bolditalic");
    doc.setFontSize(8);
    doc.text(cName, 158, signatureY + 13, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text(values.nama_pengirim || SIGNER_NAME, 158, signatureY + 35, { align: "center" });
    doc.text(values.jabatan || SIGNER_TITLE, 158, signatureY + 41, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(8);
    doc.text(`${cName} - ${values.perihal || "Surat Keluar"}`, marginX, 282);

    return URL.createObjectURL(doc.output("blob"));
};

const renderTemplateContent = (
    templateContent: string,
    values: initValue,
    letterTypes: LetterTypeOption[],
    userName: string
) => {
    const selectedLetterType = letterTypes.find((item) => item.jenis_surat_id === values.id_jenis_surat);
    const replacements: Record<string, string> = {
        nomor_surat: values.nomor_surat || "",
        nomor_agenda: values.nomor_agenda || "",
        tanggal_surat: formatDateId(values.tanggal_surat),
        tanggal_kirim: formatDateId(values.tanggal_kirim),
        nama_jenis_surat: selectedLetterType?.nama_jenis_surat || "",
        perihal: values.perihal || "",
        tujuan: values.tujuan || "",
        instansi_tujuan: values.instansi_tujuan || "",
        media_pengiriman: values.media_pengiriman || "",
        isi_surat: values.isi_surat || "",
        nama_pengirim: values.nama_pengirim || userName || "",
        jabatan: values.jabatan || "",
    };

    return (templateContent || "").replace(/{{\s*([\w_]+)\s*}}/g, (_, key) => replacements[key] || "");
};

const Form = ({ state, setState, formik, toast, getData, apiSaveLetter, apiUploadPdf, apiDownloadDocx, apiExtractOcr, apiGetLetterTypes, apiGetTemplates, apiGetNomorPreview, apiGetConfig }: FormProps) => {
    const [letterTypeOptions, setLetterTypeOptions] = useState<LetterTypeOption[]>([]);
    const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
    const [nomorPreviewLoading, setNomorPreviewLoading] = useState(false);
    const [nomorSuratAuto, setNomorSuratAuto] = useState(true);
    const [suratInputMode, setSuratInputMode] = useState<"sistem" | "upload_pdf">("sistem");
    const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [downloadLoading, setDownloadLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getLetterTypeOptions = async () => {
        try {
            const data = await apiGetLetterTypes?.();
            setLetterTypeOptions(data || []);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Jenis surat gagal diambil");
        }
    };

    const getTemplateOptions = async () => {
        try {
            const data = await apiGetTemplates?.();
            const templates = (data || [])
                .map((item: any) => ({
                    ...item,
                    id_template: item.id_template || item.id,
                }))
                .filter((item: TemplateOption) => item.status === "active");

            setTemplateOptions(templates);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Template surat gagal diambil");
        }
    };

    const availableStatusOptions = useMemo(() => {
        const manualOptions = [
            { label: "Draft", value: "draft" },
            { label: "Terkirim", value: "terkirim" },
            { label: "Selesai", value: "selesai" },
        ];

        const currentStatus = formik.values.status;
        if (currentStatus && !manualOptions.some((o) => o.value === currentStatus)) {
            const autoLabels: Record<string, string> = {
                menunggu_approval: "Menunggu Approval",
                disetujui: "Disetujui",
                ditolak: "Ditolak",
            };
            return [
                {
                    label: autoLabels[currentStatus] || String(currentStatus),
                    value: currentStatus,
                },
                ...manualOptions,
            ];
        }

        return manualOptions;
    }, [formik.values.status]);

    const selectedTemplate = useMemo(
        () => templateOptions.find((item) => item.id_template === formik.values.id_template) || null,
        [templateOptions, formik.values.id_template]
    );

    const currentUnitKerjaId = useMemo(
        () =>
            (state.session?.user as any)?.id_unit_kerja ||
            (state.session?.user as any)?.IdUnitKerja ||
            (state.session?.user as any)?.unit_kerja_id ||
            null,
        [state.session]
    );

    const availableTemplateOptions = useMemo(() => {
        if (!formik.values.id_jenis_surat) return templateOptions;

        return templateOptions.filter(
            (item) => !item.jenis_surat_id || item.jenis_surat_id === formik.values.id_jenis_surat
        );
    }, [templateOptions, formik.values.id_jenis_surat]);

    const applyTemplateToPreview = () => {
        if (!selectedTemplate) {
            formik.setFieldValue("isi_surat_final", buildFinalLetterText(formik.values));
            return;
        }

        formik.setFieldValue(
            "isi_surat",
            extractIsiSuratFromFinal(
                renderTemplateContent(
                    selectedTemplate.isi_template,
                    formik.values,
                    letterTypeOptions,
                    getSessionSenderName(state)
                )
            )
        );
    };

    const generatePdfPreview = async () => {
        try {
            const pdfUrl = await buildPdfPreviewUrl(formik.values, apiGetConfig);

            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }

            setPdfPreviewUrl(pdfUrl);
            setPdfPreviewVisible(true);
        } catch (error: any) {
            showError(toast, error?.message || "Preview PDF gagal dibuat");
        }
    };

    const downloadDocx = async () => {
        if (!formik.values.id_surat_keluar) {
            showError(toast, "Simpan surat terlebih dahulu sebelum mengunduh DOCX");
            return;
        }

        setDownloadLoading(true);
        try {
            const response = await apiDownloadDocx?.(formik.values.id_surat_keluar, {
                "X-Level": "1",
                ...getFilterHeaders(),
            });

            const blob = new Blob([response?.data], {
                type: response?.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            const url = URL.createObjectURL(blob);
            const filename =
                getFilenameFromDisposition(response.headers["content-disposition"]) ||
                `${String(formik.values.nomor_surat || "surat-keluar").replace(/[^\w.-]+/g, "_")}.docx`;
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            let message = error?.response?.data?.message || error?.message || "Dokumen gagal diunduh";

            if (error?.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const parsed = JSON.parse(text);
                    message = parsed?.message || message;
                } catch {
                    message = "Dokumen gagal diunduh";
                }
            }

            showError(toast, message);
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const isEdit = Boolean(state.edit);
            const shouldUploadPdf = suratInputMode === "upload_pdf" && Boolean(input.file_surat);
            const isDirectUploadRequired = suratInputMode === "upload_pdf" && !isEdit && !input.file_surat;

            if (isDirectUploadRequired) {
                showError(toast, "File PDF atau Word (.docx) wajib diupload untuk Opsi Upload Eksternal");
                return;
            }

            const isiSuratFinal = buildFinalLetterText(input);
            const payload = mapOutgoingLetterPayload(
                {
                    ...input,
                    isi_surat_final: isiSuratFinal,
                    created_by: input.created_by || getUserId(state) as number | null,
                    updated_by: getUserId(state) as number | null,
                },
                isEdit
            );
            payload.nomor_surat_auto = nomorSuratAuto;

            const response = await apiSaveLetter?.(payload, isEdit, input.id_surat_keluar);

            const savedId = Number(
                response?.data?.data?.id_surat_keluar || input.id_surat_keluar || 0
            );
            let uploadErrorMessage = "";

            if (shouldUploadPdf && savedId> 0) {
                try {
                    await uploadDirectPdf(savedId, input.file_surat);
                } catch (uploadError: any) {
                    const uploadResponse = uploadError?.response?.data || uploadError;
                    uploadErrorMessage =
                        uploadResponse?.message ||
                        uploadError?.message ||
                        "PDF surat gagal diunggah";
                }
            }

            if (uploadErrorMessage) {
                showError(
                    toast,
                    `Surat keluar tersimpan, tetapi ${uploadErrorMessage}`
                );
            } else {
                showSuccess(
                    toast,
                    shouldUploadPdf
                        ? "Surat keluar dan PDF berhasil disimpan"
                        : (response?.data?.message || "Surat keluar berhasil disimpan")
                );
            }
            formik.resetForm();
            clearUploadedPdf();
            setSuratInputMode("sistem");
            setState((p) => ({
                ...p,
                add: false,
                edit: false,
                detail: false,
                detailData: null,
                selectedLetters: [],
            }));
            await getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Surat keluar gagal disimpan");
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const isFormFieldInvalid = (name: keyof initValue) =>
        Boolean(formik.touched[name] && formik.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) =>
        isFormFieldInvalid(name) ? (
            <small className="p-error flex align-items-center gap-1 mt-1">
                <i className="pi pi-exclamation-circle text-xs" />
                {formik.errors[name] as string}
            </small>
        ) : null;

    const clearUploadedPdf = () => {
        formik.setFieldValue("file_surat", null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const [isOcrExtracting, setIsOcrExtracting] = useState(false);

    const handleExternalFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!['pdf', 'docx', 'doc'].includes(ext)) {
            showError(toast, "Upload file eksternal hanya menerima format PDF atau Word (.docx)");
            clearUploadedPdf();
            return;
        }

        formik.setFieldValue("file_surat", file);
        setIsOcrExtracting(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await apiExtractOcr?.(formData);
            const meta = res?.data?.data;

            if (meta) {
                const hasExtractedData = Boolean(
                    meta.nomor_surat || meta.perihal || meta.tanggal_surat || meta.tujuan_surat || meta.isi_surat
                );

                if (hasExtractedData) {
                    showSuccess(toast, "Ekstraksi OCR berhasil. Data form telah terisi otomatis.");
                    if (meta.nomor_surat) {
                        formik.setFieldValue("nomor_surat", meta.nomor_surat);
                        setNomorSuratAuto(false);
                    }
                    if (meta.perihal) {
                        formik.setFieldValue("perihal", meta.perihal);
                    }
                    if (meta.tanggal_surat) {
                        formik.setFieldValue("tanggal_surat", meta.tanggal_surat);
                    }
                    if (meta.tujuan_surat) {
                        formik.setFieldValue("tujuan", meta.tujuan_surat);
                    }
                    if (meta.isi_surat) {
                        formik.setFieldValue("isi_surat", meta.isi_surat);
                    }
                } else {
                    showError(
                        toast,
                        "Berkas terdeteksi tanpa naskah teks terstruktur. Silakan isi form data surat secara manual."
                    );
                }
            }
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Gagal meng-ekstrak OCR metadata. Anda tetap dapat memasukkan data secara manual.");
        } finally {
            setIsOcrExtracting(false);
        }
    };

    const uploadDirectPdf = async (idSuratKeluar: number, file?: File | null) => {
        const selectedFile = file || formik.values.file_surat;
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("id_surat_keluar", String(idSuratKeluar));
        formData.append("nomor_surat", formik.values.nomor_surat || "");
        formData.append("perihal", formik.values.perihal || "");
        formData.append("File", selectedFile);

        const uploadedBy = getUserId(state);
        if (uploadedBy) formData.append("uploaded_by", String(uploadedBy));

        await apiUploadPdf?.(idSuratKeluar, formData);
    };

    useEffect(() => {
        if (state.submittedData) handleSave(state.submittedData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.submittedData]);

    useEffect(() => {
        if (state.add && !state.edit) {
            setNomorSuratAuto(true);
            if (!formik.values.status || formik.values.status === "draft") {
                formik.setFieldValue("status", "menunggu_approval");
            }
        }
    }, [state.add, state.edit]);

    useEffect(() => {
        if (state.edit && formik.values.id_surat_keluar) {
            setNomorSuratAuto(false);
        }
    }, [state.edit, formik.values.id_surat_keluar]);

    useEffect(() => {
        if (state.add || state.edit) {
            setSuratInputMode("sistem");
            clearUploadedPdf();
        } else {
            setSuratInputMode("sistem");
            clearUploadedPdf();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.add, state.edit]);

    useEffect(() => {
        if (suratInputMode === "upload_pdf") {
            if (formik.values.id_template) {
                formik.setFieldValue("id_template", null);
            }
            return;
        }

        if (formik.values.file_surat) {
            clearUploadedPdf();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suratInputMode]);

    useEffect(() => {
        if (!state.add && !state.edit) return;

        const senderName = getSessionSenderName(state);
        const senderPosition = getSessionSenderPosition(state);

        if (!formik.values.nama_pengirim && senderName) {
            formik.setFieldValue("nama_pengirim", senderName);
        }

        if (!formik.values.jabatan && senderPosition) {
            formik.setFieldValue("jabatan", senderPosition);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.add, state.edit, state.session]);

    useEffect(() => {
        if (!formik.values.id_jenis_surat || !formik.values.tanggal_surat) {
            setNomorPreviewLoading(false);
            return;
        }

        let cancelled = false;

        const loadNomorPreview = async () => {
            setNomorPreviewLoading(true);

            try {
                const nomorSurat = (await apiGetNomorPreview?.({
                    jenis_surat_id: formik.values.id_jenis_surat,
                    tanggal_surat: formik.values.tanggal_surat,
                    id_unit_kerja: currentUnitKerjaId,
                })) || "";

                if (cancelled) return;
                if (nomorSurat && (nomorSuratAuto || !formik.values.nomor_surat)) {
                    formik.setFieldValue("nomor_surat", nomorSurat);
                    setNomorSuratAuto(true);
                }
            } catch (error: any) {
                if (!cancelled) {
                    const e = error?.response?.data || error;
                    const message = String(e?.message || "");
                    if (!message.toLowerCase().includes("konfigurasi penomoran aktif belum tersedia")) {
                        showError(toast, message || "Preview nomor surat gagal diambil");
                    }
                }
            } finally {
                if (!cancelled) setNomorPreviewLoading(false);
            }
        };

        loadNomorPreview();

        return () => {
            cancelled = true;
            setNomorPreviewLoading(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.id_jenis_surat, formik.values.tanggal_surat, currentUnitKerjaId]);

    useEffect(() => {
        const nextContent = buildFinalLetterText(formik.values);

        if (formik.values.isi_surat_final !== nextContent) {
            formik.setFieldValue("isi_surat_final", nextContent);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        formik.values.nomor_surat,
        formik.values.nomor_agenda,
        formik.values.tanggal_surat,
        formik.values.tanggal_kirim,
        formik.values.id_jenis_surat,
        formik.values.perihal,
        formik.values.tujuan,
        formik.values.instansi_tujuan,
        formik.values.media_pengiriman,
        formik.values.isi_surat,
        formik.values.nama_pengirim,
        formik.values.jabatan,
        letterTypeOptions,
    ]);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
        };
    }, [pdfPreviewUrl]);

    useEffect(() => {
        getLetterTypeOptions();
        getTemplateOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
        <Dialog
            visible={state.add || state.edit}
            header={
                <div className="flex align-items-center gap-2">
                    <i className={`pi ${state.edit ? "pi-pencil" : "pi-send"} text-primary`} />
                    <span className="font-bold text-900">
                        {state.edit ? "Edit Surat Keluar" : "Tambah Surat Keluar"}
                    </span>
                </div>
            }
            modal
            style={{ width: "58rem", maxWidth: "95vw" }}
            onHide={() => {
                setState((p) => ({ ...p, add: false, edit: false }));
                setNomorSuratAuto(true);
                setSuratInputMode("sistem");
                clearUploadedPdf();
                if (pdfPreviewUrl) {
                    URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl("");
                }
                setPdfPreviewVisible(false);
                formik.resetForm();
            }}
            pt={{ header: { className: "border-bottom-1 surface-border pb-3" } }}>
            <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2 mt-0 fadein animation-duration-300">
                <div className="grid">
                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="nomor_surat" className="text-sm">
                            Nomor Surat <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="nomor_surat"
                            className={`w-full ${isFormFieldInvalid("nomor_surat") ? "p-invalid" : ""}`}
                            value={formik.values.nomor_surat}
                            onChange={(e) => {
                                setNomorSuratAuto(false);
                                formik.setFieldValue("nomor_surat", e.target.value);
                            }}
                            onBlur={() => formik.setFieldTouched("nomor_surat", true)}
                            placeholder="Contoh: 001/SK/VII/2026" />
                        <small className="text-color-secondary">
                            {nomorPreviewLoading
                                ? "Mengambil nomor otomatis..."
                                : "Nomor otomatis boleh diedit; saat disimpan sistem memakai nilai di field ini."}
                        </small>
                        {getFormErrorMessage("nomor_surat")}
                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label className="text-sm" style={{ fontFamily: "inherit" }}>Mode Input Surat</label>
                        <div className="surface-100 border-1 surface-border p-1 border-round-xl flex align-items-center w-full gap-1">
                            <button
                                type="button"
                                onClick={() => setSuratInputMode("sistem")}
                                style={{ fontFamily: "inherit" }}
                                className={`flex-1 py-2 px-3 border-round-lg text-center border-none cursor-pointer transition-all transition-duration-200 flex align-items-center justify-content-center gap-2 select-none ${
                                    suratInputMode === "sistem"
                                        ? "bg-white text-primary shadow-1 font-semibold"
                                        : "bg-transparent text-600 hover:text-900 font-medium"
                                }`}>
                                <i className="pi pi-file-edit text-sm" />
                                <span className="text-sm whitespace-nowrap">Opsi 1: Template Sistem</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSuratInputMode("upload_pdf")}
                                style={{ fontFamily: "inherit" }}
                                className={`flex-1 py-2 px-3 border-round-lg text-center border-none cursor-pointer transition-all transition-duration-200 flex align-items-center justify-content-center gap-2 select-none ${
                                    suratInputMode === "upload_pdf"
                                        ? "bg-white text-primary shadow-1 font-semibold"
                                        : "bg-transparent text-600 hover:text-900 font-medium"
                                }`}>
                                <i className="pi pi-upload text-sm" />
                                <span className="text-sm whitespace-nowrap">Opsi 2: Upload File (PDF/Word)</span>
                            </button>
                        </div>
                        <small className="text-color-secondary" style={{ fontFamily: "inherit" }}>
                            {suratInputMode === "sistem"
                                ? "Surat dibangun menggunakan template aplikasi otomatis."
                                : "Metadata surat di-ekstrak langsung dari berkas PDF / Word yang Anda upload."}
                        </small>
                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="tanggal_surat" className="text-sm">
                            Tanggal Surat <span className="text-red-500">*</span>
                        </label>
                        <Calendar
                            id="tanggal_surat"
                            className={`w-full ${isFormFieldInvalid("tanggal_surat") ? "p-invalid" : ""}`}
                            value={toDateValue(formik.values.tanggal_surat)}
                            onChange={(e) => formik.setFieldValue("tanggal_surat", toDateString(e.value))}
                            onBlur={() => formik.setFieldTouched("tanggal_surat", true)}
                            dateFormat="yy-mm-dd"
                            showIcon
                            placeholder="Pilih tanggal surat" />
                        {getFormErrorMessage("tanggal_surat")}
                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="tanggal_kirim" className="text-sm">Tanggal Kirim</label>
                        <Calendar
                            id="tanggal_kirim"
                            className="w-full"
                            value={toDateValue(formik.values.tanggal_kirim)}
                            onChange={(e) => formik.setFieldValue("tanggal_kirim", toDateString(e.value))}
                            dateFormat="yy-mm-dd"
                            showIcon
                            placeholder="Pilih tanggal kirim" />

                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="id_jenis_surat" className="text-sm">
                            Jenis Surat <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="id_jenis_surat"
                            className={`w-full ${isFormFieldInvalid("id_jenis_surat") ? "p-invalid" : ""}`}
                            value={formik.values.id_jenis_surat}
                            options={letterTypeOptions}
                            optionLabel="nama_jenis_surat"
                            optionValue="jenis_surat_id"
                            onChange={(e) => formik.setFieldValue("id_jenis_surat", e.value)}
                            onBlur={() => formik.setFieldTouched("id_jenis_surat", true)}
                            placeholder="Pilih jenis surat"
                            filter
                            showClear />
                        {getFormErrorMessage("id_jenis_surat")}
                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="status" className="text-sm">Status</label>
                        <Dropdown
                            id="status"
                            className="w-full"
                            value={formik.values.status}
                            options={availableStatusOptions}
                            onChange={(e) => formik.setFieldValue("status", e.value)}
                            placeholder="Pilih status" />
                        {getFormErrorMessage("status")}
                    </div>

                    <div className="col-12 flex flex-column gap-2">
                        <label htmlFor="perihal" className="text-sm">
                            Perihal <span className="text-red-500">*</span>
                        </label>
                        <InputTextarea
                            id="perihal"
                            className={`w-full ${isFormFieldInvalid("perihal") ? "p-invalid" : ""}`}
                            value={formik.values.perihal}
                            onChange={(e) => formik.setFieldValue("perihal", e.target.value)}
                            onBlur={() => formik.setFieldTouched("perihal", true)}
                            placeholder="Perihal surat"
                            rows={3}
                            style={{ resize: "none" }} />
                        {getFormErrorMessage("perihal")}
                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="tujuan" className="text-sm">
                            Tujuan <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="tujuan"
                            className={`w-full ${isFormFieldInvalid("tujuan") ? "p-invalid" : ""}`}
                            value={formik.values.tujuan}
                            onChange={(e) => formik.setFieldValue("tujuan", e.target.value)}
                            onBlur={() => formik.setFieldTouched("tujuan", true)}
                            placeholder="Nama penerima" />
                        {getFormErrorMessage("tujuan")}
                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="instansi_tujuan" className="text-sm">Instansi Tujuan</label>
                        <InputText
                            id="instansi_tujuan"
                            className="w-full"
                            value={formik.values.instansi_tujuan}
                            onChange={(e) => formik.setFieldValue("instansi_tujuan", e.target.value)}
                            placeholder="Nama instansi tujuan" />

                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="media_pengiriman" className="text-sm">Media Pengiriman</label>
                        <Dropdown
                            id="media_pengiriman"
                            className="w-full"
                            value={formik.values.media_pengiriman}
                            options={mediaPengirimanOptions}
                            onChange={(e) => formik.setFieldValue("media_pengiriman", e.value || "")}
                            placeholder="Pilih media pengiriman"
                            showClear />

                    </div>

                    {suratInputMode === "sistem" ? (
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="id_template" className="text-sm">Template Surat</label>
                            <Dropdown
                                id="id_template"
                                className="w-full"
                                value={formik.values.id_template}
                                options={availableTemplateOptions}
                                optionLabel="nama_template"
                                optionValue="id_template"
                                onChange={(e) => {
                                    formik.setFieldValue("id_template", e.value || null);
                                }}
                                placeholder="Pilih template"
                                filter
                                showClear />
    
                        </div>
                    ) : (
                        <div className="col-12 md:col-6 flex flex-column gap-2">
                            <label htmlFor="file_surat" className="text-sm">
                                Upload File Eksternal Surat (PDF / Word)
                            </label>
                            <input
                                ref={fileInputRef}
                                id="file_surat"
                                type="file"
                                accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                style={{ display: "none" }}
                                onChange={handleExternalFileSelection} />
                            <div className="flex align-items-stretch gap-2">
                                <InputText
                                    className="w-full"
                                    value={formik.values.file_surat?.name || "Belum ada file PDF/Word dipilih"}
                                    readOnly />
                                <Button type="button"
                                    icon={isOcrExtracting ? "pi pi-spin pi-spinner" : "pi pi-upload"}
                                    outlined
                                    aria-label="Pilih file eksternal"
                                    disabled={isOcrExtracting}
                                    onClick={() => fileInputRef.current?.click()} />
                                <Button type="button"
                                    icon="pi pi-times"
                                    severity="secondary"
                                    outlined
                                    aria-label="Hapus file eksternal"
                                    disabled={!formik.values.file_surat || isOcrExtracting}
                                    onClick={clearUploadedPdf} />
                            </div>
                            <small className="text-color-secondary">
                                {isOcrExtracting
                                    ? "Sedang meng-ekstrak metadata OCR dari file..."
                                    : formik.values.file_surat
                                    ? `File eksternal siap (${formatFileSize(formik.values.file_surat.size)}). Metadata form telah terisi otomatis.`
                                    : "Pilih file PDF atau Word (.docx) eksternal. Sistem akan meng-ekstrak metadata secara otomatis."}
                            </small>
                        </div>
                    )}

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="nama_pengirim" className="text-sm">Nama Pengirim</label>
                        <InputText
                            id="nama_pengirim"
                            className="w-full"
                            value={formik.values.nama_pengirim}
                            onChange={(e) => formik.setFieldValue("nama_pengirim", e.target.value)}
                            placeholder="Nama penandatangan / pengirim" />

                    </div>

                    <div className="col-12 md:col-6 flex flex-column gap-2">
                        <label htmlFor="jabatan" className="text-sm">Jabatan</label>
                        <InputText
                            id="jabatan"
                            className="w-full"
                            value={formik.values.jabatan}
                            onChange={(e) => formik.setFieldValue("jabatan", e.target.value)}
                            placeholder="Jabatan penandatangan / pengirim" />

                    </div>

                    <div className="col-12 flex flex-column gap-2 mb-2">
                        <label htmlFor="isi_surat" className="text-sm">Isi Surat</label>
                        <InputTextarea
                            id="isi_surat"
                            className="w-full"
                            rows={8}
                            value={formik.values.isi_surat}
                            onChange={(e) => {
                                formik.setFieldValue("isi_surat", e.target.value);
                            }}
                            placeholder="Tulis isi utama surat di sini"
                            autoResize />
                    </div>

                    {suratInputMode === "sistem" && (
                        <div className="col-12 flex flex-column gap-2 mb-2">
                            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                                <label htmlFor="isi_surat_final" className="text-sm">Preview Naskah Final</label>
                                <div className="flex align-items-center gap-2 flex-wrap">
                                    <Button type="button"
                                        icon="pi pi-sync"
                                        label="Terapkan Data"
                                        outlined
                                        disabled={!selectedTemplate}
                                        onClick={applyTemplateToPreview} />
                                    <Button type="button"
                                        icon="pi pi-file-pdf"
                                        label="Preview PDF"
                                        outlined
                                        disabled={!formik.values.isi_surat_final && !formik.values.isi_surat}
                                        onClick={generatePdfPreview} />
                                    <Button type="button"
                                        icon="pi pi-download"
                                        label="Unduh DOCX"
                                        outlined
                                        loading={downloadLoading}
                                        disabled={!formik.values.id_surat_keluar}
                                        onClick={downloadDocx} />
                                </div>
                            </div>
                            <InputTextarea
                                id="isi_surat_final"
                                className="w-full font-mono"
                                rows={10}
                                value={formik.values.isi_surat_final}
                                readOnly
                                autoResize />
                        </div>
                    )}
                </div>

                <div className="mt-2">
                    <Button type="submit" label={state?.edit ? 'Perbarui' : 'Simpan'} className="w-full p-button-primary" loading={state?.load} disabled={state?.load} />
                </div>
            </form>
        </Dialog>

        <Dialog
            visible={pdfPreviewVisible}
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-file-pdf text-primary" />
                    <span className="font-bold text-900">Preview PDF Surat</span>
                </div>
            }
            modal
            style={{ width: "92vw", maxWidth: "92rem", height: "90vh" }}
            onHide={() => {
                setPdfPreviewVisible(false);
                if (pdfPreviewUrl) {
                    URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl("");
                }
            }}
            pt={{ content: { className: "h-full" } }}>
            <div className="h-full">
                {pdfPreviewUrl && (
                    <PDFViewer
                        pdfUrl={pdfPreviewUrl}
                        paperSize="A4"
                        fileName={formik.values.nomor_surat || "preview-surat-keluar"} />
                )}
            </div>
        </Dialog>
        </>
    );
};

export default Form;
