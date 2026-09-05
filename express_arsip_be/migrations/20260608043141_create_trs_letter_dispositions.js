/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("trx_letter_dispositions", (table) => {
    table.bigIncrements("disid_jabatan").primary();

    table.bigInteger("incoming_letter_id").unsigned().notNullable();
    table.bigInteger("parent_disid_jabatan").unsigned().nullable();

    table.integer("from_nama_pengguna").unsigned().nullable();
    table.integer("to_nama_pengguna").unsigned().notNullable();

    table.bigInteger("disposition_instruction_id").unsigned().nullable();

    table.text("instruction").nullable();
    table.text("disposition_note").nullable();
    table.date("due_date").nullable();

    table
      .enu("status", ["baru", "dibaca", "diproses", "selesai"])
      .notNullable()
      .defaultTo("baru");

    table.dateTime("received_at").nullable();
    table.dateTime("processed_at").nullable();
    table.dateTime("completed_at").nullable();

    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("incoming_letter_id")
      .references("incoming_letter_id")
      .inTable("trx_incoming_letters")
      .onDelete("CASCADE");

    table
      .foreign("parent_disid_jabatan")
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
      .foreign("disposition_instruction_id")
      .references("disposition_instruction_id")
      .inTable("mst_disposition_instructions");

    table
      .foreign("created_by")
      .references("id_pengguna")
      .inTable("mst_pengguna");
    table
      .foreign("updated_by")
      .references("id_pengguna")
      .inTable("mst_pengguna");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("trx_letter_dispositions");
}
