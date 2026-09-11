import express from "express";
import DB from "../../../../core/config/knex.js";
import { validateNumberingFormat } from "../../components/tools/letter_numbering_service.js";
import { datetime, formatDateSystem, status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { baseValidation, validationMessages, ensureActiveUniqueness, normalizePayload } from "./penomoran_surat_helper.js";
const router = express.Router();
router.put("/:id", async (req, res) => {
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
    const existing = await DB("mst_penomoran_surat").where("id_penomoran_surat", req.params.id).first();
    if (!existing) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Penomoran surat tidak ditemukan",
        datetime: datetime()
      });
    }
    const cUniqueError = await ensureActiveUniqueness({
      ...oPayload,
      excludeId: req.params.id
    });
    if (cUniqueError) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cUniqueError,
        datetime: datetime()
      });
    }
    await DB("mst_penomoran_surat").where("id_penomoran_surat", req.params.id).update({
      ...oPayload,
      created_by: existing.created_by,
      updated_at: new Date()
      , tz: typeof req !== 'undefined' ? (req.context?.tz || req.headers?.['x-tz'] || 'Asia/Jakarta') : 'Asia/Jakarta'
    });
    return res.status(200).json({
      status: status.SUKSES,
      message: "Penomoran surat berhasil diupdate",
      datetime: formatDateSystem()
    });
  } catch (error) {
    await Logging(error, {
      file: "penomoran_surat_update.js",
      func: "update",
      request: oPayload,
      user: req?.auth?.nama_pengguna || ""
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Penomoran surat gagal diupdate",
      datetime: datetime()
    });
  }
});
export default router;
