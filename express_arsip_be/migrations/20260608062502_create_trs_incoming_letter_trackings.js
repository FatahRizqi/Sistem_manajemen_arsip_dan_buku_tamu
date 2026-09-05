/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("trx_incoming_letter_trackings", (table) => {
    table.bigIncrements("incoming_letter_tracking_id").primary();

    table.bigInteger("incoming_letter_id").unsigned().notNullable();
    table.bigInteger("disid_jabatan").unsigned().nullable();

    table.string("action_name", 100).notNullable();

    table.integer("from_nama_pengguna").unsigned().nullable();
    table.integer("to_nama_pengguna").unsigned().nullable();

    table.string("previous_status", 50).nullable();
    table.string("current_status", 50).notNullable();

    table.text("notes").nullable();
    table.dateTime("processed_at").notNullable();

    table.integer("created_by").unsigned().nullable();

    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("incoming_letter_id")
      .references("incoming_letter_id")
      .inTable("trx_incoming_letters")
      .onDelete("CASCADE");

    table
      .foreign("disid_jabatan")
      .references("disid_jabatan")
      .inTable("trx_letter_dispositions");

    table
      .foreign("from_nama_pengguna")
      .references("id_pengguna")
      .inTable("mst_pengguna");
    table
      .foreign("to_nama_pengguna")
      .references("id_pengguna")
      .inTable("mst_pengguna");
    table
      .foreign("created_by")
      .references("id_pengguna")
      .inTable("mst_pengguna");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("trx_incoming_letter_trackings");
}
