import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { datetime, status, formatDateSystem, hmac } from "../components/tools/general.js";
import { Logging, validatePayload } from "../components/tools/servertool.js";

const router = express.Router();

router.put("/", async (req, res) => {
  const { body: oPayload } = req;
  const cNamaPengguna = req?.auth?.nama_pengguna || "";

  try {
    const userId = req.auth.id_pengguna;
    if (!userId) {
      return res.status(401).json({
        status: status.UNAUTHORIZED,
        message: "Sesi tidak valid",
        datetime: formatDateSystem()
      });
    }

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
        telepon: Joi.string().pattern(/^[0-9]+$/).max(13).required().label("telepon"),
        surel: Joi.string().email().max(100).allow(null, '').optional().label("surel"),
        sandi_lama: Joi.string().allow(null, '').optional().label("sandi_lama"),
        sandi_baru: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$")).allow(null, '').optional().label("sandi_baru"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
        "string.email": "Format surel tidak valid",
        "string.pattern.base": "Kata sandi harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial"
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
      Logging(null, { file: "profile_update.js", func: "update", request: oPayload, response: oResult, user: cNamaPengguna });
      return res.status(422).json(oResult);
    }

    // Cek duplikasi username / telp
    const existingUser = await DB("mst_pengguna")
      .whereNot("id_pengguna", userId)
      .andWhere(function() {
        this.where("nama_pengguna", oPayload.nama_pengguna).orWhere("telepon", oPayload.telepon);
      })
      .first();

    if (existingUser) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: existingUser.nama_pengguna === oPayload.nama_pengguna
            ? "Data dengan nama pengguna tersebut sudah digunakan"
            : "Data dengan telepon tersebut sudah digunakan",
        datetime: formatDateSystem(),
      });
    }

    const currentUser = await DB("mst_pengguna").where("id_pengguna", userId).first();

    const updateData = {
      nama_lengkap: oPayload.nama_lengkap,
      nama_pengguna: oPayload.nama_pengguna,
      telepon: oPayload.telepon,
      surel: oPayload.surel || null,
      updated_at: datetime(),
    };

    if (oPayload.sandi_baru) {
      if (!oPayload.sandi_lama) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Sandi lama harus diisi untuk mengubah kata sandi",
          datetime: formatDateSystem(),
        });
      }

      // Verifikasi sandi_lama menggunakan nama_pengguna yang lama
      const cOldKataSandi = process.env.USER_KEY + currentUser.nama_pengguna + oPayload.sandi_lama;
      const hashedOldSandi = hmac(cOldKataSandi, process.env.USER_SECRET, "sha512");

      if (hashedOldSandi !== currentUser.kata_sandi) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Sandi lama yang Anda masukkan salah",
          datetime: formatDateSystem(),
        });
      }

      // Hash sandi_baru menggunakan nama_pengguna yang baru (jika berubah) atau yang lama
      const cNewKataSandi = process.env.USER_KEY + oPayload.nama_pengguna + oPayload.sandi_baru;
      updateData.kata_sandi = hmac(cNewKataSandi, process.env.USER_SECRET, "sha512");
    } else if (oPayload.nama_pengguna !== currentUser.nama_pengguna) {
      // Jika user mengubah nama_pengguna tapi tidak mengubah kata sandi, 
      // kata sandi harus di-rehash menggunakan nama_pengguna yang baru.
      // Namun kita butuh sandi_lama untuk melakukan ini.
      if (!oPayload.sandi_lama) {
         return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Perubahan nama pengguna memerlukan verifikasi Sandi Lama Anda",
          datetime: formatDateSystem(),
        });
      }

      const cOldKataSandi = process.env.USER_KEY + currentUser.nama_pengguna + oPayload.sandi_lama;
      const hashedOldSandi = hmac(cOldKataSandi, process.env.USER_SECRET, "sha512");

      if (hashedOldSandi !== currentUser.kata_sandi) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Sandi lama yang Anda masukkan salah",
          datetime: formatDateSystem(),
        });
      }

      const cNewKataSandi = process.env.USER_KEY + oPayload.nama_pengguna + oPayload.sandi_lama; // re-hash old password with new username
      updateData.kata_sandi = hmac(cNewKataSandi, process.env.USER_SECRET, "sha512");
    }

    await DB("mst_pengguna").where("id_pengguna", userId).update(updateData);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Profil berhasil diperbarui",
      datetime: formatDateSystem()
    });

  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Gagal memperbarui profil",
      datetime: datetime(),
    };
    Logging(error, { file: "profile_update.js", func: "update", request: oPayload, response: oResult, user: cNamaPengguna });
    return res.status(500).json(oResult);
  }
});

export default router;
