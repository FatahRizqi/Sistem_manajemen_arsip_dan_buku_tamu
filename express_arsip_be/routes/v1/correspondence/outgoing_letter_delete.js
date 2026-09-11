import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { status, datetime } from "../components/tools/general.js";
import {
  Logging,
  validatePayload,
} from "../components/tools/servertool.js";

const router = express.Router();

const outgoingLetterDelete = async (req, res) => {
  const cFile = "outgoing_letter_delete.js";
  const cFunc = "outgoingLetterDelete";
  const oPayload = {
    ...(req.params || {}),
    ...(req.body || {}),
  };

  if (oPayload.id_surat_keluar) {
    oPayload.id_surat_keluar = Number(oPayload.id_surat_keluar);
  }

  try {
    const oValidation = {
      id_surat_keluar: Joi.number().required(),
      updated_by: Joi.number().allow(null).optional(),
      catatan: Joi.string().allow(null, "").optional(),
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

    if (oPayload.updated_by) {
      const oUser = await DB("mst_pengguna")
        .where("id_pengguna", oPayload.updated_by)
        .first();

      if (!oUser) {
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: "User pengubah tidak ditemukan",
        });
      }
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

    const dNow = new Date();

    await DB.transaction(async (trx) => {
      await trx("trx_surat_keluar")
        .where("id_surat_keluar", oPayload.id_surat_keluar)
        .update({
          status: "dihapus",
          updated_by: oPayload.updated_by || null,
          updated_at: dNow,
        });

      await trx("trx_tracking_surat_keluar").insert({
        id_surat_keluar: oPayload.id_surat_keluar,
        status: "dihapus",
        aktivitas: "surat_dihapus",
        catatan: oPayload.catatan || "Surat keluar dihapus",
        tanggal: dNow,
        dibuat_oleh: oPayload.updated_by || null,
        created_at: dNow,
        updated_at: dNow,
      });
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Surat keluar berhasil dihapus",
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat keluar gagal dihapus",
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

router.post("/:id_surat_keluar?", outgoingLetterDelete);
router.delete("/:id_surat_keluar?", outgoingLetterDelete);
router.post("/", outgoingLetterDelete);
router.delete("/", outgoingLetterDelete);

export default router;
