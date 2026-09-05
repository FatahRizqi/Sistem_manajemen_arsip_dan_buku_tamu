/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("trx_archive_loans", (table) => {
    table.charset("utf8mb4");
    table.collate("utf8mb4_unicode_ci");

    table.increments("loan_id").primary();
    table
      .integer("document_id")
      .unsigned()
      .notNullable()
      .references("document_id")
      .inTable("trx_documents")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.string("borrower_name").notNullable();
    table.date("loan_date").notNullable();
    table.date("return_date").nullable();
    table.text("purpose").nullable();
    table
      .enu("status", [
        "pending",
        "approved",
        "borrowed",
        "returned",
        "rejected",
      ])
      .notNullable()
      .defaultTo("pending");

    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("trx_archive_loans");
}
