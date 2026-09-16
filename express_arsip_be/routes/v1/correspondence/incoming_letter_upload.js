import express from "express";
import multer from "multer";
import DB from "../../../core/config/knex.js";
import {
  removeFileFromMinio,
  uploadFileToMinio,
  getMinioPrefix,
} from "../../../core/components/tools/minio_helper.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { insertIncomingLetterTracking } from "../components/tools/tracking_helper.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const incomingLetterUpload = async (req, res) => {
  let cObjectName = null;
  let cBucketName = null;
  let bObjectPersisted = false;
  let vaReplacedFiles = [];
  let vaInserted = [];

  try {
    const oPayload = req.body || {};
    const oFile = req.file;

    if (!oPayload.surat_masuk_id || !oFile) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "surat_masuk_id dan File wajib diisi",
      });
    }

    const oLetter = await DB("trx_surat_masuk as sm")
      .leftJoin("mst_cabang as c", "sm.id_cabang", "c.id_cabang")
      .select(
        "sm.*",
        "c.kode_cabang",
        "c.nama_cabang"
      )
      .where("sm.surat_masuk_id", oPayload.surat_masuk_id)
      .first();

    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan",
      });
    }

    const cBucketNameTemp = process.env.MINIO_BUCKET_NAME || "arsip-bucket";
    cObjectName = await uploadFileToMinio(cBucketNameTemp, oFile, {
      idCabang: oLetter.id_cabang,
      modul: "korespondensi/surat-masuk",
      nomorDokumen: oLetter.nomor_surat || oLetter.nomor_agenda,
      namaDokumen: oLetter.perihal || "",
    });

    cBucketName = cBucketNameTemp;

    const dNow = new Date();

    await DB.transaction(async (trx) => {
      vaReplacedFiles = await trx("trx_file_surat_masuk")
        .select("file_surat_masuk_id", "path_file")
        .where("surat_masuk_id", oPayload.surat_masuk_id)
        .where("status", "active")
        .forUpdate();

      if (vaReplacedFiles.length > 0) {
        await trx("trx_file_surat_masuk")
          .where("surat_masuk_id", oPayload.surat_masuk_id)
          .where("status", "active")
          .update({
            status: "nonactive",
            updated_at: dNow,
          });
      }

      vaInserted = await trx("trx_file_surat_masuk").insert({
        surat_masuk_id: oPayload.surat_masuk_id,
        path_file: cObjectName,
        nama_file: oFile.originalname,
        tipe_mime_file: oFile.mimetype,
        ukuran_file: oFile.size,
        uploaded_by: oPayload.uploaded_by || oPayload.UploadedBy || null,
        status: "active",
        created_at: dNow,
        updated_at: dNow,
      });

      await insertIncomingLetterTracking(trx, {
        surat_masuk_id: oPayload.surat_masuk_id,
        disposisi_surat_id: null,
        nama_aksi: "file_surat_diupload",
        dari_pengguna_id: null,
        kepada_pengguna_id: null,
        status_sebelumnya: oLetter.status,
        status_saat_ini: oLetter.status,
        catatan:
          vaReplacedFiles.length > 0
            ? `File surat diganti dengan ${oFile.originalname}`
            : `File ${oFile.originalname} berhasil diupload`,
        processed_at: dNow,
        created_by: oPayload.uploaded_by || oPayload.UploadedBy || null,
        created_at: dNow,
        updated_at: dNow,
      });
    });

    bObjectPersisted = true;

    for (const oReplacedFile of vaReplacedFiles) {
      const cReplacedPath = oReplacedFile.path_file?.replace(/\\/g, "/");
      const bIsLegacyLocalFile =
        !cReplacedPath || /^\/?uploads\/surat_masuk\//.test(cReplacedPath);

      if (bIsLegacyLocalFile) continue;

      try {
        await removeFileFromMinio(
          cBucketName,
          cReplacedPath.replace(/^\/+/, "")
        );
      } catch (cleanupError) {
        console.error(
          `Gagal menghapus file lama ${cReplacedPath} dari MinIO:`,
          cleanupError.message
        );
      }
    }

    return res.status(201).json({
      status: status.SUKSES,
      message:
        vaReplacedFiles.length > 0
          ? "File surat masuk berhasil diganti"
          : "File surat masuk berhasil diupload",
      data: {
        file_surat_masuk_id: vaInserted[0],
        path_file: cObjectName,
        nama_file: oFile.originalname,
        tipe_mime_file: oFile.mimetype,
        ukuran_file: oFile.size,
      },
    });
  } catch (error) {


    if (cObjectName && !bObjectPersisted) {
      try {
        await removeFileFromMinio(cBucketName, cObjectName);
      } catch (cleanupError) {}
    }

    const oResult = {
      status: status.BAD_REQUEST,
      message: "File surat masuk gagal diupload",
      error: error.message,
    };

    Logging(error, {
      file: "incoming_letter_upload.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: "",
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", upload.single("File"), incomingLetterUpload);
export default router;
