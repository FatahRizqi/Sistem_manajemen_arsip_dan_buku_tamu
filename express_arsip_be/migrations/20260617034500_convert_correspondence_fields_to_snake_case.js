const hasTable = (knex, tableName) => knex.schema.hasTable(tableName);

const hasColumn = async (knex, tableName, columnName) => {
  if (!(await hasTable(knex, tableName))) {
    return false;
  }

  return knex.schema.hasColumn(tableName, columnName);
};

const dropForeignIfExists = async (knex, tableName, columnName) => {
  if (!(await hasColumn(knex, tableName, columnName))) {
    return;
  }

  try {
    await knex.schema.table(tableName, (table) => {
      table.dropForeign([columnName]);
    });
  } catch {
    // The table may already have snake_case constraints on fresh databases.
  }
};

const renameIfExists = async (knex, tableName, oldName, newName) => {
  if (
    (await hasColumn(knex, tableName, oldName)) &&
    !(await hasColumn(knex, tableName, newName))
  ) {
    await knex.schema.table(tableName, (table) => {
      table.renameColumn(oldName, newName);
    });
  }
};

const renameDateTimeIfExists = async (knex, tableName, oldName, newName) => {
  if (
    (await hasColumn(knex, tableName, oldName)) &&
    !(await hasColumn(knex, tableName, newName))
  ) {
    await knex.raw("ALTER TABLE ?? CHANGE ?? ?? DATETIME NOT NULL", [
      tableName,
      oldName,
      newName,
    ]);
  }
};

export async function up(knex) {
  const convertedIncomingLetters = await hasColumn(
    knex,
    "trx_incoming_letters",
    "LetterTypeId",
  );
  const convertedLetterDispositions = await hasColumn(
    knex,
    "trx_letter_dispositions",
    "IncomingLetterId",
  );
  const convertedIncomingLetterFiles = await hasColumn(
    knex,
    "trx_incoming_letter_files",
    "IncomingLetterId",
  );
  const convertedIncomingLetterTrackings = await hasColumn(
    knex,
    "trx_incoming_letter_trackings",
    "IncomingLetterId",
  );

  await dropForeignIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "IncomingLetterId",
  );
  await dropForeignIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "DisIdJabatan",
  );
  await dropForeignIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "FromNamaPengguna",
  );
  await dropForeignIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "ToNamaPengguna",
  );
  await dropForeignIfExists(knex, "trx_incoming_letter_trackings", "CreatedBy");

  await dropForeignIfExists(
    knex,
    "trx_incoming_letter_files",
    "IncomingLetterId",
  );
  await dropForeignIfExists(knex, "trx_incoming_letter_files", "UploadedBy");

  await dropForeignIfExists(
    knex,
    "trx_letter_dispositions",
    "IncomingLetterId",
  );
  await dropForeignIfExists(
    knex,
    "trx_letter_dispositions",
    "ParentDisIdJabatan",
  );
  await dropForeignIfExists(
    knex,
    "trx_letter_dispositions",
    "FromNamaPengguna",
  );
  await dropForeignIfExists(knex, "trx_letter_dispositions", "ToNamaPengguna");
  await dropForeignIfExists(
    knex,
    "trx_letter_dispositions",
    "DispositionInstructionId",
  );
  await dropForeignIfExists(knex, "trx_letter_dispositions", "CreatedBy");
  await dropForeignIfExists(knex, "trx_letter_dispositions", "UpdatedBy");

  await dropForeignIfExists(knex, "trx_incoming_letters", "LetterTypeId");
  await dropForeignIfExists(knex, "trx_incoming_letters", "DocumentTypeId");
  await dropForeignIfExists(
    knex,
    "trx_incoming_letters",
    "ArchiveClassificationId",
  );
  await dropForeignIfExists(
    knex,
    "trx_incoming_letters",
    "ConfidentialityLevelId",
  );
  await dropForeignIfExists(knex, "trx_incoming_letters", "CreatedBy");
  await dropForeignIfExists(knex, "trx_incoming_letters", "UpdatedBy");

  await renameIfExists(
    knex,
    "mst_letter_types",
    "LetterTypeId",
    "letter_type_id",
  );
  await renameIfExists(
    knex,
    "mst_letter_types",
    "LetterTypeCode",
    "letter_type_code",
  );
  await renameIfExists(
    knex,
    "mst_letter_types",
    "LetterTypeName",
    "letter_type_name",
  );
  await renameIfExists(knex, "mst_letter_types", "Direction", "direction");
  await renameIfExists(knex, "mst_letter_types", "deskripsi", "deskripsi");
  await renameIfExists(knex, "mst_letter_types", "Status", "status");
  await renameDateTimeIfExists(
    knex,
    "mst_letter_types",
    "CreatedAt",
    "created_at",
  );
  await renameDateTimeIfExists(
    knex,
    "mst_letter_types",
    "UpdatedAt",
    "updated_at",
  );

  await renameIfExists(
    knex,
    "mst_disposition_instructions",
    "DispositionInstructionId",
    "disposition_instruction_id",
  );
  await renameIfExists(
    knex,
    "mst_disposition_instructions",
    "InstructionCode",
    "instruction_code",
  );
  await renameIfExists(
    knex,
    "mst_disposition_instructions",
    "InstructionName",
    "instruction_name",
  );
  await renameIfExists(
    knex,
    "mst_disposition_instructions",
    "deskripsi",
    "deskripsi",
  );
  await renameIfExists(
    knex,
    "mst_disposition_instructions",
    "Status",
    "status",
  );
  await renameDateTimeIfExists(
    knex,
    "mst_disposition_instructions",
    "CreatedAt",
    "created_at",
  );
  await renameDateTimeIfExists(
    knex,
    "mst_disposition_instructions",
    "UpdatedAt",
    "updated_at",
  );

  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "IncomingLetterId",
    "incoming_letter_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "AgendaNumber",
    "agenda_number",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "LetterNumber",
    "letter_number",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "LetterDate",
    "letter_date",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "ReceivedDate",
    "received_date",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "SenderName",
    "sender_name",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "SenderInstitution",
    "sender_institution",
  );
  await renameIfExists(knex, "trx_incoming_letters", "Subject", "subject");
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "Attachmentdeskripsi",
    "attachment_deskripsi",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "LetterTypeId",
    "letter_type_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "DocumentTypeId",
    "document_type_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "ArchiveClassificationId",
    "archive_classification_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letters",
    "ConfidentialityLevelId",
    "confidentiality_level_id",
  );
  await renameIfExists(knex, "trx_incoming_letters", "Status", "status");
  await renameIfExists(knex, "trx_incoming_letters", "CreatedBy", "created_by");
  await renameIfExists(knex, "trx_incoming_letters", "UpdatedBy", "updated_by");
  await renameDateTimeIfExists(
    knex,
    "trx_incoming_letters",
    "CreatedAt",
    "created_at",
  );
  await renameDateTimeIfExists(
    knex,
    "trx_incoming_letters",
    "UpdatedAt",
    "updated_at",
  );

  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "IncomingLetterFileId",
    "incoming_letter_file_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "IncomingLetterId",
    "incoming_letter_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "FilePath",
    "file_path",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "FileName",
    "file_name",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "FileMimeType",
    "file_mime_type",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "FileSize",
    "file_size",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_files",
    "UploadedBy",
    "uploaded_by",
  );
  await renameIfExists(knex, "trx_incoming_letter_files", "Status", "status");
  await renameDateTimeIfExists(
    knex,
    "trx_incoming_letter_files",
    "CreatedAt",
    "created_at",
  );
  await renameDateTimeIfExists(
    knex,
    "trx_incoming_letter_files",
    "UpdatedAt",
    "updated_at",
  );

  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "DisIdJabatan",
    "disid_jabatan",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "IncomingLetterId",
    "incoming_letter_id",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "ParentDisIdJabatan",
    "parent_disid_jabatan",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "FromNamaPengguna",
    "from_nama_pengguna",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "ToNamaPengguna",
    "to_nama_pengguna",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "DispositionInstructionId",
    "disposition_instruction_id",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "Instruction",
    "instruction",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "DispositionNote",
    "disposition_note",
  );
  await renameIfExists(knex, "trx_letter_dispositions", "DueDate", "due_date");
  await renameIfExists(knex, "trx_letter_dispositions", "Status", "status");
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "ReceivedAt",
    "received_at",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "ProcessedAt",
    "processed_at",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "CompletedAt",
    "completed_at",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "CreatedBy",
    "created_by",
  );
  await renameIfExists(
    knex,
    "trx_letter_dispositions",
    "UpdatedBy",
    "updated_by",
  );
  await renameDateTimeIfExists(
    knex,
    "trx_letter_dispositions",
    "CreatedAt",
    "created_at",
  );
  await renameDateTimeIfExists(
    knex,
    "trx_letter_dispositions",
    "UpdatedAt",
    "updated_at",
  );

  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "IncomingLetterTrackingId",
    "incoming_letter_tracking_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "IncomingLetterId",
    "incoming_letter_id",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "DisIdJabatan",
    "disid_jabatan",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "ActionName",
    "action_name",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "FromNamaPengguna",
    "from_nama_pengguna",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "ToNamaPengguna",
    "to_nama_pengguna",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "PreviousStatus",
    "previous_status",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "CurrentStatus",
    "current_status",
  );
  await renameIfExists(knex, "trx_incoming_letter_trackings", "Notes", "notes");
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "ProcessedAt",
    "processed_at",
  );
  await renameIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "CreatedBy",
    "created_by",
  );
  await renameDateTimeIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "CreatedAt",
    "created_at",
  );
  await renameDateTimeIfExists(
    knex,
    "trx_incoming_letter_trackings",
    "UpdatedAt",
    "updated_at",
  );

  if (convertedIncomingLetters) {
    await knex.schema.table("trx_incoming_letters", (table) => {
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
  }

  if (convertedLetterDispositions) {
    await knex.schema.table("trx_letter_dispositions", (table) => {
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

  if (convertedIncomingLetterFiles) {
    await knex.schema.table("trx_incoming_letter_files", (table) => {
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

  if (convertedIncomingLetterTrackings) {
    await knex.schema.table("trx_incoming_letter_trackings", (table) => {
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
}

export async function down() {}
