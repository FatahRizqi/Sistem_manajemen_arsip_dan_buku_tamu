'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import getData from '@/lib/axios/getData';

export interface Permission {
    nama_menu: string;
    url: string;
    hak_lihat: number | boolean;
    hak_buat: number | boolean;
    hak_ubah: number | boolean;
    hak_hapus: number | boolean;
    hak_setuju: number | boolean;
}

interface PermissionContextProps {
    permissions: Permission[];
    loading: boolean;
    hasPermission: (menuName: string, actionType: keyof Permission) => boolean;
}

const PermissionContext = createContext<PermissionContextProps>({
    permissions: [],
    loading: true,
    hasPermission: () => false,
});

export const PermissionProvider = ({ children }: { children: React.ReactNode }) => {
    const { data: session } = useSession();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!session?.user) {
                setLoading(false);
                return;
            }

            try {
                // Fetch profile which now includes permissions
                const res = await getData('/auth/profile');
                if (res.data?.data?.permissions) {
                    setPermissions(res.data.data.permissions);
                }
            } catch (error) {
                console.error("Gagal mengambil permissions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [session?.user]);

    const hasPermission = (menuName: string, actionType: keyof Permission): boolean => {
        // Jika Superadmin, berikan akses penuh (sebagai fallback di FE)
        const role = (session?.user as any)?.roleCode || (session?.user as any)?.role;
        if (role === 'SA' || role === 'SUPERADMIN' || role === 'Superadmin') {
            return true;
        }

        const menu = permissions.find((p) => p.nama_menu === menuName);
        if (!menu) return false;

        return menu[actionType] === 1 || menu[actionType] === true;
    };

    return (
        <PermissionContext.Provider value={{ permissions, loading, hasPermission }}>
            {children}
        </PermissionContext.Provider>
    );
};

import { usePathname } from 'next/navigation';

export const usePermissions = () => {
    const context = useContext(PermissionContext);
    const pathname = usePathname();
    const { data: session } = useSession();

    let canView = false;
    let canCreate = false;
    let canUpdate = false;
    let canDelete = false;
    let canApprove = false;

    if (context && !context.loading) {
        // Find permission by URL (start matching parent routes as fallback)
        let menu = context.permissions.find(p => pathname.startsWith(p.url) && p.url !== '/');
        // Prefer exact match
        const exactMenu = context.permissions.find(p => p.url === pathname);
        if (exactMenu) menu = exactMenu;

        const role = (session?.user as any)?.roleCode || (session?.user as any)?.role;
        const isSuperadmin = role === 'SA' || role === 'SUPERADMIN' || role === 'Superadmin';

        if (isSuperadmin) {
            canView = canCreate = canUpdate = canDelete = canApprove = true;
        } else if (menu) {
            canView = !!menu.hak_lihat;
            canCreate = !!menu.hak_buat;
            canUpdate = !!menu.hak_ubah;
            canDelete = !!menu.hak_hapus;
            canApprove = !!menu.hak_setuju;
        }
    }

    return {
        ...context,
        canView,
        canCreate,
        canUpdate,
        canDelete,
        canApprove,
        activeRole: (session?.user as any)?.role as string
    };
};
