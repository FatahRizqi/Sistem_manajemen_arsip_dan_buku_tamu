import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import QRCode from "qrcode";
import forge from "node-forge";

import DB from "../../../../core/config/knex.js";
import { downloadFileFromMinio, getMinioPrefix, uploadFileToMinio, MINIO_BUCKET_NAME } from "../../../../core/components/tools/minio_helper.js";
import { formatDateSystem } from "./general.js";

const DEFAULT_SIGNATURE_LENGTH = 16384;
const DEFAULT_PAGE_WIDTH = 595.28;
const DEFAULT_PAGE_HEIGHT = 841.89;
const DEFAULT_SIGNATURE_RECT = [345, 58, 565, 162];

const SIGNATURE_PROVIDER = String(process.env.TTE_SIGNING_PROVIDER || "internal").toLowerCase();

const cleanBuffer = (value) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value || "");
};

const sha256Hex = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const toBinaryString = (buffer) => cleanBuffer(buffer).toString("binary");

const normalizeString = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const splitText = (text = "") => String(text).split(/\r?\n/);

const wrapLine = (text, font, fontSize, maxWidth) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
};

const drawParagraphs = (page, font, text, x, y, maxWidth, fontSize, lineHeight, color = rgb(0.1, 0.1, 0.1)) => {
  let cursorY = y;
  for (const paragraph of splitText(text)) {
    const wrapped = wrapLine(paragraph || " ", font, fontSize, maxWidth);
    for (const line of wrapped) {
      page.drawText(line, {
        x,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= lineHeight;
    }
    cursorY -= lineHeight * 0.35;
  }
  return cursorY;
};

const getUserId = (req) => req?.auth?.id_pengguna || req?.auth?.IdPengguna || null;

const getUserBranchId = (req) => req?.auth?.id_cabang || null;

const getBasePdfFileName = (surat) =>
  `${normalizeString(surat?.nomor_surat || `surat-keluar-${surat?.id_surat_keluar || "dokumen"}`)}.pdf`
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_");

const getYearFolder = () => new Date().getFullYear();

const loadObjectBuffer = async (objectName) => {
  if (!objectName) return null;

  const bucketName = process.env.MINIO_BUCKET_NAME || MINIO_BUCKET_NAME;
  const cleanedObject = String(objectName).replace(/\\/g, "/").replace(/^\/+/, "");

  try {
    const stream = await downloadFileFromMinio(bucketName, cleanedObject);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (minioError) {
    const localPath = path.resolve(process.cwd(), cleanedObject.replace(/^uploads\//, ""));
    try {
      return await fs.readFile(localPath);
    } catch (diskError) {
      throw new Error(
        `Gagal memuat dokumen dari storage (${cleanedObject}): ${minioError.message || diskError.message}`,
      );
    }
  }
};

const uploadPdfBuffer = async (buffer, fileName, { idCabang = null, moduleName = "tte/surat-keluar" } = {}) => {
  const bucketName = process.env.MINIO_BUCKET_NAME || MINIO_BUCKET_NAME;
  const prefix = await getMinioPrefix(idCabang);
  const syntheticFile = {
    originalname: fileName,
    buffer,
    size: buffer.length,
    mimetype: "application/pdf",
  };

  return uploadFileToMinio(bucketName, syntheticFile, {
    idCabang,
    modul: moduleName,
    nomorDokumen: fileName.replace(/\.pdf$/i, ""),
    namaDokumen: fileName.replace(/\.pdf$/i, ""),
    version: "V1",
    customFolderPath: `${prefix}/${moduleName}/${getYearFolder()}`,
  });
};

const generateDevKeystore = async (targetFilePath, password = "") => {
  let finalPath = targetFilePath;
  if (!/\.(p12|pfx)$/i.test(finalPath)) {
    finalPath = path.join(finalPath, "dev_keystore.p12");
  }

  try {
    await fs.stat(finalPath);
    return finalPath;
  } catch (e) {
    // File does not exist, create self-signed certificate
  }

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(Date.now());
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: "commonName", value: "Sertifikat Elektronik (Development TTE)" },
    { name: "organizationName", value: "Sistem Manajemen Arsip & Buku Tamu" },
    { name: "countryName", value: "ID" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password || "");
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Buffer = Buffer.from(p12Der, "binary");

  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  await fs.writeFile(finalPath, p12Buffer);
  return finalPath;
};

const resolveKeystoreFilePath = async (lokasiKeystore, password = "") => {
  if (!lokasiKeystore) {
    throw new Error("Lokasi keystore sertifikat belum dikonfigurasi");
  }

  let resolved = path.isAbsolute(lokasiKeystore)
    ? lokasiKeystore
    : path.resolve(process.cwd(), lokasiKeystore);

  try {
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      const files = await fs.readdir(resolved);
      const p12File = files.find((f) => f.endsWith(".p12") || f.endsWith(".pfx"));
      if (p12File) {
        resolved = path.join(resolved, p12File);
      } else {
        resolved = await generateDevKeystore(resolved, password);
      }
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      resolved = await generateDevKeystore(resolved, password);
    } else {
      throw err;
    }
  }

  return resolved;
};

const loadP12Signer = async ({ lokasiKeystore, password }) => {
  const resolved = await resolveKeystoreFilePath(lokasiKeystore, password);
  const p12Buffer = await fs.readFile(resolved);
  return new P12Signer(p12Buffer, { passphrase: password || "" });
};

const buildVisibleSignatureBlock = async ({
  pdfDoc,
  page,
  posisi,
  signerName,
  signerTitle,
  signingTime,
  tokenVerifikasi,
}) => {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 48;

  // 1. Generate QR Code Barcode
  const qrDataUrl = await QRCode.toDataURL(tokenVerifikasi || signerName || "tte", {
    margin: 0,
    width: 120,
  });

  const qrImage = await pdfDoc.embedPng(
    qrDataUrl.split(",")[1] ? Buffer.from(qrDataUrl.split(",")[1], "base64") : Buffer.from(qrDataUrl, "base64")
  );

  // 2. Determine QR Code Barcode Position (Right inside Signature Block)
  const qrWidth = 60;
  const qrHeight = 60;

  let qrX = pageWidth - margin - 150;
  let qrY = 100;

  if (posisi?.posisi_x && posisi?.posisi_y) {
    qrX = Number(posisi.posisi_x);
    qrY = Number(posisi.posisi_y);
  } else if (posisi?.widgetRect) {
    const [x1, y1, x2, y2] = posisi.widgetRect;
    qrX = x1 + (x2 - x1 - qrWidth) / 2;
    qrY = y1 + (y2 - y1 - qrHeight) / 2;
  }

  // Draw Barcode QR Code directly inside the Signature Block
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrWidth,
    height: qrHeight,
  });

  // 3. Draw TTE Info Line at bottom footer margin
  const footerY = 22;
  const formattedDate = signingTime ? formatDateSystem(signingTime, "dd MMM yyyy HH:mm") : "-";

  page.drawLine({
    start: { x: margin, y: footerY + 14 },
    end: { x: pageWidth - margin, y: footerY + 14 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.84),
  });

  const footerText = `Dokumen ini telah ditandatangani secara elektronik oleh ${normalizeString(signerName || "Superadmin SIAB")} (${normalizeString(signerTitle || "DIREKTUR")}) pada ${formattedDate}. Kode Verifikasi: ${normalizeString(tokenVerifikasi || "-")}`;

  page.drawText(footerText, {
    x: margin,
    y: footerY,
    size: 7,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.4),
  });

  return [qrX, qrY, qrX + qrWidth, qrY + qrHeight];
};

const getLogoBuffer = async (dbLogoName) => {
  const possiblePaths = [];
  if (dbLogoName) {
    possiblePaths.push(path.resolve(process.cwd(), "public/uploads/config/logo_perusahaan", dbLogoName));
  }
  possiblePaths.push(
    path.resolve(process.cwd(), "../next_arsip_fe/public/marstech-logo.png"),
    path.resolve(process.cwd(), "next_arsip_fe/public/marstech-logo.png"),
    path.resolve(process.cwd(), "public/marstech-logo.png")
  );

  for (const p of possiblePaths) {
    try {
      return await fs.readFile(p);
    } catch (e) {
      // ignore
    }
  }
  return null;
};

const generatePdfFromSurat = async (surat, { signerName = "", signerTitle = "" } = {}) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const margin = 48;
  const contentWidth = DEFAULT_PAGE_WIDTH - margin * 2;

  const vaData = await DB("config").whereIn("kode", [
    "msNamaPerusahaan", "msAlamatPerusahaan", "msTeleponPerusahaan", "msLogoPerusahaan"
  ]).select("kode", "keterangan");
  const configMap = {};
  vaData.forEach(row => { configMap[row.kode] = row.keterangan; });

  const companyName = configMap["msNamaPerusahaan"] || "PT. MARSTECH GLOBAL";
  const companyAddress = configMap["msAlamatPerusahaan"] || "JL. MARGATAMA ASRI IV NO. 3 KANIGORO, KARTOHARJO, MADIUN, JAWA TIMUR";
  const companyPhone = configMap["msTeleponPerusahaan"] || "0351-2812555";

  // Logo Kop Surat
  try {
    const logoBuffer = await getLogoBuffer(configMap["msLogoPerusahaan"]);
    if (logoBuffer) {
      const logoImg = await pdfDoc.embedPng(logoBuffer);
      page.drawImage(logoImg, {
        x: margin,
        y: DEFAULT_PAGE_HEIGHT - 82,
        width: 54,
        height: 54,
      });
    }
  } catch (e) {
    // ignore logo load error
  }

  // Header Title & Address Kop Surat
  const headerX = margin + 64;
  page.drawText(companyName, {
    x: headerX,
    y: DEFAULT_PAGE_HEIGHT - 38,
    size: 14,
    font: fontBold,
    color: rgb(0, 0.2, 0.45),
  });

  page.drawText(companyAddress, {
    x: headerX,
    y: DEFAULT_PAGE_HEIGHT - 51,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Telp. ${companyPhone}`, {
    x: headerX,
    y: DEFAULT_PAGE_HEIGHT - 63,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Double Line Separator Kop Surat
  page.drawLine({
    start: { x: margin, y: DEFAULT_PAGE_HEIGHT - 90 },
    end: { x: DEFAULT_PAGE_WIDTH - margin, y: DEFAULT_PAGE_HEIGHT - 90 },
    thickness: 2,
    color: rgb(0, 0.2, 0.45),
  });
  page.drawLine({
    start: { x: margin, y: DEFAULT_PAGE_HEIGHT - 93 },
    end: { x: DEFAULT_PAGE_WIDTH - margin, y: DEFAULT_PAGE_HEIGHT - 93 },
    thickness: 0.75,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Metadata Block
  let cursorY = DEFAULT_PAGE_HEIGHT - 118;
  const tglSurat = surat?.tanggal_surat ? formatDateSystem(surat.tanggal_surat, "dd MMMM yyyy") : "-";

  page.drawText(`Nomor        : ${surat?.nomor_surat || "-"}`, {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Madiun, ${tglSurat}`, {
    x: DEFAULT_PAGE_WIDTH - margin - 150,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 15;

  page.drawText(`Lampiran   : -`, {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 15;

  page.drawText(`Perihal        : ${surat?.perihal || "-"}`, {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 22;

  page.drawText("Kepada Yth.", {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 14;

  page.drawText(normalizeString(surat?.tujuan || "Tempat"), {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 14;

  if (surat?.instansi_tujuan) {
    page.drawText(normalizeString(surat.instansi_tujuan), {
      x: margin,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    cursorY -= 14;
  }

  page.drawText("di Tempat", {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 24;

  page.drawText("Dengan hormat,", {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 18;

const extractCleanBodyText = (surat) => {
  if (surat?.isi_surat && String(surat.isi_surat).trim() !== "") {
    return String(surat.isi_surat).trim();
  }

  let text = String(surat?.isi_surat_final || "").trim();
  if (!text) {
    return surat?.perihal ? `Mengenai ${surat.perihal}.` : "Demikian surat ini disampaikan untuk dipergunakan sebagaimana mestinya.";
  }

  const hIdx = text.toLowerCase().indexOf("dengan hormat");
  if (hIdx >= 0) {
    text = text.slice(hIdx).replace(/^dengan hormat,?\s*/i, "").trim();
  }

  text = text
    .replace(/nomor\s*:\s*[\w\/-]+\s*/gim, "")
    .replace(/lampiran\s*:\s*[-a-zA-Z0-9\s]+\s*/gim, "")
    .replace(/lamp\s*:\s*[-a-zA-Z0-9\s]+\s*/gim, "")
    .replace(/perihal\s*:\s*[^\r\n]+\s*/gim, "")
    .replace(/kepada yth\.?\s*[^\r\n]+\s*/gim, "")
    .replace(/di tempat\s*/gim, "")
    .replace(/dengan hormat,?\s*/gim, "")
    .replace(/demikian surat ini dibuat[\s\S]*$/i, "")
    .replace(/demikian surat [\s\S]*?terima kasih\.?[\s\S]*$/i, "")
    .replace(/demikian [\s\S]*$/i, "")
    .replace(/hormat kami,?[\s\S]*$/i, "")
    .replace(/superadmin[\s\S]*$/i, "")
    .replace(/direktur[\s\S]*$/i, "")
    .trim();

  return text || (surat?.perihal ? `Mengenai ${surat.perihal}.` : "Demikian surat ini disampaikan untuk dipergunakan sebagaimana mestinya.");
};

  // Body Content
  const bodyText = extractCleanBodyText(surat);

  const paragraphs = splitText(bodyText);
  for (const para of paragraphs) {
    const wrapped = wrapLine(para || " ", fontRegular, 10, contentWidth);
    for (const line of wrapped) {
      if (cursorY < 180) {
        page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
        cursorY = DEFAULT_PAGE_HEIGHT - 60;
      }
      page.drawText(line, {
        x: margin,
        y: cursorY,
        size: 10,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 15;
    }
    cursorY -= 6;
  }

  if (cursorY < 230) {
    page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
    cursorY = DEFAULT_PAGE_HEIGHT - 60;
  }

  cursorY -= 12;
  page.drawText("Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.", {
    x: margin,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Signature Block - Fixed at Bottom Right
  const sigX = DEFAULT_PAGE_WIDTH - margin - 180;
  const finalSignerTitle = normalizeString(signerTitle || surat?.jabatan || "DIREKTUR");
  const finalSignerName = normalizeString(signerName || surat?.nama_pengirim || "BOSTANUL ASY'ARI");

  page.drawText(`Madiun, ${tglSurat}`, {
    x: sigX,
    y: 215,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("Hormat kami,", {
    x: sigX,
    y: 198,
    size: 10,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(companyName, {
    x: sigX,
    y: 183,
    size: 10,
    font: fontBold,
    color: rgb(0, 0.2, 0.45),
  });

  page.drawText(finalSignerTitle, {
    x: sigX,
    y: 168,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Space Y: 100 to 160 is reserved for Barcode QR Code

  page.drawText(finalSignerName, {
    x: sigX,
    y: 84,
    size: 10.5,
    font: fontBold,
    color: rgb(0, 0.2, 0.45),
  });

  return Buffer.from(await pdfDoc.save());
};

const preparePdfForSignature = async (pdfBuffer, options = {}) => {
  const pdfDoc = await PDFDocument.load(cleanBuffer(pdfBuffer));
  const pages = pdfDoc.getPages();
  const pageIndex = Math.max(0, Math.min((options.posisi?.halaman || pages.length || 1) - 1, pages.length - 1));
  const page = pages[pageIndex] || pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
  const rect = await buildVisibleSignatureBlock({
    pdfDoc,
    page,
    posisi: options.posisi,
    signerName: options.signerName,
    signerTitle: options.signerTitle,
    signingTime: options.signingTime,
    tokenVerifikasi: options.tokenVerifikasi,
  });

  pdflibAddPlaceholder({
    pdfDoc,
    pdfPage: page,
    reason: options.reason || "Tanda tangan elektronik internal",
    contactInfo: options.contactInfo || "internal-ttd",
    name: normalizeString(options.signerName || "Pengguna"),
    location: normalizeString(options.location || "Indonesia"),
    signingTime: options.signingTime || new Date(),
    signatureLength: options.signatureLength || DEFAULT_SIGNATURE_LENGTH,
    byteRangePlaceholder: options.byteRangePlaceholder,
    subFilter: options.subFilter || "ETSI.CAdES.detached",
    widgetRect: rect,
    appName: options.appName || "TTE Internal",
  });

  return Buffer.from(await pdfDoc.save());
};

const getCertificateRecord = async ({ idSertifikat, idPengguna = null } = {}) => {
  let query = DB("mst_sertifikat_elektronik as mse")
    .leftJoin("mst_pengguna as u", "mse.id_pengguna", "u.id_pengguna")
    .select(
      "mse.*",
      "u.nama_lengkap as nama_pengguna",
      "u.nama_pengguna as username_pengguna",
    )
    .where("mse.status_sertifikat", "aktif");

  if (idSertifikat) {
    query = query.where("mse.id_sertifikat_elektronik", idSertifikat);
  }

  if (idPengguna) {
    query = query.andWhere((builder) => {
      builder.whereNull("mse.id_pengguna").orWhere("mse.id_pengguna", idPengguna);
    });
  }

  return query.orderBy("mse.updated_at", "desc").first();
};

const resolveCertificateMaterial = async (certificateRecord = {}) => {
  const lokasiKeystore =
    certificateRecord.lokasi_keystore ||
    process.env.TTE_INTERNAL_KEYSTORE_PATH ||
    "TTE";
  const password =
    process.env.TTE_INTERNAL_KEYSTORE_PASSWORD ||
    certificateRecord.password_keystore ||
    "";

  if (!lokasiKeystore) {
    throw new Error("Lokasi keystore sertifikat belum dikonfigurasi");
  }

  const resolved = await resolveKeystoreFilePath(lokasiKeystore, password);
  const keystoreBuffer = await fs.readFile(resolved);

  const p12Asn1 = forge.asn1.fromDer(toBinaryString(keystoreBuffer), { parseAllBytes: false });
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  const cert = certBags[0]?.cert || null;
  const key = keyBags[0]?.key || null;

  if (!cert || !key) {
    throw new Error("Keystore tidak berisi sertifikat atau private key yang valid");
  }

  return {
    keystoreBuffer,
    cert,
    key,
    password,
    lokasiKeystore,
  };
};

const parseDigestAlgorithm = (oid) => {
  switch (oid) {
    case forge.pki.oids.sha1:
      return "sha1";
    case forge.pki.oids.sha384:
      return "sha384";
    case forge.pki.oids.sha512:
      return "sha512";
    case forge.pki.oids.sha256:
    default:
      return "sha256";
  }
};

const getAuthenticatedAttributesDigest = (attrAsn1) => {
  const raw = forge.asn1.toDer(attrAsn1).getBytes();
  return crypto.createHash("sha256").update(Buffer.from(raw, "binary")).digest();
};

const getAttrValue = (attrNode, attrOid) => {
  if (!attrNode?.value || attrNode.value.length < 2) return null;
  const oidNode = attrNode.value[0];
  if (!oidNode || forge.asn1.derToOid(oidNode.value) !== attrOid) return null;
  const setNode = attrNode.value[1];
  const valueNode = setNode?.value?.[0] || null;
  return valueNode || null;
};

const parseCmsSignature = (contentsHex) => {
  const normalizedHex = String(contentsHex || "").replace(/\s+/g, "");
  const contentsBuffer = Buffer.from(normalizedHex, "hex");
  const derBytes = contentsBuffer.toString("binary");
  const asn1Obj = forge.asn1.fromDer(derBytes, { parseAllBytes: false });
  const msg = forge.pkcs7.messageFromAsn1(asn1Obj);
  return { asn1Obj, msg };
};

const extractSignatureInfosFromPdf = (pdfBuffer) => {
  const text = cleanBuffer(pdfBuffer).toString("latin1");
  const matches = [...text.matchAll(/\/ByteRange\s*\[\s*([0-9\s]+?)\s*\]/g)];
  return matches.map((match, index) => {
    const numbers = match[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    const tail = text.slice(match.index || 0);
    const contentsMatch = tail.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/);
    return {
      index,
      byteRange: numbers,
      contentsHex: contentsMatch?.[1] || "",
      rawByteRange: match[0],
    };
  });
};

const verifyPdfBuffer = async (pdfBuffer) => {
  const signatures = extractSignatureInfosFromPdf(pdfBuffer);
  const results = [];

  for (const signature of signatures) {
    const [offset1, length1, offset2, length2] = signature.byteRange;
    const firstSlice = cleanBuffer(pdfBuffer).slice(offset1, offset1 + length1);
    const secondSlice = cleanBuffer(pdfBuffer).slice(offset2, offset2 + length2);
    const signedContent = Buffer.concat([firstSlice, secondSlice]);

    const signedDigest = crypto.createHash("sha256").update(signedContent).digest();

    let validKriptografis = false;
    let validIntegritas = false;
    let validSertifikat = false;
    let sertifikatDipercaya = false;
    let sertifikatDicabut = false;
    let dokumenDiubah = false;
    let pesan = [];
    let certificateInfo = null;

    try {
      const { msg } = parseCmsSignature(signature.contentsHex);
      const rawSignerInfos = msg?.rawCapture?.signerInfos;
      const signerInfoAsn1 =
        rawSignerInfos?.value?.[0] ||
        rawSignerInfos?.[0] ||
        rawSignerInfos ||
        null;

      if (!signerInfoAsn1) {
        throw new Error("Signer info tidak ditemukan di signature");
      }

      const signerCapture = {};
      const errors = [];
      if (!forge.asn1.validate(signerInfoAsn1, forge.pkcs7.asn1.signerInfoValidator, signerCapture, errors)) {
        throw new Error(`Signer info tidak valid: ${errors.map((item) => item.message).join(", ")}`);
      }

      const attrsAsn1 = signerCapture.authenticatedAttributes || null;
      const attrs = attrsAsn1?.value || [];
      const digestAttr = attrs.find((attr) => {
        const oid = forge.asn1.derToOid(attr.value?.[0]?.value || "");
        return oid === forge.pki.oids.messageDigest;
      });

      const digestAttrValue = getAttrValue(digestAttr, forge.pki.oids.messageDigest);
      const messageDigestBytes = digestAttrValue?.value || null;
      validIntegritas = Boolean(
        messageDigestBytes &&
          Buffer.from(messageDigestBytes, "binary").equals(signedDigest),
      );

      const digestAlgorithm = parseDigestAlgorithm(signerCapture.digestAlgorithm);
      const attrsDigest = crypto.createHash(digestAlgorithm).update(Buffer.from(forge.asn1.toDer(attrsAsn1).getBytes(), "binary")).digest();

      const signerCertificate = (msg?.certificates || []).find((cert) => {
        const certSerial = String(cert.serialNumber || "").replace(/^0+/, "") || "0";
        const signerSerial = String(signerCapture.serialNumber || "").replace(/^0+/, "") || "0";
        return certSerial.toLowerCase() === signerSerial.toLowerCase();
      }) || msg?.certificates?.[0] || null;

      if (signerCertificate) {
        certificateInfo = {
          serialNumber: signerCertificate.serialNumber,
          subject: signerCertificate.subject?.attributes || [],
          issuer: signerCertificate.issuer?.attributes || [],
          validFrom: signerCertificate.validity?.notBefore || null,
          validTo: signerCertificate.validity?.notAfter || null,
        };

        const pemPublicKey = signerCertificate.publicKey;
        validKriptografis = pemPublicKey.verify(attrsDigest.toString("binary"), signerCapture.signature, "RSASSA-PKCS1-V1_5");
        const now = new Date();
        validSertifikat =
          signerCertificate.validity?.notBefore <= now &&
          signerCertificate.validity?.notAfter >= now;
        sertifikatDipercaya = validSertifikat;
      }

      pesan.push(validIntegritas ? "Hash dokumen cocok dengan signature." : "Hash dokumen tidak cocok.");
      pesan.push(validKriptografis ? "Signature kriptografis valid." : "Signature kriptografis tidak valid.");
      pesan.push(validSertifikat ? "Sertifikat masih berlaku." : "Sertifikat tidak berlaku atau tidak ditemukan.");
      dokumenDiubah = !validIntegritas || !validKriptografis;
    } catch (error) {
      pesan.push(error.message || "Verifikasi signature gagal");
      dokumenDiubah = true;
    }

    results.push({
      index: signature.index,
      byteRange: signature.byteRange,
      valid_kriptografis: validKriptografis,
      valid_integritas: validIntegritas,
      valid_sertifikat: validSertifikat,
      sertifikat_dipercaya: sertifikatDipercaya,
      sertifikat_dicabut: sertifikatDicabut,
      dokumen_diubah: dokumenDiubah,
      pesan_verifikasi: pesan.join(" "),
      certificate_info: certificateInfo,
    });
  }

  const aggregate = results.length > 0
    ? results.every((item) => item.valid_kriptografis && item.valid_integritas && item.valid_sertifikat)
    : false;

  return {
    dokumen_tertandatangan: results.length > 0,
    valid_kriptografis: aggregate,
    valid_integritas: aggregate,
    valid_sertifikat: results.every((item) => item.valid_sertifikat),
    sertifikat_dipercaya: results.every((item) => item.sertifikat_dipercaya),
    sertifikat_dicabut: results.some((item) => item.sertifikat_dicabut),
    dokumen_diubah: results.some((item) => item.dokumen_diubah),
    signatures: results,
  };
};

const chooseBaseDocumentBuffer = async (surat, { preferSigned = true } = {}) => {
  const latestSignature = preferSigned
    ? await DB("trx_tanda_tangan_dokumen as ttd")
        .where("ttd.id_surat_keluar", surat.id_surat_keluar)
        .where("ttd.status_tanda_tangan", "aktif")
        .orderBy("ttd.urutan_tanda_tangan", "desc")
        .orderBy("ttd.created_at", "desc")
        .first()
    : null;

  if (latestSignature?.lokasi_dokumen) {
    return loadObjectBuffer(latestSignature.lokasi_dokumen);
  }

  const latestFile = await DB("trx_file_surat_keluar")
    .where("id_surat_keluar", surat.id_surat_keluar)
    .where("status", "active")
    .orderBy("tanggal_upload", "desc")
    .first();

  if (latestFile?.path_file) {
    const ext = path.extname(latestFile.path_file || latestFile.nama_file || "").toLowerCase();
    if (ext === ".pdf") {
      return loadObjectBuffer(latestFile.path_file);
    }
  }

  return generatePdfFromSurat(surat);
};

const assertMenuPermission = async (req, res, menuPaths = [], actionKey = "canView") => {
  const roleId = req?.auth?.peranId;
  if (!roleId) {
    return res.status(401).json({ status: status.BAD_REQUEST, message: "Autentikasi tidak ditemukan" });
  }

  const menus = await DB("mst_menu as m")
    .leftJoin("mst_peran_menu as pm", "m.id_menu", "pm.id_menu")
    .select("m.jalur_menu", "pm.hak_lihat", "pm.hak_buat", "pm.hak_ubah", "pm.hak_hapus", "pm.hak_setuju")
    .where("pm.id_peran", roleId)
    .where("m.status_aktif", 1)
    .whereIn("m.jalur_menu", Array.isArray(menuPaths) ? menuPaths : [menuPaths]);

  if (!menus || menus.length === 0) {
    return res.status(403).json({
      status: status.BAD_REQUEST,
      message: "Anda tidak memiliki akses ke menu ini",
    });
  }

  const allowed = {
    canView: menus.some((r) => Boolean(r.hak_lihat)),
    canCreate: menus.some((r) => Boolean(r.hak_buat)),
    canUpdate: menus.some((r) => Boolean(r.hak_ubah)),
    canDelete: menus.some((r) => Boolean(r.hak_hapus)),
    canApprove: menus.some((r) => Boolean(r.hak_setuju)),
  };

  if (!allowed[actionKey]) {
    return res.status(403).json({
      status: status.BAD_REQUEST,
      message: "Hak akses tidak mencukupi",
    });
  }

  return null;
};

const buildCertificatePayload = async (payload = {}, req = null) => {
  const now = new Date();
  const nResolvedUserId = payload.id_pengguna || getUserId(req);
  return {
    id_pengguna: nResolvedUserId || null,
    nama_sertifikat: normalizeString(payload.nama_sertifikat),
    alias_sertifikat: normalizeString(payload.alias_sertifikat || payload.nama_sertifikat),
    nomor_seri: normalizeString(payload.nomor_seri),
    subjek_sertifikat: normalizeString(payload.subjek_sertifikat),
    penerbit_sertifikat: normalizeString(payload.penerbit_sertifikat),
    algoritma_tanda_tangan: normalizeString(payload.algoritma_tanda_tangan || "RSA-SHA256"),
    algoritma_hash: normalizeString(payload.algoritma_hash || "SHA-256"),
    lokasi_keystore: normalizeString(payload.lokasi_keystore),
    berlaku_mulai: payload.berlaku_mulai || null,
    berlaku_sampai: payload.berlaku_sampai || null,
    status_sertifikat: normalizeString(payload.status_sertifikat || "aktif"),
    created_by: getUserId(req),
    updated_by: getUserId(req),
    created_at: now,
    updated_at: now,
  };
};

const getLatestDocumentSignature = async (idSuratKeluar) =>
  DB("trx_tanda_tangan_dokumen as ttd")
    .leftJoin("mst_pengguna as u", "ttd.id_pengguna", "u.id_pengguna")
    .leftJoin("mst_sertifikat_elektronik as mse", "ttd.id_sertifikat_elektronik", "mse.id_sertifikat_elektronik")
    .select(
      "ttd.*",
      "u.nama_lengkap as nama_penanda_tangan",
      "u.nama_pengguna as username_penanda_tangan",
      "mse.nama_sertifikat",
      "mse.alias_sertifikat",
    )
    .where("ttd.id_surat_keluar", idSuratKeluar)
    .where("ttd.status_tanda_tangan", "aktif")
    .orderBy("ttd.urutan_tanda_tangan", "desc")
    .orderBy("ttd.created_at", "desc")
    .first();

const getLatestDocumentVerification = async (idSuratKeluar) =>
  DB("trx_verifikasi_dokumen as tvd")
    .leftJoin("mst_pengguna as u", "tvd.diverifikasi_oleh", "u.id_pengguna")
    .select("tvd.*", "u.nama_lengkap as nama_verifikator", "u.nama_pengguna as username_verifikator")
    .where("tvd.id_surat_keluar", idSuratKeluar)
    .orderBy("tvd.diverifikasi_pada", "desc")
    .orderBy("tvd.id_verifikasi_dokumen", "desc")
    .first();

const recordSignatureLog = async ({
  idSuratKeluar,
  idPengguna,
  aksi,
  statusSebelum,
  statusSesudah,
  req,
  metadata = {},
}) => {
  const lastLog = await DB("trx_log_tanda_tangan")
    .where("id_surat_keluar", idSuratKeluar)
    .orderBy("id_log_tanda_tangan", "desc")
    .first();

  const logPayloadBase = {
    id_surat_keluar: idSuratKeluar,
    id_pengguna: idPengguna || null,
    aksi,
    status_sebelum: statusSebelum || null,
    status_sesudah: statusSesudah || null,
    alamat_ip:
      req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      null,
    user_agent: req?.headers?.["user-agent"] || null,
    metadata: Object.keys(metadata || {}).length > 0 ? JSON.stringify(metadata) : null,
    hash_log_sebelumnya: lastLog?.hash_log || null,
    dibuat_pada: new Date(),
    created_by: idPengguna || null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const hashLog = sha256Hex(
    Buffer.from(
      JSON.stringify({
        ...logPayloadBase,
        hash_log: null,
      }),
    ),
  );

  await DB("trx_log_tanda_tangan").insert({
    ...logPayloadBase,
    hash_log: hashLog,
  });
};

const selectSigningPosition = async (surat) => {
  const templateId = surat?.id_template || null;
  const byTemplate = templateId
    ? await DB("mst_posisi_tanda_tangan")
        .where("status", "aktif")
        .where("id_template", templateId)
        .orderBy("is_default", "desc")
        .first()
    : null;

  if (byTemplate) return byTemplate;

  const defaultPosition = await DB("mst_posisi_tanda_tangan")
    .where("status", "aktif")
    .where("is_default", 1)
    .first();

  return defaultPosition || { widgetRect: DEFAULT_SIGNATURE_RECT, halaman: 1 };
};

const signLetterAutomatically = async ({ idSuratKeluar, actorId = null, req = null }) => {
  const surat = await DB("trx_surat_keluar as tsk")
    .leftJoin("mst_jenis_surat as mjs", "tsk.id_jenis_surat", "mjs.jenis_surat_id")
    .leftJoin("mst_template_surat as mts", "tsk.id_template", "mts.id_template")
    .select("tsk.*", "mjs.nama_jenis_surat", "mts.nama_template")
    .where("tsk.id_surat_keluar", idSuratKeluar)
    .first();

  if (!surat) {
    throw new Error("Surat keluar tidak ditemukan");
  }

  const activeFile = await DB("trx_file_surat_keluar")
    .where("id_surat_keluar", idSuratKeluar)
    .where("status", "active")
    .orderBy("tanggal_upload", "desc")
    .first();

  let baseBuffer = null;
  const isPdfFile = activeFile?.path_file && (
    activeFile.path_file.toLowerCase().endsWith(".pdf") ||
    activeFile.nama_file?.toLowerCase().endsWith(".pdf") ||
    activeFile.mime_type?.includes("pdf")
  );

  if (isPdfFile) {
    try {
      baseBuffer = await loadObjectBuffer(activeFile.path_file);
    } catch (e) {
      baseBuffer = await generatePdfFromSurat(surat);
    }
  } else {
    baseBuffer = await generatePdfFromSurat(surat);
  }

  let certificate = await getCertificateRecord({ idPengguna: actorId });
  if (!certificate) {
    const confName = await DB("config").where("kode", "msNamaPerusahaan").first();
    const cName = confName ? confName.keterangan : "Perusahaan";

    const dNow = new Date();
    const [insertedId] = await DB("mst_sertifikat_elektronik").insert({
      id_pengguna: actorId || null,
      nama_sertifikat: "Sertifikat Digital Internal",
      alias_sertifikat: "TTE Internal SIAB",
      nomor_seri: `CERT-${Date.now()}`,
      subjek_sertifikat: `CN=Sistem SIAB, O=${cName}, C=ID`,
      penerbit_sertifikat: "Internal SIAB CA",
      algoritma_tanda_tangan: "RSA-SHA256",
      algoritma_hash: "SHA-256",
      lokasi_keystore: "TTE",
      berlaku_mulai: dNow,
      berlaku_sampai: new Date(dNow.getTime() + 365 * 10 * 24 * 3600 * 1000),
      status_sertifikat: "aktif",
      created_at: dNow,
      updated_at: dNow,
    });
    certificate = await DB("mst_sertifikat_elektronik").where("id_sertifikat_elektronik", insertedId).first();
  }

  const certMaterial = await resolveCertificateMaterial(certificate);
  const posisi = await selectSigningPosition(surat);
  const signingTime = new Date();
  const tokenVerifikasi = crypto.randomUUID();

  const actorUser = actorId ? await DB("mst_pengguna").where("id_pengguna", actorId).first() : null;
  const signerName = actorUser?.nama_lengkap || actorUser?.nama_pengguna || surat.nama_pengirim || "Superadmin SIAB";
  const signerTitle = actorUser?.jabatan || surat.jabatan || "DIREKTUR";

  const provider = createSigningProvider();
  const signedBuffer = await provider.tandatanganiDokumen({
    pdfBuffer: baseBuffer,
    lokasiKeystore: certMaterial.lokasiKeystore,
    password: certMaterial.password,
    signerName,
    signerTitle,
    tokenVerifikasi,
    posisi,
    signingTime,
    reason: `Disetujui dan Ditandatangani secara elektronik oleh ${signerName}`,
    contactInfo: actorUser?.nama_pengguna || "siab-tte",
    location: "Indonesia",
    appName: "Sistem Arsip SIAB",
  });

  const hashDokumen = sha256Hex(signedBuffer);
  const cleanNomor = String(surat.nomor_surat || `surat-keluar-${surat.id_surat_keluar}`).replace(/[\\/:*?"<>|]+/g, "-");
  const signedFileName = `${cleanNomor}-surat${idSuratKeluar}-${Date.now()}-ttd.pdf`;
  const signedPath = await uploadPdfBuffer(signedBuffer, signedFileName, {
    idCabang: surat.id_cabang || req?.auth?.id_cabang || null,
    moduleName: "tte/signed",
  });

  const existingSignatures = await DB("trx_tanda_tangan_dokumen")
    .where("id_surat_keluar", idSuratKeluar)
    .where("status_tanda_tangan", "aktif")
    .count({ total: "id_tanda_tangan_dokumen" });
  const urutan = Number(existingSignatures?.[0]?.total || 0) + 1;

  await DB.transaction(async (trx) => {
    await trx("trx_file_surat_keluar")
      .where("id_surat_keluar", idSuratKeluar)
      .where("status", "active")
      .update({
        status: "nonactive",
        updated_at: new Date(),
      });

    await trx("trx_file_surat_keluar").insert({
      id_surat_keluar: idSuratKeluar,
      nama_file: signedFileName,
      path_file: signedPath,
      mime_type: "application/pdf",
      ukuran_file: signedBuffer.length,
      tanggal_upload: new Date(),
      status: "active",
      created_by: actorId || null,
      updated_by: actorId || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await trx("trx_tanda_tangan_dokumen").insert({
      id_surat_keluar: idSuratKeluar,
      id_pengguna: actorId || null,
      id_sertifikat_elektronik: certificate?.id_sertifikat_elektronik || null,
      id_versi_dokumen: urutan,
      urutan_tanda_tangan: urutan,
      nomor_seri_sertifikat: certificate?.nomor_seri || "CERT-AUTO",
      subjek_sertifikat: certificate?.subjek_sertifikat || "CN=Sistem SIAB",
      penerbit_sertifikat: certificate?.penerbit_sertifikat || "Internal SIAB CA",
      algoritma_tanda_tangan: certificate?.algoritma_tanda_tangan || "RSA-SHA256",
      algoritma_hash: certificate?.algoritma_hash || "SHA-256",
      hash_dokumen: hashDokumen,
      lokasi_dokumen: signedPath,
      token_verifikasi: tokenVerifikasi,
      waktu_tanda_tangan: signingTime,
      status_tanda_tangan: "aktif",
      created_by: actorId || null,
      created_at: signingTime,
    });
  });

  await recordSignatureLog({
    idSuratKeluar: idSuratKeluar,
    idPengguna: actorId || null,
    aksi: "tanda_tangan_otomatis_approval",
    statusSebelum: surat.status,
    statusSesudah: "disetujui",
    req,
    metadata: {
      path_file: signedPath,
      nama_file: signedFileName,
      token_verifikasi: tokenVerifikasi,
      signer: signerName,
    },
  });

  return {
    signedFileName,
    signedPath,
    tokenVerifikasi,
    signerName,
  };
};

export {
  assertMenuPermission,
  buildCertificatePayload,
  chooseBaseDocumentBuffer,
  generatePdfFromSurat,
  getAuthenticatedAttributesDigest,
  getCertificateRecord,
  getLatestDocumentSignature,
  getLatestDocumentVerification,
  getUserBranchId,
  getUserId,
  loadObjectBuffer,
  loadP12Signer,
  parseCmsSignature,
  preparePdfForSignature,
  recordSignatureLog,
  resolveCertificateMaterial,
  sha256Hex,
  signLetterAutomatically,
  uploadPdfBuffer,
  verifyPdfBuffer,
};

export class PenyediaTandaTangan {
  async tandatanganiDokumen() {
    throw new Error("Implementasi penyedia tanda tangan belum tersedia");
  }

  async verifikasiDokumen(parameter) {
    return verifyPdfBuffer(parameter.pdfBuffer);
  }

  async ambilInformasiSertifikat(parameter) {
    return resolveCertificateMaterial(parameter);
  }
}

export class PenyediaTandaTanganInternal extends PenyediaTandaTangan {
  async tandatanganiDokumen(parameter) {
    const signer = await loadP12Signer({
      lokasiKeystore: parameter.lokasiKeystore,
      password: parameter.password,
    });

    const prepared = await preparePdfForSignature(parameter.pdfBuffer, parameter);
    const signerEngine = new SignPdf();
    const signed = await signerEngine.sign(prepared, signer, parameter.signingTime || new Date());
    return Buffer.from(signed);
  }

  async ambilInformasiSertifikat(parameter) {
    const material = await resolveCertificateMaterial(parameter);
    const cert = material.cert;

    return {
      serialNumber: cert.serialNumber,
      subject: cert.subject?.attributes || [],
      issuer: cert.issuer?.attributes || [],
      validFrom: cert.validity?.notBefore || null,
      validTo: cert.validity?.notAfter || null,
      lokasiKeystore: material.lokasiKeystore,
    };
  }
}

export class PenyediaTandaTanganPsre extends PenyediaTandaTangan {
  async tandatanganiDokumen() {
    throw new Error("Penyedia PSrE belum diaktifkan");
  }
}

export const createSigningProvider = () => {
  if (SIGNATURE_PROVIDER === "psre") {
    return new PenyediaTandaTanganPsre();
  }

  return new PenyediaTandaTanganInternal();
};
