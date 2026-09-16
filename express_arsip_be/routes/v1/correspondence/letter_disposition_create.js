import express from "express";
import Joi from "joi";
import DB from "../../../core/config/knex.js";
import { validatePayload, Logging } from "../components/tools/servertool.js";
import { sendWhatsAppMessage } from "../../../core/components/tools/wa_helper.js";
import { formatDateSystem, status } from "../components/tools/general.js";
import { createNotification } from "../components/tools/notification_helper.js";

const router = express.Router();
const rowsFromRaw = (result) =>
  Array.isArray(result?.[0]) ? result[0] : result?.rows || result || [];
const getExistingTable = async (candidates) => {
  for (const tableName of candidates) {
    if (await DB.schema.hasTable(tableName)) return tableName;
  }
  return null;
};
const getColumns = async (tableName) => {
  if (!tableName) return [];
  const result = await DB.raw("SHOW COLUMNS FROM ??", [tableName]);
  return rowsFromRaw(result).map((column) => column.Field);
};
const pickColumn = (columns, candidates) =>
  candidates.find((columnName) => columns.includes(columnName)) || null;

const assignIfColumnExists = (target, columns, columnName, value) => {
  if (columnName && columns.includes(columnName)) target[columnName] = value;
};

const letterDispositionCreate = async (req, res) => {
  const cFile = "letter_disposition_create.js";
  const cFunc = "letterDispositionCreate";
  const oPayload = req.body || {};

  try {
    const oValidation = {
      surat_masuk_id: Joi.number().required(),
      disposisi_induk_id: Joi.number().allow(null).optional(),
      dari_pengguna_id: Joi.number().allow(null).optional(),
      kepada_pengguna_id: Joi.number().required(),
      instruksi_disposisi_id: Joi.number().allow(null).optional(),
      instruksi: Joi.string().allow(null, "").optional(),
      catatan_disposisi: Joi.string().allow(null, "").optional(),
      batas_waktu: Joi.date().allow(null).optional(),
      created_by: Joi.number().allow(null).optional(),
      updated_by: Joi.number().allow(null).optional(),
    };

    const oMessage = {
      "surat_masuk_id.required": "surat_masuk_id wajib diisi",
      "surat_masuk_id.number": "surat_masuk_id harus berupa angka",
      "kepada_pengguna_id.required": "kepada_pengguna_id wajib diisi",
      "kepada_pengguna_id.number": "kepada_pengguna_id harus berupa angka",
    };

    const cValidate = await validatePayload(oValidation, oMessage, oPayload, {
      allowUnknown: false,
    });

    if (cValidate) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: cValidate,
      });
    }

    const dispositionTable = await getExistingTable([
      "trx_disposisi_surat",
      "trx_incoming_letter_dispositions",
    ]);
    const letterTable = await getExistingTable([
      "trx_surat_masuk",
      "trx_incoming_letters",
    ]);
    const trackingTable = await getExistingTable([
      "trx_tracking_surat_masuk",
      "trx_incoming_letter_trackings",
    ]);

    if (!dispositionTable || !letterTable) {
      return res.status(500).json({
        status: status.BAD_REQUEST,
        message: "Tabel disposisi / surat masuk tidak ditemukan",
      });
    }

    const dispositionColumns = await getColumns(dispositionTable);
    const letterColumns = await getColumns(letterTable);
    const trackingColumns = await getColumns(trackingTable);

    const letterIdColumn = pickColumn(letterColumns, [
      "surat_masuk_id",
      "incoming_letter_id",
    ]);
    const letterStatusColumn = pickColumn(letterColumns, [
      "status",
      "status_surat",
    ]);
    const dispositionLetterIdColumn = pickColumn(dispositionColumns, [
      "surat_masuk_id",
      "incoming_letter_id",
    ]);
    const parentColumn = pickColumn(dispositionColumns, [
      "disposisi_induk_id",
      "parent_id",
    ]);
    const fromUserColumn = pickColumn(dispositionColumns, [
      "dari_pengguna_id",
      "from_id_pengguna",
      "from_user_id",
    ]);
    const toUserColumn = pickColumn(dispositionColumns, [
      "kepada_pengguna_id",
      "to_id_pengguna",
      "to_user_id",
    ]);
    const instructionIdColumn = pickColumn(dispositionColumns, [
      "instruksi_disposisi_id",
      "disposition_instruction_id",
    ]);
    const instructionColumn = pickColumn(dispositionColumns, [
      "instruksi",
      "instruction",
    ]);
    const noteColumn = pickColumn(dispositionColumns, [
      "catatan_disposisi",
      "catatan",
      "notes",
    ]);
    const dueDateColumn = pickColumn(dispositionColumns, [
      "batas_waktu",
      "due_date",
    ]);

    const oLetter = await DB(letterTable)
      .where(letterIdColumn, oPayload.surat_masuk_id)
      .first();

    if (!oLetter) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Surat masuk tidak ditemukan",
      });
    }

    const oReceiver = await DB("mst_pengguna")
      .where("id_pengguna", oPayload.kepada_pengguna_id)
      .first();

    if (!oReceiver) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Pengguna penerima disposisi tidak ditemukan",
      });
    }

    if (oPayload.dari_pengguna_id) {
      const oSender = await DB("mst_pengguna")
        .where("id_pengguna", oPayload.dari_pengguna_id)
        .first();

      if (!oSender) {
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: "Pengguna pengirim disposisi tidak ditemukan",
        });
      }
    }

    if (oPayload.instruksi_disposisi_id && instructionIdColumn) {
      const oInstruction = await DB("mst_instruksi_disposisi")
        .where("instruksi_disposisi_id", oPayload.instruksi_disposisi_id)
        .first();

      if (!oInstruction) {
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: "Instruksi disposisi tidak ditemukan",
        });
      }
    }

    if (oPayload.disposisi_induk_id && parentColumn) {
      const oParent = await DB(dispositionTable)
        .where("disposisi_surat_id", oPayload.disposisi_induk_id)
        .where(dispositionLetterIdColumn, oPayload.surat_masuk_id)
        .first();

      if (!oParent) {
        return res.status(404).json({
          status: status.BAD_REQUEST,
          message: "Parent disposisi tidak ditemukan pada surat ini",
        });
      }
    }

    const dNow = new Date();
    const nDispositionId = await DB.transaction(async (trx) => {
      const dispositionPayload = {};
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        dispositionLetterIdColumn,
        oPayload.surat_masuk_id
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        parentColumn,
        oPayload.disposisi_induk_id || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        fromUserColumn,
        oPayload.dari_pengguna_id || req?.auth?.id_pengguna || req?.context?.id_pengguna || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        toUserColumn,
        oPayload.kepada_pengguna_id
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        instructionIdColumn,
        oPayload.instruksi_disposisi_id || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        instructionColumn,
        oPayload.instruksi || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        noteColumn,
        oPayload.catatan_disposisi || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        dueDateColumn,
        oPayload.batas_waktu || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "status",
        "baru"
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "received_at",
        null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "processed_at",
        null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "completed_at",
        null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "created_by",
        oPayload.created_by || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "updated_by",
        oPayload.updated_by || null
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "created_at",
        dNow
      );
      assignIfColumnExists(
        dispositionPayload,
        dispositionColumns,
        "updated_at",
        dNow
      );

      const vaInserted = await trx(dispositionTable).insert(
        dispositionPayload
      );
      const nId = vaInserted[0];

      const letterUpdatePayload = {};
      assignIfColumnExists(
        letterUpdatePayload,
        letterColumns,
        letterStatusColumn,
        "didisposisi"
      );
      assignIfColumnExists(
        letterUpdatePayload,
        letterColumns,
        "updated_by",
        oPayload.updated_by || oPayload.created_by || null
      );
      assignIfColumnExists(
        letterUpdatePayload,
        letterColumns,
        "updated_at",
        dNow
      );

      if (Object.keys(letterUpdatePayload).length) {
        await trx(letterTable)
          .where(letterIdColumn, oPayload.surat_masuk_id)
          .update(letterUpdatePayload);
      }

      if (trackingTable) {
        const trackingPayload = {};
        const trackingLetterIdColumn = pickColumn(trackingColumns, [
          "surat_masuk_id",
          "incoming_letter_id",
        ]);
        const trackingDispositionIdColumn = pickColumn(trackingColumns, [
          "disposisi_surat_id",
          "disposisi_id",
          "disid_jabatan",
        ]);
        const trackingActionColumn = pickColumn(trackingColumns, [
          "nama_aksi",
          "action_name",
        ]);
        const trackingFromColumn = pickColumn(trackingColumns, [
          "dari_pengguna_id",
          "from_id_pengguna",
          "from_nama_pengguna",
        ]);
        const trackingToColumn = pickColumn(trackingColumns, [
          "kepada_pengguna_id",
          "to_id_pengguna",
          "to_nama_pengguna",
        ]);
        const previousStatusColumn = pickColumn(trackingColumns, [
          "status_sebelumnya",
          "previous_status",
        ]);
        const currentStatusColumn = pickColumn(trackingColumns, [
          "status_saat_ini",
          "current_status",
        ]);
        const trackingNoteColumn = pickColumn(trackingColumns, [
          "catatan",
          "notes",
        ]);

        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          trackingLetterIdColumn,
          oPayload.surat_masuk_id
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          trackingDispositionIdColumn,
          nId
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          trackingActionColumn,
          "surat_didisposisi"
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          trackingFromColumn,
          oPayload.dari_pengguna_id || req?.auth?.id_pengguna || req?.context?.id_pengguna || null
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          trackingToColumn,
          oPayload.kepada_pengguna_id
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          previousStatusColumn,
          oLetter[letterStatusColumn]
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          currentStatusColumn,
          "didisposisi"
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          trackingNoteColumn,
          oPayload.catatan_disposisi ||
            oPayload.instruksi ||
            "Surat didisposisikan"
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          "processed_at",
          dNow
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          "created_by",
          oPayload.created_by || null
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          "created_at",
          dNow
        );
        assignIfColumnExists(
          trackingPayload,
          trackingColumns,
          "updated_at",
          dNow
        );

        await trx(trackingTable).insert(trackingPayload);
      }
      return nId;
    });

    // Kirim notifikasi secara asynchronous
    try {
      const oPenerima = await DB("mst_pengguna")
        .select("nama_lengkap", "telepon")
        .where("id_pengguna", oPayload.kepada_pengguna_id)
        .first();

      await createNotification({
        id_pengguna: oPayload.kepada_pengguna_id,
        judul: "Disposisi Surat Baru",
        pesan: `Anda menerima disposisi untuk surat: ${oLetter?.perihal || "-"}`,
        tipe: "disposisi",
        tautan: "/correspondence/mail_in/disposition",
      });

      // === Notifikasi ke Superadmin ===
      const superadmins = await DB("mst_pengguna as p")
        .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
        .join("mst_peran as r", "pp.id_peran", "r.id_peran")
        .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
        .andWhere("p.status", "active")
        .select("p.id_pengguna");

      for (const sa of superadmins) {
        if (sa.id_pengguna !== Number(oPayload.kepada_pengguna_id)) {
          await createNotification({
            id_pengguna: sa.id_pengguna,
            judul: "Disposisi Surat Baru",
            pesan: `Disposisi surat ke ${oPenerima?.nama_lengkap || "Staf"}: ${oLetter?.perihal || "-"}`,
            tipe: "disposisi",
            tautan: "/correspondence/mail_in/disposition",
          });
        }
      }

      const targetPhone = oPenerima?.telepon || oPenerima?.no_hp;
      if (oPenerima && targetPhone) {
        const surat = await DB(letterTable)
          .select("nomor_surat", "perihal")
          .where(letterIdColumn, oPayload.surat_masuk_id)
          .first();

        const waPesan = `Halo Bpk/Ibu ${oPenerima.nama_lengkap},

Anda mendapat lembar *Disposisi Baru* untuk ditindaklanjuti pada ${formatDateSystem()}.

Detail Disposisi:
- Nomor Surat: *${surat?.nomor_surat || "-"}*
- Perihal: *${surat?.perihal || "-"}*
- Instruksi Pimpinan: ${oPayload.instruksi || oPayload.catatan_disposisi || "-"}

Silakan buka sistem Arsip Digital Anda untuk melihat lampiran fisik surat dan menindaklanjuti disposisi ini. Terima kasih.`;

        sendWhatsAppMessage(targetPhone, waPesan);
      }
    } catch (waErr) {
      console.error("Gagal mengirim notifikasi disposisi:", waErr.message);
    }

    return res.status(201).json({
      status: status.SUKSES,
      message: "Disposisi surat berhasil dibuat",
      data: {
        disposisi_surat_id: nDispositionId,
        disposisi_id: nDispositionId,
        disid_jabatan: nDispositionId,
      },
    });
  } catch (error) {

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Disposisi surat gagal dibuat",
      error: error.message,
    };
    Logging(error, {
      file: cFile,
      func: cFunc,
      request: req.body || {},
      response: oResult,
      user: "",
    });
    return res.status(500).json(oResult);
  }
};

router.post("/", letterDispositionCreate);
export default router;
