import express from "express";
import minioClient from "../../../core/config/minio.js";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import fs from "fs";
import path from "path";

const router = express.Router();

const documentPreview = async (req, res) => {
  try {
    let cFilePath =
      req.query.file_name ||
      req.query.file_path ||
      req.query.path_file ||
      req.body?.file_name ||
      req.body?.file_path ||
      req.body?.path_file;

    const nIdDokumen = req.query.id_dokumen || req.body?.id_dokumen;
    const cKodeDokumen = req.query.kode_dokumen || req.body?.kode_dokumen;

    // Jika file_path belum ada tapi id_dokumen / kode_dokumen dikirim, cari dari database
    if (!cFilePath && (nIdDokumen || cKodeDokumen)) {
      const oQuery = DB("trx_versi_dokumen as v")
        .select("v.file_path")
        .join("trx_dokumen as d", "v.kode_dokumen", "d.kode_dokumen");

      if (nIdDokumen) {
        oQuery.where("d.id_dokumen", nIdDokumen);
      } else if (cKodeDokumen) {
        oQuery.where("d.kode_dokumen", cKodeDokumen);
      }

      const oVersion = await oQuery
        .where("v.status_persetujuan", "approved")
        .orderBy("v.nomor_versi", "desc")
        .first();

      if (oVersion && oVersion.file_path) {
        cFilePath = oVersion.file_path;
      }
    }

    if (!cFilePath) {
      return res.status(422).json({
        status: "error",
        message: "file_name / file_path / id_dokumen / kode_dokumen wajib diisi",
      });
    }

    const cBucketName = process.env.MINIO_BUCKET_NAME || "arsip-bucket";
    const cObjectName = cFilePath.replace(/^\/uploads\//, "").replace(/^\//, "");

    try {
      await minioClient.statObject(cBucketName, cObjectName);

      let finalUrl;
      try {
        finalUrl = await minioClient.presignedGetObject(cBucketName, cObjectName, 3600);
      } catch (err) {
        console.warn("Gagal men-generate presigned URL dari MinIO, fallback ke URL lokal:", err.message);
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        finalUrl = `${serverUrl}/uploads/${cObjectName}`;
      }

      return res.status(200).json({
        status: "success",
        preview_url: finalUrl,
        url: finalUrl,
        data: {
          preview_url: finalUrl,
          url: finalUrl,
        },
      });
    } catch (statErr) {
      // If object doesn't exist in MinIO or MinIO is unreachable, fallback to local URL
      console.warn("Object tidak ditemukan di MinIO atau MinIO error, fallback ke URL lokal:", statErr.message);

      const localFilePath = path.join(process.cwd(), 'public', 'uploads', cObjectName);

      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({
          status: "error",
          message: "Berkas fisik dokumen tidak ditemukan di penyimpanan (MinIO maupun Lokal). Silakan unggah ulang dokumen ini.",
        });
      }

      const serverUrl = `${req.protocol}://${req.get('host')}`;
      const finalUrl = `${serverUrl}/uploads/${cObjectName}`;

      return res.status(200).json({
        status: "success",
        preview_url: finalUrl,
        url: finalUrl,
        data: {
          preview_url: finalUrl,
          url: finalUrl,
        },
      });
    }
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Gagal memproses pratinjau dokumen",
      error: error.message,
    };

    Logging(error, {
      file: "document_preview.js",
      func: "documentPreview",
      request: { ...req.query, ...req.body },
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", documentPreview);
export default router;
