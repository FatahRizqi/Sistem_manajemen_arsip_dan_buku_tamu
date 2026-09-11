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
        kode_cabang: Joi.string().required().label("Kode Cabang"),
        nama_cabang: Joi.string().required().label("Nama Cabang"),
        id_induk: Joi.number().optional().allow(null, "").label("Induk Cabang"),
        alamat: Joi.string().optional().allow(null, "").label("Alamat"),
        telepon: Joi.string().optional().allow(null, "").label("Telepon"),
        surel: Joi.string().optional().allow(null, "").label("Surel")
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
    await DB("mst_cabang").insert({
      kode_cabang: oPayload.kode_cabang ? (oPayload.kode_cabang.toUpperCase().startsWith("CB-") ? `CB-${oPayload.kode_cabang.substring(3)}` : `CB-${oPayload.kode_cabang}`) : null,
      nama_cabang: oPayload.nama_cabang || null,
      id_induk: oPayload.id_induk || null,
      alamat: oPayload.alamat || null,
      telepon: oPayload.telepon || null,
      surel: oPayload.surel || null,
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
