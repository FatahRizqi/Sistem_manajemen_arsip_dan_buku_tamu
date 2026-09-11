import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";

const router = express.Router();

const createTemplateSurat = async (req, res) => {
  const oPayload = req.body || {};
  const nama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    const cValidation = await validatePayload(
      {
        kode_template: Joi.string().trim().max(50).required().label("Kode Template"),
        nama_template: Joi.string().trim().max(150).required().label("Nama Template"),
        isi_template: Joi.string().trim().required().label("Isi Template"),
        jenis_surat_id: Joi.number().integer().positive().optional().allow(null).label("Jenis Surat"),
        deskripsi: Joi.string().allow(null, "").optional().label("Deskripsi"),
        status: Joi.string().valid("active", "inactive").optional().label("Status"),
        created_by: Joi.number().integer().positive().optional().allow(null).label("Pembuat"),
        updated_by: Joi.number().integer().positive().optional().allow(null).label("Pengubah"),
      },
      {
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} maksimal {#limit} karakter",
        "any.required": "{#label} wajib diisi",
        "any.only": "{#label} tidak valid",
      },
      oPayload
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: datetime(),
      });
    }

    const existing = await DB("mst_template_surat")
      .where("kode_template", String(oPayload.kode_template).trim())
      .first();

    if (existing) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: `Kode template '${oPayload.kode_template}' sudah digunakan`,
        datetime: formatDateSystem(),
      });
    }

    const dNow = new Date();
    const [id] = await DB("mst_template_surat").insert({
      kode_template: String(oPayload.kode_template).trim(),
      nama_template: String(oPayload.nama_template).trim(),
      jenis_surat_id: oPayload.jenis_surat_id || null,
      deskripsi: oPayload.deskripsi || null,
      isi_template: oPayload.isi_template,
      status: oPayload.status || "active",
      created_by: oPayload.created_by || null,
      updated_by: oPayload.created_by || null,
      created_at: dNow,
      updated_at: dNow,
    });

    return res.status(201).json({
      status: status.SUKSES,
      message: "Template surat berhasil dibuat",
      datetime: formatDateSystem(),
      data: { id },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    await Logging(error, {
      file: "template_surat_create.js",
      func: "createTemplateSurat",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createTemplateSurat);

export default router;
