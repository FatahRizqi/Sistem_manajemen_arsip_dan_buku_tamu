import express from "express";
import DB from "../../../../../core/config/knex.js";
import { status, formatDateSystem, datetime } from "../../../components/tools/general.js";
import { Logging } from "../../../components/tools/servertool.js";

const router = express.Router();

router.post("/update", async (req, res) => {
  const { id_peran, permissions } = req.body;
  const cnama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    if (!id_peran || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Payload tidak valid", datetime: formatDateSystem() });
    }

    // Kita akan hapus semua permission lama untuk peran ini
    await DB("mst_peran_menu").where("id_peran", id_peran).del();

    // Siapkan data insert baru
    const insertData = [];
    const dNow = new Date();

    for (const p of permissions) {
      if (p.id_menu && (p.hak_lihat || p.hak_buat || p.hak_ubah || p.hak_hapus || p.hak_setuju)) {
        insertData.push({
          id_peran: id_peran,
          id_menu: p.id_menu,
          hak_lihat: p.hak_lihat ? 1 : 0,
          hak_buat: p.hak_buat ? 1 : 0,
          hak_ubah: p.hak_ubah ? 1 : 0,
          hak_hapus: p.hak_hapus ? 1 : 0,
          hak_setuju: p.hak_setuju ? 1 : 0,
          created_at: dNow,
          updated_at: dNow

        });
      }
    }

    if (insertData.length > 0) {
      await DB("mst_peran_menu").insert(insertData);
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Hak akses berhasil diperbarui",
      datetime: formatDateSystem()
    });
  } catch (error) {
    console.error(error);
    Logging(error, { file: "roles_permissions_update.js", func: "update", request: req.body, user: cnama_pengguna });
    return res.status(500).json({ status: status.BAD_REQUEST, message: "Gagal menyimpan hak akses", datetime: formatDateSystem() });
  }
});

export default router;
