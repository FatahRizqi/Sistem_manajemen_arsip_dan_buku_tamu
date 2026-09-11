const ROMAN_MONTHS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const NUMBERING_TOKENS = ["{NOMOR_URUT}", "{KODE_JENIS_SURAT}", "{KODE_UNIT}", "{BULAN}", "{BULAN_ROMAWI}", "{TAHUN}", "{TAHUN_DUA_DIGIT}"];
export const PERIODE_RESET_OPTIONS = ["tidak_pernah", "tahunan", "bulanan"];
export const CAKUPAN_SEQUENCE_OPTIONS = ["global", "per_jenis_surat", "per_unit_kerja", "per_jenis_surat_unit_kerja"];
export const TAHAP_PENERBITAN_OPTIONS = ["saat_draft_dibuat", "setelah_approval_final", "saat_diterbitkan"];
export const validateNumberingFormat = formatNomor => {
  const format = String(formatNomor || "");
  if (!format.includes("{NOMOR_URUT}")) {
    return "Format nomor wajib memiliki token {NOMOR_URUT}";
  }
  const unsupportedTokens = [...format.matchAll(/\{[A-Z0-9_]+\}/g)].map(match => match[0]).filter(token => !NUMBERING_TOKENS.includes(token));
  if (unsupportedTokens.length > 0) {
    return `Token tidak didukung: ${unsupportedTokens.join(", ")}`;
  }
  return null;
};
const toDate = value => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const padSequence = (value, digit) => String(value).padStart(Number(digit) || 1, "0");
const getPeriodKey = (periodeReset, date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  if (periodeReset === "bulanan") return `${year}-${month}`;
  if (periodeReset === "tahunan") return String(year);
  return "global";
};
const getScopeKey = ({
  cakupanSequence,
  jenisSuratId,
  unitKerjaId
}) => {
  if (cakupanSequence === "per_jenis_surat_unit_kerja") {
    return `jenis:${jenisSuratId || "null"}|unit:${unitKerjaId || "null"}`;
  }
  if (cakupanSequence === "per_unit_kerja") {
    return `unit:${unitKerjaId || "null"}`;
  }
  if (cakupanSequence === "per_jenis_surat") {
    return `jenis:${jenisSuratId || "null"}`;
  }
  return "global";
};
export const getNumberingReferences = async (db, {
  jenisSuratId,
  unitKerjaId
}) => {
  const [jenisSurat, unitKerja] = await Promise.all([jenisSuratId ? db("mst_jenis_surat").where("jenis_surat_id", jenisSuratId).first() : null, unitKerjaId ? db("mst_unit_kerja").where("id_unit_kerja", unitKerjaId).first() : null]);
  return {
    jenisSurat,
    unitKerja
  };
};
export const renderNomorSurat = ({
  formatNomor,
  nomor,
  jumlahDigit,
  tanggalSurat,
  jenisSurat,
  unitKerja
}) => {
  const date = toDate(tanggalSurat);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const replacements = {
    "{NOMOR_URUT}": padSequence(nomor, jumlahDigit),
    "{KODE_JENIS_SURAT}": jenisSurat?.kode_jenis_surat || "",
    "{KODE_UNIT}": unitKerja?.kode_unit_kerja || "",
    "{BULAN}": String(month).padStart(2, "0"),
    "{BULAN_ROMAWI}": ROMAN_MONTHS[month],
    "{TAHUN}": String(year),
    "{TAHUN_DUA_DIGIT}": String(year).slice(-2)
  };
  return Object.entries(replacements).reduce((result, [token, value]) => result.replaceAll(token, value), String(formatNomor || ""));
};
export const previewNomorSurat = async (db, {
  format_nomor,
  jumlah_digit,
  nomor,
  jenis_surat_id,
  id_unit_kerja,
  tanggal_surat
}) => {
  const cFormatError = validateNumberingFormat(format_nomor);
  if (cFormatError) throw new Error(cFormatError);
  const {
    jenisSurat,
    unitKerja
  } = await getNumberingReferences(db, {
    jenisSuratId: jenis_surat_id,
    unitKerjaId: id_unit_kerja
  });
  return renderNomorSurat({
    formatNomor: format_nomor,
    nomor: nomor || 1,
    jumlahDigit: jumlah_digit || 3,
    tanggalSurat: tanggal_surat,
    jenisSurat,
    unitKerja
  });
};
export const getActiveNumberingConfig = async (db, jenisSuratId) => {
  return db("mst_penomoran_surat").where("jenis_surat_id", jenisSuratId).where("status_aktif", 1).orderBy("updated_at", "desc").first();
};
const getNextNumberPreview = async (db, {
  config,
  jenisSuratId,
  unitKerjaId,
  tanggalSurat
}) => {
  if (!config) return null;
  const date = toDate(tanggalSurat);
  const periodeKey = getPeriodKey(config.periode_reset, date);
  const cakupanKey = getScopeKey({
    cakupanSequence: config.cakupan_sequence,
    jenisSuratId,
    unitKerjaId
  });
  const sequence = await db("trx_sequence_penomoran_surat").where({
    id_penomoran_surat: config.id_penomoran_surat,
    periode_key: periodeKey,
    cakupan_key: cakupanKey
  }).first();
  return {
    nextNumber: Number(sequence?.nomor_terakhir ?? Number(config.nomor_awal || 1) - 1) + 1,
    date
  };
};
export const previewActiveNomorSurat = async (db, {
  jenisSuratId,
  unitKerjaId,
  tanggalSurat
}) => {
  const config = await getActiveNumberingConfig(db, jenisSuratId);
  if (!config) {
    throw new Error("Konfigurasi penomoran aktif belum tersedia");
  }
  const nextPreview = await getNextNumberPreview(db, {
    config,
    jenisSuratId,
    unitKerjaId,
    tanggalSurat
  });
  const {
    jenisSurat,
    unitKerja
  } = await getNumberingReferences(db, {
    jenisSuratId,
    unitKerjaId
  });
  return renderNomorSurat({
    formatNomor: config.format_nomor,
    nomor: nextPreview.nextNumber,
    jumlahDigit: config.jumlah_digit,
    tanggalSurat: nextPreview.date,
    jenisSurat,
    unitKerja
  });
};
export const generateNomorSurat = async (trx, {
  jenisSuratId,
  unitKerjaId,
  tanggalSurat
}) => {
  const config = await getActiveNumberingConfig(trx, jenisSuratId);
  if (!config) return null;
  const date = toDate(tanggalSurat);
  const periodeKey = getPeriodKey(config.periode_reset, date);
  const cakupanKey = getScopeKey({
    cakupanSequence: config.cakupan_sequence,
    jenisSuratId,
    unitKerjaId
  });
  let sequence = await trx("trx_sequence_penomoran_surat").where({
    id_penomoran_surat: config.id_penomoran_surat,
    periode_key: periodeKey,
    cakupan_key: cakupanKey
  }).forUpdate().first();
  if (!sequence) {
    try {
      await trx("trx_sequence_penomoran_surat").insert({
        id_penomoran_surat: config.id_penomoran_surat,
        jenis_surat_id: jenisSuratId || null,
        id_unit_kerja: unitKerjaId || null,
        bulan: config.periode_reset === "bulanan" ? date.getMonth() + 1 : null,
        tahun: ["bulanan", "tahunan"].includes(config.periode_reset) ? date.getFullYear() : null,
        periode_key: periodeKey,
        cakupan_key: cakupanKey,
        nomor_terakhir: Number(config.nomor_awal || 1) - 1,
        created_at: new Date(),
        updated_at: new Date()

      });
    } catch (error) {
      if (!["ER_DUP_ENTRY", "23505"].includes(error.code)) throw error;
    }
    sequence = await trx("trx_sequence_penomoran_surat").where({
      id_penomoran_surat: config.id_penomoran_surat,
      periode_key: periodeKey,
      cakupan_key: cakupanKey
    }).forUpdate().first();
  }
  const nextNumber = Number(sequence?.nomor_terakhir || 0) + 1;
  await trx("trx_sequence_penomoran_surat").where("id_sequence_penomoran_surat", sequence.id_sequence_penomoran_surat).update({
    nomor_terakhir: nextNumber,
    updated_at: new Date()

  });
  const {
    jenisSurat,
    unitKerja
  } = await getNumberingReferences(trx, {
    jenisSuratId,
    unitKerjaId
  });
  return renderNomorSurat({
    formatNomor: config.format_nomor,
    nomor: nextNumber,
    jumlahDigit: config.jumlah_digit,
    tanggalSurat,
    jenisSurat,
    unitKerja
  });
};
