import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { logDocumentChange } from "../components/tools/audit_trail_helper.js";

const router = express.Router();

const deleteDocument = async (req, res) => {
  const oPayload = req.body;

  try {
    const vaDocumentId = Array.isArray(oPayload.id_dokumen)
      ? oPayload.id_dokumen
      : [oPayload.id_dokumen];
    const dNow = new Date();

    if (
      !vaDocumentId.length ||
      vaDocumentId.some((nDocumentId) => !nDocumentId)
    ) {
      const oResult = {
        status: "error",
        message: "id_dokumen is required",
      };

      return res.status(422).json(oResult);
    }

    const oDocs = await DB("trx_dokumen")
      .select("id_dokumen", "kode_dokumen", "nama_dokumen")
      .whereIn("id_dokumen", vaDocumentId)
      .whereNot("status", "deleted");

    if (!oDocs || oDocs.length === 0) {
      const oResult = {
        status: "error",
        message: "Document not found",
      };

      return res.status(404).json(oResult);
    }

    const oData = {
      status: "deleted",
      updated_at: dNow,
    };

    await DB("trx_dokumen")
      .whereIn("id_dokumen", vaDocumentId)
      .whereNot("status", "deleted")
      .update(oData);

    // Audit trail log for each deleted document
    for (const doc of oDocs) {
      await logDocumentChange({
        kodeDokumen: doc.kode_dokumen,
        aksi: "delete",
        deskripsi: `Dokumen '${doc.nama_dokumen}' telah dihapus`,
        detailJson: { status: "deleted" },
        req,
      });
    }

    const oResult = {
      status: "success",
      message: "Document deleted successfully",
      data: {
        id_dokumen: vaDocumentId,
        ...oData,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to delete document",
      error: error.message,
    };

    Logging(error, {
      file: "document_delete.js",
      func: "deleteDocument",
      request: oPayload,
      response: oResult,
      user: req?.auth?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", deleteDocument);
export default router;
