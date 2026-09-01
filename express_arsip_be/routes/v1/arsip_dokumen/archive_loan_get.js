import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";

const router = express.Router();

const getArchiveLoans = async (req, res) => {
  const oQuery = req.query;

  try {
    const nLoanId = oQuery.id_peminjaman || oQuery.loan_id;
    const cKodeDokumen = oQuery.kode_dokumen || oQuery.document_code;
    const nIdDokumen = oQuery.id_dokumen || oQuery.document_id;
    const cStatus = oQuery.status;
    const vaAllowedStatus = [
      "pending",
      "approved",
      "borrowed",
      "returned",
      "rejected",
    ];

    if (cStatus && !vaAllowedStatus.includes(cStatus)) {
      const oResult = {
        status: "error",
        message: "Status is invalid",
      };

      return res.status(422).json(oResult);
    }

    const oData = DB("trx_peminjaman_arsip as l")
      .leftJoin("trx_dokumen as d", "l.kode_dokumen", "d.kode_dokumen")
      .leftJoin("mst_pengguna as u", function () {
        this.on(DB.raw("d.nama_pic COLLATE utf8mb4_unicode_ci = u.nama_lengkap COLLATE utf8mb4_unicode_ci"));
      })
      .select(
        "l.id_peminjaman",
        "l.kode_dokumen",
        "d.id_dokumen",
        "d.nama_dokumen",
        "d.nomor_dokumen",
        "l.nama_peminjam",
        "l.tanggal_pinjam",
        "l.tanggal_pengembalian",
        "l.tanggal_kembali",
        "l.keperluan",
        "l.status",
        "l.disetujui_oleh",
        "l.disetujui_pada",
        "l.catatan_persetujuan",
        DB.raw("CASE WHEN l.status = 'borrowed' AND l.tanggal_pengembalian < NOW() THEN 1 ELSE l.terlambat END as terlambat"),
        "l.created_at",
        "l.updated_at",
      )
      .orderBy("l.id_peminjaman", "desc");

    if (nLoanId) {
      oData.where("l.id_peminjaman", nLoanId);
    }

    if (cKodeDokumen) {
      oData.where("l.kode_dokumen", cKodeDokumen);
    }

    if (nIdDokumen) {
      oData.where("d.id_dokumen", nIdDokumen);
    }

    if (cStatus) {
      oData.where("l.status", cStatus);
    }

    // Multi-tenancy filter (Direct branch filter with fallback for legacy loans)
    const fCabang = req.headers["x-filter-cabang"];
    if (fCabang && fCabang !== "null" && fCabang !== "undefined") {
      const vaCabangIds = String(fCabang).split(",").map(Number);
      oData.where((builder) => {
        builder
          .whereIn("l.id_cabang", vaCabangIds)
          .orWhereIn("d.id_cabang", vaCabangIds)
          .orWhere(function () {
            this.whereNull("l.id_cabang")
              .whereNull("d.id_cabang")
              .whereIn("u.id_cabang", vaCabangIds);
          });
      });
    }

    const vaData = await oData;

    const oResult = {
      status: "success",
      message: "Archive loans retrieved successfully",
      data: vaData,
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to retrieve archive loans",
      error: error.message,
    };

    Logging(error, {
      file: "archive_loan_get.js",
      func: "getArchiveLoans",
      request: oQuery,
      response: oResult,
      user: req?.auth?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", getArchiveLoans);
export default router;
