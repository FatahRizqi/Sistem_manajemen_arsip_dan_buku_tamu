import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";

const router = express.Router();

const createDocumentVersion = async (req, res) => {
  const oPayload = req.body;
  try {
    const cKodeDokumen = oPayload.kode_dokumen;
    const nVersionNumber = oPayload.nomor_versi;
    const cChangeNotes = oPayload.catatan_perubahan;
    const cFilePath = oPayload.file_path;
    const dNow = new Date();

    const oData = {
      kode_dokumen: cKodeDokumen,
      nomor_versi: nVersionNumber,
      catatan_perubahan: cChangeNotes,
      file_path: cFilePath,
      diunggah_oleh: req?.auth?.nama_pengguna || req?.context?.nama_pengguna || oPayload.diunggah_oleh || oPayload.uploaded_by || "system",
      tanggal_transaksi: dNow,
      created_at: dNow,
      updated_at: dNow,
    };

    await DB("trx_versi_dokumen").insert(oData);

    const oResult = {
      status: "success",
      message: "Document version created successfully",
      data: oData,
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to create document version",
      error: error.message,
    };

    Logging(error, {
      file: "document_version_create.js",
      func: "createDocumentVersion",
      request: oPayload,
      response: oResult,
      user: req?.auth?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createDocumentVersion);
export default router;
