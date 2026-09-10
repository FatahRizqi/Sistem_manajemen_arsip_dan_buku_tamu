/**
 * Helper untuk menerapkan isolasi data multi-tenancy.
 * 
 * Hierarki Baru (setelah swap):
 *   mst_cabang (self-ref id_induk) → mst_departemen → mst_divisi → mst_unit_kerja
 * 
 * Isolasi data menggunakan pendekatan BRANCH-CENTRIC:
 * - Middleware (validate_header.js) sudah meng-expand x-filter-cabang untuk mencakup
 *   cabang user + anak cabang langsung (1 level), dan melakukan intersect dengan
 *   filter request jika ada.
 * - Filter ini cukup menerapkan x-filter-cabang yang sudah disiapkan middleware.
 * - Filter tambahan (departemen/divisi/unit kerja) bersifat OPSIONAL untuk drill-down.
 */
export const applyMultiTenantFilter = (queryBuilder, req, userTableAlias = 'mst_pengguna', deptTableAlias = null) => {
    if (!req.context) return queryBuilder;

    const aliasForDept = deptTableAlias || userTableAlias;

    // Primary filter: Cabang (sudah di-expand oleh middleware untuk semua role)
    const fCabang = req.headers['x-filter-cabang'];
    if (fCabang && fCabang !== 'null' && fCabang !== 'undefined') {
        const branchIds = String(fCabang).split(",").map(Number);
        queryBuilder.whereIn(`${userTableAlias}.id_cabang`, branchIds);
    }

    // Secondary filters: Drill-down opsional (berlaku untuk semua role)
    const fDepartemen = req.headers['x-filter-departemen'];
    const fDivisi = req.headers['x-filter-divisi'];
    const fUnitKerja = req.headers['x-filter-unit-kerja'];

    if (fDepartemen && fDepartemen !== 'null') queryBuilder.where(`${aliasForDept}.id_departemen`, fDepartemen);
    if (fDivisi && fDivisi !== 'null') queryBuilder.where(`${aliasForDept}.id_divisi`, fDivisi);
    if (fUnitKerja && fUnitKerja !== 'null') queryBuilder.where(`${aliasForDept}.id_unit_kerja`, fUnitKerja);

    return queryBuilder;
};
