'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { LayoutContext } from './context/layoutcontext';
import { useSession } from 'next-auth/react';
import postData from '@/lib/axios/postData';

interface Branch {
    id_cabang: number;
    id_induk: number | null;
    kode_cabang: string;
    nama_cabang: string;
    status: string;
    level?: number;
}

const BranchSwitcher = () => {
    const { data: session } = useSession();
    const { layoutState, setLayoutState } = useContext(LayoutContext);
    const op = useRef<OverlayPanel>(null);

    const activeRole = (session?.user as any)?.roleCode || (session?.user as any)?.role || '';
    const activeBranch = (layoutState.globalFilter as any)?.nama_cabang || (session?.user as any)?.nama_cabang || null;

    const [allBranches, setAllBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Selected hierarchy IDs
    const [selectedPusat, setSelectedPusat] = useState<number | null>(null);
    const [selectedDaerah, setSelectedDaerah] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [selectedKecamatan, setSelectedKecamatan] = useState<number | null>(null);

    const role = activeRole?.toUpperCase() || '';
    const isAdmin = role === 'SUPERADMIN' || role === 'SUPER ADMIN' || role === 'ADMINISTRATOR' || role === 'ADM' || session?.user?.name === 'Super Admin';

    // Fetch all branches when popover opens
    const fetchBranches = async () => {
        if (loaded) return;
        setLoading(true);
        try {
            const bypassFilters = {
                'x-filter-cabang': '',
                'x-filter-departemen': '',
                'x-filter-divisi': '',
                'x-filter-unit-kerja': '',
                'x-exact-cabang': ''
            };
            const res = await postData('/master/organisasi/branches/get-data', { limit: 1000, page: 1, keyword: '' }, bypassFilters);
            const branches = res.data?.data || [];
            setAllBranches(branches);
            setLoaded(true);

            // Auto-select root jika hanya ada 1 kantor pusat (best practice: skip level yang tidak perlu dipilih)
            const roots = branches.filter((b: Branch) => b.level === 1 || b.id_induk === null);
            if (roots.length === 1) {
                setSelectedPusat(roots[0].id_cabang);
            }

            // Initialize selection based on current globalFilter
            initializeSelection(branches);
        } catch (e) {
            console.error('Failed to fetch branches:', e);
        } finally {
            setLoading(false);
        }
    };

    // Figure out which hierarchy level the current branch is at
    const initializeSelection = (branches: Branch[]) => {
        const currentId = (layoutState.globalFilter as any)?.id_cabang;
        if (!currentId) return;

        const current = branches.find(b => b.id_cabang === currentId);
        if (!current) return;

        // Find hierarchy path: walk up to root
        const path: Branch[] = [];
        let node: Branch | undefined = current;
        while (node) {
            path.unshift(node);
            node = node.id_induk ? branches.find(b => b.id_cabang === node!.id_induk) : undefined;
        }

        const isExact = (layoutState.globalFilter as any)?.exact_cabang;

        // For each node in the path, assign it to the correct state based on its index (level)
        path.forEach((node, index) => {
            const level = index + 1;
            if (level === 1) {
                setSelectedPusat(node.id_cabang);
                // Jika Pusat Jakarta dipilih dari dropdown Daerah (exact match)
                if (isExact && node.id_cabang === currentId) {
                    setSelectedDaerah(node.id_cabang);
                }
            }
            else if (level === 2) setSelectedDaerah(node.id_cabang);
            else if (level === 3) setSelectedUnit(node.id_cabang);
            else if (level === 4) setSelectedKecamatan(node.id_cabang);
        });
    };

    // Level 1: Kantor Pusat (root nodes where id_induk === null)
    const pusatList = allBranches.filter(b => b.level === 1 || b.id_induk === null);

    // Level 2: Pusat Daerah (anak langsung dari root yang dipilih)
    const daerahList = selectedPusat
        ? allBranches.filter(b => b.id_induk === selectedPusat)
        : pusatList.length === 0 ? allBranches.filter(b => b.level === 2) : [];

    // Level 3: Unit Daerah
    const unitList = selectedDaerah
        ? allBranches.filter(b => b.id_induk === selectedDaerah)
        : (pusatList.length === 0 && daerahList.length === 0) ? allBranches.filter(b => b.level === 3) : [];

    // Level 4: Kantor Kecamatan
    const kecamatanList = selectedUnit
        ? allBranches.filter(b => b.id_induk === selectedUnit)
        : (pusatList.length === 0 && daerahList.length === 0 && unitList.length === 0) ? allBranches.filter(b => b.level === 4) : [];

    // Visibility logic: Tampilkan Level 1 selalu jika ada data pusat (sesuai permintaan user)
    const showPusat = pusatList.length > 0;
    const showDaerah = daerahList.length > 0;
    const showUnit = unitList.length > 0;
    const showKecamatan = kecamatanList.length > 0;

    const applyBranch = (branchId: number | null, isExact: boolean = false) => {
        if (branchId === null) {
            handleResetFilter();
            return;
        }

        const branch = allBranches.find(b => b.id_cabang === branchId);
        if (!branch) return;

        setLayoutState((prev: any) => ({
            ...prev,
            globalFilter: {
                ...(prev.globalFilter || {}),
                id_cabang: branch.id_cabang,
                nama_cabang: branch.nama_cabang,
                exact_cabang: isExact,
                id_departemen: null,
                id_divisi: null,
                id_unit_kerja: null
            }
        }));

        op.current?.hide();

        // Reload page to refetch data with new branch context
        setTimeout(() => window.location.reload(), 300);
    };

    const handleResetFilter = () => {
        setSelectedPusat(null);
        setSelectedDaerah(null);
        setSelectedUnit(null);
        setSelectedKecamatan(null);

        setLayoutState((prev: any) => ({
            ...prev,
            globalFilter: {
                id_cabang: (session?.user as any)?.id_cabang || null,
                nama_cabang: (session?.user as any)?.nama_cabang || null,
                exact_cabang: false,
                id_departemen: null,
                id_divisi: null,
                id_unit_kerja: null
            }
        }));

        op.current?.hide();
        setTimeout(() => window.location.reload(), 300);
    };

    const handleToggle = (e: React.MouseEvent) => {
        if (!isAdmin) return;
        fetchBranches();
        op.current?.toggle(e);
    };

    if (!activeBranch) return null;

    return (
        <>
            {/* Separator */}
            <div className="hidden md:block" style={{ width: '1px', height: '1.5rem', background: '#E5E7EB' }}></div>

            {/* Branch Badge */}
            <div
                className="flex align-items-center gap-2 px-2 md:px-3 py-2 border-round-3xl"
                style={{
                    background: 'rgba(79, 70, 229, 0.08)',
                    color: '#4F46E5',
                    border: '1px solid rgba(79, 70, 229, 0.15)',
                    cursor: isAdmin ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                }}
                title={isAdmin ? 'Klik untuk pindah cabang' : `Kantor aktif: ${activeBranch}`}
                onClick={handleToggle}
            >
                <i className="pi pi-building" style={{ fontSize: '0.8rem' }}></i>
                <span
                    className="font-semibold text-xs hidden md:block"
                    style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                    {activeBranch}
                </span>
                {isAdmin && (
                    <i className="pi pi-chevron-down hidden md:block" style={{ fontSize: '0.6rem', opacity: 0.7 }}></i>
                )}
            </div>

            {/* Branch Switcher Popover */}
            {isAdmin && (
                <OverlayPanel
                    ref={op}
                    style={{
                        width: '340px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                >
                    <div className="flex flex-column">
                        {/* Header */}
                        <div className="flex align-items-center justify-content-between mb-3">
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-building" style={{ color: '#4F46E5', fontSize: '1rem' }}></i>
                                <span className="font-bold text-sm text-900">Pindah Kantor</span>
                            </div>
                            <Button
                                icon="pi pi-refresh"
                                text
                                rounded
                                severity="secondary"
                                onClick={handleResetFilter}
                                tooltip="Reset ke cabang asal"
                                tooltipOptions={{ position: 'left' }}
                                style={{ width: '2rem', height: '2rem' }}
                            />
                        </div>

                        {/* Current Branch Info */}
                        <div
                            className="flex align-items-center gap-2 px-3 py-2 border-round mb-3"
                            style={{ background: 'rgba(79, 70, 229, 0.06)', border: '1px solid rgba(79, 70, 229, 0.12)' }}
                        >
                            <i className="pi pi-map-marker" style={{ color: '#4F46E5', fontSize: '0.8rem' }}></i>
                            <div className="flex flex-column">
                                <span className="font-medium" style={{ fontSize: '0.6rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Kantor Aktif
                                </span>
                                <span className="font-semibold text-xs" style={{ color: '#4F46E5' }}>
                                    {activeBranch}
                                </span>
                            </div>
                        </div>

                        <Divider className="my-2" style={{ borderColor: '#F3F4F6' }} />

                        {/* Level 1: Kantor Pusat */}
                        {showPusat && (
                            <div className="flex flex-column gap-2 mb-3">
                                <label className="font-semibold text-xs text-600" style={{ letterSpacing: '0.03em' }}>
                                    <i className="pi pi-building mr-1" style={{ fontSize: '0.7rem' }}></i>
                                    Kantor Pusat
                                </label>
                                <Dropdown
                                    value={selectedPusat}
                                    onChange={(e) => {
                                        setSelectedPusat(e.value);
                                        setSelectedDaerah(null);
                                        setSelectedUnit(null);
                                        setSelectedKecamatan(null);
                                        if (e.value) applyBranch(e.value, false);
                                        else applyBranch(null as any); // Clear completely
                                    }}
                                    options={pusatList}
                                    optionLabel="nama_cabang"
                                    optionValue="id_cabang"
                                    placeholder="Pilih Kantor Pusat"
                                    showClear
                                    filter
                                    className="w-full p-dropdown-sm"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {/* Level 2: Pusat Daerah */}
                        {showDaerah && (
                            <div className="flex flex-column gap-2 mb-3">
                                <label className="font-semibold text-xs text-600" style={{ letterSpacing: '0.03em' }}>
                                    <i className="pi pi-sitemap mr-1" style={{ fontSize: '0.7rem' }}></i>
                                    Kantor Pusat Daerah
                                </label>
                                <Dropdown
                                    value={selectedDaerah}
                                    onChange={(e) => {
                                        setSelectedDaerah(e.value);
                                        setSelectedUnit(null);
                                        setSelectedKecamatan(null);
                                        if (e.value) applyBranch(e.value, false);
                                        else applyBranch(selectedPusat, false); // Revert to level 1
                                    }}
                                    options={daerahList}
                                    optionLabel="nama_cabang"
                                    optionValue="id_cabang"
                                    placeholder="Pilih Pusat Daerah"
                                    showClear
                                    filter
                                    className="w-full p-dropdown-sm"
                                />
                            </div>
                        )}

                        {/* Level 3: Unit Daerah */}
                        {showUnit && (
                            <div className="flex flex-column gap-2 mb-3">
                                <label className="font-semibold text-xs text-600" style={{ letterSpacing: '0.03em' }}>
                                    <i className="pi pi-map mr-1" style={{ fontSize: '0.7rem' }}></i>
                                    Kantor Unit Daerah
                                </label>
                                <Dropdown
                                    value={selectedUnit}
                                    onChange={(e) => {
                                        setSelectedUnit(e.value);
                                        setSelectedKecamatan(null);
                                        if (e.value) applyBranch(e.value, false);
                                        else applyBranch(selectedDaerah, false); // Revert to level 2
                                    }}
                                    options={unitList}
                                    optionLabel="nama_cabang"
                                    optionValue="id_cabang"
                                    placeholder="Pilih Unit Daerah"
                                    showClear
                                    filter
                                    className="w-full p-dropdown-sm"
                                />
                            </div>
                        )}

                        {/* Level 4: Kantor Kecamatan */}
                        {showKecamatan && (
                            <div className="flex flex-column gap-2 mb-3">
                                <label className="font-semibold text-xs text-600" style={{ letterSpacing: '0.03em' }}>
                                    <i className="pi pi-home mr-1" style={{ fontSize: '0.7rem' }}></i>
                                    Kantor Unit Kecamatan ({kecamatanList.length} data)
                                </label>
                                <Dropdown
                                    value={selectedKecamatan}
                                    onChange={(e) => {
                                        setSelectedKecamatan(e.value);
                                        if (e.value) applyBranch(e.value, false);
                                        else applyBranch(selectedUnit, false); // Revert to level 3
                                    }}
                                    options={kecamatanList}
                                    optionLabel="nama_cabang"
                                    optionValue="id_cabang"
                                    placeholder="Pilih Kantor Kecamatan"
                                    showClear
                                    filter
                                    className="w-full p-dropdown-sm"
                                />
                            </div>
                        )}

                        {/* Hierarchy breadcrumb */}
                        {selectedPusat && (
                            <>
                                <Divider className="my-2" style={{ borderColor: '#F3F4F6' }} />
                                <div className="flex align-items-center gap-1 flex-wrap" style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                                    <i className="pi pi-sitemap" style={{ fontSize: '0.6rem' }}></i>
                                    <span>{allBranches.find(b => b.id_cabang === selectedPusat)?.nama_cabang || '-'}</span>
                                    {selectedDaerah && (
                                        <>
                                            <i className="pi pi-angle-right" style={{ fontSize: '0.6rem' }}></i>
                                            <span>{allBranches.find(b => b.id_cabang === selectedDaerah)?.nama_cabang || '-'}</span>
                                        </>
                                    )}
                                    {selectedUnit && (
                                        <>
                                            <i className="pi pi-angle-right" style={{ fontSize: '0.6rem' }}></i>
                                            <span>{allBranches.find(b => b.id_cabang === selectedUnit)?.nama_cabang || '-'}</span>
                                        </>
                                    )}
                                    {selectedKecamatan && (
                                        <>
                                            <i className="pi pi-angle-right" style={{ fontSize: '0.6rem' }}></i>
                                            <span>{allBranches.find(b => b.id_cabang === selectedKecamatan)?.nama_cabang || '-'}</span>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </OverlayPanel>
            )}
        </>
    );
};

export default BranchSwitcher;
