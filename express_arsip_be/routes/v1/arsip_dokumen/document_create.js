import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { v4 as uuidv4 } from "uuid";
import { formatDateSystem } from "../components/tools/general.js";
import { logDocumentChange } from "../components/tools/audit_trail_helper.js";
import { processDocumentContent } from "../../../core/components/ocr_service.js";
import { uploadDocument } from "../../../middleware/upload_document.js";

const router = express.Router();

const createDocument = async (req, res) => {
  const oPayload = req.body;

  try {
    const cDocumentName = oPayload.nama_dokumen;
    const cDocumentNumber = oPayload.nomor_dokumen;
    const dDocumentDate = oPayload.tanggal;
    const cDocumentTypeCode = oPayload.kode_jenis_dokumen || null;
    const cDocumentCategoryCode = oPayload.kode_kategori_dokumen || null;
    const cClassificationCode = oPayload.kode_klasifikasi || null;
    const cConfidentialityLevelCode = oPayload.kode_tingkat_kerahasiaan || null;
    let cRetentionCode = oPayload.kode_retensi || null;
    const cPhysicalLocation = oPayload.lokasi_fisik || null;
    const dNow = new Date();

    // Auto-assign JRA code and get retention years
    let nTahunRetensi = null;
    if (cDocumentCategoryCode) {
      const oRetention = await DB("mst_jadwal_retensi")
        .where("kode_kategori_dokumen", cDocumentCategoryCode)
        .where("status", "active")
        .first();
      if (oRetention) {
        cRetentionCode = oRetention.kode_retensi;
        nTahunRetensi = oRetention.tahun_retensi;
      }
    }

    // Auto-map transaction date to document date
    const dTransactionDate = dDocumentDate ? new Date(dDocumentDate) : null;

    // Auto-calculate expiration date based on document date and JRA
    let dExpiredDate = null;
    if (dDocumentDate && nTahunRetensi !== null) {
      const dExp = new Date(dDocumentDate);
      dExp.setFullYear(dExp.getFullYear() + nTahunRetensi);
      dExpiredDate = dExp;
    }

    // Validasi wajib
    if (!cDocumentName || !cDocumentNumber || !dDocumentDate) {
      const oResult = {
        status: "error",
        message: "nama_dokumen, nomor_dokumen, dan tanggal wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Logika Fallback Pintar untuk Variabel cPic
    let cPic = oPayload.nama_pic;
    if (typeof cPic === "string") {
      cPic = cPic.trim();
    }
    if (!cPic) {
      cPic = req.auth?.nama_lengkap || "System Fallback (User Master Pending)";
    }

    // Cek duplikat nomor dokumen
    const oExisting = await DB("trx_dokumen")
      .where("nomor_dokumen", cDocumentNumber)
      .where("status", "active")
      .first();

    if (oExisting) {
      const oResult = {
        status: "error",
        message: `Nomor dokumen ${cDocumentNumber} sudah terdaftar`,
      };
      return res.status(422).json(oResult);
    }

    // Extract id_cabang from active branch header (x-filter-cabang) or fallback to user context
    let nIdCabang = null;
    const cFilterCabang = req.headers["x-filter-cabang"];
    if (cFilterCabang && cFilterCabang !== "null" && cFilterCabang !== "undefined") {
      const firstId = parseInt(String(cFilterCabang).split(",")[0], 10);
      if (!isNaN(firstId)) nIdCabang = firstId;
    }
    if (!nIdCabang) {
      nIdCabang = req.context?.id_cabang || req.auth?.id_cabang || null;
    }

    const nUserId = req.context?.id_pengguna || req.auth?.id_pengguna || req.auth?.id || null;
    const cTz = req.headers["x-tz"] || "Asia/Jakarta";

    const oData = {
      id_cabang: nIdCabang,
      kode_klasifikasi: cClassificationCode,
      kode_jenis_dokumen: cDocumentTypeCode,
      kode_kategori_dokumen: cDocumentCategoryCode,
      kode_tingkat_kerahasiaan: cConfidentialityLevelCode,
      kode_retensi: cRetentionCode,
      nama_dokumen: cDocumentName,
      nomor_dokumen: cDocumentNumber,
      tanggal: dDocumentDate,
      tanggal_transaksi: dTransactionDate,
      tanggal_kedaluwarsa: dExpiredDate,
      nama_pic: cPic,
      lokasi_fisik: cPhysicalLocation,
      qr_code: oPayload.qr_code || null,
      status: "active",
      created_by: nUserId,
      updated_by: nUserId,
      tz: cTz,
      created_at: dNow,
      updated_at: dNow,
    };

    let createdKodeDokumen = "";
    let firstVersionId = null;
    let uploadedFilePath = null;

    const nDocumentId = await DB.transaction(async (trx) => {
      const cClassification = cClassificationCode || "KLS";
      const cDocType = cDocumentTypeCode || "DOC";
      const cDateStr = formatDateSystem(dNow, "yyyyMMdd");
      const cPrefix = `${cClassification}/${cDocType}/${cDateStr}/`;

      const oLastDoc = await trx("trx_dokumen")
        .select("kode_dokumen")
        .where("kode_dokumen", "like", `${cPrefix}%`)
        .orderBy("id_dokumen", "desc")
        .first();

      let nSeq = 1;
      if (oLastDoc && oLastDoc.kode_dokumen) {
        const parts = oLastDoc.kode_dokumen.split("/");
        const lastSeqStr = parts[parts.length - 1];
        const lastSeq = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeq)) {
          nSeq = lastSeq + 1;
        }
      }
      const cSeqPadded = String(nSeq).padStart(4, "0");
      const cKodeDokumen = `${cPrefix}${cSeqPadded}`;
      createdKodeDokumen = cKodeDokumen;

      // Insert directly with the pre-generated document code
      const [nId] = await trx("trx_dokumen").insert({
        ...oData,
        kode_dokumen: cKodeDokumen,
      });

      // Automatically insert version v1 if a file is uploaded
      if (req.file) {
        const cFilePath = req.file.path || `/uploads/documents/${req.file.filename}`;
        uploadedFilePath = cFilePath;
        const [nVerId] = await trx("trx_versi_dokumen").insert({
          kode_dokumen: cKodeDokumen,
          nomor_versi: 1,
          catatan_perubahan: "Versi Awal (Unggahan Perdana)",
          file_path: cFilePath,
          diunggah_oleh: cPic,
          status_persetujuan: "approved", // Auto-approved for first version
          disetujui_oleh: cPic,
          disetujui_pada: dNow,
          tanggal_transaksi: dNow,
          created_at: dNow,
          updated_at: dNow,
        });
        firstVersionId = nVerId;
      }

      return nId;
    });

    // Log to Audit Trail
    await logDocumentChange({
      kodeDokumen: createdKodeDokumen,
      aksi: "create",
      deskripsi: `Dokumen baru '${cDocumentName}' (${cDocumentNumber}) berhasil didaftarkan`,
      detailJson: { nama_dokumen: cDocumentName, nomor_dokumen: cDocumentNumber, nama_pic: cPic },
      dilakukanOleh: cPic,
      req,
    });

    // Auto-trigger OCR processing in background if file exists
    if (createdKodeDokumen && firstVersionId && uploadedFilePath) {
      processDocumentContent(createdKodeDokumen, firstVersionId, uploadedFilePath).catch(
        (err) => console.error("[OCR Background Error]:", err.message)
      );
    }

    const oResult = {
      status: "success",
      message: "Document metadata registered successfully",
      data: {
        id_dokumen: nDocumentId,
        kode_dokumen: createdKodeDokumen,
        nama_pic: cPic,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    Logging("error", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to save document metadata",
      error: error.message,
    });
  }
};

router.post("/", uploadDocument, createDocument);
export default router;
