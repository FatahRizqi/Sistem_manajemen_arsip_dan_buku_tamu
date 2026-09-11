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

const createDocumentCategory = async (req, res) => {
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
        kode_klasifikasi: Joi.string()
          .max(255)
          .required()
          .label("Kode Klasifikasi"),
        kode_kategori_dokumen: Joi.string()
          .max(255)
          .required()
          .label("Kode Kategori"),
        nama_kategori_dokumen: Joi.string()
          .max(255)
          .required()
          .label("Nama Kategori"),
        deskripsi: Joi.string()
          .max(255)
          .optional()
          .allow(null, "")
          .label("Deskripsi"),
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
        file: "category_create.js",
        func: "createDocumentCategory",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    const existing = await DB("mst_kategori_dokumen")
      .where("kode_kategori_dokumen", oPayload.kode_kategori_dokumen)
      .first();

    if (existing) {
      if (existing.status === "active") {
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: `Kode Kategori '${oPayload.kode_kategori_dokumen}' sudah digunakan dan aktif.`,
          datetime: formatDateSystem(),
        });
      } else {
        // Aktifkan kembali data kategori yang di-soft-delete
        await DB("mst_kategori_dokumen")
          .where("id_kategori_dokumen", existing.id_kategori_dokumen)
          .update({
            kode_klasifikasi: oPayload.kode_klasifikasi,
            nama_kategori_dokumen: oPayload.nama_kategori_dokumen,
            deskripsi: oPayload.deskripsi || null,
            status: oPayload.status || "active",
            updated_at: new Date()

          });

        return res.status(201).json({
          status: status.SUKSES,
          message: "Data kategori berhasil diaktifkan kembali",
          datetime: formatDateSystem(),
        });
      }
    }

    const dNow = new Date();
    await DB("mst_kategori_dokumen").insert({
      kode_klasifikasi: oPayload.kode_klasifikasi,
      kode_kategori_dokumen: oPayload.kode_kategori_dokumen,
      nama_kategori_dokumen: oPayload.nama_kategori_dokumen,
      deskripsi: oPayload.deskripsi || null,
      status: oPayload.status || "active",
      created_at: dNow,
      updated_at: dNow,
    });

    return res.status(201).json({
      status: status.SUKSES,
      message: "Data berhasil dibuat",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "category_create.js",
      func: "createDocumentCategory",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createDocumentCategory);

export default router;
