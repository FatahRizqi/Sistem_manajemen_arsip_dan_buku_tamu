import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { insertIncomingLetterTracking } from "../components/tools/tracking_helper.js";

const router = express.Router();
const incomingLetterUpdate = async (req, res) => {
  try {
    const oPayload = req.body || {};
    if (!oPayload.surat_masuk_id && oPayload.incoming_letter_id) {
      oPayload.surat_masuk_id = oPayload.incoming_letter_id;
      delete oPayload.incoming_letter_id;
    }
    const oValidation = {
      surat_masuk_id: Joi.number().required(),
      nomor_agenda: Joi.string().max(100).optional(),
      nomor_surat: Joi.string().max(100).optional(),
      tanggal_surat: Joi.date().optional(),
      tanggal_diterima: Joi.date().optional(),
      nama_pengirim: Joi.string().max(150).optional(),
      instansi_pengirim: Joi.string().max(150).allow(null, "").optional(),
      perihal: Joi.string().max(255).optional(),
      keterangan_lampiran: Joi.string().allow(null, "").optional(),
      jenis_surat_id: Joi.number().allow(null).optional(),
      jenis_dokumen_id: Joi.number().allow(null).optional(),
      archive_classification_id: Joi.number().allow(null).optional(),
      confidentiality_level_id: Joi.number().allow(null).optional(),
      status: Joi.string().valid("baru", "diproses", "didisposisi", "selesai").optional(),
      updated_by: Joi.number().allow(null).optional(),
    };
    const oMessage = {
      "surat_masuk_id.required": "id surat masuk wajib diisi",
      "surat_masuk_id.number": "id surat masuk harus berupa angka",
      "nomor_agenda.max": "Nomor agenda maksimal 100 karakter",
      "nomor_surat.max": "Nomor surat maksimal 100 karakter",
      "nama_pengirim.max": "Nama pengirim maksimal 150 karakter",
      "perihal.max": "Perihal maksimal 255 karakter",
      "status.valid": "status hanya boleh baru, diproses, didisposisi, atau selesai",
    };
    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      uniqueField: ["nomor_agenda"],
      table: "trx_surat_masuk",
      excludedField: "surat_masuk_id",
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
    const vaReferenceChecks = [
      {
        field: "jenis_surat_id",
        table: "mst_jenis_surat",
        key: "jenis_surat_id",
        label: "Jenis surat",
      },
      {
        field: "jenis_dokumen_id",
        table: "mst_jenis_dokumen",
        key: "id_jenis_dokumen",
        label: "Tipe dokumen",
      },
      {
        field: "archive_classification_id",
        table: "mst_klasifikasi_arsip",
        key: "id_klasifikasi",
        label: "Klasifikasi arsip",
      },
      {
        field: "confidentiality_level_id",
        table: "mst_tingkat_kerahasiaan",
        key: "id_tingkat_kerahasiaan",
        label: "Level kerahasiaan",
      },
      {
        field: "updated_by",
        table: "mst_pengguna",
        key: "id_pengguna",
        label: "User pengubah",
      },
    ];
    for (const oReference of vaReferenceChecks) {
      const value = oPayload[oReference.field];
      if (value === undefined || value === null || value === "") {
        continue;
      }
      const oData = await DB(oReference.table).where(oReference.key, value).first();
      if (!oData) {
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: `${oReference.label} tidak ditemukan`,
        });
      }
    }
    const dNow = new Date();
    const oUpdate = {
      nomor_agenda: oPayload.nomor_agenda,
      nomor_surat: oPayload.nomor_surat,
      tanggal_surat: oPayload.tanggal_surat,
      tanggal_diterima: oPayload.tanggal_diterima,
      nama_pengirim: oPayload.nama_pengirim,
      instansi_pengirim: oPayload.instansi_pengirim,
      perihal: oPayload.perihal,
      keterangan_lampiran: oPayload.keterangan_lampiran,
      jenis_surat_id: oPayload.jenis_surat_id,
      jenis_dokumen_id: oPayload.jenis_dokumen_id,
      klasifikasi_arsip_id: oPayload.archive_classification_id,
      tingkat_kerahasiaan_id: oPayload.confidentiality_level_id,
      status: oPayload.status,
      updated_by: oPayload.updated_by || null,
      updated_at: dNow,
    };
    Object.keys(oUpdate).forEach((cKey) => {
      if (oUpdate[cKey] === undefined) {
        delete oUpdate[cKey];
      }
    });

    await DB.transaction(async (trx) => {
      await trx("trx_surat_masuk")
        .where("surat_masuk_id", oPayload.surat_masuk_id)
        .update(oUpdate);

      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: oPayload.surat_masuk_id,
        disposisi_surat_id: null,
        nama_aksi: "surat_diupdate",
        dari_pengguna_id: null,
        kepada_pengguna_id: null,
        status_sebelumnya: oLetter.status,
        status_saat_ini: oUpdate.status || oLetter.status,
        catatan: "Data surat masuk diperbarui",
        processed_at: dNow,
        created_by: oPayload.updated_by || null,
        created_at: dNow,
        updated_at: dNow,
      });
    });
    return res.status(200).json({
      status: status.SUKSES,
      message: "Surat masuk berhasil diupdate",
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat masuk gagal diupdate",
      error: error.message,
    };
    Logging(error, {
      file: "incoming_letter_update.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: "",
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", incomingLetterUpdate);
export default router;
