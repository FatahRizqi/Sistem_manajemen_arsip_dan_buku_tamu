import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { logDocumentChange, buildChangeDiff } from "../components/tools/audit_trail_helper.js";

const router = express.Router();

const updateDocument = async (req, res) => {
  const oPayload = req.body;

  try {
    const nDocumentId = oPayload.id_dokumen;
    const cDocumentName = oPayload.nama_dokumen;
    const cDocumentNumber = oPayload.nomor_dokumen;
    const dDocumentDate = oPayload.tanggal;
    const cPicName = oPayload.nama_pic;
    const cDocumentTypeCode = oPayload.kode_jenis_dokumen || null;
    const cDocumentCategoryCode = oPayload.kode_kategori_dokumen || null;
    const cClassificationCode = oPayload.kode_klasifikasi || null;
    const cConfidentialityLevelCode = oPayload.kode_tingkat_kerahasiaan || null;
    let cRetentionCode = oPayload.kode_retensi || null;
    const cPhysicalLocation = oPayload.lokasi_fisik || null;

    if (!nDocumentId) {
      const oResult = {
        status: "error",
        message: "id_dokumen wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    if (!cDocumentName || !cDocumentNumber || !dDocumentDate || !cPicName) {
      const oResult = {
        status: "error",
        message: "nama_dokumen, nomor_dokumen, tanggal, dan nama_pic wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Ambil data lama sebelum update
    const oOldDoc = await DB("trx_dokumen")
      .where("id_dokumen", nDocumentId)
      .where("status", "active")
      .first();

    if (!oOldDoc) {
      const oResult = {
        status: "error",
        message: "Document not found or already inactive",
      };
      return res.status(404).json(oResult);
    }

    // Auto-assign JRA code and get retention years
    let nTahunRetensi = null;
    if (cDocumentCategoryCode) {
      const oRetention = await DB("mst_jadwal_retensi")
        .where("kode_kategori_dokumen", cDocumentCategoryCode)
        .where("status", "active")
        .first();
      if (oRetention) {
        cRetentionCode = oRetention.kode_retensi;
        nTahunRetensi = oRetention.tahun_retensi;
      }
    }

    // Auto-map transaction date to document date
    const dTransactionDate = dDocumentDate ? new Date(dDocumentDate) : null;

    // Auto-calculate expiration date based on document date and JRA
    let dExpiredDate = null;
    if (dDocumentDate && nTahunRetensi !== null) {
      const dExp = new Date(dDocumentDate);
      dExp.setFullYear(dExp.getFullYear() + nTahunRetensi);
      dExpiredDate = dExp;
    }
    const dNow = new Date();

    // Cek duplikat nomor dokumen (exclude dokumen yang sedang diedit)
    const oExisting = await DB("trx_dokumen")
      .where("nomor_dokumen", cDocumentNumber)
      .where("status", "active")
      .whereNot("id_dokumen", nDocumentId)
      .first();

    if (oExisting) {
      const oResult = {
        status: "error",
        message: `Nomor dokumen ${cDocumentNumber} sudah digunakan oleh dokumen lain`,
      };
      return res.status(422).json(oResult);
    }

    const nUserId = req.context?.id_pengguna || req.auth?.id_pengguna || req.auth?.id || null;
    const cTz = req.headers["x-tz"] || "Asia/Jakarta";

    const oData = {
      kode_klasifikasi: cClassificationCode,
      kode_jenis_dokumen: cDocumentTypeCode,
      kode_kategori_dokumen: cDocumentCategoryCode,
      kode_tingkat_kerahasiaan: cConfidentialityLevelCode,
      kode_retensi: cRetentionCode,
      nama_dokumen: cDocumentName,
      nomor_dokumen: cDocumentNumber,
      tanggal: dDocumentDate,
      tanggal_transaksi: dTransactionDate,
      tanggal_kedaluwarsa: dExpiredDate,
      nama_pic: cPicName,
      lokasi_fisik: cPhysicalLocation,
      updated_by: nUserId,
      tz: cTz,
      updated_at: dNow,
    };

    await DB("trx_dokumen")
      .where("id_dokumen", nDocumentId)
      .where("status", "active")
      .update(oData);

    // Compute diff & log audit trail
    const diff = buildChangeDiff(oOldDoc, oData, [
      "nama_dokumen",
      "nomor_dokumen",
      "nama_pic",
      "lokasi_fisik",
      "kode_jenis_dokumen",
      "kode_kategori_dokumen",
      "kode_klasifikasi",
      "kode_tingkat_kerahasiaan",
    ]);

    await logDocumentChange({
      kodeDokumen: oOldDoc.kode_dokumen,
      aksi: "update",
      deskripsi: `Metadata dokumen '${cDocumentName}' berhasil diperbarui`,
      detailJson: diff,
      dilakukanOleh: req?.auth?.nama_pengguna || cPicName,
      req,
    });

    const oResult = {
      status: "success",
      message: "Document metadata updated successfully",
      data: { id_dokumen: nDocumentId, ...oData },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to update document metadata",
      error: error.message,
    };

    Logging(error, {
      file: "document_update.js",
      func: "updateDocument",
      request: oPayload,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", updateDocument);
export default router;
