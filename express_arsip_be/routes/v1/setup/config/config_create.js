import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import {
  formatDateSystem,
  mimeToExt,
  status,
} from "../../components/tools/general.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

const upload = multer({
  dest: "temp/",
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
});

router.post("/", upload.any(), async (req, res) => {
  const oPayload = req.body;
  const vaFiles = req.files;
  const nama_pengguna = req?.auth?.nama_pengguna || "";

  try {
    console.log(oPayload);
    const cValidation = await validatePayload(
      {
        kode: Joi.string().required().label("kode"),
        keterangan: Joi.string().required().label("keterangan"),
      },
      {
        "any.required": "{#label} wajib diisi",
        "array.base": "{#label} harus berupa array",
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
      },
      oPayload,
    );

    if (cValidation) {
      const oResult = {
        status: status.GAGAL,
        message: cValidation,
        datetime: formatDateSystem(),
      };
      Logging(null, {
        file: "info_perusahaan_create.js",
        func: "create",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });
      return res.status(422).json(oResult);
    }

    let { kode, keterangan } = oPayload;

    kode = JSON.parse(kode);
    keterangan = JSON.parse(keterangan);
    console.log(vaFiles);

    if (kode.length !== keterangan.length) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: "Jumlah data kode dan keterangan tidak sama.",
        datetime: formatDateSystem(),
      };
      Logging(null, {
        file: "info_perusahaan_create.js",
        func: "create",
        request: oPayload,
        response: oResult,
        user: nama_pengguna,
      });
      return res.status(422).json(oResult);
    }

    const oldData = await DB("config")
      .select("kode", "keterangan")
      .where("kode", "msLogoPerusahaan")
      .first();

    let filename = oldData?.keterangan || "";
    const oFile = vaFiles[0];

    if (oFile) {
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "config",
        "logo_perusahaan",
      );
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext =
        path.extname(oFile.originalname) || mimeToExt[oFile.mimetype] || "";
      filename = `logo_perusahaan${ext}`;
      const filepath = path.join(uploadDir, filename);

      // hapus file lama kalau ada
      const oldPath = path.join(uploadDir, oldData?.keterangan || "");
      if (oldData?.keterangan && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      fs.renameSync(oFile.path, filepath);
    }

    kode.push("msLogoPerusahaan");
    keterangan.push(filename);

    for (let i = 0; i < kode.length; i++) {
      const cKode = kode[i];
      const cKeterangan = keterangan[i] ?? null;

      const existing = await DB("config")
        .select("keterangan")
        .where("kode", cKode)
        .first();

      if (existing) {
        await DB("config")
          .where("kode", cKode)
          .update({ keterangan: cKeterangan });
      } else {
        await DB("config").insert({ kode: cKode, keterangan: cKeterangan });
      }
    }

    const oResult = {
      status: status.SUKSES,
      message: "Berhasil Menambahkan Data",
      datetime: formatDateSystem(),
    };

    return res.status(200).json(oResult);
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, {
      file: "info_perusahaan_create.js",
      func: "create",
      request: oPayload,
      response: oResult,
      user: nama_pengguna,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
