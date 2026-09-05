/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    const hasTable = await knex.schema.hasTable('mst_visit_purpose');
    
    // 1. Ubah nama tabelnya dulu
    if (hasTable) {
        await knex.schema.renameTable('mst_visit_purpose', 'mst_tujuan_kunjungan');
    }

    // 2. Ubah nama kolom menggunakan query raw agar AUTO_INCREMENT & tipe data tidak hilang
    await knex.raw(`
        ALTER TABLE mst_tujuan_kunjungan 
        CHANGE visit_purpose_id id_tujuan_kunjungan INT(11) NOT NULL AUTO_INCREMENT,
        CHANGE visit_purpose_code kode_tujuan_kunjungan VARCHAR(45) NOT NULL,
        CHANGE visit_purpose_name nama_tujuan_kunjungan VARCHAR(45) NOT NULL,
        CHANGE description deskripsi VARCHAR(45) DEFAULT NULL;
    `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    const hasTable = await knex.schema.hasTable('mst_tujuan_kunjungan');
    
    if (hasTable) {
        // 1. Rollback nama kolom kembali ke bahasa Inggris dengan tipe data yang sama
        await knex.raw(`
            ALTER TABLE mst_tujuan_kunjungan 
            CHANGE id_tujuan_kunjungan visit_purpose_id INT(11) NOT NULL AUTO_INCREMENT,
            CHANGE kode_tujuan_kunjungan visit_purpose_code VARCHAR(45) NOT NULL,
            CHANGE nama_tujuan_kunjungan visit_purpose_name VARCHAR(45) NOT NULL,
            CHANGE deskripsi description VARCHAR(45) DEFAULT NULL;
        `);

        // 2. Rollback nama tabel
        await knex.schema.renameTable('mst_tujuan_kunjungan', 'mst_visit_purpose');
    }
}
