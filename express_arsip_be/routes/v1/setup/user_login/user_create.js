import express from "express";
import {
  datetime,
  formatDateSystem,
  hmac,
  status,
} from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body: oPayload } = req;
  const cNamaPengguna = req?.auth?.nama_pengguna || "";

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
        nama_lengkap: Joi.string().max(100).required().label("nama_lengkap"),
        nama_pengguna: Joi.string().max(100).required().label("nama_pengguna"),
        telepon: Joi.string()
          .pattern(/^[0-9]+$/)
          .max(13)
          .required()
          .label("telepon"),
        id_peran: Joi.alternatives()
          .try(Joi.string(), Joi.number())
          .required()
          .label("id_peran"),
        kata_sandi: Joi.string()
          .min(8)
          .pattern(
            new RegExp(
              "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$",
            ),
          )
          .required()
          .label("kata_sandi"),
        status: Joi.string().required().label("status"),
        id_cabang: Joi.number().integer().positive().required().label("id_cabang"),
        id_jabatan: Joi.number().integer().positive().required().label("id_jabatan"),
        id_divisi: Joi.number().integer().positive().required().label("id_divisi"),
        id_departemen: Joi.number().integer().positive().required().label("id_departemen"),
        id_unit_kerja: Joi.number().integer().positive().required().label("id_unit_kerja"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      {
        allowUnknown: true,
      },
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: datetime(),
      };
      Logging(null, {
        file: "user_create.js",
        func: "create",
        request: oPayload,
        response: oResult,
        user: cNamaPengguna,
      });
      return res.status(422).json(oResult);
    }

    // Cek apakah user sudah ada
    const existingUser = await DB("mst_pengguna")
      .where("nama_pengguna", oPayload.nama_pengguna)
      .orWhere("telepon", oPayload.telepon)
      .first();

    if (existingUser) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message:
          existingUser.nama_pengguna === oPayload.nama_pengguna
            ? "Data dengan nama_pengguna tersebut sudah digunakan"
            : "Data dengan telepon tersebut sudah digunakan",
        datetime: formatDateSystem(),
      });
    }

    // HASH kata_sandi PAKAI nama_pengguna SEBAGAI SALT
    let cHashedKataSandi = "";
    if (oPayload.kata_sandi) {
      const cKataSandi =
        process.env.USER_KEY + oPayload.nama_pengguna + oPayload.kata_sandi;
      const cSecret = process.env.USER_SECRET;
      cHashedKataSandi = hmac(cKataSandi, cSecret, "sha512");
    }

    // 1. SIAPKAN INPUT peran
    let cInputPeran = oPayload.id_peran;

    // 2. CARI peran DATA TERLEBIH DAHULU SEBELUM TRANSAKSI
    const peranData = await DB("mst_peran")
      .where("id_peran", cInputPeran)
      .orWhere("nama_peran", cInputPeran)
      .orWhere("kode_peran", cInputPeran)
      .first();

    if (!peranData) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Peran tidak valid",
        datetime: datetime(),
      });
    }

    const cPeranCode = req?.auth?.peranCode;
    if (cPeranCode !== "SUPERADMIN") {
      // Cegah pembuatan user dengan role SUPERADMIN jika bukan SA
      if (peranData.kode_peran === "SUPERADMIN") {
        return res.status(403).json({
          status: status.FORBIDDEN,
          message: "Anda tidak memiliki izin untuk memberikan peran Superadmin",
          datetime: datetime(),
        });
      }

      // Paksa cabang/organisasi sesuai dengan token admin saat ini
      if (req?.auth?.id_cabang) oPayload.id_cabang = req.auth.id_cabang;
      if (req?.auth?.id_departemen) oPayload.id_departemen = req.auth.id_departemen;
      if (req?.auth?.id_divisi) oPayload.id_divisi = req.auth.id_divisi;
      if (req?.auth?.id_unit_kerja) oPayload.id_unit_kerja = req.auth.id_unit_kerja;
    }

    // 3. CARI NAVIGASI BERDASARKAN PERAN
    const oNavigation = await DB("mst_navigasi")
      .select("menu")
      .where("peran", peranData.nama_peran)
      .orWhere("peran", peranData.kode_peran)
      .first();

    // 4. VALIDASI NAVIGASI
    if (!oNavigation || !oNavigation.menu) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Peran tidak memiliki template menu di mst_navigasi",
        datetime: formatDateSystem(),
      });
    }

    // 5. TRANSAKSI DATABASE KE 3 TABEL
    await DB.transaction(async (trx) => {
      // 1. Masuk ke mst_pengguna
      const [nNewUserId] = await trx("mst_pengguna").insert({
        nama_lengkap: oPayload.nama_lengkap,
        nama_pengguna: oPayload.nama_pengguna,
        surel: oPayload.surel || oPayload.nama_pengguna,
        telepon: oPayload.telepon,
        kata_sandi: cHashedKataSandi || undefined,
        status:
          oPayload.status == "1" || oPayload.status == "active"
            ? "active"
            : "nonactive",
        id_cabang: Number(oPayload.id_cabang) || null,
        id_jabatan: Number(oPayload.id_jabatan) || null,
        id_divisi: Number(oPayload.id_divisi) || null,
        id_departemen: Number(oPayload.id_departemen) || null,
        id_unit_kerja: Number(oPayload.id_unit_kerja) || null,
        created_at: formatDateSystem(),
        updated_at: formatDateSystem(),
      });

      // 2. Masuk ke mst_pengguna_peran (Relasi Peran)
      await trx("mst_pengguna_peran").insert({
        id_pengguna: nNewUserId,
        id_peran: peranData.id_peran,
        peran_utama: 1,
        status: "active",
        created_at: formatDateSystem(),
        updated_at: formatDateSystem(),
      });

      // 3. Masuk ke navigasi_pengguna (Menu Spesifik)
      await trx("navigasi_pengguna")
        .insert({
          id_pengguna: nNewUserId,
          menu: oNavigation.menu,
          created_at: formatDateSystem(),
          updated_at: formatDateSystem(),
        })
        .onConflict("id_pengguna")
        .merge({
          menu: oNavigation.menu,
          updated_at: formatDateSystem(),
        });
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil dibuat",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance",
      datetime: datetime(),
    };
    Logging(error, {
      file: "user_create.js",
      func: "create",
      request: oPayload,
      response: oResult,
      user: cNamaPengguna,
    });
    return res.status(500).json(oResult);
  }
});

export default router;
