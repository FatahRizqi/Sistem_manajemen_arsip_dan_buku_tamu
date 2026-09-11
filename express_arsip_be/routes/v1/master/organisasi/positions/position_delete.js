import express from "express";
import DB from "../../../../../core/config/knex.js";
import { status, formatDateSystem, datetime } from "../../../components/tools/general.js";
import { Logging } from "../../../components/tools/servertool.js";

const router = express.Router();

router.post("/delete", async (req, res) => {
  const { body: oPayload } = req;
  const cnama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    if (!oPayload || !oPayload.id || !Array.isArray(oPayload.id)) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Array ID wajib diisi", datetime: formatDateSystem() });
    }

    await DB("mst_jabatan").whereIn("id_jabatan", oPayload.id).update({ status: 'deleted', updated_at: new Date() });

    return res.status(200).json({ status: status.SUKSES, message: "Berhasil dihapus!", datetime: formatDateSystem() });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Gagal menghapus", datetime: datetime() };
    Logging(error, { file: "delete.js", func: "delete", request: oPayload, response: oResult, user: cnama_pengguna });
    return res.status(500).json(oResult);
  }
});

export default router;
