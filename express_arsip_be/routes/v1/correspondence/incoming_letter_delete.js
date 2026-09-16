import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const incomingLetterDelete = async (req, res) => {
  try {
    const oPayload = req.body || {};
    if (!oPayload.surat_masuk_id && oPayload.incoming_letter_id) {
      oPayload.surat_masuk_id = oPayload.incoming_letter_id;
      delete oPayload.incoming_letter_id;
    }
    const oValidation = {
      surat_masuk_id: Joi.number().required()
    };
    const oMessage = {
      "surat_masuk_id.required": "id surat masuk wajib diisi",
      "surat_masuk_id.number": "id surat masuk harus berupa angka"
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
    const oLetter = await DB("trx_surat_masuk").where("surat_masuk_id", oPayload.surat_masuk_id).first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan"
      });
    }
    const { insertIncomingLetterTracking } = await import("../components/tools/tracking_helper.js");
    const dNow = new Date();
    await DB.transaction(async trx => {
      await trx("trx_surat_masuk").where("surat_masuk_id", oPayload.surat_masuk_id).update({
        status: "dihapus",
        updated_at: dNow

      });
      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: oPayload.surat_masuk_id,
        status_sebelumnya: oLetter.status,
        status_saat_ini: "dihapus",
        nama_aksi: "surat_dihapus",
        catatan: "Surat masuk dihapus",
        processed_at: dNow,
        created_at: dNow,
        updated_at: dNow

      });
    });
    return res.status(200).json({
      status: status.SUKSES,
      message: "Surat masuk berhasil dihapus"
    });
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Surat masuk gagal dihapus",
      error: error.message
    };
    Logging(error, {
      file: "incoming_letter_delete.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", incomingLetterDelete);
export default router;
