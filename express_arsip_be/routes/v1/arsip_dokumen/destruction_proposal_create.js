import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

const createDestructionProposal = async (req, res) => {
  const oPayload = req.body;

  try {
    const cKodeDokumen = oPayload.kode_dokumen || oPayload.document_code;
    const nIdDokumen = oPayload.id_dokumen || oPayload.document_id;
    const cProposalReason = oPayload.alasan_usulan || oPayload.proposal_reason;
    const cProposedBy = req?.auth?.nama_pengguna || req?.context?.nama_pengguna || oPayload.diusulkan_oleh || oPayload.proposed_by || "system";
    const dNow = new Date();

    if ((!cKodeDokumen && !nIdDokumen) || !cProposalReason) {
      const oResult = {
        status: "error",
        message: "kode_dokumen/id_dokumen dan alasan_usulan wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Verifikasi dokumen aktif
    let oQueryBuilder = DB("trx_dokumen as d")
      .select(
        "d.id_dokumen",
        "d.kode_dokumen",
        "d.nama_dokumen",
        "d.nomor_dokumen",
        "d.tanggal",
        "d.tanggal_kedaluwarsa",
        "d.kode_retensi",
        "rs.tahun_retensi",
        "rs.tindakan_retensi"
      )
      .leftJoin(
        "mst_jadwal_retensi as rs",
        "d.kode_retensi",
        "rs.kode_retensi"
      )
      .where("d.status", "active");

    if (cKodeDokumen) {
      oQueryBuilder.where("d.kode_dokumen", cKodeDokumen);
    } else {
      oQueryBuilder.where("d.id_dokumen", nIdDokumen);
    }

    const oDocument = await oQueryBuilder.first();

    if (!oDocument) {
      const oResult = {
        status: "error",
        message: "Document not found or already inactive",
      };
      return res.status(404).json(oResult);
    }

    // Cek apakah sudah ada proposal aktif untuk dokumen ini
    const oExistingProposal = await DB("trx_usulan_pemusnahan")
      .where("kode_dokumen", oDocument.kode_dokumen)
      .whereNotIn("status", ["rejected", "executed"])
      .first();

    if (oExistingProposal) {
      const oResult = {
        status: "error",
        message: `Dokumen ini sudah memiliki proposal pemusnahan aktif dengan status '${oExistingProposal.status}' (ProposalId: ${oExistingProposal.id_usulan})`,
      };
      return res.status(422).json(oResult);
    }

    const oData = {
      kode_dokumen: oDocument.kode_dokumen,
      kode_retensi: oDocument.kode_retensi || null,
      alasan_usulan: cProposalReason,
      diusulkan_oleh: cProposedBy,
      diusulkan_pada: dNow,
      status: "submitted",
      ditinjau_oleh: null,
      ditinjau_pada: null,
      catatan_tinjauan: null,
      dieksekusi_oleh: null,
      dieksekusi_pada: null,
      file_berita_acara: null,
      tanggal_transaksi: dNow,
      created_at: dNow,
      updated_at: dNow,
    };

    const [nProposalId] = await DB("trx_usulan_pemusnahan").insert(oData);

    const oResult = {
      status: "success",
      message:
        "Proposal pemusnahan arsip berhasil diajukan dan menunggu review",
      data: {
        id_usulan: nProposalId,
        document_name: oDocument.nama_dokumen,
        document_number: oDocument.nomor_dokumen,
        retention_years: oDocument.tahun_retensi,
        retention_action: oDocument.tindakan_retensi,
        ...oData,
      },
    };

    // Kirim notifikasi ke Pimpinan dan Superadmin
    try {
      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA", "PIMPINAN"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        await createNotification({
          id_pengguna: sa.id_pengguna,
          judul: "Usulan Pemusnahan Baru",
          pesan: `Usulan pemusnahan baru untuk dokumen "${oDocument.nama_dokumen || oDocument.kode_dokumen}" oleh ${cProposedBy}`,
          tipe: "pemusnahan_arsip",
          tautan: "/edms/destruction",
        });
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi usulan pemusnahan baru:", notifError.message);
    }

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to create destruction proposal",
      error: error.message,
    };

    Logging(error, {
      file: "destruction_proposal_create.js",
      func: "createDestructionProposal",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createDestructionProposal);
export default router;
