import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { applyMultiTenantFilter } from "../components/tools/filter_helper.js";
import { status, datetime } from "../components/tools/general.js";

const router = express.Router();

const outgoingLetterDashboardStats = async (req, res) => {
  const cFile = "outgoing_letter_dashboard.js";
  const cFunc = "outgoingLetterDashboardStats";

  try {
    const qTerkirim = DB("trx_surat_keluar as tsk")
      .leftJoin("mst_pengguna as u", "tsk.created_by", "u.id_pengguna")
      .count("* as total").whereIn("tsk.status", ["terkirim", "selesai"]);
    if (startDate && endDate) {
      qTerkirim.whereRaw("DATE(tsk.created_at) >= ? AND DATE(tsk.created_at) <= ?", [startDate, endDate]);
    }
    qTerkirim.first();
    applyMultiTenantFilter(qTerkirim, req, 'u');

    const qDisetujui = DB("trx_surat_keluar as tsk")
      .leftJoin("mst_pengguna as u", "tsk.created_by", "u.id_pengguna")
      .count("* as total").where("tsk.status", "disetujui");
    if (startDate && endDate) {
      qDisetujui.whereRaw("DATE(tsk.created_at) >= ? AND DATE(tsk.created_at) <= ?", [startDate, endDate]);
    }
    qDisetujui.first();
    applyMultiTenantFilter(qDisetujui, req, 'u');

    const qDitolak = DB("trx_surat_keluar as tsk")
      .leftJoin("mst_pengguna as u", "tsk.created_by", "u.id_pengguna")
      .count("* as total").where("tsk.status", "ditolak");
    if (startDate && endDate) {
      qDitolak.whereRaw("DATE(tsk.created_at) >= ? AND DATE(tsk.created_at) <= ?", [startDate, endDate]);
    }
    qDitolak.first();
    applyMultiTenantFilter(qDitolak, req, 'u');

    const qMenunggu = DB("trx_surat_keluar as tsk")
      .leftJoin("mst_pengguna as u", "tsk.created_by", "u.id_pengguna")
      .count("* as total").where("tsk.status", "menunggu_approval");
    if (startDate && endDate) {
      qMenunggu.whereRaw("DATE(tsk.created_at) >= ? AND DATE(tsk.created_at) <= ?", [startDate, endDate]);
    }
    qMenunggu.first();
    applyMultiTenantFilter(qMenunggu, req, 'u');

    const [oTerkirim, oDisetujui, oDitolak, oMenunggu] = await Promise.all([
      qTerkirim,
      qDisetujui,
      qDitolak,
      qMenunggu
    ]);

    const nTerkirim = Number(oTerkirim?.total) || 0;
    const nDisetujui = Number(oDisetujui?.total) || 0;
    const nDitolak = Number(oDitolak?.total) || 0;
    const nMenunggu = Number(oMenunggu?.total) || 0;

    // Fetch trend data for last 7 days
    const qChart = DB("trx_surat_keluar as tsk")
      .leftJoin("mst_pengguna as u", "tsk.created_by", "u.id_pengguna")
      .select(DB.raw("DATE(tsk.created_at) as tanggal"), "tsk.status", DB.raw("COUNT(*) as total"))
      .whereRaw("tsk.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)")
      .whereNot("tsk.status", "dihapus")
      .groupByRaw("DATE(tsk.created_at), tsk.status")
      .orderByRaw("DATE(tsk.created_at) ASC");
    applyMultiTenantFilter(qChart, req, 'u');

    const vaChartRaw = await qChart;

    const vaNamaHari = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const vaLabels = [];
    const vaTerkirimData = [];
    const vaDisetujuiData = [];
    const vaDitolakData = [];
    const vaMenungguData = [];

    for (let i = 6; i >= 0; i--) {
      const dTarget = new Date();
      dTarget.setDate(dTarget.getDate() - i);

      const cTanggal = dTarget.toISOString().slice(0, 10);
      const cHari = vaNamaHari[dTarget.getDay()];

      vaLabels.push(cHari);

      // Find matching values in vaChartRaw for target date
      const filterByDateAndStatus = (statusList) => {
        return vaChartRaw
          .filter((item) => {
            const cItemDate =
              item.tanggal instanceof Date
                ? item.tanggal.toISOString().slice(0, 10)
                : String(item.tanggal).slice(0, 10);
            return cItemDate === cTanggal && statusList.includes(item.status);
          })
          .reduce((sum, item) => sum + Number(item.total), 0);
      };

      vaTerkirimData.push(filterByDateAndStatus(["terkirim", "selesai"]));
      vaDisetujuiData.push(filterByDateAndStatus(["disetujui"]));
      vaDitolakData.push(filterByDateAndStatus(["ditolak"]));
      vaMenungguData.push(filterByDateAndStatus(["menunggu_approval"]));
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Statistik dashboard surat keluar berhasil diambil",
      data: {
        summary: {
          terkirim: nTerkirim,
          disetujui: nDisetujui,
          ditolak: nDitolak,
          menungguApproval: nMenunggu,
          total: nTerkirim + nDisetujui + nDitolak + nMenunggu
        },
        chartData: {
          labels: vaLabels,
          datasets: [
            {
              label: "Terkirim",
              data: vaTerkirimData,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              fill: true,
              tension: 0.4
            },
            {
              label: "Diterima / Disetujui",
              data: vaDisetujuiData,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              fill: true,
              tension: 0.4
            },
            {
              label: "Ditolak",
              data: vaDitolakData,
              borderColor: "#ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              fill: true,
              tension: 0.4
            },
            {
              label: "Menunggu Approval",
              data: vaMenungguData,
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              fill: true,
              tension: 0.4
            }
          ]
        }
      }
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Statistik dashboard surat keluar gagal diambil",
      error: error.message
    };

    await Logging(error, {
      file: cFile,
      func: cFunc,
      request: "",
      response: JSON.stringify(oResult),
      user: req?.auth?.nama_pengguna || "system"
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", outgoingLetterDashboardStats);

export default router;

