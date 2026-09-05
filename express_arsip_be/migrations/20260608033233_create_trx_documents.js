/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.createTable("trx_documents", (table) => {
    table.charset("utf8mb4");
    table.collate("utf8mb4_unicode_ci");

    table.increments("document_id").primary();
    table.integer("archive_classification_id").unsigned();
    table.string("document_name");
    table.string("document_number");
    table.date("document_date");
    table.date("expired_date");
    table.string("pic_name");
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTableIfExists("trx_documents");
};
