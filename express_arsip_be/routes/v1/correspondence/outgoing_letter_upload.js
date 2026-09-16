import express from "express";
import multer from "multer";
import DB from "../../../core/config/knex.js";
import { removeFileFromMinio, uploadFileToMinio, getMinioPrefix } from "../../../core/components/tools/minio_helper.js";
import { Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const vaAllowedMimeTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png"];
    if (!vaAllowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Format file tidak didukung"));
    }
    cb(null, true);
  }
});
const outgoingLetterUpload = async (req, res) => {
  const cBucketName = process.env.MINIO_BUCKET_NAME || "arsip-bucket";
  let cObjectName = null;
  let bObjectPersisted = false;
  try {
    const oPayload = req.body || {};
    const oFile = req.file;
    if (!oPayload.id_surat_keluar) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "id_surat_keluar wajib diisi"
      });
    }
    if (!oFile) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "File wajib diupload"
      });
    }
    const oLetter = await DB("trx_surat_keluar").where("id_surat_keluar", oPayload.id_surat_keluar).first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat keluar tidak ditemukan"
      });
    }
    const cNomorSurat = oPayload.nomor_surat || oLetter.nomor_surat;
    const cPerihal = oPayload.perihal || oLetter.perihal;

    // Ambil detail pengunggah (untuk struktur folder hirarki MinIO)
    let uploaderIdCabang = null,
      uploaderIdDept = null,
      uploaderIdDiv = null,
      uploaderIdUnit = null;
    const uploaderId = oPayload.uploaded_by || oPayload.UploadedBy || req?.auth?.id_pengguna;
    if (uploaderId) {
      const uploader = await DB("mst_pengguna").select("id_cabang", "id_departemen", "id_divisi", "id_unit_kerja").where("id_pengguna", uploaderId).first();
      if (uploader) {
        uploaderIdCabang = uploader.id_cabang;
        uploaderIdDept = uploader.id_departemen;
        uploaderIdDiv = uploader.id_divisi;
        uploaderIdUnit = uploader.id_unit_kerja;
      }
    }

    // Fallback
    if (!uploaderIdCabang && req.context && req.context.id_cabang) {
      uploaderIdCabang = req.context.id_cabang;
    }
    const minioPrefix = await getMinioPrefix(uploaderIdCabang, uploaderIdDept, uploaderIdDiv, uploaderIdUnit);

    // Separated MinIO folder: [prefix]/korespondensi/surat-keluar
    cObjectName = await uploadFileToMinio(cBucketName, oFile, {
      idCabang: uploaderIdCabang,
      modul: "korespondensi/surat-keluar",
      nomorDokumen: cNomorSurat,
      namaDokumen: cPerihal,
      version: "V1",
      customFolderPath: `${minioPrefix}/korespondensi/surat-keluar`
    });
    const dNow = new Date();
    let vaInserted;
    let vaReplacedFiles = [];
    const nActorId = oPayload.uploaded_by || req?.auth?.id_pengguna || null;
    await DB.transaction(async trx => {
      vaReplacedFiles = await trx("trx_file_surat_keluar").select("id_file_surat_keluar", "path_file").where("id_surat_keluar", oPayload.id_surat_keluar).where("status", "active").forUpdate();
      if (vaReplacedFiles.length > 0) {
        await trx("trx_file_surat_keluar").where("id_surat_keluar", oPayload.id_surat_keluar).where("status", "active").update({
          status: "nonactive",
          updated_at: dNow

        });
      }
      vaInserted = await trx("trx_file_surat_keluar").insert({
        id_surat_keluar: oPayload.id_surat_keluar,
        path_file: cObjectName,
        nama_file: oFile.originalname,
        mime_type: oFile.mimetype,
        ukuran_file: oFile.size,
        created_by: nActorId,
        status: "active",
        created_at: dNow,
        updated_at: dNow

      });
      await trx("trx_tracking_surat_keluar").insert({
        id_surat_keluar: oPayload.id_surat_keluar,
        status: oLetter.status,
        aktivitas: "file_surat_diupload",
        catatan: vaReplacedFiles.length > 0 ? `File surat diganti dengan ${oFile.originalname}` : `File ${oFile.originalname} berhasil diupload`,
        tanggal: dNow,
        dibuat_oleh: nActorId,
        created_at: dNow,
        updated_at: dNow

      });
    });
    bObjectPersisted = true;
    for (const oReplacedFile of vaReplacedFiles) {
      const cReplacedPath = oReplacedFile.path_file?.replace(/\\/g, "/");
      const bIsLegacyLocalFile = !cReplacedPath || /^\/?uploads\/surat_keluar\//.test(cReplacedPath);
      if (bIsLegacyLocalFile) continue;
      try {
        await removeFileFromMinio(cBucketName, cReplacedPath.replace(/^\/+/, ""));
      } catch (cleanupError) {
        console.error(`Gagal menghapus file lama ${cReplacedPath} dari MinIO:`, cleanupError.message);
      }
    }
    return res.status(201).json({
      status: status.SUKSES,
      message: vaReplacedFiles.length > 0 ? "File surat keluar berhasil diganti" : "File surat keluar berhasil diupload",
      data: {
        id_file_surat_keluar: vaInserted[0],
        path_file: cObjectName,
        nama_file: oFile.originalname,
        mime_type: oFile.mimetype,
        ukuran_file: oFile.size
      }
    });
  } catch (error) {

    if (cObjectName && !bObjectPersisted) {
      try {
        await removeFileFromMinio(cBucketName, cObjectName);
      } catch (cleanupError) {}
    }
    const oResult = {
      status: status.BAD_REQUEST,
      message: "File surat keluar gagal diupload",
      error: error.message
    };
    Logging(error, {
      file: "outgoing_letter_upload.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", upload.single("File"), outgoingLetterUpload);
export default router;
