import express from "express";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/general.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";
import { Logging } from "../components/tools/servertool.js";
const router = express.Router();
router.post("/", async (req, res) => {
  const { startDate, endDate } = req.query.startDate ? req.query : req.body;
  try {
    let qTotal = DB("trx_kunjungan").leftJoin("mst_pengguna", "trx_kunjungan.id_user_host", "mst_pengguna.id_pengguna").modify((qb) => {if (startDate && endDate) {qb.whereRaw("DATE(trx_kunjungan.created_at) >= ? AND DATE(trx_kunjungan.created_at) <= ?", [startDate, endDate]);} else {qb.whereRaw("DATE(trx_kunjungan.created_at) = CURRENT_DATE()");}}).count("trx_kunjungan.id_kunjungan as total");
    applyMultiTenantFilter(qTotal, req, 'trx_kunjungan', 'mst_pengguna');
    const totalTamuHariIni = await qTotal.first();
    let qSedang = DB("trx_kunjungan").leftJoin("mst_pengguna", "trx_kunjungan.id_user_host", "mst_pengguna.id_pengguna").modify((qb) => {if (startDate && endDate) {qb.whereRaw("DATE(trx_kunjungan.created_at) >= ? AND DATE(trx_kunjungan.created_at) <= ?", [startDate, endDate]);} else {qb.whereRaw("DATE(trx_kunjungan.created_at) = CURRENT_DATE()");}}).andWhere("trx_kunjungan.status", "in").count("trx_kunjungan.id_kunjungan as total");
    applyMultiTenantFilter(qSedang, req, 'trx_kunjungan', 'mst_pengguna');
    const sedangBerkunjung = await qSedang.first();
    let qSelesai = DB("trx_kunjungan").leftJoin("mst_pengguna", "trx_kunjungan.id_user_host", "mst_pengguna.id_pengguna").modify((qb) => {if (startDate && endDate) {qb.whereRaw("DATE(trx_kunjungan.created_at) >= ? AND DATE(trx_kunjungan.created_at) <= ?", [startDate, endDate]);} else {qb.whereRaw("DATE(trx_kunjungan.created_at) = CURRENT_DATE()");}}).andWhere("trx_kunjungan.status", "out").count("trx_kunjungan.id_kunjungan as total");
    applyMultiTenantFilter(qSelesai, req, 'trx_kunjungan', 'mst_pengguna');
    const selesaiKunjungan = await qSelesai.first();
    const timeRange = req.body.time_range || 'this_week';
    
    let qRute = DB("trx_kunjungan as t")
      .leftJoin("mst_pengguna", "t.id_user_host", "mst_pengguna.id_pengguna")
      .join("mst_tujuan_kunjungan as m", "t.id_tujuan_kunjungan", "m.id_tujuan_kunjungan")
      .select("m.nama_tujuan_kunjungan")
      .count("t.id_kunjungan as total")
      .groupBy("m.nama_tujuan_kunjungan");

    if (timeRange === 'this_week' || timeRange === 'last_week') {
      const offset = timeRange === 'last_week' ? 1 : 0;
      qRute = qRute.whereRaw(`YEARWEEK(t.created_at, 1) = YEARWEEK(CURRENT_DATE() - INTERVAL ${offset} WEEK, 1)`);
    } else if (timeRange === 'this_month') {
      qRute = qRute.whereRaw("YEAR(t.created_at) = YEAR(CURRENT_DATE()) AND MONTH(t.created_at) = MONTH(CURRENT_DATE())");
    } else if (timeRange === 'this_year') {
      qRute = qRute.whereRaw("YEAR(t.created_at) = YEAR(CURRENT_DATE())");
    } else {
      qRute = qRute.whereRaw("DATE(t.created_at) = CURRENT_DATE()");
    }

    applyMultiTenantFilter(qRute, req, 't', 'mst_pengguna');
    const ruteTujuan = await qRute;
    const chart_tujuan_labels = ruteTujuan.map(item => item.nama_tujuan_kunjungan);
    const chart_tujuan_data = ruteTujuan.map(item => parseInt(item.total, 10));
    let chart_trend_labels = [];
    let chart_trend_data = [];

    let qTrend = DB("trx_kunjungan as t").leftJoin("mst_pengguna", "t.id_user_host", "mst_pengguna.id_pengguna");
    applyMultiTenantFilter(qTrend, req, 't', 'mst_pengguna');

    if (timeRange === 'this_week' || timeRange === 'last_week') {
      chart_trend_labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      chart_trend_data = [0, 0, 0, 0, 0, 0, 0];
      const offset = timeRange === 'last_week' ? 1 : 0;
      
      qTrend = qTrend.select(DB.raw("WEEKDAY(t.created_at) as idx, COUNT(t.id_kunjungan) as total"))
        .whereRaw(`YEARWEEK(t.created_at, 1) = YEARWEEK(CURRENT_DATE() - INTERVAL ${offset} WEEK, 1)`)
        .groupByRaw("WEEKDAY(t.created_at)");

      const resTrend = await qTrend;
      resTrend.forEach(row => {
        const idx = parseInt(row.idx, 10);
        if (idx >= 0 && idx < 7) chart_trend_data[idx] = parseInt(row.total, 10);
      });
    } else if (timeRange === 'this_month') {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        chart_trend_labels.push(i.toString());
        chart_trend_data.push(0);
      }
      qTrend = qTrend.select(DB.raw("DAY(t.created_at) as idx, COUNT(t.id_kunjungan) as total"))
        .whereRaw("YEAR(t.created_at) = YEAR(CURRENT_DATE()) AND MONTH(t.created_at) = MONTH(CURRENT_DATE())")
        .groupByRaw("DAY(t.created_at)");

      const resTrend = await qTrend;
      resTrend.forEach(row => {
        const idx = parseInt(row.idx, 10);
        if (idx >= 1 && idx <= daysInMonth) chart_trend_data[idx - 1] = parseInt(row.total, 10);
      });
    } else if (timeRange === 'this_year') {
      chart_trend_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      chart_trend_data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      qTrend = qTrend.select(DB.raw("MONTH(t.created_at) as idx, COUNT(t.id_kunjungan) as total"))
        .whereRaw("YEAR(t.created_at) = YEAR(CURRENT_DATE())")
        .groupByRaw("MONTH(t.created_at)");

      const resTrend = await qTrend;
      resTrend.forEach(row => {
        const idx = parseInt(row.idx, 10);
        if (idx >= 1 && idx <= 12) chart_trend_data[idx - 1] = parseInt(row.total, 10);
      });
    }

    const oDashboardStats = {
      total_tamu_hari_ini: parseInt(totalTamuHariIni?.total || 0, 10),
      sedang_berkunjung: parseInt(sedangBerkunjung?.total || 0, 10),
      selesai_kunjungan: parseInt(selesaiKunjungan?.total || 0, 10),
      chart_mingguan: chart_trend_data, // Backwards compatibility
      chart_trend_labels: chart_trend_labels,
      chart_trend_data: chart_trend_data,
      chart_tujuan_labels: chart_tujuan_labels,
      chart_tujuan_data: chart_tujuan_data
    };
    return res.status(200).json({
      status: "00",
      message: "Berhasil memuat statistik monitoring buku tamu",
      data: oDashboardStats,
      datetime: formatDateSystem()
    });
  } catch (error) {
    const oResult = {
      status: "01",
      message: "Sistem error saat memuat data statistik",
      datetime: formatDateSystem()
    };
    Logging(error, {
      file: "visit_monitoring.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
});
export default router;
