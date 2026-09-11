import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { insertIncomingLetterTracking } from "../components/tools/tracking_helper.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();
const letterDispositionComplete = async (req, res) => {
  try {
    const oPayload = req.body || {};
    oPayload.disposisi_id =
      oPayload.disposisi_id ||
      oPayload.disposisi_surat_id ||
      oPayload.disid_jabatan ||
      oPayload.disposition_id;
    delete oPayload.disposisi_surat_id;
    delete oPayload.disid_jabatan;
    delete oPayload.disposition_id;

    const oValidation = {
      disposisi_id: Joi.number().required(),
      complete_note: Joi.string().allow(null, "").optional(),
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
        message: "Disposisi sudah selesai",
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
        message: "Surat masuk sudah selesai",
      });
    }
    const dNow = new Date();
    const nActorId = oPayload.updated_by || req?.auth?.id_pengguna || null;
    let bAllDispositionCompleted = false;

    await DB.transaction(async (trx) => {
      await trx("trx_disposisi_surat")
        .where("disposisi_surat_id", oPayload.disposisi_id)
        .update({
          status: "selesai",
          catatan_tindakan: oPayload.complete_note || null,
          received_at: oDisposition.received_at || dNow,
          processed_at: oDisposition.processed_at || dNow,
          completed_at: dNow,
          updated_by: nActorId,
          updated_at: dNow,
        });

      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: oDisposition.surat_masuk_id,
        disposisi_surat_id: oPayload.disposisi_id,
        nama_aksi: "disposisi_selesai",
        dari_pengguna_id: oDisposition.dari_pengguna_id || null,
        kepada_pengguna_id: oDisposition.kepada_pengguna_id || null,
        status_sebelumnya: oLetter.status,
        status_saat_ini: "diproses",
        catatan: oPayload.complete_note || "Disposisi telah diselesaikan",
        processed_at: dNow,
        created_by: nActorId,
        created_at: dNow,
        updated_at: dNow,
      });

      const vaUnfinishedDispositions = await trx("trx_disposisi_surat")
        .where("surat_masuk_id", oDisposition.surat_masuk_id)
        .whereNot("status", "selesai");

      if (vaUnfinishedDispositions.length === 0) {
        bAllDispositionCompleted = true;

        await trx("trx_surat_masuk")
          .where("surat_masuk_id", oDisposition.surat_masuk_id)
          .update({
            status: "selesai",
            updated_by: nActorId,
            updated_at: dNow,
          });

        await insertIncomingLetterTracking(trx, {
          surat_masuk_id: oDisposition.surat_masuk_id,
          disposisi_surat_id: oPayload.disposisi_id,
          nama_aksi: "surat_selesai",
          dari_pengguna_id: oDisposition.dari_pengguna_id || null,
          kepada_pengguna_id: oDisposition.kepada_pengguna_id || null,
          status_sebelumnya: oLetter.status,
          status_saat_ini: "selesai",
          catatan: "Semua disposisi selesai, surat masuk dinyatakan selesai",
          processed_at: dNow,
          created_by: nActorId,
          created_at: dNow,
          updated_at: dNow,
        });
      } else {
        await trx("trx_surat_masuk")
          .where("surat_masuk_id", oDisposition.surat_masuk_id)
          .update({
            status: "diproses",
            updated_by: nActorId,
            updated_at: dNow,
          });
      }
    });

    // Kirim notifikasi ke pemberi disposisi (pimpinan) dan semua Superadmin
    try {
      const perihal = oLetter.perihal || `Surat Masuk #${oLetter.surat_masuk_id}`;

      if (oDisposition.dari_pengguna_id) {
        await createNotification({
          id_pengguna: oDisposition.dari_pengguna_id,
          judul: "Disposisi Selesai",
          pesan: `Disposisi surat "${perihal}" telah DISELESAIKAN oleh staf pelaksana.`,
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
            judul: "Disposisi Selesai",
            pesan: `Disposisi surat "${perihal}" telah diselesaikan.`,
            tipe: "disposisi",
            tautan: "/correspondence/mail_in/data",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi disposisi selesai:", notifError.message);
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: bAllDispositionCompleted
        ? "Disposisi selesai dan surat masuk telah selesai"
        : "Disposisi surat berhasil diselesaikan",
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Disposisi surat gagal diselesaikan",
      error: error.message,
    };
    Logging(error, {
      file: "letter_disposition_complete.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: "",
    });
    return res.status(500).json(oResult);
  }
};

router.post("/", letterDispositionComplete);
export default router;
