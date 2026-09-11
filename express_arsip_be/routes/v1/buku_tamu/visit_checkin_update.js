import express from "express";
import Joi from "joi";
import { formatDateSystem } from "../components/tools/general.js";
import { Logging } from "../components/tools/servertool.js";
import DB from "../../../core/config/knex.js";
import { sendMailNotification } from "../../../core/components/tools/mail_helper.js";

const router = express.Router();
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const nama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    const { error } = Joi.number().integer().required().validate(id);
    if (error) {
      return res.status(400).json({ status: "99", message: "ID Kunjungan tidak valid", datetime: formatDateSystem() });
    }

    const checkKunjungan = await DB("trx_kunjungan").where("id_kunjungan", id).first();
    if (!checkKunjungan) {
      return res.status(404).json({ status: "01", message: "Data kunjungan tidak ditemukan", datetime: formatDateSystem() });
    }

    if (checkKunjungan.status_persetujuan !== "approved") {
      return res.status(400).json({ status: "01", message: "Kunjungan belum disetujui", datetime: formatDateSystem() });
    }

    if (checkKunjungan.status === "in") {
      return res.status(400).json({ status: "01", message: "Tamu sudah berstatus check-in", datetime: formatDateSystem() });
    }

    const currentDateTime = formatDateSystem(new Date(), "yyyy-MM-dd HH:mm:ss", "WIB");

    await DB("trx_kunjungan")
      .where("id_kunjungan", id)
      .update({
        status: "in",
        waktu_masuk: currentDateTime,
        updated_at: currentDateTime

      });

    // Kirim email notifikasi ke pegawai secara asinkron
    if (checkKunjungan.id_user_host) {
      const purpose = await DB("mst_tujuan_kunjungan").where("id_tujuan_kunjungan", checkKunjungan.id_tujuan_kunjungan).first();
      const visitPurposeName = purpose ? purpose.nama_tujuan_kunjungan : "Kunjungan";

      sendMailNotification(checkKunjungan.id_user_host, "checkin", {
        nama_tamu: checkKunjungan.nama_tamu,
        instansi_tamu: checkKunjungan.instansi_tamu || "-",
        VisitPurposeName: visitPurposeName,
        waktu_masuk: currentDateTime,
        kode_kunjungan: checkKunjungan.kode_kunjungan,
        catatan_kunjungan: checkKunjungan.catatan_kunjungan || "-"
      });
    }

    return res.status(200).json({
      status: "00",
      message: `Tamu ${checkKunjungan.nama_tamu} berhasil Check-in`,
      datetime: formatDateSystem()
    });

  } catch (error) {
    console.error("❌ [Database Error Log visit_checkin.js PUT]:", error);
    const oResult = { status: "01", message: "Sistem error saat check-in tamu", datetime: formatDateSystem() };
    Logging(error, { file: "visit_checkin.js", func: "check-in-put", request: req.params, response: oResult, user: nama_pengguna });
    return res.status(500).json(oResult);
  }
});

export default router;

