import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/general.js";
import { Logging } from "../components/tools/servertool.js";
import { sendWhatsAppMessage } from "../../../core/components/tools/wa_helper.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body: oPayload } = req;
  const nama_pengguna = req?.auth?.nama_pengguna || "";
  const userperan = (req?.auth?.peran || req?.auth?.peranCode || "").toLowerCase();

  try {
    const { idKunjungan, action, catatanPersetujuan } = oPayload;

    if (!idKunjungan || !action) {
      return res.status(400).json({
        status: "99",
        message: "idKunjungan dan action wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const allowedRoles = [
      "master",
      "admin",
      "pimpinan",
      "superadmin",
      "administrator",
      "resepsionis",
      "sa"
    ];

    if (!allowedRoles.some(r => userperan.includes(r))) {
      return res.status(403).json({
        status: "99",
        message: "Akses ditolak",
        datetime: formatDateSystem(),
      });
    }

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        status: "99",
        message: "Action tidak valid",
        datetime: formatDateSystem(),
      });
    }

    await DB("trx_kunjungan")
      .where("id_kunjungan", idKunjungan)
      .update({
        status_persetujuan: action,
        catatan_persetujuan: catatanPersetujuan,
        updated_at: formatDateSystem(),
      });

    // Kirim Notifikasi WhatsApp ke Tamu jika disetujui / ditolak
    const visitData = await DB("trx_kunjungan as t")
      .leftJoin("mst_tujuan_kunjungan as tk", "t.id_tujuan_kunjungan", "tk.id_tujuan_kunjungan")
      .leftJoin("mst_cabang as c", "t.id_cabang", "c.id_cabang")
      .select("t.*", "tk.nama_tujuan_kunjungan as purpose_name", "c.nama_cabang")
      .where("t.id_kunjungan", idKunjungan)
      .first();

    if (visitData && visitData.nomor_telepon) {
      try {
        if (action === "approved") {
          const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${visitData.kode_kunjungan}`;
          const waPesan = `Halo Bpk/Ibu ${visitData.nama_tamu},

Permohonan rencana kunjungan Anda dengan Kode Booking: *${visitData.kode_kunjungan}* telah DISETUJUI.

Detail Persetujuan:
- Kantor / Cabang: ${visitData.nama_cabang || '-'}
- Pegawai: ${visitData.nama_host || '-'}
- Status: DISETUJUI

📱 Link QR Code Tiket:
${qrCodeImageUrl}

Silakan tunjukkan QR Code di atas kepada petugas resepsionis saat Anda tiba di lokasi. Terima kasih.`;
          sendWhatsAppMessage(visitData.nomor_telepon, waPesan, qrCodeImageUrl);
        } else if (action === "rejected") {
          const hasNote = catatanPersetujuan && String(catatanPersetujuan).trim() !== '' && String(catatanPersetujuan).trim() !== '-';
          const noteText = hasNote ? `\n\nAlasan / Catatan: ${catatanPersetujuan}` : '';
          const waPesan = `Halo Bpk/Ibu ${visitData.nama_tamu},

Mohon maaf, permohonan rencana kunjungan Anda dengan Kode Booking: *${visitData.kode_kunjungan}* DITOLAK.${noteText}

Terima kasih atas perhatian Anda.`;
          sendWhatsAppMessage(visitData.nomor_telepon, waPesan);
        }
      } catch (waErr) {
        console.error("[WA Gateway] Gagal kirim notifikasi approval:", waErr.message);
      }
    }

    try {
      const actionText = action === "approved" ? "DISETUJUI" : "DITOLAK";

      if (visitData && visitData.id_user_host) {
        await createNotification({
          id_pengguna: visitData.id_user_host,
          judul: `Kunjungan Tamu ${actionText}`,
          pesan: `Rencana kunjungan ${visitData.nama_tamu} telah ${actionText.toLowerCase()} oleh Admin.`,
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
        if (sa.id_pengguna !== Number(visitData?.id_user_host || 0)) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: `Kunjungan Tamu ${actionText}`,
            pesan: `Rencana kunjungan ${visitData?.nama_tamu || 'Tamu'} telah ${actionText.toLowerCase()} oleh Admin.`,
            tipe: "kunjungan",
            tautan: "/buku_tamu/monitoring",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi approval:", notifError);
    }

    return res.status(200).json({
      status: "00",
      message: "Proses persetujuan berhasil",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, {
      file: "visit_approval.js",
      func: "approval",
      request: req.body,
      response: "error",
      user: nama_pengguna,
    });
    return res.status(500).json({
      status: "01",
      message: "Sistem error",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
