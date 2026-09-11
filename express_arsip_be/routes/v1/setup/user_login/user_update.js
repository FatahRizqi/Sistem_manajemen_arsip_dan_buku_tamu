import express from "express";
import {
  datetime,
  formatDateSystem,
  hmac,
  status,
} from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { validatePayload, Logging } from "../../components/tools/servertool.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body: oPayload } = req;

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
        id_pengguna: Joi.alternatives()
          .try(Joi.number(), Joi.string())
          .required()
          .label("id_pengguna"),
        nama_lengkap: Joi.string().max(100).required().label("nama_lengkap"),
        nama_pengguna: Joi.string().max(100).required().label("nama_pengguna"),
        telepon: Joi.string()
          .pattern(/^[0-9]+$/)
          .max(13)
          .required()
          .label("telepon"),
        id_peran: Joi.any().required().label("id_peran"),
        kata_sandi: Joi.string().optional().allow(""),
        status: Joi.string().required().label("status"),
        id_cabang: Joi.number().integer().positive().required().label("id_cabang"),
        id_jabatan: Joi.number().integer().positive().required().label("id_jabatan"),
        id_divisi: Joi.number().integer().positive().required().label("id_divisi"),
        id_departemen: Joi.number().integer().positive().required().label("id_departemen"),
        id_unit_kerja: Joi.number().integer().positive().required().label("id_unit_kerja"),
      },
      { "any.required": "{#label} wajib diisi" },
      oPayload,
      {
        allowUnknown: true,
      },
    );

    if (cValidation)
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: datetime(),
      });

    const nUserId = Number(oPayload.id_pengguna);
    if (!Number.isFinite(nUserId)) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "id_pengguna tidak valid",
        datetime: datetime(),
      });
    }

    // Cek duplikat nama_pengguna / telepon (kecuali diri sendiri)
    const existingUser = await DB("mst_pengguna")
      .where((builder) => {
        builder
          .where("nama_pengguna", oPayload.nama_pengguna)
          .orWhere("telepon", oPayload.telepon);
      })
      .whereNot("id_pengguna", nUserId)
      .first();

    if (existingUser) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message:
          existingUser.nama_pengguna === oPayload.nama_pengguna
            ? "Data dengan nama_pengguna tersebut sudah digunakan"
            : "Data dengan telepon tersebut sudah digunakan",
        datetime: datetime(),
      });
    }

    const peranCode = req?.auth?.peranCode;
    if (peranCode !== "SUPERADMIN") {
      // 1. Pastikan user yang diedit memang berada di cabang yang sama!
      const userToUpdate = await DB("mst_pengguna").where("id_pengguna", nUserId).first();
      if (!userToUpdate) {
        return res.status(404).json({ status: status.NOT_FOUND, message: "Pengguna tidak ditemukan", datetime: datetime() });
      }
      if (req?.auth?.id_cabang && userToUpdate.id_cabang !== req.auth.id_cabang) {
        return res.status(403).json({ status: status.FORBIDDEN, message: "Anda tidak memiliki izin mengedit pengguna dari cabang lain", datetime: datetime() });
      }

      // 2. Paksa input cabang sesuai dengan token admin saat ini
      if (req?.auth?.id_cabang) oPayload.id_cabang = req.auth.id_cabang;
      if (req?.auth?.id_departemen) oPayload.id_departemen = req.auth.id_departemen;
      if (req?.auth?.id_divisi) oPayload.id_divisi = req.auth.id_divisi;
      if (req?.auth?.id_unit_kerja) oPayload.id_unit_kerja = req.auth.id_unit_kerja;

      // 3. Cegah admin cabang memberikan peran SUPERADMIN
      if (oPayload.id_peran) {
        const peranData = await DB("mst_peran").where("id_peran", oPayload.id_peran).first();
        if (peranData && (peranData.kode_peran === "SUPERADMIN")) {
          return res.status(403).json({ status: status.FORBIDDEN, message: "Anda tidak memiliki izin memberikan peran Superadmin", datetime: datetime() });
        }
      }
    }

    // Siapkan data update mst_pengguna
    const oDataUser = {
      nama_lengkap: oPayload.nama_lengkap,
      nama_pengguna: oPayload.nama_pengguna,
      surel: oPayload.surel || oPayload.nama_pengguna,
      telepon: oPayload.telepon,
      status:
        oPayload.status == "1" || oPayload.status == "active"
          ? "active"
          : "nonactive",
      id_cabang: Number(oPayload.id_cabang) || null,
      id_jabatan: Number(oPayload.id_jabatan) || null,
      id_divisi: Number(oPayload.id_divisi) || null,
      id_departemen: Number(oPayload.id_departemen) || null,
      id_unit_kerja: Number(oPayload.id_unit_kerja) || null,
      updated_at: formatDateSystem(),
    };

    if (oPayload.kata_sandi) {
      const cKataSandi =
        process.env.USER_KEY + oPayload.nama_pengguna + oPayload.kata_sandi;
      const secret = process.env.USER_SECRET;
      oDataUser.kata_sandi = hmac(cKataSandi, secret, "sha512");
    }

    // TRANSAKSI UPDATE
    await DB.transaction(async (trx) => {
      // 1. Update mst_pengguna
      await trx("mst_pengguna").where("id_pengguna", nUserId).update(oDataUser);

      // 2. Update/insert mst_pengguna_peran berdasarkan id_pengguna
      const roleId = Number(oPayload.id_peran) || null;
      if (roleId) {
        const existingRole = await trx("mst_pengguna_peran")
          .where("id_pengguna", nUserId)
          .first();

        if (existingRole) {
          await trx("mst_pengguna_peran").where("id_pengguna", nUserId).update({
            id_peran: roleId,
            peran_utama: 1,
            status: "active",
            updated_at: formatDateSystem(),
          });
        } else {
          await trx("mst_pengguna_peran").insert({
            id_pengguna: nUserId,
            id_peran: roleId,
            peran_utama: 1,
            status: "active",
            created_at: formatDateSystem(),
            updated_at: formatDateSystem(),
          });
        }
      }

      // 3. Update navigasi_pengguna berdasarkan peran
      const activeRole = await trx("mst_pengguna_peran as ur")
        .leftJoin("mst_peran as r", "ur.id_peran", "r.id_peran")
        .select("r.nama_peran", "r.kode_peran")
        .where("ur.id_pengguna", nUserId)
        .where("ur.status", "active")
        .orderBy("ur.peran_utama", "desc")
        .first();

      const roleAliases = [activeRole?.nama_peran, activeRole?.kode_peran].filter(
        Boolean,
      );
      const navigation = roleAliases.length
        ? await trx("mst_navigasi")
          .select("menu")
          .whereIn("peran", roleAliases)
          .first()
        : null;

      if (navigation?.menu) {
        await trx("navigasi_pengguna")
          .insert({
            id_pengguna: nUserId,
            menu: navigation.menu,
            created_at: formatDateSystem(),
            updated_at: formatDateSystem(),
          })
          .onConflict("id_pengguna")
          .merge({
            menu: navigation.menu,
            updated_at: formatDateSystem(),
          });
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil diupdate",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem maintenance",
      datetime: datetime(),
    };
    Logging(error, {
      file: "user_update.js",
      func: "update",
      request: oPayload,
      response: oResult,
      user: req?.auth?.nama_pengguna || "",
    });
    return res.status(500).json(oResult);
  }
});

export default router;
