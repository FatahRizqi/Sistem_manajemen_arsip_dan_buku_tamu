import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { formatDateSystem } from "../components/tools/general.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";

const getTableColumns = async (tableName) => {
  try {
    const [cols] = await DB.raw(`SHOW COLUMNS FROM \`${tableName}\``);
    return cols.map((col) => col.Field);
  } catch (error) {
    return [];
  }
};

const pickColumn = (columns, candidates) => {
  return candidates.find((column) => columns.includes(column)) || null;
};

/**
 * GET /dashboard/summary
 * Mengambil ringkasan data dashboard: metric cards, chart mingguan, dan audit log.
 */
const getDashboardSummary = async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const auditColumns = await getTableColumns("mst_riwayat_audit");
    const auditUserColumn = pickColumn(auditColumns, ["nama_pengguna", "username"]);
    const auditActionColumn = pickColumn(auditColumns, ["aksi", "action"]);
    if (!auditUserColumn || !auditActionColumn) {
      throw new Error("Kolom audit log tidak lengkap pada tabel mst_riwayat_audit");
    }

    // ── 1. Query semua metric secara paralel ──────────────────────────────────
    // Metric 1: Arsip Aktif
    const qArsipAktif = DB("trx_dokumen as d")
      .count("* as total")
      .where("d.status", "active")
      .first();
    applyMultiTenantFilter(qArsipAktif, req, 'd');

    // Metric 2: Tamu Berkunjung Hari Ini
    const qTamuHariIni = DB("trx_kunjungan as t")
      .leftJoin("mst_pengguna as u", "t.id_user_host", "u.id_pengguna")
      .count("* as total");
    if (startDate && endDate) {
      qTamuHariIni.whereRaw("DATE(t.created_at) >= ? AND DATE(t.created_at) <= ?", [startDate, endDate]);
    } else {
      qTamuHariIni.whereRaw("DATE(t.created_at) = CURDATE()");
    }
    qTamuHariIni.first();
    const fCabangTamu = req.headers['x-filter-cabang'];
    if (fCabangTamu && fCabangTamu !== 'null' && fCabangTamu !== 'undefined') {
      const bIds = String(fCabangTamu).split(',').map(Number);
      qTamuHariIni.whereIn(DB.raw('COALESCE(t.id_cabang, u.id_cabang)'), bIds);
    }

    const dispositionColumns = await getTableColumns("trx_disposisi_surat");
    const disposisiToUserCol = pickColumn(dispositionColumns, ["kepada_pengguna_id", "to_user_id", "to_id_pengguna"]) || "kepada_pengguna_id";

    // Metric 3: Surat Disposisi Menunggu Tindak Lanjut
    const qDisposisi = DB("trx_disposisi_surat as tld")
      .leftJoin("mst_pengguna as u", `tld.${disposisiToUserCol}`, "u.id_pengguna")
      .count("* as total")
      .where("tld.status", "baru");
    if (startDate && endDate) {
      qDisposisi.whereRaw("DATE(tld.created_at) >= ? AND DATE(tld.created_at) <= ?", [startDate, endDate]);
    }
    qDisposisi.first();
    applyMultiTenantFilter(qDisposisi, req, 'u');

    // Metric 4: Retensi Expired
    const qRetensi = DB("trx_dokumen as d")
      .join("mst_jadwal_retensi as rs", "d.kode_retensi", "rs.kode_retensi")
      .count("* as total")
      .where("d.status", "active")
      .whereRaw("DATE_ADD(d.created_at, INTERVAL rs.tahun_retensi YEAR) <= NOW()")
      .first();
    applyMultiTenantFilter(qRetensi, req, 'd');

    // Chart: Dokumen diunggah 7 hari terakhir (per hari)
    const qChart = DB("trx_dokumen as d")
      .select(DB.raw("DATE(d.created_at) as tanggal"), DB.raw("COUNT(*) as total"))
      .whereRaw("d.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)")
      .where("d.status", "active")
      .groupByRaw("DATE(d.created_at)")
      .orderByRaw("DATE(d.created_at) ASC");
    applyMultiTenantFilter(qChart, req, 'd');

    // Audit Log: 10 aktivitas terbaru
    const qAudit = DB("mst_riwayat_audit as a")
      .leftJoin("mst_pengguna as u", "a.nama_pengguna", "u.nama_pengguna")
      .select("a.id", "a.nama_pengguna as nama_pengguna", "a.aksi", "a.status", "a.created_at")
      .orderBy("a.created_at", "desc")
      .limit(10);
    applyMultiTenantFilter(qAudit, req, 'u');

    const [oArsipAktif, oTamuHariIni, oDisposisi, vaRetensi, vaChartRaw, vaAuditRaw] =
      await Promise.all([
        qArsipAktif,
        qTamuHariIni,
        qDisposisi,
        qRetensi,
        qChart,
        qAudit
      ]);

    // ── 2. Format angka metric ────────────────────────────────────────────────
    const nArsipAktif = Number(oArsipAktif?.total) || 0;
    const nTamuHariIni = Number(oTamuHariIni?.total) || 0;
    const nDisposisi = Number(oDisposisi?.total) || 0;
    const nRetensi = Number(vaRetensi?.total) || 0;

    // ── 3. Format chart data (7 hari terakhir, Sen-Min) ───────────────────────
    const vaNamaHari = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const vaLabels = [];
    const vaData = [];

    for (let i = 6; i >= 0; i--) {
      const dTarget = new Date();
      dTarget.setDate(dTarget.getDate() - i);

      const cTanggal = dTarget.toISOString().slice(0, 10); // YYYY-MM-DD
      const cHari = vaNamaHari[dTarget.getDay()];

      vaLabels.push(cHari);

      // Cari data di hasil query
      const oFound = vaChartRaw.find((oItem) => {
        const cItemDate =
          oItem.tanggal instanceof Date
            ? oItem.tanggal.toISOString().slice(0, 10)
            : String(oItem.tanggal).slice(0, 10);
        return cItemDate === cTanggal;
      });

      vaData.push(oFound ? Number(oFound.total) : 0);
    }

    // ── 4. Format audit logs dengan relative time ─────────────────────────────
    const vaColorPalette = [
      "#6366f1", "#10b981", "#0ea5e9", "#f59e0b",
      "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
    ];

    const _getConsistentColor = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return vaColorPalette[Math.abs(hash) % vaColorPalette.length];
    };

    const vaAuditLogs = vaAuditRaw.map((oLog) => {
      const cRelativeTime = _getRelativeTime(oLog.created_at);

      return {
        id: oLog.id,
        user: oLog.nama_pengguna,
        action: oLog.aksi,
        time: cRelativeTime,
        color: _getConsistentColor(oLog.nama_pengguna),
      };
    });

    // ── 5. Response ───────────────────────────────────────────────────────────
    const oResult = {
      status: "success",
      message: "Dashboard summary retrieved successfully",
      data: {
        summary: {
          arsipAktif: nArsipAktif,
          tamuHariIni: nTamuHariIni,
          menungguDisposisi: nDisposisi,
          retensiExpired: nRetensi,
        },
        chartMingguan: {
          labels: vaLabels,
          data: vaData,
        },
        auditLogs: vaAuditLogs,
      },
    };

    return res.status(200).json(oResult);
  } catch (error) {
    const oResult = {
      status: "error",
      message: "Failed to retrieve dashboard summary",
      error: error.message,
    };

    Logging(error, {
      file: "dashboard_summary.js",
      func: "getDashboardSummary",
      request: req.query,
      response: oResult,
      user: req?.context?.nama_pengguna || "system",
    });

    return res.status(500).json(oResult);
  }
};

/**
 * Helper: Konversi datetime ke relative time string (bahasa Indonesia)
 */
const _getRelativeTime = (dDate) => {
  if (!dDate) return "-";

  const dNow = new Date();
  const dInput = new Date(dDate);
  const nDiffMs = dNow - dInput;
  const nDiffSeconds = Math.floor(nDiffMs / 1000);
  const nDiffMinutes = Math.floor(nDiffSeconds / 60);
  const nDiffHours = Math.floor(nDiffMinutes / 60);
  const nDiffDays = Math.floor(nDiffHours / 24);

  if (nDiffSeconds < 60) return "Baru saja";
  if (nDiffMinutes < 60) return `${nDiffMinutes} menit yang lalu`;
  if (nDiffHours < 24) return `${nDiffHours} jam yang lalu`;
  if (nDiffDays < 7) return `${nDiffDays} hari yang lalu`;

  return dInput.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default getDashboardSummary;
