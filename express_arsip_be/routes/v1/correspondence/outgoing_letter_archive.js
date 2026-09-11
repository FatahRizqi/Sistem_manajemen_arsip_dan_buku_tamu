import express from "express";
import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const buildDocumentFilePath = (filePath = "") => {
  const cNormalizedPath = String(filePath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (cNormalizedPath.startsWith("uploads/")) {
    return `/${cNormalizedPath}`;
  }
  return `/uploads/${cNormalizedPath}`;
};
const outgoingLetterArchive = async (req, res) => {
  try {
    const oPayload = req.body || {};
    const oValidation = {
      id_surat_keluar: Joi.number().required(),
      nama_pic: Joi.string().max(150).allow(null, "").optional(),
      lokasi_fisik: Joi.string().max(255).allow(null, "").optional(),
      archived_by: Joi.string().max(150).allow(null, "").optional(),
      created_by: Joi.number().allow(null).optional()
    };
    const oMessage = {
      "id_surat_keluar.required": "id_surat_keluar wajib diisi",
      "id_surat_keluar.number": "id_surat_keluar harus berupa angka"
    };
    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      allowUnknown: false
    });
    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate
      });
    }
    const oLetter = await DB("trx_surat_keluar").where("id_surat_keluar", oPayload.id_surat_keluar).first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat keluar tidak ditemukan"
      });
    }
    const oActiveFile = await DB("trx_file_surat_keluar").where("id_surat_keluar", oPayload.id_surat_keluar).where("status", "active").orderBy("created_at", "desc").orderBy("id_file_surat_keluar", "desc").first();
    if (!oActiveFile) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Upload file surat terlebih dahulu sebelum diarsipkan"
      });
    }
    const oExistingDocument = await DB("trx_dokumen").where("nomor_dokumen", oLetter.nomor_agenda).where("status", "active").first();
    if (oExistingDocument) {
      return res.status(200).json({
        status: status.SUKSES,
        message: "Surat keluar sudah pernah diarsipkan",
        data: {
          id_dokumen: oExistingDocument.id_dokumen,
          kode_dokumen: oExistingDocument.kode_dokumen,
          already_archived: true
        }
      });
    }
    const dNow = new Date();
    const nActorId = oPayload.created_by || req?.auth?.id_pengguna || null;
    const cActorName = oPayload.archived_by || req?.auth?.nama_lengkap || "system";
    const oResult = await DB.transaction(async trx => {
      const cDocumentTypeCode = "SURAT";
      const oFirstClass = await trx("mst_klasifikasi_arsip").first();
      const oFirstConf = await trx("mst_tingkat_kerahasiaan").first();
      const cClassificationCode = oFirstClass?.kode_klasifikasi || null;
      const cConfidentialityCode = oFirstConf?.kode_tingkat_kerahasiaan || null;
      const [nDocumentId] = await trx("trx_dokumen").insert({
        kode_klasifikasi: cClassificationCode,
        kode_jenis_dokumen: cDocumentTypeCode,
        kode_kategori_dokumen: null,
        kode_tingkat_kerahasiaan: cConfidentialityCode,
        kode_retensi: null,
        nama_dokumen: oLetter.perihal,
        nomor_dokumen: oLetter.nomor_agenda,
        tanggal: oLetter.tanggal_surat,
        tanggal_kedaluwarsa: null,
        nama_pic: oPayload.nama_pic || cActorName,
        lokasi_fisik: oPayload.lokasi_fisik || null,
        qr_code: `DOC-${uuidv4()}`,
        status: "active",
        created_at: dNow,
        updated_at: dNow

      });
      const cKodeDokumen = `${oLetter.nomor_agenda}-${nDocumentId}`;
      await trx("trx_dokumen").where("id_dokumen", nDocumentId).update({
        kode_dokumen: cKodeDokumen
      });
      const [nVersionId] = await trx("trx_versi_dokumen").insert({
        kode_dokumen: cKodeDokumen,
        nomor_versi: 1,
        catatan_perubahan: `Diarsipkan dari surat keluar ${oLetter.nomor_agenda}`,
        file_path: buildDocumentFilePath(oActiveFile.path_file),
        diunggah_oleh: cActorName,
        status_persetujuan: "approved",
        disetujui_oleh: cActorName,
        disetujui_pada: dNow,
        catatan_persetujuan: "Versi awal dari file surat keluar",
        tanggal_transaksi: dNow,
        created_at: dNow,
        updated_at: dNow

      });
      await trx("trx_tracking_surat_keluar").insert({
        id_surat_keluar: oLetter.id_surat_keluar,
        status: oLetter.status,
        aktivitas: "surat_diarsipkan",
        catatan: `Surat keluar diarsipkan sebagai dokumen ${cKodeDokumen}`,
        tanggal: dNow,
        dibuat_oleh: nActorId,
        created_at: dNow,
        updated_at: dNow

      });
      return {
        id_dokumen: nDocumentId,
        kode_dokumen: cKodeDokumen,
        id_versi: nVersionId
      };
    });
    return res.status(201).json({
      status: status.SUKSES,
      message: "Surat keluar berhasil diarsipkan menjadi dokumen",
      data: oResult
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat keluar gagal diarsipkan",
      error: error.message
    };
    Logging(error, {
      file: "outgoing_letter_archive.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", outgoingLetterArchive);
export default router;
