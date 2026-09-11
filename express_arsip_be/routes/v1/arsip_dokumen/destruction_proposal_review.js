import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();

const reviewDestructionProposal = async (req, res) => {
  const oPayload = req.body;

  try {
    const nProposalId = oPayload.id_usulan || oPayload.proposal_id;
    const cStatus = oPayload.status;
    const cReviewNotes = oPayload.catatan_tinjauan || oPayload.review_notes || null;
    const cReviewedBy =
      req?.auth?.nama_pengguna ||
      req?.context?.nama_pengguna ||
      req?.context?.nama_pengguna ||
      oPayload.reviewed_by ||
      "system";
    const dNow = new Date();

    if (!nProposalId) {
      const oResult = {
        status: "error",
        message: "id_usulan wajib diisi",
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

    // Cek proposal ada dan masih bisa di-review
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

    if (oProposal.status !== "submitted") {
      const oResult = {
        status: "error",
        message: `Proposal tidak dalam status 'submitted'. Status saat ini: '${oProposal.status}'`,
      };
      return res.status(422).json(oResult);
    }

    const oData = {
      status: cStatus,
      ditinjau_oleh: cReviewedBy,
      ditinjau_pada: dNow,
      catatan_tinjauan: cReviewNotes,
      updated_at: dNow,
    };

    await DB("trx_usulan_pemusnahan")
      .where("id_usulan", nProposalId)
      .update(oData);

    const oResult = {
      status: "success",
      message: `Proposal pemusnahan berhasil di-${cStatus === "approved" ? "setujui" : "tolak"}`,
      data: {
        id_usulan: nProposalId,
        kode_dokumen: oProposal.kode_dokumen,
        ...oData,
      },
    };

    // Kirim notifikasi ke pengusul dan semua Superadmin
    try {
      const actionText = cStatus === "approved" ? "DISETUJUI" : "DITOLAK";
      const kode = oProposal.kode_dokumen || `Usulan #${nProposalId}`;

      if (oProposal.dibuat_oleh || oProposal.created_by) {
        const proposerId = oProposal.dibuat_oleh || oProposal.created_by;
        await createNotification({
          id_pengguna: proposerId,
          judul: `Usulan Pemusnahan ${actionText}`,
          pesan: `Usulan pemusnahan arsip "${kode}" telah ${actionText} oleh pimpinan. Catatan: ${cReviewNotes || "-"}`,
          tipe: "pemusnahan_arsip",
          tautan: "/edms/destruction",
        });
      }

      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      const proposerId = oProposal.dibuat_oleh || oProposal.created_by;
      for (const sa of superadmins) {
        if (sa.id_pengguna !== proposerId) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: `Usulan Pemusnahan ${actionText}`,
            pesan: `Usulan pemusnahan arsip "${kode}" telah ${actionText}.`,
            tipe: "pemusnahan_arsip",
            tautan: "/edms/destruction",
          });
        }
      }
    } catch (notifError) {
      console.error("Gagal kirim notifikasi usulan pemusnahan:", notifError.message);
    }

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to review destruction proposal",
      error: error.message,
    };

    Logging(error, {
      file: "destruction_proposal_review.js",
      func: "reviewDestructionProposal",
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

router.post("/", reviewDestructionProposal);
export default router;
