/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Matikan check biar nggak rewel saat drop tabel
  await knex.raw("SET FOREIGN_KEY_CHECKS = 0;");

  await knex.schema.dropTableIfExists("trx_incoming_letters");
  await knex.schema.dropTableIfExists("mst_letter_types");

  await knex.schema.createTable("mst_letter_types", (table) => {
    table.bigIncrements("letter_type_id").primary();
    table.string("letter_type_code", 50).notNullable().unique();
    table.string("letter_type_name", 150).notNullable();
    table
      .enu("direction", ["incoming", "outgoing", "both"])
      .notNullable()
      .defaultTo("both");
    table.text("deskripsi").nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("trx_incoming_letters", (table) => {
    table.bigIncrements("incoming_letter_id").primary();

    table.string("agenda_number", 100).notNullable().unique();
    table.string("letter_number", 100).notNullable();
    table.date("letter_date").notNullable();
    table.date("received_date").notNullable();

    table.string("sender_name", 150).notNullable();
    table.string("sender_institution", 150).nullable();
    table.string("subject", 255).notNullable();
    table.text("attachment_deskripsi").nullable();

    // Pastikan semua kolom FK pakai snake_case
    table.bigInteger("letter_type_id").unsigned().nullable();
    table.integer("document_type_id").unsigned().nullable();
    table.integer("archive_classification_id").unsigned().nullable();
    table.integer("confidentiality_level_id").unsigned().nullable();
    table
      .enu("status", ["baru", "diproses", "didisposisi", "selesai"])
      .notNullable()
      .defaultTo("baru");
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());

    // SEMUA REFERENSI FK HARUS SNAKE_CASE
    table
      .foreign("letter_type_id")
      .references("letter_type_id")
      .inTable("mst_letter_types");
    table
      .foreign("document_type_id")
      .references("document_type_id")
      .inTable("mst_document_type");
    table
      .foreign("archive_classification_id")
      .references("archive_classification_id")
      .inTable("mst_archive_classifications");
    table
      .foreign("confidentiality_level_id")
      .references("confidentiality_level_id")
      .inTable("mst_confidentiality_levels");
    table
      .foreign("created_by")
      .references("id_pengguna")
      .inTable("mst_pengguna");
    table
      .foreign("updated_by")
      .references("id_pengguna")
      .inTable("mst_pengguna");
  });

  await knex.raw("SET FOREIGN_KEY_CHECKS = 1;");
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("trx_incoming_letters");
  await knex.schema.dropTableIfExists("mst_letter_types");
}
