import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { createNotification } from "../components/tools/notification_helper.js";
import { insertIncomingLetterTracking } from "../components/tools/tracking_helper.js";

const router = express.Router();
const AGENDA_PREFIX = "AGD";
const AGENDA_SEQUENCE_LENGTH = 4;

const getAgendaYear = () =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(new Date());

const generateAgendaNumber = async (trx) => {
  const cYear = getAgendaYear();
  const cPrefix = `${AGENDA_PREFIX}-${cYear}-`;
  const oLastAgenda = await trx("trx_surat_masuk")
    .select("nomor_agenda")
    .where("nomor_agenda", "like", `${cPrefix}%`)
    .orderBy("nomor_agenda", "desc")
    .forUpdate()
    .first();

  const cLastSequence = String(oLastAgenda?.nomor_agenda || "").slice(
    cPrefix.length
  );
  const nLastSequence = /^\d+$/.test(cLastSequence)
    ? Number(cLastSequence)
    : 0;
  const cNextSequence = String(nLastSequence + 1).padStart(
    AGENDA_SEQUENCE_LENGTH,
    "0"
  );
  return `${cPrefix}${cNextSequence}`;
};

const incomingLetterCreate = async (req, res) => {
  try {
    const oPayload = req.body || {};
    if (!oPayload.nomor_agenda) {
      delete oPayload.nomor_agenda;
    }

    const oValidation = {
      nomor_agenda: Joi.string().max(100).optional(),
      nomor_surat: Joi.string().max(100).required(),
      tanggal_surat: Joi.date().required(),
      tanggal_diterima: Joi.date().required(),
      nama_pengirim: Joi.string().max(150).required(),
      instansi_pengirim: Joi.string().max(150).allow(null, "").optional(),
      perihal: Joi.string().max(255).required(),
      keterangan_lampiran: Joi.string().allow(null, "").optional(),
      jenis_surat_id: Joi.number().required(),
      jenis_dokumen_id: Joi.number().allow(null).optional(),
      archive_classification_id: Joi.number().allow(null).optional(),
      confidentiality_level_id: Joi.number().allow(null).optional(),
      created_by: Joi.number().allow(null).optional(),
      updated_by: Joi.number().allow(null).optional(),
    };

    const oMessage = {
      "nomor_surat.required": "Nomor surat wajib diisi",
      "tanggal_surat.required": "Tanggal surat wajib diisi",
      "tanggal_diterima.required": "Tanggal diterima wajib diisi",
      "nama_pengirim.required": "Pengirim wajib diisi",
      "perihal.required": "Perihal wajib diisi",
      "jenis_surat_id.required": "Jenis surat wajib dipilih",
    };

    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      uniqueField: ["nomor_agenda"],
      table: "trx_surat_masuk",
      allowUnknown: false,
    });

    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate,
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
        field: "created_by",
        table: "mst_pengguna",
        key: "id_pengguna",
        label: "User pembuat",
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

      const oData = await DB(oReference.table)
        .where(oReference.key, value)
        .first();

      if (!oData) {
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: `${oReference.label} tidak ditemukan`,
        });
      }
    }

    const dNow = new Date();
    const nActorId =
      oPayload.created_by ||
      req?.auth?.id_pengguna ||
      req?.context?.id_pengguna ||
      1;

    const nIncomingLetterId = await DB.transaction(async (trx) => {
      const cNomorAgenda =
        oPayload.nomor_agenda || (await generateAgendaNumber(trx));
      const vaInserted = await trx("trx_surat_masuk").insert({
        nomor_agenda: cNomorAgenda,
        nomor_surat: oPayload.nomor_surat,
        tanggal_surat: oPayload.tanggal_surat,
        tanggal_diterima: oPayload.tanggal_diterima,
        nama_pengirim: oPayload.nama_pengirim,
        instansi_pengirim: oPayload.instansi_pengirim || null,
        perihal: oPayload.perihal,
        keterangan_lampiran: oPayload.keterangan_lampiran || null,
        jenis_surat_id: oPayload.jenis_surat_id,
        jenis_dokumen_id: oPayload.jenis_dokumen_id || null,
        klasifikasi_arsip_id: oPayload.archive_classification_id || null,
        tingkat_kerahasiaan_id: oPayload.confidentiality_level_id || null,
        status: "baru",
        created_by: nActorId,
        updated_by: oPayload.updated_by || nActorId,
        created_at: dNow,
        updated_at: dNow,
      });

      const nId = vaInserted[0];

      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: nId,
        disposisi_surat_id: null,
        nama_aksi: "surat_dibuat",
        dari_pengguna_id: null,
        kepada_pengguna_id: null,
        status_sebelumnya: null,
        status_saat_ini: "baru",
        catatan: "Surat masuk dibuat",
        processed_at: dNow,
        created_by: nActorId,
        created_at: dNow,
        updated_at: dNow,
      });

      return nId;
    });

    try {
      const branchId = req?.context?.id_cabang || req?.auth?.id_cabang;
      if (branchId) {
        const usersInBranch = await DB("mst_pengguna")
          .where("id_cabang", branchId)
          .andWhere("status", "active")
          .select("id_pengguna");

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
            judul: "Surat Masuk Baru",
            pesan: `Perihal: ${oPayload.perihal}`,
            tipe: "surat_masuk",
            tautan: "/correspondence/mail_in",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi surat masuk:", notifError);
    }

    return res.status(201).json({
      status: status.SUKSES,
      message: "Surat masuk berhasil dibuat",
      data: {
        surat_masuk_id: nIncomingLetterId,
      },
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat masuk gagal dibuat",
      error: error.message,
    };
    Logging(error, {
      file: "incoming_letter_create.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: "",
    });
    return res.status(500).json(oResult);
  }
};

router.post("/", incomingLetterCreate);
export default router;
