import express from "express";
import DB from "../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../components/tools/general.js";
import { Logging } from "../../components/tools/servertool.js";

const router = express.Router();

const getTemplateSurat = async (req, res) => {
  const oPayload = req.body || {};
  const nama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    const vaData = await DB("mst_template_surat as mts")
      .leftJoin("mst_jenis_surat as mjs", "mjs.jenis_surat_id", "mts.jenis_surat_id")
      .select(
        "mts.id_template",
        "mts.kode_template",
        "mts.nama_template",
        "mts.jenis_surat_id",
        "mjs.nama_jenis_surat",
        "mts.deskripsi",
        "mts.isi_template",
        "mts.status",
        "mts.created_by",
        "mts.updated_by",
        "mts.created_at",
        "mts.updated_at"
      )
      .whereNot("mts.status", "inactive")
      .orderBy("mts.updated_at", "desc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data template surat berhasil ditarik",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: vaData.length,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    await Logging(error, {
      file: "template_surat_get.js",
      func: "getTemplateSurat",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", getTemplateSurat);

export default router;
