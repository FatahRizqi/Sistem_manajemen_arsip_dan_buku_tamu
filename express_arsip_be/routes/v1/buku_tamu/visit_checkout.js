import express from "express";
import Joi from "joi";
import { formatDateSystem } from "../components/tools/general.js";
import { Logging, validatePayload } from "../components/tools/servertool.js";
import DB from "../../../core/config/knex.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const nama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    const { error } = Joi.number().integer().required().validate(id);
    if (error) {
      return res.status(400).json({
        status: "99",
        message: "ID Kunjungan tidak valid",
        datetime: formatDateSystem(),
      });
    }

    const checkKunjungan = await DB("trx_kunjungan")
      .where("id_kunjungan", id)
      .first();

    if (!checkKunjungan) {
      return res.status(404).json({
        status: "01",
        message: "Data kunjungan tamu tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    if (checkKunjungan.status === "out") {
      return res.status(400).json({
        status: "01",
        message: "Tamu ini sudah melakukan check-out sebelumnya",
        datetime: formatDateSystem(),
      });
    }

    const oDataUpdate = {
      status: "out",
      waktu_keluar: formatDateSystem(),
      updated_at: formatDateSystem()

    };

    await DB("trx_kunjungan")
      .where("id_kunjungan", id)
      .update(oDataUpdate);

    // Kirim notifikasi real-time saat tamu check-out
    try {
      const cGuestName = checkKunjungan.nama_tamu || "Seorang tamu";
      const notifMsg = `Tamu ${cGuestName} telah check-out (selesai berkunjung)`;

      if (checkKunjungan.id_user_host) {
        await createNotification({
          id_pengguna: checkKunjungan.id_user_host,
          judul: "Tamu Check-Out",
          pesan: notifMsg,
          tipe: "kunjungan",
          tautan: "/buku_tamu/monitoring",
        });
      }

      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        if (sa.id_pengguna !== Number(checkKunjungan.id_user_host)) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: "Tamu Check-Out",
            pesan: notifMsg,
            tipe: "kunjungan",
            tautan: "/buku_tamu/monitoring",
          });
        }
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi checkout:", notifErr.message);
    }

    return res.status(200).json({
      status: "00",
      message: `Tamu ${checkKunjungan.nama_tamu} berhasil Check-out`,
      data: {
        id_kunjungan: id,
        nama_tamu: checkKunjungan.nama_tamu,
        waktu_masuk: checkKunjungan.waktu_masuk,
        waktu_keluar: oDataUpdate.waktu_keluar
      },
      datetime: formatDateSystem(),
    });

  } catch (error) {
    console.error("❌ [Database Checkout Error Log]:", error);

    const oResult = {
      status: "01",
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "visit_checkout.js",
      func: "check-out",
      request: req.params,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
