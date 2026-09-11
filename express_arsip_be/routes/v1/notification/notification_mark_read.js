import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { formatDateSystem } from "../components/tools/general.js";

const router = express.Router();

router.put("/mark-read", async (req, res) => {
  const nUserId = req?.auth?.id_pengguna || req?.auth?.IdPengguna || null;
  const username = req?.auth?.nama_pengguna || "";
  const { id_notifikasi } = req.body;

  try {
    if (!nUserId) {
      return res.status(401).json({
        status: "01",
        message: "Pengguna tidak terautentikasi",
        datetime: formatDateSystem(),
      });
    }

    const now = formatDateSystem();
    const query = DB("trx_notifikasi")
      .update({
        status_baca: 1,
        updated_at: now,
      })
      .where((builder) => {
        builder.where("id_pengguna", nUserId).orWhereNull("id_pengguna");
      });

    if (id_notifikasi) {
      query.andWhere("id_notifikasi", id_notifikasi);
    }

    await query;

    return res.status(200).json({
      status: "00",
      message: id_notifikasi
        ? "Notifikasi berhasil ditandai telah dibaca"
        : "Semua notifikasi berhasil ditandai telah dibaca",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: "01",
      message: "Gagal menandai notifikasi dibaca",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "notification_mark_read.js",
      func: "put",
      request: req.body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
