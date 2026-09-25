import express from "express";
import DB from "../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../components/tools/general.js";
import { Logging, getDescendantBranchIds } from "../../components/tools/servertool.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const cNamaPengguna = req?.auth?.nama_pengguna || "";

  try {
    // DB aktif memakai nama kolom Inggris; response tetap pakai alias lama
    // supaya frontend setup/users tidak perlu berubah.
    let query = DB("mst_pengguna as mu")
      .leftJoin(
        "mst_pengguna_peran as mur",
        "mu.id_pengguna",
        "mur.id_pengguna",
      )
      .leftJoin("mst_peran as mr", "mur.id_peran", "mr.id_peran")
      .select(
        "mu.id_pengguna",
        "mu.nama_lengkap",
        "mu.nama_pengguna",
        "mu.telepon",
        "mu.surel",
        "mu.id_cabang",
        "mu.id_divisi",
        "mu.id_departemen",
        "mu.id_jabatan",
        "mu.id_unit_kerja",
        "mu.status",
        "mu.created_at",
        DB.raw("GROUP_CONCAT(mr.id_peran) as id_peran"),
        DB.raw("GROUP_CONCAT(mr.nama_peran SEPARATOR ', ') as role")
      );

    if (req.headers["x-filter-cabang"]) {
      const vaParentBranchIds = req.headers["x-filter-cabang"].split(",").map(Number);
      let vaAllBranchIds = [];
      if (req.headers["x-exact-cabang"] === 'true') {
        vaAllBranchIds = vaParentBranchIds;
      } else {
        for (const nBranchId of vaParentBranchIds) {
          const descendantIds = await getDescendantBranchIds(DB, nBranchId);
          vaAllBranchIds = vaAllBranchIds.concat(descendantIds);
        }
      }
      query = query.whereIn("mu.id_cabang", vaAllBranchIds);
    }
    if (req.headers["x-filter-departemen"]) {
      query = query.where("mu.id_departemen", req.headers["x-filter-departemen"]);
    }
    if (req.headers["x-filter-divisi"]) {
      query = query.where("mu.id_divisi", req.headers["x-filter-divisi"]);
    }
    if (req.headers["x-filter-unit-kerja"]) {
      query = query.where("mu.id_unit_kerja", req.headers["x-filter-unit-kerja"]);
    }

    const vaData = await query
      .whereNot("mu.status", "deleted")
      .groupBy("mu.id_pengguna")
      .orderBy("mu.id_pengguna", "asc");

    vaData.forEach(user => {
      if (user.id_peran && typeof user.id_peran === 'string') {
        user.id_peran = user.id_peran.split(',').map(Number);
      } else if (user.id_peran && typeof user.id_peran === 'number') {
        user.id_peran = [user.id_peran];
      } else {
        user.id_peran = [];
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: vaData.length,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance",
      datetime: datetime(),
    };
    Logging(error, {
      file: "user_data.js",
      func: "get",
      request: oPayload,
      response: oResult,
      user: cNamaPengguna,
    });
    return res.status(500).json(oResult);
  }
});

export default router;
