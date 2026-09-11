import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

const generateDocumentQR = async (req, res) => {
  const oPayload = req.body;

  try {
    const nIdDokumen = oPayload.id_dokumen;

    if (!nIdDokumen) {
      const oResult = {
        status: "error",
        message: "id_dokumen wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Ambil data dokumen
    const oDocument = await DB("trx_dokumen")
      .select("id_dokumen", "nama_dokumen", "nomor_dokumen", "qr_code", "status")
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

    // Gunakan QRCode yang sudah ada atau generate baru jika kosong
    let cQRCodeString = oDocument.qr_code;
    if (!cQRCodeString) {
      cQRCodeString = `DOC-${uuidv4()}`;

      // Simpan QR Code string ke database
      await DB("trx_dokumen")
        .where("id_dokumen", nIdDokumen)
        .update({
          qr_code: cQRCodeString,
          updated_at: new Date(),
        });
    }

    // Generate QR Code sebagai base64 PNG dengan meng-encode string cQRCodeString langsung
    const cQRBase64 = await QRCode.toDataURL(cQRCodeString, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 300,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
    });

    const oResult = {
      status: "success",
      message: "QR Code berhasil di-generate",
      data: {
        id_dokumen: oDocument.id_dokumen,
        nomor_dokumen: oDocument.nomor_dokumen,
        nama_dokumen: oDocument.nama_dokumen,
        qr_code: cQRCodeString,
        qr_base64: cQRBase64,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to generate QR Code",
      error: error.message,
    };

    Logging(error, {
      file: "document_qr_generate.js",
      func: "generateDocumentQR",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", generateDocumentQR);
export default router;
