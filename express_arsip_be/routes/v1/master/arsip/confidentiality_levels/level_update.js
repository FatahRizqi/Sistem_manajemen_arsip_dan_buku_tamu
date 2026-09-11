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

const updateConfidentialityLevel = async (req, res) => {
  const { body: oPayload } = req;
  const cIdTingkatKerahasiaan = req.params.id_tingkat_kerahasiaan;
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
        "any.required": "{#label} wajib diisi",
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
        file: "level_update.js",
        func: "updateConfidentialityLevel",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    const nUpdated = await DB("mst_tingkat_kerahasiaan")
      .where("id_tingkat_kerahasiaan", cIdTingkatKerahasiaan)
      .update({
        kode_tingkat_kerahasiaan: oPayload.kode_tingkat_kerahasiaan,
        nama_tingkat_kerahasiaan: oPayload.nama_tingkat_kerahasiaan,
        tingkat_kerahasiaan: oPayload.tingkat_kerahasiaan,
        status: oPayload.status || "active",
        deskripsi: oPayload.deskripsi || null,
        updated_at: new Date(),
      });

    if (!nUpdated) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil diupdate",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "level_update.js",
      func: "updateConfidentialityLevel",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.put("/:id_tingkat_kerahasiaan", updateConfidentialityLevel);

export default router;
