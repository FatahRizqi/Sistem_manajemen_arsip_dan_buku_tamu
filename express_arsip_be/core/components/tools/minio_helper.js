import minioClient from '../../config/minio.js';
import DB from '../../config/knex.js';

const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'arsip-bucket';

/**
 * Helper untuk menyusun hirarki prefix folder MinIO berdasarkan silsilah cabang
 * @param {number|string} idCabang - ID Cabang milik uploader
 * @returns {Promise<string>} - Prefix hirarki (contoh: "PUSAT-JAKARTA/PUSAT-SURABAYA")
 */
const getMinioPrefix = async (idCabang, idDepartemen = null, idDivisi = null, idUnitKerja = null) => {
    if (!idCabang) return 'GLOBAL';

    let currentId = parseInt(idCabang, 10);
    if (isNaN(currentId)) return 'GLOBAL';

    const hierarchy = [];
    let leafBranchSlug = "";

    try {
        while (currentId) {
            const branch = await DB("mst_cabang")
                .select("id_cabang", "kode_cabang", "nama_cabang", "id_induk")
                .where("id_cabang", currentId)
                .first();

            if (!branch) break;

            const rawName = branch.nama_cabang || branch.kode_cabang || `CAB-${branch.id_cabang}`;
            const sanitizedName = rawName
                .trim()
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9_-]/g, "")
                .toUpperCase();

            if (!leafBranchSlug) {
                leafBranchSlug = rawName
                    .trim()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-zA-Z0-9_-]/g, "")
                    .toLowerCase();
            }

            hierarchy.unshift(sanitizedName);

            // Naik ke parent
            currentId = branch.id_induk;
        }

        if (leafBranchSlug) {
            hierarchy.push(`operasional-${leafBranchSlug}`);
        }
    } catch (e) {
        console.error("Gagal getMinioPrefix:", e);
    }

    if (hierarchy.length === 0) return 'GLOBAL';
    return hierarchy.join('/');
};

/**
 * Enterprise Helper untuk upload file ke MinIO sesuai hirarki kantor & penamaan terstruktur berdasarkan metadata.
 * @param {string} bucketName - Nama bucket (contoh: 'arsip-bucket')
 * @param {object} file - Objek file dari Multer (req.file)
 * @param {object|string} [options={}] - Opsi konfigurasi metadata upload
 *   - options.idCabang: ID Cabang untuk hirarki
 *   - options.modul: Modul tujuan (contoh: 'arsip-dokumen', 'surat-masuk', 'buku-tamu')
 *   - options.nomorDokumen: Nomor dokumen dari form metadata (contoh: 'SBY-SK-2026-004')
 *   - options.namaDokumen: Nama dokumen dari form metadata (contoh: 'SK Direksi Pengangkatan Karyawan')
 *   - options.version: Label versi file (contoh: 'V1')
 * @returns {Promise<string>} - Nama/Path file unik yang berhasil diupload (objectName)
 */
const uploadFileToMinio = async (bucketName, file, options = {}) => {
    try {
        // 1. Cek & pastikan bucket ada
        try {
            const bExists = await minioClient.bucketExists(bucketName);
            if (!bExists) {
                await minioClient.makeBucket(bucketName);
                console.log(`Bucket '${bucketName}' berhasil dibuat.`);
            }
        } catch (bucketErr) {
            console.warn(`[MinIO Warning] Gagal cek/buat bucket (mungkin MinIO mati): ${bucketErr.message}`);
        }

        // Parse metadata options
        let idCabang = null;
        let cModul = 'documents';
        let cNomorDokumen = '';
        let cNamaDokumen = '';
        let cVersionLabel = '';
        let cCustomFolderPath = null;

        if (typeof options === 'string') {
            cCustomFolderPath = options.replace(/\/$/, '') || 'documents';
        } else if (typeof options === 'object' && options !== null) {
            idCabang = options.idCabang || null;
            cModul = options.modul || 'documents';
            cNomorDokumen = options.nomorDokumen || options.customPrefix || '';
            cNamaDokumen = options.namaDokumen || '';
            cVersionLabel = options.version || '';
        }

        // 2. Susun hirarki folder
        const nYearFolder = new Date().getFullYear();
        let cFolderPath = "";

        if (cCustomFolderPath) {
            if (/\/\d{4}(\d{4})?$/.test(cCustomFolderPath)) {
                cFolderPath = cCustomFolderPath;
            } else {
                cFolderPath = `${cCustomFolderPath}/${nYearFolder}`;
            }
        } else {
            const cBranchPrefix = await getMinioPrefix(idCabang);
            cFolderPath = `${cBranchPrefix}/${cModul}/${nYearFolder}`;
        }

        // 3. Susun penamaan file bersih dari metadata
        const cExt = file.originalname.split('.').pop().toLowerCase();

        let cCleanNomor = cNomorDokumen
            ? String(cNomorDokumen)
                .trim()
                .replace(/[\/\\]/g, "-")
                .replace(/[^a-zA-Z0-9_-]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-+|-+$/g, "")
            : "";

        let cCleanNama = cNamaDokumen
            ? String(cNamaDokumen)
                .trim()
                .replace(/[\/\\]/g, "-")
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9_-]/g, "")
                .replace(/-+/g, "-")
                .replace(/^-+|-+$/g, "")
            : "";

        if (cCleanNama.length > 40) cCleanNama = cCleanNama.substring(0, 40);

        const cVString = cVersionLabel ? `_${String(cVersionLabel).toUpperCase()}` : '_V1';

        let cBaseName = "";
        if (cCleanNomor && cCleanNama) {
            cBaseName = `${cCleanNomor}_${cCleanNama}${cVString}.${cExt}`;
        } else if (cCleanNomor) {
            cBaseName = `${cCleanNomor}${cVString}.${cExt}`;
        } else if (cCleanNama) {
            cBaseName = `${cCleanNama}${cVString}.${cExt}`;
        } else {
            const cRaw = file.originalname.replace(/\.[^/.]+$/, "").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "-");
            cBaseName = `${cRaw}${cVString}.${cExt}`;
        }

        const cObjectName = `${cFolderPath}/${cBaseName}`;

        try {
            // 4. Put object ke MinIO
            await minioClient.putObject(
                bucketName,
                cObjectName,
                file.buffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );
            console.log(`[Metadata MinIO Upload] Berhasil upload -> ${bucketName}/${cObjectName}`);
        } catch (minioError) {
            console.error("[MinIO Warning] FULL ERROR:", minioError);
            const fsLog = await import('fs');
            fsLog.appendFileSync('minio_error.log', new Date().toISOString() + ': ' + (minioError.stack || minioError) + '\n');
            console.warn(`[MinIO Warning] Gagal upload ke MinIO, fallback menyimpan file lokal: ${minioError.message}`);
            
            // Fallback to local storage
            const fs = await import('fs');
            const path = await import('path');
            
            const localDir = path.join(process.cwd(), 'public', 'uploads', cFolderPath);
            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }
            
            const localFilePath = path.join(process.cwd(), 'public', 'uploads', cObjectName);
            fs.writeFileSync(localFilePath, file.buffer);
            console.log(`[Local Upload Fallback] Berhasil menyimpan file secara lokal di -> public/uploads/${cObjectName}`);
        }

        return cObjectName;

    } catch (error) {
        console.error("Kesalahan sistem saat mempersiapkan upload file:", error);
        throw error;
    }
};

/**
 * Helper fleksibel untuk download file dari MinIO.
 */
const downloadFileFromMinio = async (bucketName, objectName) => {
    try {
        const cleanedObject = String(objectName).replace(/^\/uploads\//, "").replace(/^\//, "");
        const stream = await minioClient.getObject(bucketName, cleanedObject);
        return stream;
    } catch (error) {
        console.error(`Gagal download dari MinIO (${objectName}):`, error.message);
        throw error;
    }
};

/**
 * Helper untuk menghapus file dari MinIO.
 */
const removeFileFromMinio = async (bucketName, objectName) => {
    try {
        const cleanedObject = String(objectName).replace(/^\/uploads\//, "").replace(/^\//, "");
        await minioClient.removeObject(bucketName, cleanedObject);
    } catch (error) {
        console.error(`Gagal menghapus file dari MinIO (${objectName}):`, error.message);
        throw error;
    }
};

/**
 * Helper untuk menghasilkan pre-signed URL dari MinIO (akses sementara).
 */
const getPresignedUrlFromMinio = async (bucketName, objectName, expiry = 3600) => {
    try {
        const cleanedObject = String(objectName).replace(/^\/uploads\//, "").replace(/^\//, "");
        const url = await minioClient.presignedGetObject(bucketName, cleanedObject, expiry);
        return url;
    } catch (error) {
        console.error("Gagal generate presigned URL dari MinIO:", error);
        // Fallback to local url if minio fails
        const cleanedObject = String(objectName).replace(/^\/uploads\//, "").replace(/^\//, "");
        const appServer = process.env.APP_SERVER || "http://localhost:8000";
        return `${appServer}/uploads/${cleanedObject}`;
    }
};

export {
    uploadFileToMinio,
    downloadFileFromMinio,
    removeFileFromMinio,
    getMinioPrefix,
    getPresignedUrlFromMinio,
    MINIO_BUCKET_NAME
};
