import express from "express";
import DB from "../../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../../components/tools/general.js";
import { Logging } from "../../../components/tools/servertool.js";

const router = express.Router();

const deleteDocumentCategory = async (req, res) => {
  const cIdKategoriDokumen = req.params.id_kategori_dokumen;
  const nama_pengguna = req?.auth?.nama_pengguna || "";
  const oPayload = { id: cIdKategoriDokumen }; // Buat keperluan logging


  try {
    const nUpdated = await DB("mst_kategori_dokumen")
      .where("id_kategori_dokumen", cIdKategoriDokumen)
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
      file: "category_delete.js",
      func: "deleteDocumentCategory",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.delete("/:id_kategori_dokumen", deleteDocumentCategory);

export default router;
