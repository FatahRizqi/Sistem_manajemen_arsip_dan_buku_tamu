/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Kita skip proses rename tabel, karena tabel lo UDAH bernama trs_kunjungan
  const hasTable = await knex.schema.hasTable("trx_visitations");
  if (hasTable) {
    await knex.schema.renameTable("trx_visitations", "trs_kunjungan");
  }

  // 2. Eksekusi ubah kolom dengan tipe data 100% akurat sesuai screenshot
  await knex.raw(`
    ALTER TABLE trs_kunjungan 
      CHANGE visitation_id id_kunjungan INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      CHANGE guest_name nama_tamu VARCHAR(100) NOT NULL,
      CHANGE phone_number nomor_telepon VARCHAR(45) NOT NULL,
      CHANGE guest_email email_tamu VARCHAR(150) DEFAULT NULL,
      CHANGE guest_company instansi_tamu VARCHAR(100) NOT NULL,
      CHANGE guest_position jabatan_tamu VARCHAR(70) DEFAULT NULL,
      CHANGE identity_type jenis_identitas ENUM('ktp','sim','paspor') DEFAULT NULL,
      CHANGE identity_number nomor_identitas VARCHAR(50) DEFAULT NULL,
      CHANGE check_in_time waktu_masuk DATETIME DEFAULT NULL,
      CHANGE check_out_time waktu_keluar DATETIME DEFAULT NULL,
      CHANGE photo_face foto_wajah VARCHAR(255) DEFAULT NULL,
      CHANGE photo_identity foto_identitas VARCHAR(255) DEFAULT NULL,
      CHANGE host_user_id id_user_host VARCHAR(36) DEFAULT NULL,
      CHANGE host_name nama_host VARCHAR(100) DEFAULT NULL,
      CHANGE visit_notes catatan_kunjungan TEXT DEFAULT NULL,
      CHANGE visit_code kode_kunjungan VARCHAR(30) DEFAULT NULL,
      CHANGE qr_token token_qr VARCHAR(100) DEFAULT NULL,
      CHANGE approval_status status_persetujuan ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
      CHANGE approval_notes catatan_persetujuan TEXT DEFAULT NULL,
      CHANGE user_id id_user INT(10) UNSIGNED DEFAULT NULL,
      CHANGE visit_purpose_id id_tujuan_kunjungan INT(11) DEFAULT NULL;
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasTable = await knex.schema.hasTable("trs_kunjungan");
  
  if (hasTable) {
    // Rollback ke nama bahasa Inggris
    await knex.raw(`
      ALTER TABLE trs_kunjungan 
        CHANGE id_kunjungan visitation_id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
        CHANGE nama_tamu guest_name VARCHAR(100) NOT NULL,
        CHANGE nomor_telepon phone_number VARCHAR(45) NOT NULL,
        CHANGE email_tamu guest_email VARCHAR(150) DEFAULT NULL,
        CHANGE instansi_tamu guest_company VARCHAR(100) NOT NULL,
        CHANGE jabatan_tamu guest_position VARCHAR(70) DEFAULT NULL,
        CHANGE jenis_identitas identity_type ENUM('ktp','sim','paspor') DEFAULT NULL,
        CHANGE nomor_identitas identity_number VARCHAR(50) DEFAULT NULL,
        CHANGE waktu_masuk check_in_time DATETIME DEFAULT NULL,
        CHANGE waktu_keluar check_out_time DATETIME DEFAULT NULL,
        CHANGE foto_wajah photo_face VARCHAR(255) DEFAULT NULL,
        CHANGE foto_identitas photo_identity VARCHAR(255) DEFAULT NULL,
        CHANGE id_user_host host_user_id VARCHAR(36) DEFAULT NULL,
        CHANGE nama_host host_name VARCHAR(100) DEFAULT NULL,
        CHANGE catatan_kunjungan visit_notes TEXT DEFAULT NULL,
        CHANGE kode_kunjungan visit_code VARCHAR(30) DEFAULT NULL,
        CHANGE token_qr qr_token VARCHAR(100) DEFAULT NULL,
        CHANGE status_persetujuan approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
        CHANGE catatan_persetujuan approval_notes TEXT DEFAULT NULL,
        CHANGE id_user user_id INT(10) UNSIGNED DEFAULT NULL,
        CHANGE id_tujuan_kunjungan visit_purpose_id INT(11) DEFAULT NULL;
    `);

    await knex.schema.renameTable("trs_kunjungan", "trx_visitations");
  }
}
