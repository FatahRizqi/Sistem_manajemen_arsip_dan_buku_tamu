import { formatDateSystem, sanitizeString } from "./general.js";
import DB from "../../../../core/config/knex.js";
import Joi from "joi";
export const getLastKodeRegister = async (key, len) => {
  const kode = key.replace(/\s/g, "");
  let oRecord = await DB("nomor_faktur").where({
    kode: kode
  }).first();
  let id = 1;
  if (oRecord) {
    id = oRecord.id + 1;
  } else {
    await DB("nomor_faktur").insert({
      kode: kode,
      id: 0
    });
    oRecord = await DB("nomor_faktur").where({
      kode: kode
    }).first();
    if (oRecord) {
      id = oRecord.id + 1;
    }
  }
  const padded = String(id).padStart(len, "0");
  return padded;
};
export const getDescendantBranchIds = async (knex, startBranchId) => {
  if (!startBranchId) return [];
  const branchIds = [Number(startBranchId)];
  // Ambil hanya keturunan satu level ke bawah (immediate children)
  const children = await knex("mst_cabang")
    .select("id_cabang")
    .where("id_induk", Number(startBranchId))
    .whereNot("status", "deleted");
    
  if (children.length > 0) {
    const childIds = children.map(c => c.id_cabang);
    branchIds.push(...childIds);
  }
  
  return branchIds;
};
export const generateDailyVisitCode = async () => {
  const dNow = new Date();
  const pad = num => String(num).padStart(2, '0');
  const dd = pad(dNow.getDate());
  const mm = pad(dNow.getMonth() + 1);
  const yyyy = dNow.getFullYear();
  const cDatePart = `${dd}${mm}${yyyy}`;
  const cKey = `BT_${cDatePart}`;
  const cSeq = await DB.transaction(async trx => {
    let oRecord = await trx("nomor_faktur").where({
      kode: cKey
    }).first();
    let nextId = 1;
    if (oRecord) {
      nextId = oRecord.id + 1;
      await trx("nomor_faktur").where({
        kode: cKey
      }).update({
        id: nextId
      });
    } else {
      await trx("nomor_faktur").insert({
        kode: cKey,
        id: 1
      });
    }
    return String(nextId).padStart(4, "0");
  });
  return `${cDatePart}-${cSeq}`;
};
export const getLastFaktur = async (key, len) => {
  const cTgl = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const cTahunBulan = cTgl.slice(0, 6);
  const faktur = await getLastKodeRegister(key + cTahunBulan, len);
  const kode = key.replace(/\s/g, "") + cTgl;
  return kode + faktur;
};
export const setLastFaktur = async kode => {
  const cTgl = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const cTahunBulan = cTgl.slice(0, 6);
  const cFullKode = kode + cTahunBulan;
  const oRecord = await DB("nomor_faktur").where({
    kode: cFullKode
  }).first();
  if (oRecord) {
    await DB("nomor_faktur").where({
      kode: cFullKode
    }).update({
      id: oRecord.id + 1
    });
  } else {
    await DB("nomor_faktur").insert({
      kode: cFullKode,
      id: 1
    });
  }
};
export const setLastKodeRegister = async kode => {
  const vaData = await DB("nomor_faktur").select("kode", "id").where("kode", kode).first();
  if (vaData) {
    const nId = vaData.id + 1;
    await DB("nomor_faktur").where("kode", kode).update({
      id: nId
    });
  } else {
    const nId = 1;
    await DB("nomor_faktur").insert({
      kode: kode,
      id: nId
    });
  }
};
export const Logging = async (error = null, {
  file = "",
  func = "",
  request = "",
  response = "",
  user = ""
} = {}) => {
  let fileName = file;
  let functionName = func;
  let stack = "";
  let message = response;

  if (error) {
    const stackLines = (error.stack || "").split("\n");
    const callerLine = stackLines[1] || "";
    const match = callerLine.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) || callerLine.match(/at\s+(.*?):(\d+):(\d+)/);
    if (match) {
      functionName = functionName || match[1] || "";
      fileName = fileName || match[2] || match[1];
    }
    stack = error.stack;
    message = response || error.message;
  }
  await DB("log").insert({
    Tgl: formatDateSystem(),
    Controller: fileName || "",
    Function: functionName || "",
    Request: request || "",
    Response: message || "",
    Stack: stack || "",
    User: user || "",
    DateTime: formatDateSystem()
  });
};
export const validatePayload = async (oValidation, oMessage, oPayload, {
  uniqueField = [],
  table = "",
  excludedField = "",
  allowUnknown = false
} = {}) => {
  try {
    for (const k of Object.keys(oPayload)) {
      if (typeof oPayload[k] === "string") {
        const {
          dangerous
        } = sanitizeString(oPayload[k], {
          mode: "detect"
        });
        if (dangerous) {
          return `Field ${k} mengandung konten berbahaya`;
        }
      }
    }
    const oSchema = Joi.object(oValidation).messages(oMessage);
    await oSchema.validateAsync(oPayload, {
      abortEarly: true,
      allowUnknown
    });
    if (uniqueField.length > 0 && table) {
      const normalizedPayload = Object.fromEntries(Object.entries(oPayload).map(([k, v]) => [k.toLowerCase(), v]));
      for (const field of uniqueField) {
        const value = normalizedPayload[field.toLowerCase()];
        if (value !== undefined) {
          let query;
          if (typeof value === "number" || /^\d+$/.test(value)) {
            query = DB(table).where(field, value);
          } else {
            query = DB(table).whereILike(field, value);
          }
          if (excludedField) {
            query = query.andWhereNot(excludedField, normalizedPayload[excludedField.toLowerCase()]);
          }
          const exists = await query.first();
          if (exists) {
            return `Data dengan ${field} tersebut sudah digunakan`;
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.log(err);
    const rawMessage = err?.details?.[0]?.message || "Invalid payload";
    const cleanMessage = rawMessage.replace(/"/g, "");
    return cleanMessage;
  }
};
