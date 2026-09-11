import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "./general.js";

/**
 * Helper to record a new notification
 * @param {Object} param0
 * @param {number|null} param0.id_pengguna - Target user ID (nullable for public/global)
 * @param {string} param0.judul - Notification title
 * @param {string} param0.pesan - Notification message body
 * @param {string} param0.tipe - Type: 'surat_masuk', 'kunjungan', 'disposisi', 'sistem'
 * @param {string|null} param0.tautan - Navigation route path (nullable)
 */
export const createNotification = async ({
  id_pengguna = null,
  judul,
  pesan,
  tipe,
  tautan = null,
}) => {
  try {
    const now = formatDateSystem();
    await DB("trx_notifikasi").insert({
      id_pengguna,
      judul,
      pesan,
      tipe,
      tautan,
      status_baca: 0,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("❌ [Notification Helper Error]:", error);
  }
};
