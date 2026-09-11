import express from "express";
import Joi from "joi";
import DB from "../../../../../core/config/knex.js";
import {
  datetime,
  formatDateSystem,
  status,
} from "../../../components/tools/general.js";
import {
  Logging,
  validatePayload,
} from "../../../components/tools/servertool.js";

const router = express.Router();

const createConfidentialityLevel = async (req, res) => {
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
        kode_tingkat_kerahasiaan: Joi.string().max(255).required().label("Kode Kerahasiaan"),
        nama_tingkat_kerahasiaan: Joi.string().max(255).required().label("Nama Kerahasiaan"),
        tingkat_kerahasiaan: Joi.number().required().label("Level (Angka)"),
        deskripsi: Joi.string().max(255).optional().allow(null, "").label("Deskripsi"),
        status: Joi.string().optional().allow(null, "").label("Status"),
      },
      {
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} maksimal {#limit} karakter",
        "any.required": "{#label} wajib diisi",
        "number.base": "{#label} harus berupa angka",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: datetime(),
      };

      Logging(null, {
        file: "level_create.js",
        func: "createConfidentialityLevel",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    const dNow = new Date();
    await DB("mst_tingkat_kerahasiaan").insert({
      kode_tingkat_kerahasiaan: oPayload.kode_tingkat_kerahasiaan,
      nama_tingkat_kerahasiaan: oPayload.nama_tingkat_kerahasiaan,
      tingkat_kerahasiaan: oPayload.tingkat_kerahasiaan,
      deskripsi: oPayload.deskripsi || null,
      status: oPayload.status || "active",
      created_at: dNow,
      updated_at: dNow,
    });

    return res.status(201).json({
      status: status.SUKSES,
      message: "Data tingkat kerahasiaan berhasil dibuat",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "level_create.js",
      func: "createConfidentialityLevel",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createConfidentialityLevel);

export default router;
