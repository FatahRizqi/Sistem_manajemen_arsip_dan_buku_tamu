import express from "express";
import DB from "../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../components/tools/general.js";
import { Logging } from "../../components/tools/servertool.js";

const router = express.Router();

const deleteTemplateSurat = async (req, res) => {
  const { id } = req.params;
  const nama_pengguna = "dummy";

  try {
    const updated = await DB("mst_template_surat")
      .where("id_template", Number(id))
      .update({
        status: "inactive",
        updated_at: new Date(), tz: typeof req !== 'undefined' ? (req.context?.tz || req.headers?.['x-tz'] || 'Asia/Jakarta') : 'Asia/Jakarta',
      });

    if (!updated) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Template surat tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Template surat berhasil dinonaktifkan",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    console.error("MY ERROR IS:", error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    await Logging(error, {
      file: "template_surat_delete.js",
      func: "deleteTemplateSurat",
      request: { id },
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.delete("/:id", deleteTemplateSurat);

export default router;
