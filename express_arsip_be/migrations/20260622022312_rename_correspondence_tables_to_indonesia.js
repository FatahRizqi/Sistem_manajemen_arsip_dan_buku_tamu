const TABLE_RENAMES = [
  ["mst_letter_types", "mst_jenis_surat"],
  ["mst_disposition_instructions", "mst_instruksi_disposisi"],
  ["trx_incoming_letters", "trs_surat_masuk"],
  ["trx_incoming_letter_files", "trs_file_surat_masuk"],
  ["trx_letter_dispositions", "trs_disposisi_surat"],
  ["trx_incoming_letter_trackings", "trs_tracking_surat_masuk"],
];

const COLUMN_RENAMES = {
  mst_jenis_surat: [
    ["letter_type_id", "jenis_surat_id"],
    ["letter_type_code", "kode_jenis_surat"],
    ["letter_type_name", "nama_jenis_surat"],
    ["direction", "arah_surat"],
    ["description", "deskripsi"],
  ],
  mst_instruksi_disposisi: [
    ["disposition_instruction_id", "instruksi_disposisi_id"],
    ["instruction_code", "kode_instruksi"],
    ["instruction_name", "nama_instruksi"],
    ["description", "deskripsi"],
  ],
  trs_surat_masuk: [
    ["incoming_letter_id", "surat_masuk_id"],
    ["agenda_number", "nomor_agenda"],
    ["letter_number", "nomor_surat"],
    ["letter_date", "tanggal_surat"],
    ["received_date", "tanggal_diterima"],
    ["sender_name", "nama_pengirim"],
    ["sender_institution", "instansi_pengirim"],
    ["subject", "perihal"],
    ["attachment_description", "keterangan_lampiran"],
    ["letter_type_id", "jenis_surat_id"],
    ["document_type_id", "jenis_dokumen_id"],
    ["archive_classification_id", "klasifikasi_arsip_id"],
    ["confidentiality_level_id", "tingkat_kerahasiaan_id"],
  ],
  trs_file_surat_masuk: [
    ["incoming_letter_file_id", "file_surat_masuk_id"],
    ["incoming_letter_id", "surat_masuk_id"],
    ["file_path", "path_file"],
    ["file_name", "nama_file"],
    ["file_mime_type", "tipe_mime_file"],
    ["file_size", "ukuran_file"],
  ],
  trs_disposisi_surat: [
    ["disposition_id", "disposisi_surat_id"],
    ["incoming_letter_id", "surat_masuk_id"],
    ["parent_disposition_id", "disposisi_induk_id"],
    ["from_user_id", "dari_pengguna_id"],
    ["to_user_id", "kepada_pengguna_id"],
    ["disposition_instruction_id", "instruksi_disposisi_id"],
    ["instruction", "instruksi"],
    ["disposition_note", "catatan_disposisi"],
    ["due_date", "batas_waktu"],
  ],
  trs_tracking_surat_masuk: [
    ["incoming_letter_tracking_id", "tracking_surat_masuk_id"],
    ["incoming_letter_id", "surat_masuk_id"],
    ["disposition_id", "disposisi_surat_id"],
    ["action_name", "nama_aksi"],
    ["from_user_id", "dari_pengguna_id"],
    ["to_user_id", "kepada_pengguna_id"],
    ["previous_status", "status_sebelumnya"],
    ["current_status", "status_saat_ini"],
    ["notes", "catatan"],
  ],
};

const FOREIGN_KEYS = [
  ["trs_surat_masuk", "jenis_surat_id", "mst_jenis_surat", "jenis_surat_id"],
  [
    "trs_surat_masuk",
    "jenis_dokumen_id",
    "mst_document_type",
    "DocumentTypeId",
  ],
  [
    "trs_surat_masuk",
    "klasifikasi_arsip_id",
    "mst_archive_classifications",
    "ArchiveClassificationId",
  ],
  [
    "trs_surat_masuk",
    "tingkat_kerahasiaan_id",
    "mst_confidentiality_levels",
    "ConfidentialityLevelId",
  ],
  [
    "trs_file_surat_masuk",
    "surat_masuk_id",
    "trs_surat_masuk",
    "surat_masuk_id",
    "CASCADE",
  ],
  [
    "trs_disposisi_surat",
    "surat_masuk_id",
    "trs_surat_masuk",
    "surat_masuk_id",
    "CASCADE",
  ],
  [
    "trs_disposisi_surat",
    "disposisi_induk_id",
    "trs_disposisi_surat",
    "disposisi_surat_id",
  ],
  // SUDAH DIPERBAIKI (sebelumnya mst_users dan UserId)
  ["trs_disposisi_surat", "dari_pengguna_id", "mst_pengguna", "id_pengguna"],
  ["trs_disposisi_surat", "kepada_pengguna_id", "mst_pengguna", "id_pengguna"],
  [
    "trs_disposisi_surat",
    "instruksi_disposisi_id",
    "mst_instruksi_disposisi",
    "instruksi_disposisi_id",
  ],
  [
    "trs_tracking_surat_masuk",
    "surat_masuk_id",
    "trs_surat_masuk",
    "surat_masuk_id",
    "CASCADE",
  ],
  [
    "trs_tracking_surat_masuk",
    "disposisi_surat_id",
    "trs_disposisi_surat",
    "disposisi_surat_id",
  ],
  // SUDAH DIPERBAIKI (sebelumnya mst_users dan UserId)
  ["trs_tracking_surat_masuk", "dari_pengguna_id", "mst_pengguna", "id_pengguna"],
  ["trs_tracking_surat_masuk", "kepada_pengguna_id", "mst_pengguna", "id_pengguna"],
];

const rowsFromRaw = (result) =>
  Array.isArray(result?.[0]) ? result[0] : (result.rows ?? result);

async function getAffectedForeignKeys(knex, tableNames) {
  const placeholders = tableNames.map(() => "?").join(", ");
  const result = await knex.raw(
    `SELECT k.TABLE_NAME AS table_name,
            k.COLUMN_NAME AS column_name,
            k.CONSTRAINT_NAME AS constraint_name,
            k.REFERENCED_TABLE_NAME AS referenced_table_name,
            k.REFERENCED_COLUMN_NAME AS referenced_column_name
       FROM information_schema.KEY_COLUMN_USAGE k
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.REFERENCED_TABLE_NAME IS NOT NULL
        AND (k.TABLE_NAME IN (${placeholders}) OR k.REFERENCED_TABLE_NAME IN (${placeholders}))
      ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`,
    [...tableNames, ...tableNames],
  );

  const columnIsRenamed = (tableName, columnName) => {
    const renamedTable = TABLE_RENAMES.find(
      ([oldName, newName]) => oldName === tableName || newName === tableName,
    );
    const finalTableName = renamedTable?.[1] ?? tableName;
    const columns = COLUMN_RENAMES[finalTableName] ?? [];

    return columns.some(
      ([oldName, newName]) => oldName === columnName || newName === columnName,
    );
  };

  const seen = new Set();
  return rowsFromRaw(result).filter((foreignKey) => {
    const isAffected =
      columnIsRenamed(foreignKey.table_name, foreignKey.column_name) ||
      columnIsRenamed(
        foreignKey.referenced_table_name,
        foreignKey.referenced_column_name,
      );
    const key = `${foreignKey.table_name}.${foreignKey.constraint_name}`;

    if (!isAffected || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function dropAffectedForeignKeys(knex) {
  const tableNames = [...new Set(TABLE_RENAMES.flat())];
  const foreignKeys = await getAffectedForeignKeys(knex, tableNames);

  for (const foreignKey of foreignKeys) {
    await knex.raw("ALTER TABLE ?? DROP FOREIGN KEY ??", [
      foreignKey.table_name,
      foreignKey.constraint_name,
    ]);
  }
}

async function renameTableIfNeeded(knex, oldName, newName) {
  const [oldExists, newExists] = await Promise.all([
    knex.schema.hasTable(oldName),
    knex.schema.hasTable(newName),
  ]);

  if (oldExists && !newExists) {
    await knex.schema.renameTable(oldName, newName);
  }
}

// SUDAH DIPERBAIKI: Menggunakan Raw Query untuk mencegah error Knex pada Auto_Increment
async function renameColumnIfNeeded(knex, tableName, oldName, newName) {
  if (!(await knex.schema.hasTable(tableName))) return;

  const [oldExists, newExists] = await Promise.all([
    knex.schema.hasColumn(tableName, oldName),
    knex.schema.hasColumn(tableName, newName),
  ]);

  if (oldExists && !newExists) {
    const result = await knex.raw("SHOW COLUMNS FROM ?? LIKE ?", [
      tableName,
      oldName,
    ]);
    const columns = rowsFromRaw(result);

    if (columns.length > 0) {
      const col = columns[0];
      
      const type = col.Type;
      const isNull = col.Null === "YES" ? "NULL" : "NOT NULL";
      
      let defaultVal = "";
      if (col.Default !== null) {
        if (col.Default.toUpperCase().includes("TIMESTAMP") || col.Default.includes("()")) {
          defaultVal = `DEFAULT ${col.Default}`;
        } else {
          defaultVal = `DEFAULT '${col.Default}'`;
        }
      } else if (col.Null === "YES") {
        defaultVal = "DEFAULT NULL";
      }

      const extra = col.Extra; 

      const query = `ALTER TABLE ?? CHANGE ?? ?? ${type} ${isNull} ${defaultVal} ${extra}`
        .trim()
        .replace(/\s+/g, " "); 

      await knex.raw(query, [tableName, oldName, newName]);
    }
  }
}

async function hasForeignKey(knex, tableName, columnName) {
  const result = await knex.raw(
    `SELECT 1
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
      LIMIT 1`,
    [tableName, columnName],
  );

  return rowsFromRaw(result).length > 0;
}

async function restoreForeignKeys(knex, definitions) {
  for (const [
    tableName,
    columnName,
    referencedTable,
    referencedColumn,
    onDelete,
  ] of definitions) {
    const objectsExist =
      (await knex.schema.hasTable(tableName)) &&
      (await knex.schema.hasTable(referencedTable)) &&
      (await knex.schema.hasColumn(tableName, columnName)) &&
      (await knex.schema.hasColumn(referencedTable, referencedColumn));

    if (objectsExist && !(await hasForeignKey(knex, tableName, columnName))) {
      await knex.schema.alterTable(tableName, (table) => {
        const foreign = table
          .foreign(columnName)
          .references(referencedColumn)
          .inTable(referencedTable);
        if (onDelete) foreign.onDelete(onDelete);
      });
    }
  }
}

async function runRenames(knex, tableRenames, columnRenames, foreignKeys) {
  await dropAffectedForeignKeys(knex);

  for (const [oldName, newName] of tableRenames) {
    await renameTableIfNeeded(knex, oldName, newName);
  }

  for (const [tableName, columns] of Object.entries(columnRenames)) {
    for (const [oldName, newName] of columns) {
      await renameColumnIfNeeded(knex, tableName, oldName, newName);
    }
  }

  await restoreForeignKeys(knex, foreignKeys);
}

export async function up(knex) {
  await runRenames(knex, TABLE_RENAMES, COLUMN_RENAMES, FOREIGN_KEYS);
}

export async function down(knex) {
  const reverseTableRenames = [...TABLE_RENAMES]
    .reverse()
    .map(([oldName, newName]) => [newName, oldName]);
  const reverseColumnRenames = Object.fromEntries(
    Object.entries(COLUMN_RENAMES).map(([tableName, columns]) => [
      tableName,
      [...columns].reverse().map(([oldName, newName]) => [newName, oldName]),
    ]),
  );
  const reverseForeignKeys = FOREIGN_KEYS.map(
    ([tableName, columnName, referencedTable, referencedColumn, onDelete]) => [
      TABLE_RENAMES.find(([, renamed]) => renamed === tableName)?.[0] ??
        tableName,
      COLUMN_RENAMES[tableName]?.find(
        ([, renamed]) => renamed === columnName,
      )?.[0] ?? columnName,
      TABLE_RENAMES.find(([, renamed]) => renamed === referencedTable)?.[0] ??
        referencedTable,
      COLUMN_RENAMES[referencedTable]?.find(
        ([, renamed]) => renamed === referencedColumn,
      )?.[0] ?? referencedColumn,
      onDelete,
    ],
  );

  await dropAffectedForeignKeys(knex);

  for (const [tableName, columns] of Object.entries(
    reverseColumnRenames,
  ).reverse()) {
    for (const [oldName, newName] of columns) {
      await renameColumnIfNeeded(knex, tableName, oldName, newName);
    }
  }

  for (const [oldName, newName] of reverseTableRenames) {
    await renameTableIfNeeded(knex, oldName, newName);
  }

  await restoreForeignKeys(knex, reverseForeignKeys);
}
