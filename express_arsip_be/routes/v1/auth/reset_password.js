import "dotenv/config";
import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import {
  formatDateSystem,
  hashEquals,
  hmac,
  status,
} from "../components/tools/general.js";
import { Logging, validatePayload } from "../components/tools/servertool.js";
import { recordAuditTrail } from "../components/tools/audit_tool.js";

const router = express.Router();

const getColumns = async (tableName) => {
  const [columns] = await DB.raw("SHOW COLUMNS FROM ??", [tableName]);
  return columns.map((column) => column.Field);
};

const pickColumn = (columns, candidates) => {
  return candidates.find((candidate) => columns.includes(candidate));
};

const getUserByUsernameForReset = async (namaPengguna) => {
  const columns = await getColumns("mst_pengguna");
  const idColumn = pickColumn(columns, ["id_pengguna", "user_id", "UserId"]);
  const usernameColumn = pickColumn(columns, ["nama_pengguna", "username", "Username"]);
  const passwordColumn = pickColumn(columns, ["kata_sandi", "password", "Password"]);

  if (!idColumn || !usernameColumn || !passwordColumn) return null;

  const user = await DB("mst_pengguna")
    .where(usernameColumn, namaPengguna)
    .select(
      `${idColumn} as id_pengguna`,
      `${usernameColumn} as nama_pengguna`,
      `${passwordColumn} as kata_sandi`,
    )
    .first();

  if (!user) return null;

  const oldTables = {
    userRole: "mst_pengguna_peran",
    role: "mst_peran",
    userId: "id_pengguna",
    roleId: "role_id",
    roleName: "role_name",
  };
  const newTables = {
    userRole: "mst_pengguna_perans",
    role: "mst_perans",
    userId: "nama_pengguna",
    roleId: "id_peran",
    roleName: "nama_peran",
  };

  const hasOld = await DB.schema.hasTable(oldTables.userRole);
  const cfg = hasOld ? oldTables : newTables;

  if (await DB.schema.hasTable(cfg.userRole) && await DB.schema.hasTable(cfg.role)) {
    const userRoleColumns = await getColumns(cfg.userRole);
    const roleColumns = await getColumns(cfg.role);
    const userJoinColumn = pickColumn(userRoleColumns, [cfg.userId, "id_pengguna", "user_id", "nama_pengguna"]);
    const roleJoinColumn = pickColumn(userRoleColumns, [cfg.roleId, "id_peran", "role_id"]);
    const roleIdColumn = pickColumn(roleColumns, [cfg.roleId, "id_peran", "role_id"]);
    const roleNameColumn = pickColumn(roleColumns, [cfg.roleName, "nama_peran", "role_name"]);

    if (userJoinColumn && roleJoinColumn && roleIdColumn) {
      const userValue = ["nama_pengguna", "username"].includes(userJoinColumn) ? user.nama_pengguna : user.id_pengguna;
      const roleRow = await DB(`${cfg.userRole} as ur`)
        .leftJoin(`${cfg.role} as r`, `ur.${roleJoinColumn}`, `r.${roleIdColumn}`)
        .select(roleNameColumn ? `r.${roleNameColumn} as nama_peran` : DB.raw("NULL as nama_peran"))
        .where(`ur.${userJoinColumn}`, userValue)
        .first();
      user.peran = roleRow?.nama_peran || null;
    }
  }

  return user;
};

router.post("/", async (req, res) => {
  const { body: oPayload } = req;
  const cnama_penggunaActor = req?.auth?.nama_pengguna || "Unknown"; // Ngambil dari token JWT

  try {
    // 1. Validasi Input User
    const cValidation = await validatePayload(
      {
        nama_pengguna: Joi.string().required().label("nama_pengguna"),
        old_kata_sandi: Joi.string().required().label("kata_sandi Lama"),
        new_kata_sandi: Joi.string().min(6).required().label("kata_sandi Baru"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
        "string.min": "{#label} minimal {#limit} karakter",
      },
      oPayload,
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };
      return res.status(422).json(oResult);
    }

    // 2. Cari Data User di Database
    const oUser = await DB("mst_pengguna")
      .leftJoin(
        "mst_pengguna_peran",
        "mst_pengguna.id_pengguna",
        "mst_pengguna_peran.id_pengguna",
      )
      .leftJoin("mst_peran", "mst_pengguna_peran.id_peran", "mst_peran.id_peran")
      .select(
        "mst_pengguna.id_pengguna",
        "mst_pengguna.nama_pengguna",
        "mst_pengguna.kata_sandi",
        "mst_peran.nama_peran as peran",
      )
      .where("mst_pengguna.nama_pengguna", oPayload.nama_pengguna)
      .first();

    if (!oUser) {
      return res.status(400).json({
        status: status.GAGAL,
        message: "nama_pengguna tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    // 3. Verifikasi kata_sandi Lama
    const cSecret = process.env.USER_SECRET;
    const cOldkata_sandi =
      process.env.USER_KEY + oUser.nama_pengguna + oPayload.old_kata_sandi;

    if (
      !hashEquals(hmac(cOldkata_sandi, cSecret, "sha512"), oUser.kata_sandi)
    ) {
      return res.status(400).json({
        status: status.GAGAL,
        message: "kata_sandi lama salah!",
        datetime: formatDateSystem(),
      });
    }

    // 4. Hash (Sandikan) kata_sandi Baru
    const cNewkata_sandi =
      process.env.USER_KEY + oUser.nama_pengguna + oPayload.new_kata_sandi;
    const cHashedNewkata_sandi = hmac(cNewkata_sandi, cSecret, "sha512");

    // 5. Update Database dengan kata_sandi Baru
    const columns = await getColumns("mst_pengguna");
    const idColumn = pickColumn(columns, ["id_pengguna", "user_id", "UserId"]);
    const passwordColumn = pickColumn(columns, ["kata_sandi", "password", "Password"]);

    await DB("mst_pengguna").where(idColumn, oUser.id_pengguna).update({
      [passwordColumn]: cHashedNewkata_sandi,
      updated_at: formatDateSystem(),
    });

    // 6. Catat Aktivitas ke CCTV
    recordAuditTrail(
      oUser.nama_pengguna,
      String(oUser.peran || ""),
      "RESET_kata_sandi",
      req,
    );

    return res.status(200).json({
      status: status.SUKSES,
      message: "kata_sandi berhasil diubah",
      datetime: formatDateSystem(),
    });
  } catch (oError) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(oError, {
      file: "reset_kata_sandi.js",
      func: "POST /",
      request: oPayload,
      response: oResult,
      user: cnama_penggunaActor,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
