/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Tabel-tabel Master Tanpa Foreign Key Dependencies
  await knex.schema.createTable("mst_perans", (table) => {
    table.increments("id_peran").primary();
    table.string("kode_peran", 45).notNullable().unique();
    table.string("nama_peran", 100).notNullable();
    table.text("deskripsi").nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_cabanges", (table) => {
    table.increments("id_cabang").primary();
    table.string("kode_cabang", 50).notNullable().unique();
    table.string("nama_cabang", 100).notNullable();
    table.text("alamat").nullable();
    table.string("telepon", 45).nullable();
    table.string("surel", 150).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_jabatan", (table) => {
    table.increments("id_jabatan").primary();
    table.string("kode_jabatan", 50).notNullable().unique();
    table.string("nama_jabatan", 100).notNullable();
    table.integer("tingkat_jabatan").nullable();
    table.text("deskripsi").nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_archive_classifications", (table) => {
    table.increments("archive_classification_id").primary();
    table.string("classification_code", 45).notNullable().unique();
    table.string("classification_name", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_document_type", (table) => {
    table.increments("document_type_id").primary();
    table.string("document_type_code", 45).notNullable().unique();
    table.string("document_type_name", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_confidentiality_levels", (table) => {
    table.increments("confidentiality_level_id").primary();
    table.string("confidentiality_level_code", 45).notNullable().unique();
    table.string("confidentiality_level_name", 100).notNullable();
    table.integer("confidentiality_level").notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_visit_purpose", (table) => {
    table.integer("visit_purpose_id").primary(); // Sesuai SQL Workbench: INT NOT NULL tanpa AI
    table.string("visit_purpose_code", 45).notNullable().unique();
    table.string("visit_purpose_name", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  // 2. Self-Referencing Table (Menus)
  await knex.schema.createTable("mst_menus", (table) => {
    table.increments("menu_id").primary();
    table
      .integer("parent_menu_id")
      .unsigned()
      .nullable()
      .references("menu_id")
      .inTable("mst_menus")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.string("menu_code", 45).notNullable().unique();
    table.string("menu_name", 45).notNullable();
    table.string("menu_path", 255).nullable();
    table.string("menu_icon", 100).nullable();
    table.integer("sort_order").notNullable().defaultTo(0);
    table.tinyint("is_active").notNullable().defaultTo(1);
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  // 3. Tabel dengan Single Dependency
  await knex.schema.createTable("mst_divisi", (table) => {
    table.increments("id_divisi").primary();
    table
      .integer("id_cabang")
      .unsigned()
      .notNullable()
      .references("id_cabang")
      .inTable("mst_cabanges")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.string("kode_divisi", 45).notNullable().unique();
    table.string("nama_divisi", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_document_categories", (table) => {
    table.increments("document_category_id").primary();
    table
      .integer("archive_classification_id")
      .unsigned()
      .notNullable()
      .references("archive_classification_id")
      .inTable("mst_archive_classifications")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.string("document_category_code", 45).notNullable().unique();
    table.string("document_category_name", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_peran_menus", (table) => {
    table.increments("peran_menu_id").primary();
    table
      .integer("id_peran")
      .unsigned()
      .notNullable()
      .references("id_peran")
      .inTable("mst_perans")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table
      .integer("menu_id")
      .unsigned()
      .notNullable()
      .references("menu_id")
      .inTable("mst_menus")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.tinyint("can_view").notNullable().defaultTo(1);
    table.tinyint("can_create").notNullable().defaultTo(0);
    table.tinyint("can_update").notNullable().defaultTo(0);
    table.tinyint("can_delete").notNullable().defaultTo(0);
    table.tinyint("can_approve").notNullable().defaultTo(0);
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  // 4. Tabel dengan Multi Dependency / Bertingkat
  await knex.schema.createTable("mst_departemens", (table) => {
    table.increments("id_departemen").primary();
    table
      .integer("id_divisi")
      .unsigned()
      .notNullable()
      .references("id_divisi")
      .inTable("mst_divisi")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.string("department_code", 50).notNullable().unique();
    table.string("department_name", 150).notNullable();
    table.text("deskripsi").nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_retention_schedule", (table) => {
    table.increments("retention_schedule_id").primary();
    table
      .integer("document_category_id")
      .unsigned()
      .notNullable()
      .references("document_category_id")
      .inTable("mst_document_categories")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.string("retention_code", 45).notNullable().unique();
    table.string("retention_name", 45).notNullable();
    table.integer("retention_years").notNullable();
    table.string("retention_action", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_unit_kerja", (table) => {
    table.increments("mst_unit_kerja").primary();
    table
      .integer("id_departemen")
      .unsigned()
      .notNullable()
      .references("id_departemen")
      .inTable("mst_departemens")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.string("kode_unit_kerja", 45).notNullable().unique();
    table.string("work_unit_name", 45).notNullable();
    table.string("deskripsi", 45).nullable();
    table.enu("status", ["active", "nonactive"]).notNullable();
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  // 5. Master Users & User perans (Paling akhir karena bergantung pada cabang, divisi, dll)
  await knex.schema.createTable("mst_pengguna", (table) => {
    table.increments("id_pengguna").primary();
    table.string("nama_lengkap", 45).notNullable();
    table.string("nama_pengguna", 45).notNullable().unique();
    table.string("surel", 45).nullable();
    table.string("telepon", 45).nullable();
    table.string("kata_sandi", 100).notNullable();
    table
      .integer("id_cabang")
      .unsigned()
      .notNullable()
      .references("id_cabang")
      .inTable("mst_cabanges")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table
      .integer("id_divisi")
      .unsigned()
      .notNullable()
      .references("id_divisi")
      .inTable("mst_divisi")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table
      .integer("id_departemen")
      .unsigned()
      .notNullable()
      .references("id_departemen")
      .inTable("mst_departemens")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table
      .integer("id_jabatan")
      .unsigned()
      .notNullable()
      .references("id_jabatan")
      .inTable("mst_jabatan")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table
      .integer("mst_unit_kerja")
      .unsigned()
      .notNullable()
      .references("mst_unit_kerja")
      .inTable("mst_unit_kerja")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.integer("gagal_masuk").nullable().defaultTo(0);
    table.datetime("terakhir_login").nullable();
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });

  await knex.schema.createTable("mst_pengguna_perans", (table) => {
    table.increments("id_peran_pengguna").primary();
    table
      .integer("nama_pengguna")
      .unsigned()
      .notNullable()
      .references("id_pengguna")
      .inTable("mst_pengguna")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table
      .integer("id_peran")
      .unsigned()
      .notNullable()
      .references("id_peran")
      .inTable("mst_perans")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION");
    table.tinyint("peran_utama").nullable().defaultTo(0);
    table
      .enu("status", ["active", "nonactive"])
      .notNullable()
      .defaultTo("active");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at").notNullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Drop dengan urutan terbalik untuk menghindari Foreign Key Violation
  await knex.schema.dropTableIfExists("mst_pengguna_perans");
  await knex.schema.dropTableIfExists("mst_pengguna");
  await knex.schema.dropTableIfExists("mst_unit_kerja");
  await knex.schema.dropTableIfExists("mst_retention_schedule");
  await knex.schema.dropTableIfExists("mst_departemens");
  await knex.schema.dropTableIfExists("mst_peran_menus");
  await knex.schema.dropTableIfExists("mst_document_categories");
  await knex.schema.dropTableIfExists("mst_divisi");
  await knex.schema.dropTableIfExists("mst_menus");
  await knex.schema.dropTableIfExists("mst_visit_purpose");
  await knex.schema.dropTableIfExists("mst_confidentiality_levels");
  await knex.schema.dropTableIfExists("mst_document_type");
  await knex.schema.dropTableIfExists("mst_archive_classifications");
  await knex.schema.dropTableIfExists("mst_jabatan");
  await knex.schema.dropTableIfExists("mst_cabanges");
  await knex.schema.dropTableIfExists("mst_perans");
}
