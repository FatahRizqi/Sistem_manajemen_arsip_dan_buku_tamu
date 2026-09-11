import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";

const router = express.Router();

const updateDocumentLocation = async (req, res) => {
  const oPayload = req.body;

  try {
    const nIdDokumen = oPayload.id_dokumen;
    const cLokasiFisik = oPayload.lokasi_fisik;
    const dNow = new Date();

    if (!nIdDokumen) {
      const oResult = {
        status: "error",
        message: "id_dokumen wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Lokasi fisik boleh kosong (untuk clear lokasi)
    const oDocument = await DB("trx_dokumen")
      .where("id_dokumen", nIdDokumen)
      .where("status", "active")
      .first();

    if (!oDocument) {
      const oResult = {
        status: "error",
        message: "Document not found or already inactive",
      };
      return res.status(404).json(oResult);
    }

    const oData = {
      lokasi_fisik: cLokasiFisik || null,
      updated_at: dNow,
    };

    await DB("trx_dokumen")
      .where("id_dokumen", nIdDokumen)
      .update(oData);

    const oResult = {
      status: "success",
      message: "Lokasi fisik dokumen berhasil diperbarui",
      data: {
        id_dokumen: nIdDokumen,
        nomor_dokumen: oDocument.nomor_dokumen,
        nama_dokumen: oDocument.nama_dokumen,
        old_location: oDocument.lokasi_fisik,
        ...oData,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to update document location",
      error: error.message,
    };

    Logging(error, {
      file: "document_location_update.js",
      func: "updateDocumentLocation",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", updateDocumentLocation);
export default router;
