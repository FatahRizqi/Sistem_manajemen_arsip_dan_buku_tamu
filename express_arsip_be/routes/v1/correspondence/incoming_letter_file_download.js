import express from "express";
import path from "path";
import fs from "fs";
import DB from "../../../core/config/knex.js";
import { downloadFileFromMinio } from "../../../core/components/tools/minio_helper.js";
import { Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const incomingLetterFileDownload = async (req, res) => {
  try {
    const nFileId = req.query.file_surat_masuk_id || req.query.incoming_letter_file_id || req.body?.file_surat_masuk_id || req.body?.incoming_letter_file_id;
    if (!nFileId) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "file_surat_masuk_id wajib diisi"
      });
    }
    const oFile = await DB("trx_file_surat_masuk").where("file_surat_masuk_id", nFileId).where("status", "active").first();
    if (!oFile) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "File surat masuk tidak ditemukan"
      });
    }
    const cFilePath = oFile.path_file;
    const cFileName = oFile.nama_file || path.basename(cFilePath);
    const cMimeType = oFile.tipe_mime_file || "application/octet-stream";
    const cBucketName = process.env.MINIO_BUCKET_NAME || "arsip-bucket";
    const cObjectName = cFilePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^uploads\//, "");
    try {
      const oStream = await downloadFileFromMinio(cBucketName, cObjectName);
      res.setHeader("Content-Type", cMimeType);
      res.setHeader("Content-Disposition", `inline; filename="${cFileName}"`);
      return oStream.pipe(res);
    } catch (minioError) {
      console.log("File tidak ditemukan di MinIO atau koneksi gagal, fallback ke disk lokal:", minioError.message);
    }
    const cUploadRoot = path.resolve(process.cwd(), "uploads", "surat_masuk");
    const cAbsolutePath = path.resolve(process.cwd(), cFilePath);
    const cRelativePath = path.relative(cUploadRoot, cAbsolutePath);
    const bIsLocalUploadPath = cRelativePath !== "" && !cRelativePath.startsWith("..") && !path.isAbsolute(cRelativePath);
    if (!bIsLocalUploadPath || !fs.existsSync(cAbsolutePath)) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "File tidak ditemukan di MinIO maupun server lokal"
      });
    }
    res.setHeader("Content-Type", cMimeType);
    res.setHeader("Content-Disposition", `inline; filename="${cFileName}"`);
    return res.sendFile(cAbsolutePath);
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "File surat masuk gagal dibuka",
      error: error.message
    };
    Logging(error, {
      file: "incoming_letter_file_download.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", incomingLetterFileDownload);
export default router;
