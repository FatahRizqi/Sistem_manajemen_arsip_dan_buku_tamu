const createIfMissing = async (knex, tableName, callback) => {
  const exists = await knex.schema.hasTable(tableName);

  if (!exists) {
    await knex.schema.createTable(tableName, callback);
  }
};

export async function up(knex) {
  await createIfMissing(knex, "mst_letter_types", (table) => {
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

  await createIfMissing(knex, "mst_disposition_instructions", (table) => {
    table.bigIncrements("disposition_instruction_id").primary();
    table.string("instruction_code", 50).notNullable().unique();
    table.string("instruction_name", 100).notNullable();
    table.text("deskripsi").nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await createIfMissing(knex, "trx_incoming_letters", (table) => {
    table.bigIncrements("incoming_letter_id").primary();
    table.string("agenda_number", 100).notNullable().unique();
    table.string("letter_number", 100).notNullable();
    table.date("letter_date").notNullable();
    table.date("received_date").notNullable();
    table.string("sender_name", 150).notNullable();
    table.string("sender_institution", 150).nullable();
    table.string("subject", 255).notNullable();
    table.text("attachment_deskripsi").nullable();
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
    table
      .foreign("letter_type_id")
      .references("letter_type_id")
      .inTable("mst_letter_types");
    table
      .foreign("document_type_id")
      .references("DocumentTypeId")
      .inTable("mst_document_type");
    table
      .foreign("archive_classification_id")
      .references("ArchiveClassificationId")
      .inTable("mst_archive_classifications");
    table
      .foreign("confidentiality_level_id")
      .references("ConfidentialityLevelId")
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

  await createIfMissing(knex, "trx_letter_dispositions", (table) => {
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

  await createIfMissing(knex, "trx_incoming_letter_files", (table) => {
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

  await createIfMissing(knex, "trx_incoming_letter_trackings", (table) => {
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

export async function down() {}
