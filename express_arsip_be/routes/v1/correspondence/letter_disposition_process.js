import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { insertIncomingLetterTracking } from "../components/tools/tracking_helper.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();
const letterDispositionProcess = async (req, res) => {
  try {
    const oPayload = req.body || {};
    const oValidation = {
      disposisi_id: Joi.number().required(),
      process_note: Joi.string().allow(null, "").optional(),
      updated_by: Joi.number().allow(null).optional(),
    };
    const oMessage = {
      "disposisi_id.required": "id disposisi wajib diisi",
      "disposisi_id.number": "id disposisi harus berupa angka",
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
    const oDisposition = await DB("trx_disposisi_surat")
      .where("disposisi_surat_id", oPayload.disposisi_id)
      .first();
    if (!oDisposition) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Disposisi surat tidak ditemukan",
      });
    }
    if (oDisposition.status === "selesai") {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Disposisi sudah selesai dan tidak dapat diproses ulang",
      });
    }
    if (oDisposition.status === "diproses") {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Disposisi sudah dalam proses",
      });
    }
    const oLetter = await DB("trx_surat_masuk")
      .where("surat_masuk_id", oDisposition.surat_masuk_id)
      .first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan",
      });
    }
    if (oLetter.status === "selesai") {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk sudah selesai dan disposisi tidak dapat diproses",
      });
    }
    const dNow = new Date();
    const nActorId = oPayload.updated_by || req?.auth?.id_pengguna || null;

    await DB.transaction(async (trx) => {
      await trx("trx_disposisi_surat")
        .where("disposisi_surat_id", oPayload.disposisi_id)
        .update({
          status: "diproses",
          catatan_tindakan: oPayload.process_note || null,
          received_at: oDisposition.received_at || dNow,
          processed_at: dNow,
          updated_by: nActorId,
          updated_at: dNow,
        });

      await trx("trx_surat_masuk")
        .where("surat_masuk_id", oDisposition.surat_masuk_id)
        .update({
          status: "diproses",
          updated_by: nActorId,
          updated_at: dNow,
        });

      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: oDisposition.surat_masuk_id,
        disposisi_surat_id: oPayload.disposisi_id,
        nama_aksi: "disposisi_diproses",
        dari_pengguna_id: oDisposition.dari_pengguna_id || null,
        kepada_pengguna_id: oDisposition.kepada_pengguna_id || null,
        status_sebelumnya: oLetter.status,
        status_saat_ini: "diproses",
        catatan: oPayload.process_note || "Disposisi mulai diproses",
        processed_at: dNow,
        created_by: nActorId,
        created_at: dNow,
        updated_at: dNow,
      });
    });

    // Kirim notifikasi ke pemberi disposisi (pimpinan) dan Superadmin
    try {
      const perihal = oLetter.perihal || `Surat Masuk #${oLetter.surat_masuk_id}`;

      if (oDisposition.dari_pengguna_id) {
        await createNotification({
          id_pengguna: oDisposition.dari_pengguna_id,
          judul: "Disposisi Mulai Diproses",
          pesan: `Disposisi surat "${perihal}" mulai DIPROSES dengan catatan: ${oPayload.process_note || "Tidak ada catatan"}.`,
          tipe: "disposisi",
          tautan: "/correspondence/mail_in/data",
        });
      }

      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        if (sa.id_pengguna !== oDisposition.dari_pengguna_id) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: "Disposisi Mulai Diproses",
            pesan: `Disposisi surat "${perihal}" mulai diproses.`,
            tipe: "disposisi",
            tautan: "/correspondence/mail_in/data",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi disposisi diproses:", notifError.message);
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Disposisi surat berhasil diproses",
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Disposisi surat gagal diproses",
      error: error.message,
    };
    Logging(error, {
      file: "letter_disposition_process.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: "",
    });
    return res.status(500).json(oResult);
  }
};

router.post("/", letterDispositionProcess);
export default router;
