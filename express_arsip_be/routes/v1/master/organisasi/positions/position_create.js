import express from "express";
import Joi from "joi";
import DB from "../../../../../core/config/knex.js";
import { status, formatDateSystem, datetime } from "../../../components/tools/general.js";
import { Logging, validatePayload } from "../../../components/tools/servertool.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { body: oPayload } = req;
  const cnama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Invalid request body", datetime: formatDateSystem() });
    }

    const cValidation = await validatePayload(
      {
        kode_jabatan: Joi.string().required().label("Kode Jabatan"),
        nama_jabatan: Joi.string().required().label("Nama Jabatan"),
        tingkat_jabatan: Joi.any().optional().allow(null, "").label("Tingkat Jabatan"),
        deskripsi: Joi.string().optional().allow(null, "").label("Deskripsi")
      },
      { "string.empty": "{#label} tidak boleh kosong", "any.required": "{#label} wajib diisi" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      const oResult = { status: status.BAD_REQUEST, message: cValidation, datetime: datetime() };
      Logging(null, { file: "create.js", func: "create", request: oPayload, response: oResult, user: cnama_pengguna });
      return res.status(422).json(oResult);
    }

    const dNow = new Date();
    await DB("mst_jabatan").insert({
      kode_jabatan: oPayload.kode_jabatan ? (oPayload.kode_jabatan.toUpperCase().startsWith("JB-") ? `JB-${oPayload.kode_jabatan.substring(3)}` : `JB-${oPayload.kode_jabatan}`) : null,
      nama_jabatan: oPayload.nama_jabatan || null,
      tingkat_jabatan: oPayload.tingkat_jabatan || null,
      deskripsi: oPayload.deskripsi || null,
      status: "active",
      created_at: dNow,
      updated_at: dNow,
    });

    return res.status(201).json({ status: status.SUKSES, message: "Berhasil ditambahkan!", datetime: formatDateSystem() });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Gagal menyimpan", datetime: datetime() };
    Logging(error, { file: "create.js", func: "create", request: oPayload, response: oResult, user: cnama_pengguna });
    return res.status(500).json(oResult);
  }
});

export default router;
