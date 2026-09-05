/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("trx_incoming_letter_files", (table) => {
    table.bigIncrements("incoming_letter_file_id").primary();

    table.bigInteger("incoming_letter_id").unsigned().notNullable();

    table.string("file_path", 255).notNullable();
    table.string("file_name", 255).nullable();
    table.string("file_mime_type", 100).nullable();
    table.bigInteger("file_size").nullable();

    table.integer("uploaded_by").unsigned().nullable();

    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("incoming_letter_id")
      .references("incoming_letter_id")
      .inTable("trx_incoming_letters")
      .onDelete("CASCADE");

    table
      .foreign("uploaded_by")
      .references("id_pengguna")
      .inTable("mst_pengguna");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("trx_incoming_letter_files");
}
