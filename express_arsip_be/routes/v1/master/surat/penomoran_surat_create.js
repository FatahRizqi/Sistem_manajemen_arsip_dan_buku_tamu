import express from "express";
import DB from "../../../../core/config/knex.js";
import { validateNumberingFormat } from "../../components/tools/letter_numbering_service.js";
import { datetime, formatDateSystem, status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { baseValidation, validationMessages, checkReference, ensureActiveUniqueness, normalizePayload } from "./penomoran_surat_helper.js";
const router = express.Router();
router.post("/", async (req, res) => {
  const oPayload = normalizePayload(req.body || {});
  try {
    const cValidation = await validatePayload(baseValidation, validationMessages, req.body || {});
    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: datetime()
      });
    }
    const cFormatError = validateNumberingFormat(oPayload.format_nomor);
    if (cFormatError) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cFormatError,
        datetime: datetime()
      });
    }
    const cReferenceError = await checkReference({
      table: "mst_jenis_surat",
      key: "jenis_surat_id",
      value: oPayload.jenis_surat_id,
      label: "Jenis surat"
    });
    if (cReferenceError) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cReferenceError,
        datetime: datetime()
      });
    }
    const cUniqueError = await ensureActiveUniqueness(oPayload);
    if (cUniqueError) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cUniqueError,
        datetime: datetime()
      });
    }
    const dNow = new Date();
    const vaInserted = await DB("mst_penomoran_surat").insert({
      ...oPayload,
      updated_by: oPayload.updated_by || oPayload.created_by || null,
      created_at: dNow,
      updated_at: dNow
      , tz: typeof req !== 'undefined' ? (req.context?.tz || req.headers?.['x-tz'] || 'Asia/Jakarta') : 'Asia/Jakarta'
    });
    return res.status(201).json({
      status: status.SUKSES,
      message: "Penomoran surat berhasil dibuat",
      datetime: formatDateSystem(),
      data: {
        id_penomoran_surat: vaInserted[0]
      }
    });
  } catch (error) {
    await Logging(error, {
      file: "penomoran_surat_create.js",
      func: "create",
      request: oPayload,
      user: req?.auth?.nama_pengguna || ""
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Penomoran surat gagal dibuat",
      datetime: datetime()
    });
  }
});
export default router;
