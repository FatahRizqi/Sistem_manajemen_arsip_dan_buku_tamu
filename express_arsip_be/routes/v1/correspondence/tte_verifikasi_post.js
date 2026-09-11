import crypto from "crypto";
import express from "express";
import Joi from "joi";
import multer from "multer";
import DB from "../../../core/config/knex.js";
import { getPresignedUrlFromMinio, MINIO_BUCKET_NAME } from "../../../core/components/tools/minio_helper.js";
import { Logging, validatePayload } from "../components/tools/servertool.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";
import { assertMenuPermission, buildCertificatePayload, chooseBaseDocumentBuffer, createSigningProvider, generatePdfFromSurat, getCertificateRecord, getUserId, loadObjectBuffer, recordSignatureLog, resolveCertificateMaterial, sha256Hex, uploadPdfBuffer, verifyPdfBuffer } from "../components/tools/tte_service.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});
const SORT_COLUMNS = {
  id_surat_keluar: "tsk.id_surat_keluar",
  nomor_surat: "tsk.nomor_surat",
  nomor_agenda: "tsk.nomor_agenda",
  tanggal_surat: "tsk.tanggal_surat",
  tanggal_kirim: "tsk.tanggal_kirim",
  perihal: "tsk.perihal",
  status: "tsk.status",
  created_at: "tsk.created_at",
  updated_at:  "tsk.updated_at",
  waktu_tanda_tangan: "ttd_latest.waktu_tanda_tangan"
};
const ALLOWED_LETTER_STATUSES = ["disetujui", "terkirim", "selesai"];
const toPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};
const getBasePayload = req => ({
  ...(req.query || {}),
  ...(req.body || {})
});
const getLatestFileSubquery = () => DB("trx_file_surat_keluar as tf").select("tf.id_surat_keluar").max("tf.id_file_surat_keluar as id_file_surat_keluar").where("tf.status", "active").groupBy("tf.id_surat_keluar");
const getSignatureSubquery = () => DB("trx_tanda_tangan_dokumen as ttd").select("ttd.id_surat_keluar").max("ttd.id_tanda_tangan_dokumen as id_tanda_tangan_dokumen").where("ttd.status_tanda_tangan", "aktif").groupBy("ttd.id_surat_keluar");
const buildFileUrl = async pathFile => {
  if (!pathFile) return null;
  const bucketName = process.env.MINIO_BUCKET_NAME || MINIO_BUCKET_NAME;
  const cleaned = String(pathFile).replace(/\\/g, "/").replace(/^\/+/, "");
  try {
    const presigned = await getPresignedUrlFromMinio(bucketName, cleaned, 3600);
    if (presigned) return presigned;
  } catch (error) {
    // ignore and fallback
  }
  return `/${cleaned}`;
};
const selectSigningPosition = async surat => {
  const templateId = surat?.id_template || null;
  const byTemplate = templateId ? await DB("mst_posisi_tanda_tangan").where("status", "aktif").where("id_template", templateId).orderBy("is_default", "desc").first() : null;
  if (byTemplate) return byTemplate;
  const defaultPosition = await DB("mst_posisi_tanda_tangan").where("status", "aktif").where("is_default", 1).orderBy("updated_at", "desc").first();
  return defaultPosition || {
    halaman: 1,
    posisi_x: 345,
    posisi_y: 58,
    lebar: 220,
    tinggi: 104
  };
};
const getSigningProvider = () => createSigningProvider();
const listDocuments = async (req, res, signedOnly = false) => {
  const oPayload = getBasePayload(req);
  const nPage = toPositiveNumber(oPayload.page, 1);
  const nLimit = Math.min(toPositiveNumber(oPayload.limit, 10), 100);
  const nOffset = (nPage - 1) * nLimit;
  const cKeyword = oPayload.keyword || oPayload.search || "";
  const cSortBy = SORT_COLUMNS[oPayload.sort_by] || SORT_COLUMNS.waktu_tanda_tangan;
  const cSortOrder = String(oPayload.sort_order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const latestFileSubquery = getLatestFileSubquery();
  const latestSignatureSubquery = getSignatureSubquery();
  const latestVerificationSubquery = DB("trx_verifikasi_dokumen as tvd").select("tvd.id_surat_keluar").max("tvd.id_verifikasi_dokumen as id_verifikasi_dokumen").groupBy("tvd.id_surat_keluar");
  const signatureCountSubquery = DB("trx_tanda_tangan_dokumen as ttd_count").select("ttd_count.id_surat_keluar").count({
    jumlah_tanda_tangan: "ttd_count.id_tanda_tangan_dokumen"
  }).where("ttd_count.status_tanda_tangan", "aktif").groupBy("ttd_count.id_surat_keluar");
  const query = DB("trx_surat_keluar as tsk").leftJoin("mst_jenis_surat as mjs", "tsk.id_jenis_surat", "mjs.jenis_surat_id").leftJoin("mst_template_surat as mts", "tsk.id_template", "mts.id_template").leftJoin("mst_pengguna as u", "tsk.created_by", "u.id_pengguna").leftJoin({
    file_latest: latestFileSubquery
  }, "tsk.id_surat_keluar", "file_latest.id_surat_keluar").leftJoin("trx_file_surat_keluar as tf", "tf.id_file_surat_keluar", "file_latest.id_file_surat_keluar").leftJoin({
    ttd_latest_ref: latestSignatureSubquery
  }, "tsk.id_surat_keluar", "ttd_latest_ref.id_surat_keluar").leftJoin("trx_tanda_tangan_dokumen as ttd_latest", "ttd_latest.id_tanda_tangan_dokumen", "ttd_latest_ref.id_tanda_tangan_dokumen").leftJoin({
    ver_latest_ref: latestVerificationSubquery
  }, "tsk.id_surat_keluar", "ver_latest_ref.id_surat_keluar").leftJoin("trx_verifikasi_dokumen as tvd_latest", "tvd_latest.id_verifikasi_dokumen", "ver_latest_ref.id_verifikasi_dokumen").leftJoin({
    ttd_count_ref: signatureCountSubquery
  }, "tsk.id_surat_keluar", "ttd_count_ref.id_surat_keluar").select("tsk.id_surat_keluar", "tsk.nomor_surat", "tsk.nomor_agenda", "tsk.tanggal_surat", "tsk.tanggal_kirim", "tsk.id_jenis_surat", "mjs.nama_jenis_surat", "tsk.perihal", "tsk.tujuan", "tsk.instansi_tujuan", "tsk.media_pengiriman", "tsk.id_template", "mts.nama_template", "tsk.id_cabang", "tf.nama_file", "tf.mime_type", "tf.ukuran_file", "tf.tanggal_upload", "tf.path_file", "tsk.isi_surat_final", "tsk.status", "tsk.created_by", "tsk.updated_by", "tsk.created_at", "tsk.updated_at", "ttd_latest.id_tanda_tangan_dokumen as id_tanda_tangan_terakhir", "ttd_latest.waktu_tanda_tangan as waktu_tanda_tangan_terakhir", "ttd_latest.token_verifikasi as token_verifikasi_terakhir", "ttd_latest.hash_dokumen as hash_dokumen_terakhir", "tvd_latest.id_verifikasi_dokumen as id_verifikasi_terakhir", "tvd_latest.valid_kriptografis as valid_kriptografis_terakhir", "tvd_latest.valid_integritas as valid_integritas_terakhir", DB.raw("COALESCE(ttd_count_ref.jumlah_tanda_tangan, 0) as jumlah_tanda_tangan"));
  applyMultiTenantFilter(query, req, "tsk");
  if (cKeyword) {
    query.where(builder => {
      builder.where("tsk.nomor_surat", "like", `%${cKeyword}%`).orWhere("tsk.nomor_agenda", "like", `%${cKeyword}%`).orWhere("tsk.perihal", "like", `%${cKeyword}%`).orWhere("tsk.tujuan", "like", `%${cKeyword}%`).orWhere("tsk.instansi_tujuan", "like", `%${cKeyword}%`);
    });
  }
  if (signedOnly) {
    query.whereNotNull("ttd_latest.id_tanda_tangan_dokumen");
  } else {
    query.whereIn("tsk.status", ALLOWED_LETTER_STATUSES);
    query.whereNull("ttd_latest.id_tanda_tangan_dokumen");
  }
  if (oPayload.id_jenis_surat) {
    query.where("tsk.id_jenis_surat", oPayload.id_jenis_surat);
  }
  const totalRows = await query.clone().clearSelect().clearOrder().count({
    total_data: "tsk.id_surat_keluar"
  });
  const nTotalData = Number(totalRows?.[0]?.total_data || 0);
  const rows = await query.orderBy(cSortBy, cSortOrder).limit(nLimit).offset(nOffset);
  const vaData = await Promise.all(rows.map(async row => ({
    ...row,
    file_url: await buildFileUrl(row.path_file),
    dokumen_tte_url: row.path_file ? await buildFileUrl(row.path_file) : null
  })));
  return res.status(200).json({
    status: status.SUKSES,
    message: signedOnly ? "Dokumen tertandatangani berhasil diambil" : "Dokumen menunggu tanda tangan berhasil diambil",
    data: vaData,
    pagination: {
      page: nPage,
      limit: nLimit,
      total_data: nTotalData,
      total_page: Math.ceil(nTotalData / nLimit)
    }
  });
};
const getSuratById = async idSuratKeluar => DB("trx_surat_keluar as tsk").leftJoin("mst_jenis_surat as mjs", "tsk.id_jenis_surat", "mjs.jenis_surat_id").leftJoin("mst_template_surat as mts", "tsk.id_template", "mts.id_template").select("tsk.*", "mjs.nama_jenis_surat", "mts.nama_template").where("tsk.id_surat_keluar", idSuratKeluar).first();
const getCurrentActiveFile = async idSuratKeluar => DB("trx_file_surat_keluar").where("id_surat_keluar", idSuratKeluar).where("status", "active").orderBy("tanggal_upload", "desc").first();
const getSignatureHistory = async idSuratKeluar => DB("trx_tanda_tangan_dokumen as ttd").leftJoin("mst_pengguna as u", "ttd.id_pengguna", "u.id_pengguna").leftJoin("mst_sertifikat_elektronik as mse", "ttd.id_sertifikat_elektronik", "mse.id_sertifikat_elektronik").select("ttd.*", "u.nama_lengkap as nama_penanda_tangan", "u.nama_pengguna as username_penanda_tangan", "mse.nama_sertifikat", "mse.alias_sertifikat").where("ttd.id_surat_keluar", idSuratKeluar).orderBy("ttd.urutan_tanda_tangan", "asc").orderBy("ttd.created_at", "asc");
const getVerificationHistory = async idSuratKeluar => DB("trx_verifikasi_dokumen as tvd").leftJoin("mst_pengguna as u", "tvd.diverifikasi_oleh", "u.id_pengguna").select("tvd.*", "u.nama_lengkap as nama_verifikator", "u.nama_pengguna as username_verifikator").where("tvd.id_surat_keluar", idSuratKeluar).orderBy("tvd.diverifikasi_pada", "desc");
const getRoutePermission = async (req, menuPaths, actionKey) => {
  const deny = await assertMenuPermission(req, {
    ...req,
    status: () => null
  }, menuPaths, actionKey);
  return deny;
};
const permissionGuard = async (req, res, menuPaths, actionKey) => {
  const permissionError = await assertMenuPermission(req, res, menuPaths, actionKey);
  return permissionError;
};
const pendingMenuPaths = ["/correspondence/outgoing_letter/tte", "/correspondence/outgoing_letter/tte/pending"];
const signedMenuPaths = ["/correspondence/outgoing_letter/tte", "/correspondence/outgoing_letter/tte/signed"];
const verifyMenuPaths = ["/correspondence/outgoing_letter/tte", "/correspondence/outgoing_letter/tte/verify"];
const certificateMenuPaths = ["/correspondence/outgoing_letter/tte", "/correspondence/outgoing_letter/tte/certificates"];
router.post("/verifikasi", upload.single("file"), async (req, res) => {
  const permissionError = await permissionGuard(req, res, verifyMenuPaths, "canCreate");
  if (permissionError) return permissionError;
  const oPayload = {
    ...(req.body || {}),
    ...(req.query || {})
  };
  try {
    const cValidation = await validatePayload({
      id_surat_keluar: Joi.number().optional(),
      id_tanda_tangan_dokumen: Joi.number().optional(),
      token_verifikasi: Joi.string().allow(null, "").optional()
    }, {}, oPayload, {
      allowUnknown: true
    });
    if (cValidation) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidation
      });
    }
    let pdfBuffer = null;
    let signatureRow = null;
    if (req.file?.buffer) {
      pdfBuffer = req.file.buffer;
    } else if (oPayload.id_tanda_tangan_dokumen) {
      signatureRow = await DB("trx_tanda_tangan_dokumen").where("id_tanda_tangan_dokumen", oPayload.id_tanda_tangan_dokumen).first();
      if (!signatureRow) {
        return res.status(404).json({
          status: status.BAD_REQUEST,
          message: "Dokumen tanda tangan tidak ditemukan"
        });
      }
      pdfBuffer = await loadObjectBuffer(signatureRow.lokasi_dokumen);
    } else if (oPayload.token_verifikasi) {
      signatureRow = await DB("trx_tanda_tangan_dokumen").where("token_verifikasi", oPayload.token_verifikasi).first();
      if (!signatureRow) {
        return res.status(404).json({
          status: status.BAD_REQUEST,
          message: "Token verifikasi tidak ditemukan"
        });
      }
      pdfBuffer = await loadObjectBuffer(signatureRow.lokasi_dokumen);
    } else if (oPayload.id_surat_keluar) {
      const currentFile = await getCurrentActiveFile(oPayload.id_surat_keluar);
      if (!currentFile) {
        return res.status(404).json({
          status: status.BAD_REQUEST,
          message: "Dokumen aktif tidak ditemukan"
        });
      }
      pdfBuffer = await loadObjectBuffer(currentFile.path_file);
    } else {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Pilih file, id_tanda_tangan_dokumen, token_verifikasi, atau id_surat_keluar"
      });
    }
    const verification = await verifyPdfBuffer(pdfBuffer);
    const verificationTime = new Date();
    const verificationInsert = {
      id_surat_keluar: oPayload.id_surat_keluar || signatureRow?.id_surat_keluar || null,
      id_tanda_tangan_dokumen: signatureRow?.id_tanda_tangan_dokumen || oPayload.id_tanda_tangan_dokumen || null,
      token_verifikasi: oPayload.token_verifikasi || signatureRow?.token_verifikasi || null,
      valid_kriptografis: verification.valid_kriptografis,
      valid_integritas: verification.valid_integritas,
      valid_sertifikat: verification.valid_sertifikat,
      sertifikat_dipercaya: verification.sertifikat_dipercaya,
      sertifikat_dicabut: verification.sertifikat_dicabut,
      dokumen_diubah: verification.dokumen_diubah,
      pesan_verifikasi: JSON.stringify(verification.signatures),
      diverifikasi_pada: verificationTime,
      diverifikasi_oleh: getUserId(req),
      created_by: getUserId(req),
      updated_by: getUserId(req),
      created_at: verificationTime,
      updated_at: verificationTime

    };
    await DB("trx_verifikasi_dokumen").insert(verificationInsert);
    return res.status(200).json({
      status: status.SUKSES,
      message: "Verifikasi dokumen berhasil dilakukan",
      data: verification
    });
  } catch (error) {
    await Logging(error, {
      file: "tte.js",
      func: "verifikasi",
      request: JSON.stringify(oPayload),
      response: "Verifikasi dokumen gagal dilakukan",
      user: req?.auth?.nama_pengguna || ""
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Verifikasi dokumen gagal dilakukan",
      error: error.message
    });
  }
});
export default router;
