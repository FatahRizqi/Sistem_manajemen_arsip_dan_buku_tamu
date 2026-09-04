import express from "express";
import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { insertIncomingLetterTracking } from "../components/tools/tracking_helper.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

const getCodeById = async (trx, table, idField, codeField, idValue) => {
  if (!idValue) return null;
  const oData = await trx(table).select(codeField).where(idField, idValue).first();
  return oData?.[codeField] || null;
};

const buildDocumentFilePath = (filePath = "") => {
  const cNormalizedPath = String(filePath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (cNormalizedPath.startsWith("uploads/")) {
    return `/${cNormalizedPath}`;
  }
  return `/uploads/${cNormalizedPath}`;
};

const incomingLetterArchive = async (req, res) => {
  try {
    const oPayload = req.body || {};
    const oValidation = {
      surat_masuk_id: Joi.number().required(),
      nama_pic: Joi.string().max(150).allow(null, "").optional(),
      lokasi_fisik: Joi.string().max(255).allow(null, "").optional(),
      archived_by: Joi.string().max(150).allow(null, "").optional(),
      created_by: Joi.number().allow(null).optional(),
    };

    const oMessage = {
      "surat_masuk_id.required": "surat_masuk_id wajib diisi",
      "surat_masuk_id.number": "surat_masuk_id harus berupa angka",
    };

    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      allowUnknown: false,
    });

    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate,
      });
    }

    const oLetter = await DB("trx_surat_masuk").where("surat_masuk_id", oPayload.surat_masuk_id).first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan",
      });
    }

    const oActiveFile = await DB("trx_file_surat_masuk")
      .where("surat_masuk_id", oPayload.surat_masuk_id)
      .where("status", "active")
      .orderBy("created_at", "desc")
      .orderBy("file_surat_masuk_id", "desc")
      .first();

    if (!oActiveFile) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Upload file surat terlebih dahulu sebelum diarsipkan",
      });
    }

    const oExistingDocument = await DB("trx_dokumen")
      .where("nomor_dokumen", oLetter.nomor_agenda)
      .where("status", "active")
      .first();

    if (oExistingDocument) {
      return res.status(200).json({
        status: status.SUKSES,
        message: "Surat masuk sudah pernah diarsipkan",
        data: {
          id_dokumen: oExistingDocument.id_dokumen,
          kode_dokumen: oExistingDocument.kode_dokumen,
          already_archived: true,
        },
      });
    }

    const dNow = new Date();
    const oResult = await DB.transaction(async (trx) => {
      const cDocumentTypeCode = "SURAT";
      const cClassificationCode = await getCodeById(trx, "mst_klasifikasi_arsip", "id_klasifikasi", "kode_klasifikasi", oLetter.klasifikasi_arsip_id);
      const cConfidentialityCode = await getCodeById(trx, "mst_tingkat_kerahasiaan", "id_tingkat_kerahasiaan", "kode_tingkat_kerahasiaan", oLetter.tingkat_kerahasiaan_id);

      const [nDocumentId] = await trx("trx_dokumen").insert({
        kode_klasifikasi: cClassificationCode,
        kode_jenis_dokumen: cDocumentTypeCode,
        kode_kategori_dokumen: null,
        kode_tingkat_kerahasiaan: cConfidentialityCode,
        kode_retensi: null,
        nama_dokumen: oLetter.perihal,
        nomor_dokumen: oLetter.nomor_agenda,
        tanggal: oLetter.tanggal_surat || oLetter.tanggal_diterima,
        tanggal_kedaluwarsa: null,
        nama_pic: oPayload.nama_pic || req?.context?.nama_pengguna || oLetter.nama_pengirim || "Sekretariat",
        lokasi_fisik: oPayload.lokasi_fisik || null,
        id_cabang: oLetter.id_cabang || (req.context ? req.context.id_cabang : null),
        qr_code: `DOC-${uuidv4()}`,
        status: "active",
        created_at: dNow,
        updated_at: dNow, tz: typeof req !== 'undefined' ? (req.context?.tz || req.headers?.['x-tz'] || 'Asia/Jakarta') : 'Asia/Jakarta',
      });

      const cKodeDokumen = `${oLetter.nomor_agenda}-${nDocumentId}`;
      await trx("trx_dokumen").where("id_dokumen", nDocumentId).update({
        kode_dokumen: cKodeDokumen,
      });

      const [nVersionId] = await trx("trx_versi_dokumen").insert({
        kode_dokumen: cKodeDokumen,
        nomor_versi: 1,
        catatan_perubahan: `Diarsipkan dari surat masuk ${oLetter.nomor_agenda}`,
        file_path: buildDocumentFilePath(oActiveFile.path_file),
        diunggah_oleh: oPayload.archived_by || req?.context?.Username || "system",
        status_persetujuan: "approved",
        disetujui_oleh: oPayload.archived_by || req?.context?.Username || "system",
        disetujui_pada: dNow,
        catatan_persetujuan: "Versi awal dari file surat masuk",
        tanggal_transaksi: dNow,
        created_at: dNow,
        updated_at: dNow, tz: typeof req !== 'undefined' ? (req.context?.tz || req.headers?.['x-tz'] || 'Asia/Jakarta') : 'Asia/Jakarta',
      });

      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: oLetter.surat_masuk_id,
        disposisi_surat_id: null,
        nama_aksi: "surat_diarsipkan",
        dari_pengguna_id: null,
        kepada_pengguna_id: null,
        status_sebelumnya: oLetter.status,
        status_saat_ini: oLetter.status,
        catatan: `Surat masuk diarsipkan sebagai dokumen ${cKodeDokumen}`,
        processed_at: dNow,
        created_by: oPayload.created_by || null,
        created_at: dNow,
        updated_at: dNow, tz: typeof req !== 'undefined' ? (req.context?.tz || req.headers?.['x-tz'] || 'Asia/Jakarta') : 'Asia/Jakarta',
      });

      return {
        id_dokumen: nDocumentId,
        kode_dokumen: cKodeDokumen,
        id_versi: nVersionId,
      };
    });

    // Kirim notifikasi ke user di cabang terkait dan Superadmin
    try {
      const perihal = oLetter.perihal || `Surat Masuk #${oLetter.surat_masuk_id}`;

      const usersInBranch = oLetter.id_cabang
        ? await DB("mst_pengguna")
            .where("id_cabang", oLetter.id_cabang)
            .andWhere("status", "active")
            .select("id_pengguna")
        : [];

      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      const targetUserIds = new Set([
        ...usersInBranch.map((u) => u.id_pengguna),
        ...superadmins.map((u) => u.id_pengguna),
      ]);

      for (const userId of targetUserIds) {
        await createNotification({
          id_pengguna: userId,
          judul: "Surat Masuk Diarsipkan",
          pesan: `Surat "${perihal}" telah diarsipkan menjadi dokumen ${oResult?.kode_dokumen || ""}.`,
          tipe: "surat_masuk",
          tautan: "/edms/documents",
        });
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi pengarsipan surat masuk:", notifError.message);
    }

    return res.status(201).json({
      status: status.SUKSES,
      message: "Surat masuk berhasil diarsipkan menjadi dokumen",
      data: oResult,
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat masuk gagal diarsipkan",
      error: error.message,
    };
    Logging(error, {
      file: "incoming_letter_archive.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: "",
    });
    return res.status(500).json(oResult);
  }
};

router.post("/", incomingLetterArchive);
export default router;
