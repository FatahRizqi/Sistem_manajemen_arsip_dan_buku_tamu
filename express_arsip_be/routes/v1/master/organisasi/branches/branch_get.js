import express from "express";
import DB from "../../../../../core/config/knex.js";
import { status, formatDateSystem } from "../../../components/tools/general.js";
import { Logging, getDescendantBranchIds } from "../../../components/tools/servertool.js";
const router = express.Router();
router.post("/get-data", async (req, res) => {
  const oPayload = req.body;
  const cnama_pengguna = req?.auth?.nama_pengguna || "";
  try {
    let query = DB("mst_cabang as c").leftJoin("mst_cabang as induk", "c.id_induk", "induk.id_cabang").select("c.id_cabang as id", "c.id_cabang", "c.id_induk", "induk.nama_cabang as nama_induk", "c.kode_cabang", "c.nama_cabang", "c.alamat", "c.telepon", "c.surel", "c.status").whereNot("c.status", "deleted");
    if (req.headers["x-filter-cabang"]) {
      const vaParentBranchIds = req.headers["x-filter-cabang"].split(",").map(Number);
      if (vaParentBranchIds.length > 0) {
        query = query.where(function() {
          this.whereIn("c.id_cabang", vaParentBranchIds).orWhereIn("c.id_induk", vaParentBranchIds);
        });
      }
    }

    // Urutkan berdasarkan hierarki: Pusat (null) -> Cabang Daerah -> Unit Kecamatan
    // Khusus untuk BR-PST (Kantor Pusat Demo) ditaruh paling bawah
    query = query.orderByRaw("CASE WHEN c.kode_cabang = 'BR-PST' THEN 1 ELSE 0 END ASC").orderBy("c.id_induk", "asc").orderBy("c.id_cabang", "asc");
    const vaData = await query;

    // Calculate absolute hierarchy level for each branch
    const allCabangs = await DB("mst_cabang").select("id_cabang", "id_induk");
    const parentMap = {};
    for (const c of allCabangs) {
      parentMap[c.id_cabang] = c.id_induk;
    }
    for (const oRow of vaData) {
      let level = 1;
      let curr = oRow.id_induk;
      const visited = new Set([oRow.id_cabang]);
      while (curr && !visited.has(curr) && level < 50) {
        visited.add(curr);
        level++;
        curr = parentMap[curr];
      }
      oRow.level = level;
    }
    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil ditarik",
      datetime: formatDateSystem(),
      data: vaData
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Terjadi kesalahan sistem",
      datetime: formatDateSystem()
    };
    Logging(error, {
      file: "get.js",
      func: "get",
      request: oPayload,
      response: oResult,
      user: cnama_pengguna
    });
    return res.status(500).json(oResult);
  }
});
export default router;
