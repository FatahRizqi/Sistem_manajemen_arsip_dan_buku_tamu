import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const letterTypeData = async (req, res) => {
  try {
    const vaData = await DB("mst_jenis_surat").select("jenis_surat_id", "kode_jenis_surat", "nama_jenis_surat", "arah_surat", "deskripsi", "status").where("status", "active").whereIn("arah_surat", ["incoming", "both"]).orderBy("nama_jenis_surat", "asc");
    return res.status(200).json({
      status: status.SUKSES,
      message: "Data jenis surat berhasil diambil",
      data: vaData
    });
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Data jenis surat gagal diambil",
      error: error.message
    };
    Logging(error, {
      file: "letter_type_data.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", letterTypeData);
export default router;
