/**
 * Upgrade trx_archive_loans:
 * - Tambah expected_return_date, approved_by, approved_at, approval_notes, is_overdue
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable("trx_archive_loans", (table) => {
    // Tanggal wajib kembali (diisi saat pengajuan)
    table.date("expected_return_date").nullable().after("loan_date");

    // Siapa yang approve peminjaman
    table.string("approved_by", 50).nullable().after("purpose");

    // Kapan diapprove
    table.datetime("approved_at").nullable().after("approved_by");

    // Catatan approval / penolakan
    table.text("approval_notes").nullable().after("approved_at");

    // Flag terlambat dikembalikan (1 = overdue)
    table.tinyint("is_overdue").notNullable().defaultTo(0).after("approval_notes");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable("trx_archive_loans", (table) => {
    table.dropColumn("expected_return_date");
    table.dropColumn("approved_by");
    table.dropColumn("approved_at");
    table.dropColumn("approval_notes");
    table.dropColumn("is_overdue");
  });
}
