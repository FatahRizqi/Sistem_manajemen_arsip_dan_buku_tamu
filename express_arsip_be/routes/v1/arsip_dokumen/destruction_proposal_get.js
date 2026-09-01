import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";

const router = express.Router();

const getDestructionProposals = async (req, res) => {
  try {
    const cStatus = req.query.status;
    const cKodeDokumen = req.query.kode_dokumen || req.query.document_code;
    const nIdDokumen = req.query.id_dokumen || req.query.document_id;
    const cProposedBy = req.query.diusulkan_oleh || req.query.proposed_by;

    const oQuery = DB("trx_usulan_pemusnahan as dp")
      .select(
        "dp.id_usulan",
        "dp.kode_dokumen",
        "dp.kode_retensi",
        "dp.alasan_usulan",
        "dp.diusulkan_oleh",
        "dp.diusulkan_pada",
        "dp.status",
        "dp.ditinjau_oleh",
        "dp.ditinjau_pada",
        "dp.catatan_tinjauan",
        "dp.dieksekusi_oleh",
        "dp.dieksekusi_pada",
        "dp.file_berita_acara",
        "dp.created_at",
        "dp.updated_at",
        // Data dokumen
        "d.id_dokumen",
        "d.nama_dokumen",
        "d.nomor_dokumen",
        "d.tanggal",
        "d.tanggal_kedaluwarsa",
        "d.nama_pic",
        // Data retensi
        "rs.nama_retensi",
        "rs.tahun_retensi",
        "rs.tindakan_retensi"
      )
      .leftJoin("trx_dokumen as d", "dp.kode_dokumen", "d.kode_dokumen")
      .leftJoin(
        "mst_jadwal_retensi as rs",
        "dp.kode_retensi",
        "rs.kode_retensi"
      )
      .leftJoin("mst_pengguna as u", function () {
        this.on(DB.raw("d.nama_pic COLLATE utf8mb4_unicode_ci = u.nama_lengkap COLLATE utf8mb4_unicode_ci"));
      });

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

    if (cStatus) {
      oQuery.where("dp.status", cStatus);
    }

    if (cKodeDokumen) {
      oQuery.andWhere("dp.kode_dokumen", cKodeDokumen);
    } else if (nIdDokumen) {
      oQuery.andWhere("d.id_dokumen", nIdDokumen);
    }

    if (cProposedBy) {
      oQuery.andWhere("dp.diusulkan_oleh", "like", `%${cProposedBy}%`);
    }

    const vaData = await oQuery.orderBy("dp.diusulkan_pada", "desc");

    const oResult = {
      status: "success",
      message: "Destruction proposals retrieved successfully",
      data: vaData,
      total: vaData.length,
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to retrieve destruction proposals",
      error: error.message,
    };

    Logging(error, {
      file: "destruction_proposal_get.js",
      func: "getDestructionProposals",
      request: req.query,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", getDestructionProposals);
export default router;
