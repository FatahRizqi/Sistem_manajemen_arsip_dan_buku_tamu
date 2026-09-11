import express from "express";
import DB from "../../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../../components/tools/general.js";
import { Logging } from "../../../components/tools/servertool.js";

const router = express.Router();

const deleteConfidentialityLevel = async (req, res) => {
  const cIdTingkatKerahasiaan = req.params.id_tingkat_kerahasiaan;
  const nama_pengguna = req?.auth?.nama_pengguna || "";
  const oPayload = { id: cIdTingkatKerahasiaan };


  try {
    const nUpdated = await DB("mst_tingkat_kerahasiaan")
      .where("id_tingkat_kerahasiaan", cIdTingkatKerahasiaan)
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
      message: "Data berhasil dihapus",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "level_delete.js",
      func: "deleteConfidentialityLevel",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.delete("/:id_tingkat_kerahasiaan", deleteConfidentialityLevel);

export default router;
