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

const updateDocumentCategory = async (req, res) => {
  const { body: oPayload } = req;
  const cIdKategoriDokumen = req.params.id_kategori_dokumen;
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
        kode_klasifikasi: Joi.string().required().label("Kode Klasifikasi Arsip"),
        kode_kategori_dokumen: Joi.string().max(255).required().label("Kode Kategori"),
        nama_kategori_dokumen: Joi.string().max(255).required().label("Nama Kategori"),
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
        file: "category_update.js",
        func: "updateDocumentCategory",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    const existing = await DB("mst_kategori_dokumen")
      .where("kode_kategori_dokumen", oPayload.kode_kategori_dokumen)
      .whereNot("id_kategori_dokumen", cIdKategoriDokumen)
      .first();

    if (existing) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: `Kode Kategori '${oPayload.kode_kategori_dokumen}' sudah digunakan oleh kategori lain.`,
        datetime: formatDateSystem(),
      });
    }

    const nUpdated = await DB("mst_kategori_dokumen")
      .where("id_kategori_dokumen", cIdKategoriDokumen)
      .update({
        kode_klasifikasi: oPayload.kode_klasifikasi,
        kode_kategori_dokumen: oPayload.kode_kategori_dokumen,
        nama_kategori_dokumen: oPayload.nama_kategori_dokumen,
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
      file: "category_update.js",
      func: "updateDocumentCategory",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.put("/:id_kategori_dokumen", updateDocumentCategory);

export default router;
