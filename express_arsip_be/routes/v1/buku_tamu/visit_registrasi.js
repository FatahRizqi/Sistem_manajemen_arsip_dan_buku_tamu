import express from "express";
import multer from "multer";
import Joi from "joi";
import { formatDateSystem } from "../components/tools/general.js";
import { Logging, validatePayload, generateDailyVisitCode } from "../components/tools/servertool.js";
import DB from "../../../core/config/knex.js";
import { uploadFileToMinio, getMinioPrefix, MINIO_BUCKET_NAME } from "../../../core/components/tools/minio_helper.js";
import { sendMailNotification } from "../../../core/components/tools/mail_helper.js";
import { sendWhatsAppMessage } from "../../../core/components/tools/wa_helper.js";
import { createNotification } from "../components/tools/notification_helper.js";

const cBucket = MINIO_BUCKET_NAME;

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  "/",
  upload.any(),
  async (req, res) => {
    const { body: oPayload } = req;
    const nama_pengguna = req?.auth?.nama_pengguna || "";

    try {
      const cValidation = await validatePayload(
        {
          nama_tamu: Joi.string().max(100).required().label("nama_tamu"),
          nomor_telepon: Joi.string().max(45).required().label("nomor_telepon"),
          email_tamu: Joi.string()
            .email()
            .max(150)
            .optional()
            .allow(null, "")
            .label("email_tamu"),
          instansi_tamu: Joi.string()
            .optional()
            .allow(null, "")
            .label("instansi_tamu"),
          jabatan_tamu: Joi.string()
            .max(20)
            .optional()
            .allow(null, "")
            .label("jabatan_tamu"),
          id_tujuan_kunjungan: Joi.alternatives()
            .try(Joi.string(), Joi.number())
            .required()
            .label("id_tujuan_kunjungan"),
          id_user_host: Joi.string()
            .max(36)
            .optional()
            .allow(null, "")
            .label("id_user_host"),
          nama_host: Joi.string()
            .max(100)
            .optional()
            .allow(null, "")
            .label("nama_host"),
          jenis_identitas: Joi.string()
            .valid("ktp", "sim", "paspor")
            .optional()
            .allow(null, "")
            .label("jenis_identitas"),
          nomor_identitas: Joi.string()
            .max(50)
            .optional()
            .allow(null, "")
            .label("nomor_identitas"),
          catatan_kunjungan: Joi.string()
            .optional()
            .allow(null, "")
            .label("catatan_kunjungan"),
          waktu_masuk: Joi.string().required().label("waktu_masuk"),
          tipe_kunjungan: Joi.string()
            .valid("personal", "group")
            .optional()
            .allow(null, "")
            .label("tipe_kunjungan"),
          jumlah_tamu: Joi.number()
            .integer()
            .min(1)
            .optional()
            .allow(null, "")
            .label("jumlah_tamu"),
          tanda_tangan_data: Joi.string()
            .optional()
            .allow(null, "")
            .label("tanda_tangan_data"),
          anggota_rombongan: Joi.string()
            .optional()
            .allow(null, "")
            .label("anggota_rombongan"),
          status_persetujuan: Joi.string()
            .valid("approved", "pending", "rejected")
            .optional()
            .allow(null, "")
            .label("status_persetujuan"),
        },
        {
          "string.base": "{#label} harus berupa string",
          "string.email": "{#label} harus berupa email yang valid",
          "string.empty": "{#label} tidak boleh kosong",
          "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
          "any.required": "{#label} wajib diisi",
          "any.only": "{#label} tidak valid",
        },
        oPayload,
        { allowUnknown: true },
      );

      if (cValidation) {
        const oResult = {
          status: "99",
          message: cValidation || "Terdapat kesalahan pada data anda",
          datetime: formatDateSystem(),
        };
        return res.status(400).json(oResult);
      }

      const {
        nama_tamu,
        nomor_telepon,
        email_tamu,
        instansi_tamu,
        jabatan_tamu,
        id_tujuan_kunjungan,
        id_user_host,
        nama_host,
        jenis_identitas,
        nomor_identitas,
        catatan_kunjungan,
        waktu_masuk,
        tipe_kunjungan,
        jumlah_tamu,
        tanda_tangan_data,
        anggota_rombongan,
      } = oPayload;

      let targetBranchId = oPayload.id_cabang || req?.auth?.id_cabang || null;
      if (oPayload.BranchId) {
        targetBranchId = Number(oPayload.BranchId);
      }
      
      const minioPrefix = await getMinioPrefix(
        req?.auth?.id_cabang,
        req?.auth?.id_departemen,
        req?.auth?.id_divisi,
        req?.auth?.id_unit_kerja,
      );

      const getFile = (fieldname) => {
        if (!req.files || !Array.isArray(req.files)) return null;
        return req.files.find((f) => f.fieldname === fieldname) || null;
      };

      const photoFaceFile = getFile("foto_wajah") || getFile("SelfieFile") || getFile("PhotoFaceFile") || getFile("PhotoFace");
      const photoIdentityFile = getFile("foto_identitas") || getFile("IdentityFile") || getFile("PhotoIdentity");
      const signatureFile = getFile("file_tanda_tangan") || getFile("SignatureFile");
      const nYear = new Date().getFullYear();
      const cTodayPath = formatDateSystem(new Date(), "yyyyMMdd");

      let PhotoFace = null;
      let PhotoIdentity = null;
      let TandaTangan = null;

      if (photoFaceFile) {
        PhotoFace = await uploadFileToMinio(
          cBucket,
          photoFaceFile,
          `${minioPrefix}/buku-tamu/foto/${nYear}/${cTodayPath}`,
        );
      }
      if (photoIdentityFile) {
        PhotoIdentity = await uploadFileToMinio(
          cBucket,
          photoIdentityFile,
          `${minioPrefix}/buku-tamu/foto/${nYear}/${cTodayPath}`,
        );
      }

      if (tanda_tangan_data && tanda_tangan_data.startsWith("data:image/")) {
        const matches = tanda_tangan_data.match(new RegExp("^data:([A-Za-z-+/]+);base64,(.+)$"));
        if (matches && matches.length === 3) {
          const type = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const ext = type.split("/")[1] || "png";
          const fileObj = {
            originalname: `signature_${Date.now()}.${ext}`,
            mimetype: type,
            buffer: buffer,
            size: buffer.length,
          };
          TandaTangan = await uploadFileToMinio(
            cBucket,
            fileObj,
            `${minioPrefix}/buku-tamu/tanda-tangan/${nYear}/${cTodayPath}`,
          );
        }
      } else if (signatureFile) {
        TandaTangan = await uploadFileToMinio(
          cBucket,
          signatureFile,
          `${minioPrefix}/buku-tamu/tanda-tangan/${nYear}/${cTodayPath}`,
        );
      }

      const VisitCode = await generateDailyVisitCode();
      const QRToken =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      let resolvedHostUserId = id_user_host;
      if (!resolvedHostUserId && nama_host) {
        const matchedUser = await DB("mst_pengguna")
          .where("nama_lengkap", nama_host)
          .orWhere("nama_pengguna", nama_host)
          .orWhere("surel", nama_host)
          .first();
        if (matchedUser) {
          resolvedHostUserId = matchedUser.id_pengguna;
        }
      }

      const isInternalUser = !!req?.auth?.nama_pengguna || !!req?.auth?.id_pengguna;
      const defaultStatus = isInternalUser ? "approved" : "pending";
      const initialStatusPersetujuan = (oPayload.ApprovalStatus || oPayload.status_persetujuan || defaultStatus).toLowerCase();

      const oData = {
        id_cabang: targetBranchId,
        nama_tamu: nama_tamu || oPayload.GuestName || "",
        nomor_telepon: nomor_telepon || oPayload.PhoneNumber || "",
        email_tamu: email_tamu || oPayload.GuestEmail || null,
        instansi_tamu: instansi_tamu || oPayload.GuestCompany || null,
        jabatan_tamu: jabatan_tamu || oPayload.GuestPosition || null,
        jenis_identitas: (jenis_identitas || oPayload.IdentityType) ? String(jenis_identitas || oPayload.IdentityType).toLowerCase() : null,
        nomor_identitas: nomor_identitas || oPayload.IdentityNumber || null,
        id_tujuan_kunjungan: id_tujuan_kunjungan || oPayload.VisitPurposeId,
        id_user_host: resolvedHostUserId || null,
        nama_host: nama_host || oPayload.HostName || null,
        catatan_kunjungan: catatan_kunjungan || oPayload.VisitNotes || null,
        foto_wajah: PhotoFace,
        foto_identitas: PhotoIdentity,
        tanda_tangan: TandaTangan,
        tipe_kunjungan: tipe_kunjungan || oPayload.VisitType || "personal",
        jumlah_tamu: jumlah_tamu ? Number(jumlah_tamu) : (oPayload.GuestCount ? Number(oPayload.GuestCount) : 1),
        kode_kunjungan: VisitCode,
        token_qr: QRToken,
        waktu_masuk: waktu_masuk || oPayload.CheckInTime,
        status: "Rencana",
        status_persetujuan: initialStatusPersetujuan,
        created_at: formatDateSystem(),
      };

      const [idKunjungan] = await DB("trx_kunjungan").insert(oData);

      // Simpan anggota rombongan jika ada
      let parsedGroupMembers = [];
      const rawGroupMembers = anggota_rombongan || oPayload.GroupMembers;
      if (rawGroupMembers && rawGroupMembers !== "") {
        try {
          parsedGroupMembers = typeof rawGroupMembers === 'string' ? JSON.parse(rawGroupMembers) : rawGroupMembers;
        } catch (err) {
          console.error("Gagal parsing anggota_rombongan:", err);
        }
      }

      if (tipe_kunjungan === "group" && Array.isArray(parsedGroupMembers) && parsedGroupMembers.length > 0) {
        const insertPromises = parsedGroupMembers.map(async (member, index) => {
          const memberFile = getFile(`foto_identitas_anggota_${index}`) || getFile(`MemberIdentityFile_${index}`);
          let memberPhotoPath = null;
          if (memberFile) {
            memberPhotoPath = await uploadFileToMinio(
              cBucket,
              memberFile,
              `${minioPrefix}/buku-tamu/foto/${nYear}/${cTodayPath}`
            );
          }

          await DB("trx_kunjungan_anggota").insert({
            id_kunjungan: idKunjungan,
            nama_anggota: member.name || member.nama_anggota || "",
            nomor_telepon: member.phone || member.nomor_telepon || null,
            nomor_identitas: member.idNumber || member.nomor_identitas || null,
            foto_identitas: memberPhotoPath,
            created_at: formatDateSystem(),
            updated_at: formatDateSystem()

          });
        });
        await Promise.all(insertPromises);
      }

      try {
        const GuestName = nama_tamu || oPayload.GuestName || oPayload.nama_tamu || "";
        const GuestCompany = instansi_tamu || oPayload.GuestCompany || oPayload.instansi_tamu || "";
        const VisitPurposeId = id_tujuan_kunjungan || oPayload.VisitPurposeId || oPayload.id_tujuan_kunjungan;
        const HostName = nama_host || oPayload.HostName || oPayload.nama_host || "";
        const PhoneNumber = nomor_telepon || oPayload.PhoneNumber || oPayload.nomor_telepon || "";
        const CheckInTime = waktu_masuk || oPayload.CheckInTime || oPayload.waktu_masuk || "";
        const VisitNotes = catatan_kunjungan || oPayload.VisitNotes || oPayload.catatan_kunjungan || "";

        let purposeName = "Kunjungan";
        if (VisitPurposeId) {
          const purposeObj = await DB("mst_tujuan_kunjungan").where("id_tujuan_kunjungan", VisitPurposeId).first();
          if (purposeObj) {
            purposeName = purposeObj.nama_tujuan_kunjungan;
          }
        }

        let resolvedHostName = HostName || null;
        let oHost = null;
        if (resolvedHostUserId) {
          oHost = await DB("mst_pengguna")
            .select("nama_lengkap", "telepon")
            .where("id_pengguna", resolvedHostUserId)
            .first();
          if (oHost && oHost.nama_lengkap) {
            resolvedHostName = oHost.nama_lengkap;
          }
        }

        // --- 1. Kirim Notifikasi WA ke TAMU (Selalu Dikirim) ---
        const rawPhone = PhoneNumber || oPayload.PhoneNumber || oPayload.phone_number || oPayload.nomor_telepon || oPayload.nomor_hp;
        const GuestPhone = rawPhone ? String(rawPhone).replace(/[^0-9+]/g, '') : null;
        console.log(`[visit_registrasi] Target WA Tamu: ${GuestPhone}`);
        if (GuestPhone) {
          const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${VisitCode}`;
          const isApproved = initialStatusPersetujuan === "approved";
          const isRejected = initialStatusPersetujuan === "rejected";
          const statusText = isApproved ? "DISETUJUI" : isRejected ? "DITOLAK" : "MENUNGGU PERSETUJUAN";

          let waTamu = "";
          if (isRejected) {
            const hasNote = VisitNotes && String(VisitNotes).trim() !== '' && String(VisitNotes).trim() !== '-';
            const noteText = hasNote ? `\n\nAlasan / Catatan: ${VisitNotes}` : '';
            waTamu = `Halo Bpk/Ibu ${GuestName},

Mohon maaf, permohonan rencana kunjungan Anda dengan Kode Booking: *${VisitCode}* DITOLAK.${noteText}

Terima kasih.`;
          } else {
            waTamu = `Halo Bpk/Ibu ${GuestName},

Pendaftaran rencana kunjungan Anda berhasil dikonfirmasi.

Detail Kunjungan:
- Pegawai yang Ditemui: ${resolvedHostName || '-'}
- Status: ${statusText}
- Rencana Kedatangan: ${CheckInTime}
- Tujuan: ${purposeName}
${isApproved ? `\n📱 Link QR Code Tiket:\n${qrCodeImageUrl}\n` : ''}
${isApproved ? 'Silakan tunjukkan QR Code di atas kepada petugas resepsionis saat Anda tiba di lokasi.' : 'Notifikasi konfirmasi akan dikirimkan kembali setelah permohonan disetujui.'} Terima kasih.`;
          }

          await sendWhatsAppMessage(GuestPhone, waTamu, isApproved ? qrCodeImageUrl : null);
        }

        // --- 2. Kirim Notifikasi Email & WA ke PEGAWAI / HOST (Jika ada) ---
        if (resolvedHostUserId) {
          sendMailNotification(resolvedHostUserId, "booking", {
            nama_tamu: nama_tamu,
            instansi_tamu: instansi_tamu || "-",
            VisitPurposeName: purposeName,
            waktu_masuk: waktu_masuk,
            kode_kunjungan: VisitCode,
            catatan_kunjungan: catatan_kunjungan || "-"
          });


          const oHost = await DB("mst_pengguna").select("nama_lengkap", "telepon").where("id_pengguna", resolvedHostUserId).first();
          if (oHost && oHost.telepon) {
            let openingMsg = "Ada tamu yang telah mendaftarkan rencana kunjungan kepada Anda";
            let closingMsg = "Silakan bersiap untuk menerima tamu tersebut pada jadwal yang ditentukan.";

            const lowerPurpose = (purposeName || "").toLowerCase();

            if (lowerPurpose.includes("meeting")) {
              openingMsg = "Ada tamu yang menjadwalkan sesi Meeting dengan Anda";
              closingMsg = "Silakan persiapkan ruangan dan jadwal Anda.";
            } else if (lowerPurpose.includes("interview") || lowerPurpose.includes("wawancara")) {
              openingMsg = "Seorang kandidat telah mendaftar untuk sesi Interview/Wawancara dengan Anda";
            }

            const waHost = `Halo Bpk/Ibu ${oHost.nama_lengkap},

${openingMsg}.

Data Rencana Kunjungan:
- Nama Tamu: ${nama_tamu}
- No. WA Tamu: ${GuestPhone}
- Instansi: ${instansi_tamu || '-'}
- Waktu Kedatangan: ${waktu_masuk}
- Keperluan: ${purposeName}
- Catatan: ${catatan_kunjungan || '-'}

${closingMsg}`;
            await sendWhatsAppMessage(oHost.telepon, waHost);
          }

          const cGuestName = nama_tamu || "Seorang tamu";
          const cGuestCompany = instansi_tamu && instansi_tamu !== "-" ? ` (${instansi_tamu})` : "";
          const notifMsg = `${cGuestName}${cGuestCompany} mendaftarkan rencana kunjungan`;

          await createNotification({
            id_pengguna: resolvedHostUserId,
            judul: "Rencana Kunjungan Baru",
            pesan: notifMsg,
            tipe: "kunjungan",
            tautan: "/buku_tamu/monitoring",
          });

          const superadmins = await DB("mst_pengguna as p")
            .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
            .join("mst_peran as r", "pp.id_peran", "r.id_peran")
            .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
            .andWhere("p.status", "active")
            .select("p.id_pengguna");

          for (const sa of superadmins) {
            if (sa.id_pengguna !== Number(resolvedHostUserId)) {
              await createNotification({
                id_pengguna: sa.id_pengguna,
                judul: "Rencana Kunjungan Baru",
                pesan: notifMsg,
                tipe: "kunjungan",
                tautan: "/buku_tamu/monitoring",
              });
            }
          }
        } else {
          const cGuestName = nama_tamu || "Seorang tamu";
          const cGuestCompany = instansi_tamu && instansi_tamu !== "-" ? ` (${instansi_tamu})` : "";
          const notifMsg = `${cGuestName}${cGuestCompany} mendaftarkan rencana kunjungan`;

          // If no host is selected, notify all active users in the target branch
          const branchUsers = await DB("mst_pengguna")
            .where("id_cabang", targetBranchId)
            .andWhere("status", "active")
            .select("id_pengguna");

          const superadmins = await DB("mst_pengguna as p")
            .join("mst_pengguna_peran as pp", "p.id_pengguna", "pp.id_pengguna")
            .join("mst_peran as r", "pp.id_peran", "r.id_peran")
            .whereIn("r.kode_peran", ["SUPERADMIN", "SA"])
            .andWhere("p.status", "active")
            .select("p.id_pengguna");

          const targetUserIds = new Set([
            ...branchUsers.map(u => u.id_pengguna),
            ...superadmins.map(u => u.id_pengguna)
          ]);

          for (const userId of targetUserIds) {
            await createNotification({
              id_pengguna: userId,
              judul: "Rencana Kunjungan Baru",
              pesan: notifMsg,
              tipe: "kunjungan",
              tautan: "/buku_tamu/monitoring",
            });
          }
        }
      } catch (e) {
        Logging(e, {
          file: "visit_registrasi.js",
          func: "notify",
          request: { id_user_host },
          response: "notify failed",
          user: nama_pengguna,
        });
      }

      return res.status(200).json({
        status: "00",
        message: "Registrasi berhasil",
        data: {
          kode_kunjungan: VisitCode,
          token_qr: QRToken,
          id_kunjungan: idKunjungan,
          nama_tamu: nama_tamu,
          instansi_tamu: instansi_tamu || "-",
          qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${QRToken}`,
        },
        datetime: formatDateSystem(),
      });
    } catch (error) {
      const oResult = {
        status: "01",
        message: "Sistem sedang maintenance harap tunggu sebentar",
        datetime: formatDateSystem(),
      };
      Logging(error, {
        file: "visit_registrasi.js",
        func: "registrasi",
        request: req.body,
        response: oResult,
        user: nama_pengguna,
      });
      return res.status(500).json(oResult);
    }
  },
);

export default router;
