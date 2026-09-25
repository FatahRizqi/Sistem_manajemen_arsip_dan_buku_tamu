import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem, status } from "../../components/tools/general.js";
import { Logging } from "../../components/tools/servertool.js";

const router = express.Router();

const getColumns = async (tableName) => {
  try {
    const [cols] = await DB.raw(`SHOW COLUMNS FROM \`${tableName}\``);
    return cols.map((c) => c.Field);
  } catch (e) {
    return [];
  }
};

const pickColumn = (columns, candidates) => {
  return candidates.find((c) => columns.includes(c)) || null;
};

router.post("/", async (req, res) => {
  try {
    let query = DB("mst_pengguna as u")
      .leftJoin("mst_pengguna_peran as ur", "u.id_pengguna", "ur.id_pengguna")
      .leftJoin("mst_peran as r", "ur.id_peran", "r.id_peran")
      .select(
        "u.id_pengguna",
        "u.nama_lengkap",
        "u.nama_pengguna",
        "u.telepon",
        DB.raw("GROUP_CONCAT(r.nama_peran SEPARATOR ', ') as role")
      )
      .where("u.status", "active");

    if (req.headers["x-filter-cabang"]) {
      query = query.whereIn("u.id_cabang", req.headers["x-filter-cabang"].split(","));
    }
    if (req.headers["x-filter-departemen"]) {
      query = query.where("u.id_departemen", req.headers["x-filter-departemen"]);
    }
    if (req.headers["x-filter-divisi"]) {
      query = query.where("u.id_divisi", req.headers["x-filter-divisi"]);
    }
    if (req.headers["x-filter-unit-kerja"]) {
      query = query.where("u.id_unit_kerja", req.headers["x-filter-unit-kerja"]);
    }

    const vaData = await query.groupBy("u.id_pengguna").orderBy("u.nama_lengkap", "asc");

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
      message: "Data user gagal diambil",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "user_dropdown.js",
      func: "post",
      request: req.body,
      response: oResult,
      user: req?.auth?.nama_pengguna || "",
    });

    return res.status(500).json(oResult);
  }
});

export default router;


