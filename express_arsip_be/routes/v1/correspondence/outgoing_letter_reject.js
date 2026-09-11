import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { Logging, validatePayload } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";
import { status } from "../components/tools/general.js";

const router = express.Router();

const outgoingLetterReject = async (req, res) => {
  const cFile = "outgoing_letter_reject.js";
  const cFunc = "outgoingLetterReject";
  const oPayload = req.body || {};

  try {
    const oValidation = {
      id_surat_keluar: Joi.number().required(),
      catatan: Joi.string().allow(null, "").optional(),
      alasan_penolakan: Joi.string().allow(null, "").optional(),
      alasan: Joi.string().allow(null, "").optional(),
      catatan_tinjauan: Joi.string().allow(null, "").optional(),
    };

    const oMessage = {
      "id_surat_keluar.required": "id_surat_keluar wajib diisi",
      "id_surat_keluar.number": "id_surat_keluar harus berupa angka",
    };

    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      allowUnknown: true,
    });

    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate,
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
      });
    }

    if (oLetter.status !== "menunggu_approval") {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message:
          "Surat keluar tidak sedang menunggu approval (status saat ini: " +
          oLetter.status +
          ")",
      });
    }

    const dNow = new Date();
    const nActorId = req?.auth?.id_pengguna || null;

    await DB.transaction(async (trx) => {
      // 1. Update status to 'ditolak'
      await trx("trx_surat_keluar")
        .where("id_surat_keluar", oPayload.id_surat_keluar)
        .update({
          status: "ditolak",
          updated_by: nActorId,
          updated_at: dNow,
        });

      const cCatatan = oPayload.catatan || oPayload.alasan_penolakan || oPayload.alasan || oPayload.catatan_tinjauan || "Surat keluar ditolak";

      // 2. Insert into tracking
      await trx("trx_tracking_surat_keluar").insert({
        id_surat_keluar: oPayload.id_surat_keluar,
        status: "ditolak",
        aktivitas: "surat_ditolak",
        catatan: cCatatan,
        tanggal: dNow,
        dibuat_oleh: nActorId,
        created_at: dNow,
        updated_at: dNow,
      });
    });

    // Kirim notifikasi ke pembuat surat dan semua Superadmin
    try {
      const perihal =
        oLetter.perihal || oLetter.hal || `Surat Keluar #${oPayload.id_surat_keluar}`;
      const cCatatan = oPayload.catatan || oPayload.alasan_penolakan || oPayload.alasan || oPayload.catatan_tinjauan || "-";

      if (oLetter.created_by) {
        await createNotification({
          id_pengguna: oLetter.created_by,
          judul: "Surat Keluar Ditolak",
          pesan: `Surat keluar "${perihal}" telah DITOLAK oleh pimpinan. Catatan: ${cCatatan}`,
          tipe: "surat_keluar",
          tautan: "/correspondence/mail_out/data",
        });
      }

      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        if (sa.id_pengguna !== oLetter.created_by) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: "Surat Keluar Ditolak",
            pesan: `Surat keluar "${perihal}" telah DITOLAK.`,
            tipe: "surat_keluar",
            tautan: "/correspondence/mail_out/data",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi surat keluar ditolak:", notifError.message);
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Surat keluar berhasil ditolak",
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat keluar gagal ditolak",
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

router.post("/", outgoingLetterReject);

export default router;
