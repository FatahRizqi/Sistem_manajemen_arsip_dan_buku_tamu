import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { logDocumentChange } from "../components/tools/audit_trail_helper.js";
import { processDocumentContent } from "../../../core/components/ocr_service.js";
import { uploadDocument } from "../../../middleware/upload_document.js";

const router = express.Router();

const uploadDocumentVersion = async (req, res) => {
  const oPayload = req.body;

  try {
    const oFile = req.file;

    if (!oFile) {
      const oResult = {
        status: "error",
        message: "File dokumen wajib diunggah",
      };
      return res.status(400).json(oResult);
    }

    const cFilePath = oFile.path || `/uploads/documents/${oFile.filename}`;
    const cKodeDokumen = oPayload.kode_dokumen || oPayload.document_code;
    const nIdDokumen = oPayload.id_dokumen || oPayload.document_id;
    const cChangeNotes = oPayload.catatan_perubahan || oPayload.change_notes || null;
    const cUploadedBy =
      req?.auth?.nama_pengguna ||
      req?.context?.nama_pengguna ||
      oPayload.diunggah_oleh ||
      oPayload.uploaded_by ||
      "system";
    const dNow = new Date();

    if (!cKodeDokumen && !nIdDokumen) {
      const oResult = {
        status: "error",
        message: "kode_dokumen atau id_dokumen wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Verifikasi dokumen aktif
    let oDocument;
    if (cKodeDokumen) {
      oDocument = await DB("trx_dokumen")
        .where("kode_dokumen", cKodeDokumen)
        .where("status", "active")
        .first();
    } else {
      oDocument = await DB("trx_dokumen")
        .where("id_dokumen", nIdDokumen)
        .where("status", "active")
        .first();
    }

    if (!oDocument) {
      const oResult = {
        status: "error",
        message: "Document not found or already inactive",
      };
      return res.status(404).json(oResult);
    }

    // Hitung nomor versi berikutnya
    const oLastVersion = await DB("trx_versi_dokumen")
      .select("nomor_versi")
      .where("kode_dokumen", oDocument.kode_dokumen)
      .orderBy("nomor_versi", "desc")
      .first();

    const nVersionNumber = oLastVersion ? oLastVersion.nomor_versi + 1 : 1;

    const oData = {
      kode_dokumen: oDocument.kode_dokumen,
      nomor_versi: nVersionNumber,
      catatan_perubahan: cChangeNotes,
      file_path: cFilePath,
      diunggah_oleh: cUploadedBy,
      status_persetujuan: "pending",
      disetujui_oleh: null,
      disetujui_pada: null,
      catatan_persetujuan: null,
      tanggal_transaksi: dNow,
      created_at: dNow,
      updated_at: dNow,
    };

    const [nVersionId] = await DB("trx_versi_dokumen").insert(oData);

    // Audit Trail Log
    await logDocumentChange({
      kodeDokumen: oDocument.kode_dokumen,
      aksi: "version_upload",
      deskripsi: `Versi baru V${nVersionNumber} diunggah oleh ${cUploadedBy} (Menunggu persetujuan)`,
      detailJson: {
        id_versi: nVersionId,
        nomor_versi: nVersionNumber,
        catatan_perubahan: cChangeNotes,
        file_path: cFilePath,
      },
      dilakukanOleh: cUploadedBy,
      req,
    });

    // Auto-trigger OCR processing in background
    processDocumentContent(oDocument.kode_dokumen, nVersionId, cFilePath).catch((err) =>
      console.error("[OCR Upload Error]:", err.message)
    );

    const oResult = {
      status: "success",
      message: `Versi dokumen V${nVersionNumber} berhasil diunggah dan menunggu approval`,
      data: {
        id_versi: nVersionId,
        ...oData,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Gagal mengunggah versi dokumen",
      error: error.message,
    };

    Logging(error, {
      file: "document_version_upload.js",
      func: "uploadDocumentVersion",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", uploadDocument, uploadDocumentVersion);
export default router;
