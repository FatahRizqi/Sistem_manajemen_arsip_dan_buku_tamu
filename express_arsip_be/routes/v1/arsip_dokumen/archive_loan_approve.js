import express from "express";
import Knex from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

const approveArchiveLoan = async (req, res) => {
  const oPayload = req.body;

  try {
    const nLoanId = oPayload.id_peminjaman || oPayload.loan_id;
    const cStatus = oPayload.status || oPayload.status_persetujuan;
    const cApprovalNotes = oPayload.catatan_persetujuan || oPayload.approval_notes || null;
    const cApprovedBy =
      req?.auth?.nama_pengguna ||
      req?.context?.nama_pengguna ||
      req?.context?.nama_pengguna ||
      oPayload.approved_by ||
      "system";
    const dNow = new Date();

    if (!nLoanId) {
      const oResult = {
        status: "error",
        message: "id_peminjaman wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    if (!["approved", "rejected"].includes(cStatus)) {
      const oResult = {
        status: "error",
        message: "Status harus 'approved' atau 'rejected'",
      };
      return res.status(422).json(oResult);
    }

    // Cek loan ada dan masih pending
    const oLoan = await Knex("trx_peminjaman_arsip")
      .where("id_peminjaman", nLoanId)
      .first();

    if (!oLoan) {
      const oResult = {
        status: "error",
        message: "Archive loan not found",
      };
      return res.status(404).json(oResult);
    }

    if (oLoan.status !== "pending") {
      const oResult = {
        status: "error",
        message: `Peminjaman sudah diproses dengan status '${oLoan.status}'`,
      };
      return res.status(422).json(oResult);
    }

    // Jika approved, check apakah dokumen sedang dipinjam
    if (cStatus === "approved") {
      const oActiveLoan = await Knex("trx_peminjaman_arsip")
        .where("kode_dokumen", oLoan.kode_dokumen)
        .where("status", "borrowed")
        .first();

      if (oActiveLoan) {
        const oResult = {
          status: "error",
          message: `Dokumen sedang dipinjam oleh ${oActiveLoan.nama_peminjam} sejak ${oActiveLoan.tanggal_pinjam}. Tidak dapat menyetujui peminjaman baru.`,
        };
        return res.status(422).json(oResult);
      }
    }

    // Jika approved, ubah status jadi 'borrowed' (langsung bisa dipinjam)
    const cNewStatus = cStatus === "approved" ? "borrowed" : "rejected";

    const oData = {
      status: cNewStatus,
      disetujui_oleh: cApprovedBy,
      disetujui_pada: dNow,
      catatan_persetujuan: cApprovalNotes,
      updated_at: dNow,
    };

    await Knex("trx_peminjaman_arsip")
      .where("id_peminjaman", nLoanId)
      .update(oData);

    if (cStatus === "approved") {
      await Knex("trx_dokumen")
        .where("kode_dokumen", oLoan.kode_dokumen)
        .update({ status: "borrowed", updated_at: dNow });
    }

    try {
      const actionText = cStatus === "approved" ? "DISETUJUI" : "DITOLAK";
      const targetUser = await Knex("mst_pengguna")
        .where("nama_lengkap", oLoan.nama_peminjam)
        .orWhere("nama_pengguna", oLoan.nama_peminjam)
        .first();

      if (targetUser) {
        await createNotification({
          id_pengguna: targetUser.id_pengguna,
          judul: `Peminjaman Arsip ${actionText}`,
          pesan: `Permohonan pinjaman arsip Anda untuk dokumen ${oLoan.kode_dokumen} telah ${actionText.toLowerCase()}.`,
          tipe: "peminjaman_arsip",
          tautan: "/edms/archive_loan",
        });
      }

      const superadmins = await Knex("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        if (!targetUser || sa.id_pengguna !== targetUser.id_pengguna) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: `Peminjaman Arsip ${actionText}`,
            pesan: `Pinjaman arsip ${oLoan.nama_peminjam} untuk dokumen ${oLoan.kode_dokumen} telah ${actionText.toLowerCase()}.`,
            tipe: "peminjaman_arsip",
            tautan: "/edms/archive_loan",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi approval peminjaman:", notifError);
    }

    const oResult = {
      status: "success",
      message: `Peminjaman arsip berhasil di-${cStatus === "approved" ? "setujui (status: borrowed)" : "tolak"}`,
      data: {
        id_peminjaman: nLoanId,
        kode_dokumen: oLoan.kode_dokumen,
        nama_peminjam: oLoan.nama_peminjam,
        ...oData,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to update archive loan",
      error: error.message,
    };

    Logging(error, {
      file: "archive_loan_approve.js",
      func: "approveArchiveLoan",
      request: oPayload,
      response: oResult,
      user:
        req?.auth?.nama_pengguna ||
        req?.context?.nama_pengguna ||
        req?.context?.nama_pengguna ||
        "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", approveArchiveLoan);
export default router;
