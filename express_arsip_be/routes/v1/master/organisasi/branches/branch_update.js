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
        id_cabang: Joi.number().required().label("ID"),
        kode_cabang: Joi.string().required().label("Kode Cabang"),
        nama_cabang: Joi.string().required().label("Nama Cabang"),
        id_induk: Joi.number().optional().allow(null, "").label("Induk Cabang"),
        alamat: Joi.string().optional().allow(null, "").label("Alamat"),
        telepon: Joi.string().optional().allow(null, "").label("Telepon"),
        surel: Joi.string().optional().allow(null, "").label("Surel"),
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

    const nUpdated = await DB("mst_cabang")
      .where("id_cabang", oPayload.id_cabang)
      .update({
        kode_cabang: oPayload.kode_cabang ? (oPayload.kode_cabang.toUpperCase().startsWith("CB-") ? `CB-${oPayload.kode_cabang.substring(3)}` : `CB-${oPayload.kode_cabang}`) : null,
        nama_cabang: oPayload.nama_cabang || null,
        id_induk: oPayload.id_induk || null,
        alamat: oPayload.alamat || null,
        telepon: oPayload.telepon || null,
        surel: oPayload.surel || null,
        status: oPayload.status || 'active',
        updated_at: new Date(),
      });

    // Cascade update to nonactive
    if (oPayload.status === 'nonactive') {
      const depts = await DB("mst_departemen").where("id_cabang", oPayload.id_cabang).select("id_departemen");
      const deptIds = depts.map(d => d.id_departemen);
      if (deptIds.length > 0) {
        await DB("mst_departemen").whereIn("id_departemen", deptIds).update({ status: 'nonactive', updated_at: new Date() });
        const divs = await DB("mst_divisi").whereIn("id_departemen", deptIds).select("id_divisi");
        const divIds = divs.map(d => d.id_divisi);
        if (divIds.length > 0) {
          await DB("mst_divisi").whereIn("id_divisi", divIds).update({ status: 'nonactive', updated_at: new Date() });
          await DB("mst_unit_kerja").whereIn("id_divisi", divIds).update({ status: 'nonactive', updated_at: new Date() });
        }
      }
    }

    if (!nUpdated) return res.status(404).json({ message: "Data tidak ditemukan", datetime: formatDateSystem() });
    return res.status(200).json({ status: status.SUKSES, message: "Berhasil diupdate!", datetime: formatDateSystem() });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Gagal mengupdate", datetime: datetime() };
    Logging(error, { file: "update.js", func: "update", request: oPayload, response: oResult, user: cnama_pengguna });
    return res.status(500).json(oResult);
  }
});

export default router;
