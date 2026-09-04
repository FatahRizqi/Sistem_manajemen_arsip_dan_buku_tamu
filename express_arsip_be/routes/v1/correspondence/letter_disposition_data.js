import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";
import { status, datetime } from "../components/tools/general.js";
const router = express.Router();
const letterDispositionData = async (req, res) => {
  try {
    const oPayload = req.body || {};
    const oValidation = {
      surat_masuk_id: Joi.number().allow(null).optional(),
      kepada_pengguna_id: Joi.number().allow(null).optional(),
      dari_pengguna_id: Joi.number().allow(null).optional(),
      status: Joi.string().valid("baru", "dibaca", "diproses", "selesai").allow(null, "").optional(),
      keyword: Joi.string().allow(null, "").optional()
    };
    const oMessage = {
      "surat_masuk_id.number": "id surat masuk harus berupa angka",
      "kepada_pengguna_id.number": "kepada pengguna id harus berupa angka",
      "dari_pengguna_id.number": "dari pengguna id harus berupa angka",
      "status.valid": "status disposisi tidak valid"
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

    const oQuery = DB("trx_disposisi_surat as tld")
      .leftJoin("trx_surat_masuk as til", "tld.surat_masuk_id", "til.surat_masuk_id")
      .leftJoin("mst_instruksi_disposisi as mdi", "tld.instruksi_disposisi_id", "mdi.instruksi_disposisi_id")
      .leftJoin("mst_pengguna as dari_pengguna", `tld.${fromCol}`, "dari_pengguna.id_pengguna")
      .leftJoin("mst_pengguna as kepada_pengguna", `tld.${toCol}`, "kepada_pengguna.id_pengguna")
      .leftJoin("mst_pengguna as processed_user", "tld.updated_by", "processed_user.id_pengguna")
      .select(
        "tld.disposisi_surat_id",
        "tld.surat_masuk_id",
        "til.nomor_agenda",
        "til.nomor_surat",
        "til.perihal",
        "til.nama_pengirim",
        "til.status as letter_status",
        "tld.disposisi_induk_id",
        `tld.${fromCol} as dari_pengguna_id`,
        "dari_pengguna.nama_lengkap as from_user_name",
        `tld.${toCol} as kepada_pengguna_id`,
        "kepada_pengguna.nama_lengkap as to_user_name",
        "processed_user.nama_lengkap as processed_by_name",
        "tld.instruksi_disposisi_id",
        "mdi.nama_instruksi",
        "tld.instruksi",
        "tld.catatan_disposisi",
        "tld.catatan_tindakan",
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
      .orderBy("tld.created_at", "desc");
    if (oPayload.surat_masuk_id) {
      oQuery.where("tld.surat_masuk_id", oPayload.surat_masuk_id);
    }
    if (oPayload.kepada_pengguna_id) {
      oQuery.where("tld.kepada_pengguna_id", oPayload.kepada_pengguna_id);
    }
    if (oPayload.dari_pengguna_id) {
      oQuery.where("tld.dari_pengguna_id", oPayload.dari_pengguna_id);
    }
    if (oPayload.status) {
      oQuery.where("tld.status", oPayload.status);
    }
    if (oPayload.keyword) {
      oQuery.where(oBuilder => {
        oBuilder.where("til.nomor_agenda", "like", `%${oPayload.keyword}%`).orWhere("til.nomor_surat", "like", `%${oPayload.keyword}%`).orWhere("til.perihal", "like", `%${oPayload.keyword}%`).orWhere("til.nama_pengirim", "like", `%${oPayload.keyword}%`).orWhere("tld.instruksi", "like", `%${oPayload.keyword}%`).orWhere("tld.catatan_disposisi", "like", `%${oPayload.keyword}%`);
      });
    }

    // Multi-tenancy filter: filter berdasarkan cabang penerima ATAU pengirim disposisi
    // (Agar pengirim/Superadmin tetap bisa melacak status disposisi yang dikirimnya)
    if (req.context) {
      const fCabang = req.headers['x-filter-cabang'];
      if (fCabang && fCabang !== 'null' && fCabang !== 'undefined') {
        const branchIds = String(fCabang).split(",").map(Number);
        oQuery.where(function () {
          this.whereIn("kepada_pengguna.id_cabang", branchIds)
              .orWhereIn("dari_pengguna.id_cabang", branchIds);
        });
      }

      // Secondary filters: Drill-down opsional (berlaku untuk penerima disposisi)
      const fDepartemen = req.headers['x-filter-departemen'];
      const fDivisi = req.headers['x-filter-divisi'];
      const fUnitKerja = req.headers['x-filter-unit-kerja'];

      if (fDepartemen && fDepartemen !== 'null') oQuery.where("kepada_pengguna.id_departemen", fDepartemen);
      if (fDivisi && fDivisi !== 'null') oQuery.where("kepada_pengguna.id_divisi", fDivisi);
      if (fUnitKerja && fUnitKerja !== 'null') oQuery.where("kepada_pengguna.id_unit_kerja", fUnitKerja);
    }
    const vaData = await oQuery;
    return res.status(200).json({
      status: status.SUKSES,
      message: "Data disposisi surat berhasil diambil",
      data: vaData
    });
  } catch (error) {
    console.log(error);
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Data disposisi surat gagal diambil",
      error: error.message
    };
    Logging(error, {
      file: "letter_disposition_data.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
};
router.post("/", letterDispositionData);
export default router;
