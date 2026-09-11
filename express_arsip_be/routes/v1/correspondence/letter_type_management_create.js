import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../components/tools/general.js";
import {
  Logging,
  validatePayload,
} from "../components/tools/servertool.js";

const router = express.Router();

// 1. GET - Retrieve all active letter types
// 2. POST - Create new letter type
router.post("/", async (req, res) => {
  const { body: oPayload } = req;
  const nama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    const cValidation = await validatePayload(
      {
        kode_jenis_surat: Joi.string().max(50).required().label("Kode Jenis Surat"),
        nama_jenis_surat: Joi.string().max(150).required().label("Nama Jenis Surat"),
        arah_surat: Joi.string().valid("incoming", "outgoing", "both").required().label("Arah Surat"),
        deskripsi: Joi.string().max(255).optional().allow(null, "").label("Deskripsi"),
      },
      {
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} maksimal {#limit} karakter",
        "any.required": "{#label} wajib diisi",
        "any.only": "{#label} harus berupa salah satu dari: incoming, outgoing, both",
      },
      oPayload
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: datetime(),
      };

      Logging(null, {
        file: "letter_type_management.js",
        func: "create",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    // Format kode_jenis_surat to uppercase with underscores if needed, or just uppercase
    const formattedCode = String(oPayload.kode_jenis_surat).trim().toUpperCase();

    // Check if code already exists and is active
    const existing = await DB("mst_jenis_surat")
      .where("kode_jenis_surat", formattedCode)
      .where("status", "active")
      .first();

    if (existing) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: `Kode jenis surat '${formattedCode}' sudah digunakan dan aktif`,
        datetime: formatDateSystem(),
      });
    }

    const dNow = new Date();
    await DB("mst_jenis_surat").insert({
      kode_jenis_surat: formattedCode,
      nama_jenis_surat: oPayload.nama_jenis_surat,
      arah_surat: oPayload.arah_surat,
      deskripsi: oPayload.deskripsi || null,
      status: "active",
      created_at: dNow,
      updated_at: dNow,
    });

    return res.status(201).json({
      status: status.SUKSES,
      message: "Data jenis surat berhasil dibuat",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "letter_type_management.js",
      func: "create",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
});


export default router;

