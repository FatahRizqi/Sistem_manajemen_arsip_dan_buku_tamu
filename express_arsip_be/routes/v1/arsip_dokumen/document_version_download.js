import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { downloadFileFromMinio } from "../../../core/components/tools/minio_helper.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadDocumentVersion = async (req, res) => {
  try {
    const nVersionId = req.query.id_versi || req.query.version_id || req.body?.id_versi || req.body?.version_id;

    if (!nVersionId) {
      const oResult = {
        status: "error",
        message: "id_versi wajib diisi",
      };
      return res.status(422).json(oResult);
    }

    // Ambil data versi dokumen
    const oVersion = await DB("trx_versi_dokumen as v")
      .select(
        "v.id_versi",
        "v.kode_dokumen",
        "v.nomor_versi",
        "v.file_path",
        "v.status_persetujuan",
        "d.nama_dokumen",
        "d.nomor_dokumen"
      )
      .leftJoin("trx_dokumen as d", "v.kode_dokumen", "d.kode_dokumen")
      .where("v.id_versi", nVersionId)
      .first();

    if (!oVersion) {
      const oResult = {
        status: "error",
        message: "Document version not found",
      };
      return res.status(404).json(oResult);
    }

    // Tentukan nama file download
    const cFileExtension = path.extname(oVersion.file_path);
    const cDownloadName = `${oVersion.nomor_dokumen}_V${oVersion.nomor_versi}${cFileExtension}`;

    // Coba download dari MinIO dahulu
    try {
      const bucketName = process.env.MINIO_BUCKET_NAME || "arsip-bucket";
      // Contoh file_path: "/uploads/documents/filename.ext" -> "documents/filename.ext"
      const objectName = oVersion.file_path.replace(/^\/uploads\//, "").replace(/^\//, "");
      
      const stream = await downloadFileFromMinio(bucketName, objectName);
      
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${cDownloadName}"`,
      );
      res.setHeader("Content-Type", "application/octet-stream");

      return stream.pipe(res);
    } catch (minioError) {
      console.log("File tidak ditemukan di MinIO atau koneksi gagal, fallback ke lokal disk:", minioError.message);
      
      // Fallback: Bangun absolute path file lokal
      const cRelativePath = oVersion.file_path.replace(/^\//, "");
      const cAbsolutePath = path.join(
        __dirname,
        "../../../public/uploads",
        cRelativePath,
      );

      // Cek file ada di disk
      if (!fs.existsSync(cAbsolutePath)) {
        const oResult = {
          status: "error",
          message: "File fisik tidak ditemukan di server maupun di MinIO",
        };
        return res.status(404).json(oResult);
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${cDownloadName}"`,
      );
      res.setHeader("Content-Type", "application/octet-stream");

      return res.sendFile(cAbsolutePath);
    }
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to download document version",
      error: error.message,
    };

    Logging(error, {
      file: "document_version_download.js",
      func: "downloadDocumentVersion",
      request: req.query || {},
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", downloadDocumentVersion);
export default router;
