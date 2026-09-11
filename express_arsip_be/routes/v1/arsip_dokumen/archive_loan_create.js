import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

const createArchiveLoan = async (req, res) => {
  const oPayload = req.body;

  try {
    console.log("=== CREATE ARCHIVE LOAN ===");
    console.log("PAYLOAD:", req.body);
    const cKodeDokumen = oPayload.kode_dokumen;
    const cBorrowerName = oPayload.nama_peminjam;
    const dLoanDate = oPayload.tanggal_pinjam;
    const dExpectedReturnDate = oPayload.tanggal_pengembalian;
    const cPurpose = oPayload.keperluan || null;
    const dNow = new Date();

    // Validasi wajib
    if (!cKodeDokumen || !cBorrowerName || !dLoanDate || !dExpectedReturnDate) {
      const oResult = {
        status: "error",
        message: "kode_dokumen, nama_peminjam, tanggal_pinjam, dan tanggal_pengembalian wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Validasi: tanggal_pengembalian tidak boleh sebelum tanggal_pinjam
    if (new Date(dExpectedReturnDate) <= new Date(dLoanDate)) {
      const oResult = {
        status: "error",
        message: "tanggal_pengembalian harus setelah tanggal_pinjam",
      };
      return res.status(422).json(oResult);
    }

    // Verifikasi dokumen aktif
    const oDocument = await DB("trx_dokumen")
      .where("kode_dokumen", cKodeDokumen)
      .where("status", "active")
      .first();

    if (!oDocument) {
      const oResult = {
        status: "error",
        message: "Document not found or already inactive",
      };
      return res.status(404).json(oResult);
    }

    // Cek apakah dokumen sedang dipinjam (status = borrowed)
    const oActiveLoan = await DB("trx_peminjaman_arsip")
      .where("kode_dokumen", cKodeDokumen)
      .where("status", "borrowed")
      .first();

    if (oActiveLoan) {
      const oResult = {
        status: "error",
        message: `Dokumen sedang dipinjam oleh ${oActiveLoan.nama_peminjam} sejak ${oActiveLoan.tanggal_pinjam}. Tidak dapat mengajukan peminjaman baru.`,
      };
      return res.status(422).json(oResult);
    }

    let nIdCabang = oDocument.id_cabang || null;
    if (!nIdCabang) {
      const cFilterCabang = req.headers["x-filter-cabang"];
      if (cFilterCabang && cFilterCabang !== "null" && cFilterCabang !== "undefined") {
        const firstId = parseInt(String(cFilterCabang).split(",")[0], 10);
        if (!isNaN(firstId)) nIdCabang = firstId;
      }
    }

    const oData = {
      id_cabang: nIdCabang,
      kode_dokumen: cKodeDokumen,
      nama_peminjam: cBorrowerName,
      tanggal_pinjam: dLoanDate,
      tanggal_pengembalian: dExpectedReturnDate,
      tanggal_kembali: null,
      keperluan: cPurpose,
      status: "pending",
      disetujui_oleh: null,
      disetujui_pada: null,
      catatan_persetujuan: null,
      terlambat: 0,
      tanggal_transaksi: dLoanDate,
      created_at: dNow,
      updated_at: dNow,
    };

    const [nLoanId] = await DB("trx_peminjaman_arsip").insert(oData);

    try {
      if (nIdCabang) {
        const branchUsers = await DB("mst_pengguna")
          .where("id_cabang", nIdCabang)
          .andWhere("status", "active")
          .select("id_pengguna");

        const superadmins = await DB("mst_pengguna as p")
          .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
          .join("mst_peran as r", "pp.id_peran", "r.id_peran")
          .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
          .andWhere("p.status", "active")
          .select("p.id_pengguna");

        const targetUserIds = new Set([
          ...branchUsers.map(u => u.id_pengguna),
          ...superadmins.map(u => u.id_pengguna)
        ]);

        for (const userId of targetUserIds) {
          await createNotification({
            id_pengguna: userId,
            judul: "Permohonan Peminjaman Arsip",
            pesan: `${cBorrowerName} mengajukan pinjaman dokumen: ${oDocument.nama_dokumen || cKodeDokumen}`,
            tipe: "peminjaman_arsip",
            tautan: "/edms/archive_loan",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi peminjaman arsip:", notifError);
    }

    const oResult = {
      status: "success",
      message:
        "Pengajuan peminjaman arsip berhasil dibuat dan menunggu approval",
      data: {
        id_peminjaman: nLoanId,
        ...oData,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to create archive loan",
      error: error.message,
    };

    Logging(error, {
      file: "archive_loan_create.js",
      func: "createArchiveLoan",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createArchiveLoan);
export default router;
