import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

const returnArchiveLoan = async (req, res) => {
  const oPayload = req.body;

  try {
    const nLoanId = oPayload.id_peminjaman || oPayload.loan_id;
    const dReturnDate = oPayload.tanggal_kembali || oPayload.return_date || null;
    const dNow = new Date();

    if (!nLoanId) {
      const oResult = {
        status: "error",
        message: "id_peminjaman wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Ambil data peminjaman
    const oLoan = await DB("trx_peminjaman_arsip")
      .where("id_peminjaman", nLoanId)
      .first();

    if (!oLoan) {
      const oResult = {
        status: "error",
        message: "Archive loan not found",
      };
      return res.status(404).json(oResult);
    }

    if (oLoan.status !== "borrowed") {
      const oResult = {
        status: "error",
        message: `Peminjaman tidak dalam status 'borrowed'. Status saat ini: '${oLoan.status}'`,
      };
      return res.status(422).json(oResult);
    }

    // Tanggal pengembalian aktual
    const dActualReturnDate = dReturnDate ? new Date(dReturnDate) : dNow;

    // Deteksi keterlambatan: bandingkan tanggal kembali aktual vs tanggal_pengembalian
    const bIsOverdue =
      oLoan.tanggal_pengembalian &&
        new Date(dActualReturnDate) > new Date(oLoan.tanggal_pengembalian)
        ? 1
        : 0;

    const oData = {
      status: "returned",
      tanggal_kembali: dActualReturnDate,
      terlambat: bIsOverdue,
      updated_at: dNow,
    };

    await DB("trx_peminjaman_arsip")
      .where("id_peminjaman", nLoanId)
      .update(oData);

    await DB("trx_dokumen")
      .where("kode_dokumen", oLoan.kode_dokumen)
      .update({ status: "active", updated_at: dNow });

    const cOverdueMessage = bIsOverdue
      ? ` (TERLAMBAT: seharusnya kembali ${oLoan.tanggal_pengembalian})`
      : "";

    const oResult = {
      status: "success",
      message: `Dokumen berhasil dikembalikan${cOverdueMessage}`,
      data: {
        id_peminjaman: nLoanId,
        kode_dokumen: oLoan.kode_dokumen,
        nama_peminjam: oLoan.nama_peminjam,
        tanggal_pengembalian: oLoan.tanggal_pengembalian,
        terlambat: bIsOverdue,
        ...oData,
      },
    };

    // Kirim notifikasi ke Peminjam dan Superadmin
    try {
      const borrowerUser = await DB("mst_pengguna")
        .where("nama_lengkap", oLoan.nama_peminjam)
        .orWhere("nama_pengguna", oLoan.nama_peminjam)
        .first();

      if (borrowerUser) {
        await createNotification({
          id_pengguna: borrowerUser.id_pengguna,
          judul: "Pengembalian Arsip",
          pesan: `Pengembalian dokumen ${oLoan.kode_dokumen} telah dicatat ${bIsOverdue ? "(Terlambat)" : "Tepat Waktu"}.`,
          tipe: "peminjaman_arsip",
          tautan: "/edms/archive_loan",
        });
      }

      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        if (!borrowerUser || sa.id_pengguna !== borrowerUser.id_pengguna) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: "Pengembalian Arsip",
            pesan: `Dokumen ${oLoan.kode_dokumen} telah dikembalikan oleh ${oLoan.nama_peminjam}${bIsOverdue ? " (Terlambat)" : ""}.`,
            tipe: "peminjaman_arsip",
            tautan: "/edms/archive_loan",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi pengembalian arsip:", notifError.message);
    }

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to return archive loan",
      error: error.message,
    };

    Logging(error, {
      file: "archive_loan_return.js",
      func: "returnArchiveLoan",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", returnArchiveLoan);
export default router;
