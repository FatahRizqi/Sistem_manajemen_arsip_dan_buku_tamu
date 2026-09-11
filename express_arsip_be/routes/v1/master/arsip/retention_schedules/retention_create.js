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

const createRetentionSchedule = async (req, res) => {
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
        kode_kategori_dokumen: Joi.string().required().label("Kode Kategori Dokumen"),
        kode_retensi: Joi.string().max(255).required().label("Kode Retensi"),
        nama_retensi: Joi.string().max(255).required().label("Nama Retensi"),
        tahun_retensi: Joi.number().required().label("Tahun Retensi"),
        tindakan_retensi: Joi.string().max(255).required().label("Tindakan Retensi"),
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
        file: "retention_create.js",
        func: "createRetentionSchedule",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    // Cek duplikasi kode_retensi
    const oExisting = await DB("mst_jadwal_retensi")
      .where("kode_retensi", oPayload.kode_retensi)
      .where("status", "active")
      .first();

    if (oExisting) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Kode retensi '${oPayload.kode_retensi}' sudah terdaftar`,
        datetime: formatDateSystem(),
      });
    }

    const dNow = new Date();
    await DB("mst_jadwal_retensi").insert({
      kode_kategori_dokumen: oPayload.kode_kategori_dokumen,
      kode_retensi: oPayload.kode_retensi,
      nama_retensi: oPayload.nama_retensi,
      tahun_retensi: oPayload.tahun_retensi,
      tindakan_retensi: oPayload.tindakan_retensi,
      deskripsi: oPayload.deskripsi || null,
      status: oPayload.status || "active",
      created_at: dNow,
      updated_at: dNow,
    });

    return res.status(201).json({
      status: status.SUKSES,
      message: "Data jadwal retensi berhasil dibuat",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: datetime(),
    };

    Logging(error, {
      file: "retention_create.js",
      func: "createRetentionSchedule",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.post("/", createRetentionSchedule);

export default router;
