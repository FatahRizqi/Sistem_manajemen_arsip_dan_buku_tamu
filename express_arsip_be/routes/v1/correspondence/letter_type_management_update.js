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
// 3. PUT - Update existing letter type
router.put("/:jenis_surat_id", async (req, res) => {
  const { body: oPayload } = req;
  const nJenisSuratId = req.params.jenis_surat_id;
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
        status: Joi.string().valid("active", "nonactive").optional().label("Status"),
      },
      {
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
        "any.only": "{#label} harus berupa salah satu dari: incoming, outgoing, both, active, nonactive",
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
        func: "update",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    const formattedCode = String(oPayload.kode_jenis_surat).trim().toUpperCase();

    // Check code duplication excluding this id
    const duplication = await DB("mst_jenis_surat")
      .where("kode_jenis_surat", formattedCode)
      .where("status", "active")
      .whereNot("jenis_surat_id", nJenisSuratId)
      .first();

    if (duplication) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: `Kode jenis surat '${formattedCode}' sudah digunakan oleh data lain`,
        datetime: formatDateSystem(),
      });
    }

    const nUpdated = await DB("mst_jenis_surat")
      .where("jenis_surat_id", nJenisSuratId)
      .update({
        kode_jenis_surat: formattedCode,
        nama_jenis_surat: oPayload.nama_jenis_surat,
        arah_surat: oPayload.arah_surat,
        deskripsi: oPayload.deskripsi || null,
        status: oPayload.status || "active",
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
      message: "Data jenis surat berhasil diupdate",
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
      func: "update",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
});


export default router;

