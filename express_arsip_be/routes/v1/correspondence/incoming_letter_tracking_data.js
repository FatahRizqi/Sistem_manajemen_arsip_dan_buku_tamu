import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const incomingLetterTrackingData = async (req, res) => {
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
      "surat_masuk_id.required": "id surat masuk  wajib diisi",
      "surat_masuk_id.number": " id surat masuk harus berupa angka"
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
    const oLetter = await DB("trx_surat_masuk").select("surat_masuk_id", "nomor_agenda", "nomor_surat", "perihal", "nama_pengirim", "status").where("surat_masuk_id", oPayload.surat_masuk_id).first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan"
      });
    }
    const vaData = await DB("trx_tracking_surat_masuk as tilt").leftJoin("trx_disposisi_surat as tld", "tilt.disposisi_surat_id", "tld.disposisi_surat_id").select("tilt.tracking_surat_masuk_id", "tilt.surat_masuk_id", "tilt.disposisi_surat_id", "tilt.nama_aksi", "tilt.dari_pengguna_id", "tilt.kepada_pengguna_id", "tilt.status_sebelumnya", "tilt.status_saat_ini", "tilt.catatan", "tilt.processed_at", "tilt.created_by", "tilt.created_at", "tilt.updated_at", "tld.disposisi_induk_id", "tld.instruksi", "tld.catatan_disposisi", "tld.batas_waktu", "tld.status as status_disposisi").where("tilt.surat_masuk_id", oPayload.surat_masuk_id).orderBy("tilt.processed_at", "asc");
    return res.status(200).json({
      status: status.SUKSES,
      message: "Tracking surat masuk berhasil diambil",
      data: {
        letter: oLetter,
        trackings: vaData
      }
    });
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Tracking surat masuk gagal diambil",
      error: error.message
    };
    Logging(error, {
      file: "incoming_letter_tracking_data.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", incomingLetterTrackingData);
export default router;
