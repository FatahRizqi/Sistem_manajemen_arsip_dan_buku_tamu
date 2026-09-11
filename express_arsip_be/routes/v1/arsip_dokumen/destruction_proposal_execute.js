import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";

const router = express.Router();

const executeDestructionProposal = async (req, res) => {
  const oPayload = req.body;

  try {
    const nProposalId = oPayload.id_usulan || oPayload.proposal_id;
    const cBeritaAcaraPath = oPayload.file_berita_acara || oPayload.berita_acara_path || null;
    const cExecutedBy = req?.auth?.nama_pengguna || req?.context?.nama_pengguna || oPayload.dieksekusi_oleh || oPayload.executed_by || "system";
    const dNow = new Date();

    if (!nProposalId) {
      const oResult = {
        status: "error",
        message: "id_usulan wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Ambil data proposal
    const oProposal = await DB("trx_usulan_pemusnahan")
      .where("id_usulan", nProposalId)
      .first();

    if (!oProposal) {
      const oResult = {
        status: "error",
        message: "Destruction proposal not found",
      };
      return res.status(404).json(oResult);
    }

    if (oProposal.status !== "approved") {
      const oResult = {
        status: "error",
        message: `Proposal harus dalam status 'approved' untuk dapat dieksekusi. Status saat ini: '${oProposal.status}'`,
      };
      return res.status(422).json(oResult);
    }

    // Jalankan dalam satu transaksi database
    await DB.transaction(async (trx) => {
      // 1. Update proposal jadi 'executed'
      await trx("trx_usulan_pemusnahan")
        .where("id_usulan", nProposalId)
        .update({
          status: "executed",
          dieksekusi_oleh: cExecutedBy,
          dieksekusi_pada: dNow,
          file_berita_acara: cBeritaAcaraPath,
          updated_at: dNow,
        });

      // 2. Soft-delete dokumen (Status → nonactive)
      await trx("trx_dokumen")
        .where("kode_dokumen", oProposal.kode_dokumen)
        .update({
          status: "nonactive",
          updated_at: dNow,
        });
    });

    const oResult = {
      status: "success",
      message:
        "Pemusnahan arsip berhasil dieksekusi. Dokumen telah dinonaktifkan.",
      data: {
        id_usulan: nProposalId,
        kode_dokumen: oProposal.kode_dokumen,
        executed_by: cExecutedBy,
        executed_at: dNow,
        file_berita_acara: cBeritaAcaraPath,
        document_status: "nonactive",
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to execute destruction proposal",
      error: error.message,
    };

    Logging(error, {
      file: "destruction_proposal_execute.js",
      func: "executeDestructionProposal",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", executeDestructionProposal);
export default router;
