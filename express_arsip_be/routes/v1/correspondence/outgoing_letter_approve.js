import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { Logging, validatePayload } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";
import { status, datetime } from "../components/tools/general.js";
import { signLetterAutomatically } from "../components/tools/tte_service.js";

const router = express.Router();

const outgoingLetterApprove = async (req, res) => {
  const cFile = "outgoing_letter_approve.js";
  const cFunc = "outgoingLetterApprove";
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

    if (oLetter.status !== "menunggu_approval") {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message:
          "Surat keluar tidak sedang menunggu approval (status saat ini: " +
          oLetter.status +
          ")",
        datetime: datetime(),
      });
    }

    const dNow = new Date();
    const nActorId = req?.auth?.id_pengguna || null;

    await DB.transaction(async (trx) => {
      // 1. Update status to 'disetujui'
      await trx("trx_surat_keluar")
        .where("id_surat_keluar", oPayload.id_surat_keluar)
        .update({
          status: "disetujui",
          updated_by: nActorId,
          updated_at: dNow,
        });

      // 2. Insert into tracking
      await trx("trx_tracking_surat_keluar").insert({
        id_surat_keluar: oPayload.id_surat_keluar,
        status: "disetujui",
        aktivitas: "surat_disetujui",
        catatan: oPayload.catatan || "Surat keluar disetujui",
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

      if (oLetter.created_by) {
        await createNotification({
          id_pengguna: oLetter.created_by,
          judul: "Surat Keluar Disetujui",
          pesan: `Surat keluar "${perihal}" telah DISETUJUI oleh pimpinan.`,
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
            judul: "Surat Keluar Disetujui",
            pesan: `Surat keluar "${perihal}" telah DISETUJUI.`,
            tipe: "surat_keluar",
            tautan: "/correspondence/mail_out/data",
          });
        }
      }
    } catch (notifError) {
      console.error(
        "Gagal kirim notifikasi surat keluar disetujui:",
        notifError.message
      );
    }

    // 3. Otomatis proses TTE & Tempel Stempel Visual + QR Code ke PDF Surat
    let tteResult = null;
    try {
      tteResult = await signLetterAutomatically({
        idSuratKeluar: oPayload.id_surat_keluar,
        actorId: nActorId,
        req,
      });
    } catch (tteError) {
      console.error("Gagal melakukan TTE otomatis saat approval:", tteError);
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: tteResult
        ? "Surat keluar berhasil disetujui dan Tanda Tangan Elektronik (TTE) otomatis tertempel"
        : "Surat keluar berhasil disetujui",
      datetime: datetime(),
      tte: tteResult,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat keluar gagal disetujui",
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

router.post("/", outgoingLetterApprove);

export default router;
