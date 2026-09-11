import express from "express";
import DB from "../../../../../core/config/knex.js";
import { datetime, formatDateSystem, status } from "../../../components/tools/general.js";
import { Logging } from "../../../components/tools/servertool.js";

const router = express.Router();

const deleteArchiveClassification = async (req, res) => {
  const cIdKlasifikasi = req.params.id_klasifikasi;
  const nama_pengguna = req?.auth?.nama_pengguna || "";
  const oPayload = { id: cIdKlasifikasi };

  try {
    const nUpdated = await DB("mst_klasifikasi_arsip")
      .where("id_klasifikasi", cIdKlasifikasi)
      .update({ status: "deleted", updated_at: new Date() });

    if (!nUpdated) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    return res.status(200).json({ status: status.SUKSES, message: "Berhasil dihapus!", datetime: formatDateSystem() });

  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: datetime() };
    Logging(error, { file: "archive_delete.js", func: "deleteArchiveClassification", request: oPayload, response: oResult, user: nama_pengguna });
    return res.status(500).json(oResult);
  }
};

router.delete("/:id_klasifikasi", deleteArchiveClassification);

export default router;
