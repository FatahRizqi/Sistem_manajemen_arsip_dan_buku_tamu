import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../components/tools/general.js";
import {
  Logging,
  validatePayload,
} from "../components/tools/servertool.js";

const router = express.Router();

// 1. GET - Retrieve all active letter types
// 4. DELETE - Soft delete letter type by deactivating it
router.delete("/:jenis_surat_id", async (req, res) => {
  const nJenisSuratId = req.params.jenis_surat_id;
  const nama_pengguna = req?.auth?.nama_pengguna || "";
  const oPayload = { id: nJenisSuratId };

  try {
    const nUpdated = await DB("mst_jenis_surat")
      .where("jenis_surat_id", nJenisSuratId)
      .update({ status: "deleted", updated_at: new Date() });

    if (!nUpdated) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data jenis surat berhasil dihapus",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "letter_type_management.js",
      func: "delete",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
});


export default router;

