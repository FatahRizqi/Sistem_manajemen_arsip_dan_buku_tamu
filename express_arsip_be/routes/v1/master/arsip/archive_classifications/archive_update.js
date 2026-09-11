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

const updateArchiveClassification = async (req, res) => {
  const { body: oPayload } = req;
  const cIdKlasifikasi = req.params.id_klasifikasi;
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
        kode_klasifikasi: Joi.string().max(255).required().label("Kode Klasifikasi"),
        nama_klasifikasi: Joi.string().max(255).required().label("Nama Klasifikasi"),
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
        message: cValidation,
        datetime: datetime(),
      };
      Logging(null, {
        file: "archive_update.js",
        func: "update",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });
      return res.status(422).json(oResult);
    }

    const nUpdated = await DB("mst_klasifikasi_arsip")
      .where("id_klasifikasi", cIdKlasifikasi)
      .update({
        kode_klasifikasi: oPayload.kode_klasifikasi,
        nama_klasifikasi: oPayload.nama_klasifikasi,
        deskripsi: oPayload.deskripsi || null,
        status: oPayload.status || "active",
        updated_at: new Date(),
      });

    if (!nUpdated)
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data tidak ditemukan",
        datetime: formatDateSystem(),
      });
    return res.status(200).json({
      status: status.SUKSES,
      message: "Berhasil diupdate!",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance",
      datetime: datetime(),
    };
    Logging(error, {
      file: "archive_update.js",
      func: "update",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });
    return res.status(500).json(oResult);
  }
};

router.put("/:id_klasifikasi", updateArchiveClassification);

export default router;
