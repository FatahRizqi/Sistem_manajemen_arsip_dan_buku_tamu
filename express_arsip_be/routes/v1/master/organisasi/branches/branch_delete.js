import express from "express";
import DB from "../../../../../core/config/knex.js";
import { status, formatDateSystem, datetime } from "../../../components/tools/general.js";
import { Logging } from "../../../components/tools/servertool.js";

const router = express.Router();

router.post("/delete", async (req, res) => {
  const { body: oPayload } = req;
  const cnama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    const cannotDelete = await DB("mst_cabang")
      .whereIn("id_cabang", oPayload.id)
      .andWhere((builder) => {
        builder.where("kode_cabang", "BR-001")
          .orWhere("kode_cabang", "BR-PST")
          .orWhere("nama_cabang", "like", "%Pusat%");
      })
      .first();

    if (cannotDelete) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: `Kantor Pusat (${cannotDelete.nama_cabang}) tidak dapat dihapus!`, datetime: formatDateSystem() });
    }

    await DB("mst_cabang").whereIn("id_cabang", oPayload.id).update({ status: 'deleted', updated_at: new Date() });

    // Cascade delete
    const depts = await DB("mst_departemen").whereIn("id_cabang", oPayload.id).select("id_departemen");
    const deptIds = depts.map(d => d.id_departemen);
    if (deptIds.length > 0) {
      await DB("mst_departemen").whereIn("id_departemen", deptIds).update({ status: 'deleted', updated_at: new Date() });
      const divs = await DB("mst_divisi").whereIn("id_departemen", deptIds).select("id_divisi");
      const divIds = divs.map(d => d.id_divisi);
      if (divIds.length > 0) {
        await DB("mst_divisi").whereIn("id_divisi", divIds).update({ status: 'deleted', updated_at: new Date() });
        await DB("mst_unit_kerja").whereIn("id_divisi", divIds).update({ status: 'deleted', updated_at: new Date() });
      }
    }

    return res.status(200).json({ status: status.SUKSES, message: "Berhasil dihapus!", datetime: formatDateSystem() });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Gagal menghapus", datetime: datetime() };
    Logging(error, { file: "delete.js", func: "delete", request: oPayload, response: oResult, user: cnama_pengguna });
    return res.status(500).json(oResult);
  }
});

export default router;
