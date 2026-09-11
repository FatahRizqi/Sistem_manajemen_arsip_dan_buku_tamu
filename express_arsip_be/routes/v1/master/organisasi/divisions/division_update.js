import express from "express";
import Joi from "joi";
import DB from "../../../../../core/config/knex.js";
import { status, formatDateSystem, datetime } from "../../../components/tools/general.js";
import { Logging, validatePayload } from "../../../components/tools/servertool.js";

const router = express.Router();

router.post("/update", async (req, res) => {
  const { body: oPayload } = req;
  const cnama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Invalid request body", datetime: formatDateSystem() });
    }

    const cValidation = await validatePayload(
      {
        id_divisi: Joi.number().required().label("ID"),
        id_departemen: Joi.number().required().label("ID Departemen"),
        kode_divisi: Joi.string().required().label("Kode Divisi"),
        nama_divisi: Joi.string().required().label("Nama Divisi"),
        deskripsi: Joi.string().optional().allow(null, "").label("Deskripsi"),
        status: Joi.string().optional().valid('active', 'nonactive', 'deleted').label("Status")
      },
      { "string.empty": "{#label} tidak boleh kosong", "any.required": "{#label} wajib diisi" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      const oResult = { status: status.BAD_REQUEST, message: cValidation, datetime: datetime() };
      Logging(null, { file: "update.js", func: "update", request: oPayload, response: oResult, user: cnama_pengguna });
      return res.status(422).json(oResult);
    }

    const nUpdated = await DB("mst_divisi")
      .where("id_divisi", oPayload.id_divisi)
      .update({
        id_departemen: oPayload.id_departemen || null,
        kode_divisi: oPayload.kode_divisi ? (oPayload.kode_divisi.toUpperCase().startsWith("DV-") ? `DV-${oPayload.kode_divisi.substring(3)}` : `DV-${oPayload.kode_divisi}`) : null,
        nama_divisi: oPayload.nama_divisi || null,
        deskripsi: oPayload.deskripsi || null,
        status: oPayload.status || 'active',
        updated_at: new Date(),
      });

    // Cascade update to nonactive
    if (oPayload.status === 'nonactive') {
      await DB("mst_unit_kerja").where("id_divisi", oPayload.id_divisi).update({ status: 'nonactive', updated_at: new Date() });
    }

    if (!nUpdated) return res.status(404).json({ message: "Data tidak ditemukan", datetime: formatDateSystem() });
    return res.status(200).json({ status: status.SUKSES, message: "Berhasil diupdate!", datetime: formatDateSystem() });
  } catch (error) {
    let errorMessage = "Gagal mengupdate";
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = "Kode Divisi sudah digunakan oleh divisi lain";
    }
    const oResult = { status: status.BAD_REQUEST, message: errorMessage, datetime: datetime() };
    Logging(error, { file: "update.js", func: "update", request: oPayload, response: oResult, user: cnama_pengguna });
    return res.status(500).json(oResult);
  }
});

export default router;
