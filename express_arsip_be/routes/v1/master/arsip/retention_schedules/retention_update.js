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

const updateRetentionSchedule = async (req, res) => {
  const { body: oPayload } = req;
  const cIdJadwalRetensi = req.params.id_jadwal_retensi;
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
        file: "retention_update.js",
        func: "updateRetentionSchedule",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });

      return res.status(422).json(oResult);
    }

    // Cek duplikasi kode_retensi untuk data lain
    const oExisting = await DB("mst_jadwal_retensi")
      .where("kode_retensi", oPayload.kode_retensi)
      .where("status", "active")
      .whereNot("id_jadwal_retensi", cIdJadwalRetensi)
      .first();

    if (oExisting) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Kode retensi '${oPayload.kode_retensi}' sudah digunakan oleh jadwal lain`,
        datetime: formatDateSystem(),
      });
    }

    const nUpdated = await DB("mst_jadwal_retensi")
      .where("id_jadwal_retensi", cIdJadwalRetensi)
      .update({
        kode_kategori_dokumen: oPayload.kode_kategori_dokumen,
        kode_retensi: oPayload.kode_retensi,
        nama_retensi: oPayload.nama_retensi,
        tahun_retensi: oPayload.tahun_retensi,
        tindakan_retensi: oPayload.tindakan_retensi,
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
      file: "retention_update.js",
      func: "updateRetentionSchedule",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
};

router.put("/:id_jadwal_retensi", updateRetentionSchedule);

export default router;
