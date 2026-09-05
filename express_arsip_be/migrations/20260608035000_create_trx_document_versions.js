/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("trx_document_versions", (table) => {
    table.charset("utf8mb4");
    table.collate("utf8mb4_unicode_ci");

    table.increments("version_id").primary();
    table
      .integer("document_id")
      .unsigned()
      .notNullable()
      .references("document_id")
      .inTable("trx_documents")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.integer("version_number").notNullable();
    table.text("change_notes").nullable();
    table.string("file_path").notNullable();
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("trx_document_versions");
}
