import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const incomingLetterDetail = async (req, res) => {
  try {
    const oPayload = req.body || {};
    if (!oPayload.surat_masuk_id && oPayload.incoming_letter_id) {
      oPayload.surat_masuk_id = oPayload.incoming_letter_id;
      delete oPayload.incoming_letter_id;
    }
    const oValidation = {
      surat_masuk_id: Joi.number().required()
    };
    const oMessage = {
      "surat_masuk_id.required": "surat_masuk_id wajib diisi",
      "surat_masuk_id.number": "surat_masuk_id harus berupa angka"
    };
    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      allowUnknown: false
    });
    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate
      });
    }
    const oLetter = await DB("trx_surat_masuk as til").leftJoin("mst_jenis_surat as mlt", "til.jenis_surat_id", "mlt.jenis_surat_id").select("til.surat_masuk_id", "til.nomor_agenda", "til.nomor_surat", "til.tanggal_surat", "til.tanggal_diterima", "til.nama_pengirim", "til.instansi_pengirim", "til.perihal", "til.keterangan_lampiran", "til.jenis_surat_id", "mlt.nama_jenis_surat", "til.jenis_dokumen_id", "til.klasifikasi_arsip_id", "til.tingkat_kerahasiaan_id", "til.status", "til.created_by", "til.updated_by", "til.created_at", "til.updated_at").where("til.surat_masuk_id", oPayload.surat_masuk_id).first();
    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan"
      });
    }
    const vaFiles = await DB("trx_file_surat_masuk").select("file_surat_masuk_id", "surat_masuk_id", "path_file", "nama_file", "tipe_mime_file", "ukuran_file", "uploaded_by", "status", "created_at", "updated_at").where("surat_masuk_id", oPayload.surat_masuk_id).where("status", "active").orderBy("created_at", "desc").orderBy("file_surat_masuk_id", "desc").limit(1);
    const getTableColumns = async (tableName) => {
      try {
        const [cols] = await DB.raw(`SHOW COLUMNS FROM \`${tableName}\``);
        return cols.map((col) => col.Field);
      } catch (error) {
        return [];
      }
    };
    const pickColumn = (columns, candidates) => {
      return candidates.find((column) => columns.includes(column)) || null;
    };
    const cols = await getTableColumns("trx_disposisi_surat");
    const fromCol = pickColumn(cols, ["from_user_id", "dari_pengguna_id", "from_id_pengguna"]) || "dari_pengguna_id";
    const toCol = pickColumn(cols, ["to_user_id", "kepada_pengguna_id", "to_id_pengguna"]) || "kepada_pengguna_id";

    const vaDispositions = await DB("trx_disposisi_surat as tld")
      .leftJoin("mst_instruksi_disposisi as mdi", "tld.instruksi_disposisi_id", "mdi.instruksi_disposisi_id")
      .select(
        "tld.disposisi_surat_id",
        "tld.surat_masuk_id",
        "tld.disposisi_induk_id",
        `tld.${fromCol} as dari_pengguna_id`,
        `tld.${toCol} as kepada_pengguna_id`,
        "tld.instruksi_disposisi_id",
        "mdi.nama_instruksi",
        "tld.instruksi",
        "tld.catatan_disposisi",
        "tld.batas_waktu",
        "tld.status",
        "tld.received_at",
        "tld.processed_at",
        "tld.completed_at",
        "tld.created_by",
        "tld.updated_by",
        "tld.created_at",
        "tld.updated_at"
      )
      .where("tld.surat_masuk_id", oPayload.surat_masuk_id)
      .orderBy("tld.created_at", "desc");
    const vaTrackings = await DB("trx_tracking_surat_masuk").select("tracking_surat_masuk_id", "surat_masuk_id", "disposisi_surat_id", "nama_aksi", "dari_pengguna_id", "kepada_pengguna_id", "status_sebelumnya", "status_saat_ini", "catatan", "processed_at", "created_by", "created_at", "updated_at").where("surat_masuk_id", oPayload.surat_masuk_id).orderBy("processed_at", "desc");
    const oArchivedDocument = await DB("trx_dokumen").select("id_dokumen", "kode_dokumen", "nama_dokumen", "nomor_dokumen", "tanggal", "status", "created_at").where("nomor_dokumen", oLetter.nomor_agenda).where("status", "active").first();
    return res.status(200).json({
      status: status.SUKSES,
      message: "Detail surat masuk berhasil diambil",
      data: {
        surat: oLetter,
        letter: oLetter,
        files: vaFiles,
        archived_document: oArchivedDocument || null,
        dispositions: vaDispositions,
        trackings: vaTrackings
      }
    });
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Detail surat masuk gagal diambil",
      error: error.message
    };
    Logging(error, {
      file: "incoming_letter_detail.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", incomingLetterDetail);
export default router;
