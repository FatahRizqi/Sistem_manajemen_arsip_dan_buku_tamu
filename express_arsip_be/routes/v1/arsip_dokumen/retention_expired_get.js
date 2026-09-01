import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";

const router = express.Router();

const getRetentionExpiredDocuments = async (req, res) => {
  try {
    const cStatus = req.query.status || "active";
    const nDocumentCategoryId = req.query.id_kategori_dokumen || req.query.document_category_id;
    const cKodeKategoriDokumen = req.query.kode_kategori_dokumen;

    // Dokumen yang masa retensinya sudah habis:
    // tanggal + tahun_retensi (dalam tahun) <= Hari ini
    // Menggunakan DATE_ADD MySQL untuk kalkulasi
    const oQuery = DB("trx_dokumen as d")
      .select(
        "d.id_dokumen",
        "d.kode_dokumen",
        "d.nama_dokumen",
        "d.nomor_dokumen",
        "d.tanggal",
        "d.tanggal_kedaluwarsa",
        "d.nama_pic",
        "d.lokasi_fisik",
        "d.status",
        "d.created_at",
        // Master data
        "dc.nama_kategori_dokumen",
        "rs.id_jadwal_retensi",
        "rs.kode_retensi",
        "rs.nama_retensi",
        "rs.tahun_retensi",
        "rs.tindakan_retensi",
        // Kalkulasi tanggal retensi berakhir
        DB.raw(
          "DATE_ADD(d.tanggal, INTERVAL rs.tahun_retensi YEAR) as RetentionEndDate"
        ),
        // Kalkulasi berapa tahun sudah lewat
        DB.raw(
          "TIMESTAMPDIFF(YEAR, DATE_ADD(d.tanggal, INTERVAL rs.tahun_retensi YEAR), NOW()) as YearsOverRetention"
        ),
        // Status proposal pemusnahan (jika ada)
        DB.raw(
          "(SELECT status FROM trx_usulan_pemusnahan WHERE kode_dokumen = d.kode_dokumen AND status NOT IN ('rejected', 'executed') LIMIT 1) as ActiveProposalStatus"
        )
      )
      .join(
        "mst_jadwal_retensi as rs",
        "d.kode_retensi",
        "rs.kode_retensi"
      )
      .leftJoin(
        "mst_kategori_dokumen as dc",
        "d.kode_kategori_dokumen",
        "dc.kode_kategori_dokumen"
      )
      .leftJoin("mst_pengguna as u", function () {
        this.on(DB.raw("d.nama_pic COLLATE utf8mb4_unicode_ci = u.nama_lengkap COLLATE utf8mb4_unicode_ci"));
      })
      .where("d.status", cStatus)
      // Kondisi utama: masa retensi sudah lewat
      .whereRaw(
        "DATE_ADD(d.tanggal, INTERVAL rs.tahun_retensi YEAR) <= NOW()"
      );

    // Multi-tenancy filter (Direct branch filter with fallback for legacy docs)
    const fCabang = req.headers["x-filter-cabang"];
    if (fCabang && fCabang !== "null" && fCabang !== "undefined") {
      const vaCabangIds = String(fCabang).split(",").map(Number);
      oQuery.where((builder) => {
        builder.whereIn("d.id_cabang", vaCabangIds).orWhere(function () {
          this.whereNull("d.id_cabang").whereIn("u.id_cabang", vaCabangIds);
        });
      });
    }

    if (cKodeKategoriDokumen) {
      oQuery.andWhere("d.kode_kategori_dokumen", cKodeKategoriDokumen);
    } else if (nDocumentCategoryId) {
      oQuery.andWhere("dc.id_kategori_dokumen", nDocumentCategoryId);
    }

    const vaData = await oQuery.orderBy("d.tanggal", "asc");

    const oResult = {
      status: "success",
      message: "Retention-expired documents retrieved successfully",
      data: vaData,
      total: vaData.length,
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to retrieve retention-expired documents",
      error: error.message,
    };

    Logging(error, {
      file: "retention_expired_get.js",
      func: "getRetentionExpiredDocuments",
      request: req.query,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", getRetentionExpiredDocuments);
export default router;
