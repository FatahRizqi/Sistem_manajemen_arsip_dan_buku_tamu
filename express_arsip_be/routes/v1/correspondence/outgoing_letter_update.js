import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import {
  Logging,
  validatePayload,
} from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";

import { parseIndonesianDateToIso } from "./outgoing_letter_extract_ocr.js";
import { signLetterAutomatically } from "../components/tools/tte_service.js";

const router = express.Router();

const checkReference = async ({ table, key, value, label }) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const oData = await DB(table).where(key, value).first();
  return oData ? null : `${label} tidak ditemukan`;
};

const outgoingLetterUpdate = async (req, res) => {
  const cFile = "outgoing_letter_update.js";
  const cFunc = "outgoingLetterUpdate";
  const oPayload = {
    ...(req.params || {}),
    ...(req.body || {}),
  };

  if (oPayload.tanggal_surat) {
    oPayload.tanggal_surat = parseIndonesianDateToIso(oPayload.tanggal_surat) || oPayload.tanggal_surat;
  }
  if (oPayload.tanggal_kirim) {
    oPayload.tanggal_kirim = parseIndonesianDateToIso(oPayload.tanggal_kirim) || oPayload.tanggal_kirim;
  }

  try {
    const oValidation = {
      id_surat_keluar: Joi.number().required(),
      nomor_surat: Joi.string().max(100).optional(),
      nomor_agenda: Joi.string().max(100).optional(),
      nomor_surat_auto: Joi.boolean().optional(),
      tanggal_surat: Joi.date().optional(),
      tanggal_kirim: Joi.date().allow(null).optional(),
      id_jenis_surat: Joi.number().optional(),
      perihal: Joi.string().max(255).optional(),
      tujuan: Joi.string().max(150).optional(),
      instansi_tujuan: Joi.string().max(150).allow(null, "").optional(),
      media_pengiriman: Joi.string().max(100).allow(null, "").optional(),
      id_template: Joi.number().integer().positive().allow(null).optional(),
      isi_surat_final: Joi.string().allow(null, "").optional(),
      nama_pengirim: Joi.string().max(150).allow(null, "").optional(),
      jabatan: Joi.string().max(150).allow(null, "").optional(),
      status: Joi.string()
        .valid(
          "draft",
          "menunggu_approval",
          "disetujui",
          "ditolak",
          "terkirim",
          "selesai"
        )
        .optional(),
      updated_by: Joi.number().allow(null).optional(),
      catatan: Joi.string().allow(null, "").optional(),
    };

    const oMessage = {
      "id_surat_keluar.required": "id_surat_keluar wajib diisi",
      "id_surat_keluar.number": "id_surat_keluar harus berupa angka",
      "any.only": "Status surat keluar tidak valid",
    };

    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      uniqueField: ["nomor_agenda"],
      table: "trx_surat_keluar",
      excludedField: "id_surat_keluar",
      allowUnknown: false,
    });

    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate,
        datetime: datetime(),
      });
    }

    const oLetter = await DB("trx_surat_keluar")
      .where("id_surat_keluar", oPayload.id_surat_keluar)
      .whereNot("status", "dihapus")
      .first();

    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat keluar tidak ditemukan",
        datetime: datetime(),
      });
    }

    const vaReferenceChecks = [
      {
        table: "mst_jenis_surat",
        key: "jenis_surat_id",
        value: oPayload.id_jenis_surat,
        label: "Jenis surat",
      },
      {
        table: "mst_template_surat",
        key: "id_template",
        value: oPayload.id_template,
        label: "Template surat",
      },
      {
        table: "mst_pengguna",
        key: "id_pengguna",
        value: oPayload.updated_by,
        label: "User pengubah",
      },
    ];

    for (const oReference of vaReferenceChecks) {
      const cReferenceError = await checkReference(oReference);

      if (cReferenceError) {
        return res.status(400).json({
          status: status.BAD_REQUEST,
        message: cReferenceError,
        datetime: datetime(),
        });
      }
    }

    const dNow = new Date();
    const oUpdate = {
      nomor_surat: oPayload.nomor_surat,
      nomor_agenda: oPayload.nomor_agenda,
      tanggal_surat: oPayload.tanggal_surat,
      tanggal_kirim: oPayload.tanggal_kirim,
      id_jenis_surat: oPayload.id_jenis_surat,
      perihal: oPayload.perihal,
      tujuan: oPayload.tujuan,
      instansi_tujuan: oPayload.instansi_tujuan,
      media_pengiriman: oPayload.media_pengiriman,
      id_template: oPayload.id_template,
      isi_surat_final: oPayload.isi_surat_final,
      nama_pengirim: oPayload.nama_pengirim,
      jabatan: oPayload.jabatan,
      status: oPayload.status,
      updated_by: oPayload.updated_by || null,
      updated_at: dNow,
    };

    Object.keys(oUpdate).forEach((cKey) => {
      if (oUpdate[cKey] === undefined || cKey === "catatan") {
        delete oUpdate[cKey];
      }
    });

    await DB.transaction(async (trx) => {
      await trx("trx_surat_keluar")
        .where("id_surat_keluar", oPayload.id_surat_keluar)
        .update(oUpdate);

      await trx("trx_tracking_surat_keluar").insert({
        id_surat_keluar: oPayload.id_surat_keluar,
        status: oUpdate.status || oLetter.status,
        aktivitas: "surat_diupdate",
        catatan: oPayload.catatan || "Data surat keluar diperbarui",
        tanggal: dNow,
        dibuat_oleh: oPayload.updated_by || null,
        created_at: dNow,
        updated_at: dNow,
      });
    });

    if (oUpdate.status === "disetujui") {
      try {
        await signLetterAutomatically({
          idSuratKeluar: oPayload.id_surat_keluar,
          actorId: oPayload.updated_by || req?.auth?.id_pengguna || null,
          req,
        });
      } catch (tteError) {
        console.error("Gagal melakukan TTE otomatis saat update status disetujui:", tteError);
      }
    }

    return res.status(200).json({
      status: status.SUKSES,
        message: "Surat keluar berhasil diupdate",
        datetime: datetime(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
        message: "Surat keluar gagal diupdate",
        datetime: datetime(),
    };

    await Logging(error, {
      file: cFile,
      func: cFunc,
      request: JSON.stringify(oPayload),
      response: oResult,
      user: req?.auth?.nama_pengguna || "",
    });

    return res.status(500).json(oResult);
  }
};

router.put("/:id_surat_keluar?", outgoingLetterUpdate);

export default router;
