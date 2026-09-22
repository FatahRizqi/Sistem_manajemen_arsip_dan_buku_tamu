/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppTopbarRef } from '@/types';
import { LayoutContext } from './context/layoutcontext';
import { signOut, useSession } from 'next-auth/react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { formatDateCalendar } from '@/lib/tools/dateTools';
import BranchSwitcher from './BranchSwitcher';
import getData from '@/lib/axios/getData';
import putData from '@/lib/axios/putData';
import { useRouter } from 'next/navigation';

interface NotificationItem {
    id_notifikasi: number;
    id_pengguna: number | null;
    judul: string;
    pesan: string;
    tipe: string;
    tautan: string | null;
    status_baca: number;
    created_at: string;
    updated_at: string;
}

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {
    const { data: session } = useSession();
    const activeRole = (session?.user as any)?.role || (session?.user as any)?.roleCode || 'Role belum terbaca';
    const { onMenuToggle } = useContext(LayoutContext);
    const menubuttonRef = useRef<HTMLButtonElement>(null);
    const op = useRef<OverlayPanel>(null);
    const notificationOp = useRef<OverlayPanel>(null);
    const [realZonedTime, setRealZonedTime] = useState<String | null>("-");

    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const fetchNotifications = async () => {
        if (!session) return;
        try {
            const res = await getData('/notification');
            if (res?.data?.status === '00') {
                setNotifications(res.data.data || []);
                setUnreadCount(res.data.unread_count || 0);
            }
        } catch (err) {
            console.error('Gagal mengambil data notifikasi:', err);
        }
    };

    const handleNotificationClick = async (item: NotificationItem) => {
        notificationOp.current?.hide();
        try {
            if (item.status_baca === 0) {
                await putData('/notification/mark-read', { id_notifikasi: item.id_notifikasi });
                setNotifications(prev => prev.map(n => n.id_notifikasi === item.id_notifikasi ? { ...n, status_baca: 1 } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Gagal menandai notifikasi dibaca:', err);
        }

        if (item.tautan) {
            router.push(item.tautan);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await putData('/notification/mark-read', {});
            setNotifications(prev => prev.map(n => ({ ...n, status_baca: 1 })));
            setUnreadCount(0);
            notificationOp.current?.hide();
        } catch (err) {
            console.error('Gagal menandai semua notifikasi dibaca:', err);
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Baru saja';
            if (diffMins < 60) return `${diffMins} menit lalu`;
            if (diffHours < 24) return `${diffHours} jam lalu`;
            if (diffDays === 1) return 'Kemarin';
            if (diffDays < 7) return `${diffDays} hari lalu`;
            
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return '-';
        }
    };

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current,
        topbarmenu: null,
        topbarmenubutton: null
    }));


    useEffect(() => {
        const timer = setInterval(() => {
            setRealZonedTime(formatDateCalendar(new Date(), "EEEE, dd MMMM yyyy HH:mm:ss", null, 'id'));
        }, 1000);

        fetchNotifications();
        const notificationTimer = setInterval(fetchNotifications, 60000);

        return () => {
            clearInterval(timer);
            clearInterval(notificationTimer);
        };
    }, [session]);

    const handleLogout = async () => {
        // Hapus cookie kustom
        document.cookie = '_A2R=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = '_A2F=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

        // Bersihkan storage
        sessionStorage.clear();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('globalFilter');

        await signOut({ callbackUrl: '/auth/login' });
    };

    return (
        <div className="layout-topbar">
            <div className="flex justify-content-between w-full align-items-center">
                {/* Brand Logo, Branch Switcher & Sidebar Toggle */}
                <div className="flex align-items-center gap-2">
                    <Link href="/" className="layout-topbar-logo flex align-items-center gap-2 no-underline mr-1" style={{ cursor: 'pointer' }}>
                        <Avatar
                            icon="pi pi-shield"
                            shape="square"
                            style={{
                                width: '2.75rem',
                                height: '2.75rem',
                                fontSize: '1.4rem',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
                                color: '#FFFFFF',
                                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)'
                            }}
                        />
                        <div className="flex flex-column justify-content-center">
                            <span className="font-bold text-xl text-900" style={{ lineHeight: '1', letterSpacing: '-0.02em' }}>
                                Arsipku
                            </span>
                        </div>
                    </Link>

                    {/* Hamburger Button (Garis 3) */}
                    <button
                        ref={menubuttonRef}
                        type="button"
                        className="p-link layout-menu-button layout-topbar-button flex align-items-center justify-content-center border-round"
                        onClick={onMenuToggle}
                        style={{
                            width: '2.25rem',
                            height: '2.25rem',
                            cursor: 'pointer',
                            color: 'var(--text-color-secondary)',
                            background: 'transparent',
                            transition: 'background-color 0.2s'
                        }}
                        title="Buka / Tutup Sidebar"
                        aria-label="Buka / Tutup Sidebar"
                    >
                        <i className="pi pi-bars text-xl" />
                    </button>
                </div>

                {/* Clock, User Role & Actions */}
                <div className="flex align-items-center gap-2">
                    {/* Clock Text & User Role */}
                    <div className="hidden md:flex align-items-center gap-2 mr-2">
                        <span className="font-bold text-sm text-700">{realZonedTime}</span>
                        <span className="text-400 font-normal mx-1">|</span>
                        <span className="text-sm font-normal text-600">
                            {session?.user?.name || activeRole || 'Superadmin'}
                        </span>
                    </div>

                    {/* Branch Switcher dipindah ke kanan untuk UI yang lebih rapi */}
                    <BranchSwitcher />

                    {/* Notification Bell */}
                    <div className="relative flex align-items-center">
                        <Button
                            icon="pi pi-bell"
                            rounded
                            text
                            severity="secondary"
                            onClick={(e) => notificationOp.current?.toggle(e)}
                            style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                color: '#4b5563',
                                fontSize: '1.1rem'
                            }}
                            aria-label="Notifikasi"
                        >
                            {unreadCount > 0 && (
                                <Badge
                                    value={unreadCount}
                                    severity="danger"
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        minWidth: '16px',
                                        height: '16px',
                                        fontSize: '0.65rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0
                                    }}
                                />
                            )}
                        </Button>

                        {/* Notification OverlayPanel */}
                        <OverlayPanel
                            ref={notificationOp}
                            style={{
                                width: '320px',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            }}
                        >
                            <div className="flex flex-column p-1">
                                <div className="flex justify-content-between align-items-center mb-3 px-2 pt-2">
                                    <span className="font-bold text-base text-900">Notifikasi</span>
                                    {unreadCount > 0 && (
                                        <Tag value={`${unreadCount} Baru`} severity="danger" rounded style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', fontWeight: 700 }} />
                                    )}
                                </div>

                                <div className="flex flex-column gap-1" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {notifications.length === 0 ? (
                                        <div className="text-center py-4 text-500 text-sm">
                                            Tidak ada notifikasi baru
                                        </div>
                                    ) : (
                                        notifications.map((item) => {
                                            const isUnread = item.status_baca === 0;
                                            let icon = 'pi pi-bell';
                                            let avatarBg = 'rgba(234, 179, 8, 0.08)';
                                            let avatarColor = '#EAB308';

                                            if (item.tipe === 'surat_masuk') {
                                                icon = 'pi pi-envelope';
                                                avatarBg = 'rgba(79, 70, 229, 0.08)';
                                                avatarColor = '#4F46E5';
                                            } else if (item.tipe === 'disposisi') {
                                                icon = 'pi pi-share-alt';
                                                avatarBg = 'rgba(59, 130, 246, 0.08)';
                                                avatarColor = '#3B82F6';
                                            } else if (item.tipe === 'kunjungan' || item.tipe === 'buku_tamu') {
                                                icon = 'pi pi-user-plus';
                                                avatarBg = 'rgba(34, 197, 94, 0.08)';
                                                avatarColor = '#22C55E';
                                            } else if (item.tipe === 'peminjaman_arsip') {
                                                icon = 'pi pi-folder-open';
                                                avatarBg = 'rgba(249, 115, 22, 0.08)';
                                                avatarColor = '#F97316';
                                            } else if (item.tipe === 'surat_keluar') {
                                                icon = 'pi pi-send';
                                                avatarBg = 'rgba(139, 92, 246, 0.08)';
                                                avatarColor = '#8B5CF6';
                                            } else if (item.tipe === 'pemusnahan_arsip') {
                                                icon = 'pi pi-trash';
                                                avatarBg = 'rgba(239, 68, 68, 0.08)';
                                                avatarColor = '#EF4444';
                                            }

                                            return (
                                                <div
                                                    key={item.id_notifikasi}
                                                    onClick={() => handleNotificationClick(item)}
                                                    className="flex align-items-start gap-3 p-2 hover:surface-hover border-round cursor-pointer transition-colors transition-duration-150"
                                                    style={{
                                                        background: isUnread ? 'rgba(79, 70, 229, 0.03)' : 'transparent'
                                                    }}
                                                >
                                                    <Avatar
                                                        icon={icon}
                                                        shape="circle"
                                                        style={{
                                                            background: avatarBg,
                                                            color: avatarColor,
                                                            minWidth: '2.25rem',
                                                            height: '2.25rem',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                    <div className="flex flex-column gap-1 flex-1">
                                                        <span className={`text-sm text-900 ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                                                            {item.judul}
                                                        </span>
                                                        <span className="text-xs text-600 line-height-3">{item.pesan}</span>
                                                        <span className="text-400 font-medium" style={{ fontSize: '0.65rem' }}>
                                                            {formatRelativeTime(item.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <Divider className="my-2" style={{ borderColor: '#F3F4F6' }} />

                                <Button
                                    label="Tandai Semua Dibaca"
                                    onClick={handleMarkAllRead}
                                    text
                                    disabled={unreadCount === 0}
                                    className="w-full text-center text-xs font-semibold py-2 text-indigo-600 hover:bg-indigo-50 border-none"
                                    style={{ borderRadius: '6px', color: '#4F46E5' }}
                                />
                            </div>
                        </OverlayPanel>
                    </div>

                    {/* User Profile Button */}
                    <Button
                        icon="pi pi-user"
                        rounded
                        text
                        severity="secondary"
                        onClick={(e) => op?.current?.toggle(e)}
                        style={{
                            width: '2.25rem',
                            height: '2.25rem',
                            color: '#4b5563',
                            fontSize: '1.1rem'
                        }}
                        aria-label="Profil Saya"
                    />

                    {/* Profile OverlayPanel */}
                    <OverlayPanel ref={op} style={{ width: '240px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex flex-column p-1">
                            <div className="flex align-items-center gap-3 px-2 py-2 mb-1">
                                <Avatar
                                    label={(session?.user?.name || 'SA').slice(0, 2).toUpperCase()}
                                    shape="circle"
                                    style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', color: '#FFFFFF', fontWeight: 'bold' }}
                                />
                                <div className="flex flex-column">
                                    <span className="font-semibold text-sm text-900">{session?.user?.name || 'Super Admin'}</span>
                                    <span className="text-xs text-color-secondary">{activeRole}</span>
                                </div>
                            </div>


                            <Divider className="my-1" style={{ borderColor: '#F3F4F6' }} />

                            <Link href="/profile" className="flex align-items-center gap-3 text-700 no-underline hover:surface-hover transition-colors px-3 py-2 border-round" style={{ cursor: 'pointer' }}>
                                <i className="pi pi-user text-sm"></i>
                                <span className="text-sm font-medium">Profil Saya</span>
                            </Link>

                            <Link href="/setup/config" className="flex align-items-center gap-3 text-700 no-underline hover:surface-hover transition-colors px-3 py-2 border-round" style={{ cursor: 'pointer' }}>
                                <i className="pi pi-cog text-sm"></i>
                                <span className="text-sm font-medium">Pengaturan</span>
                            </Link>

                            <Divider className="my-1" style={{ borderColor: '#F3F4F6' }} />

                            <Button
                                label="Keluar"
                                icon="pi pi-sign-out"
                                severity="danger"
                                text
                                className="w-full text-left justify-content-start px-3 py-2 mt-1 font-medium text-sm hover:bg-red-50 text-red-600"
                                onClick={() => handleLogout()}
                                style={{ borderRadius: '6px' }}
                            />
                        </div>
                    </OverlayPanel>
                </div>
            </div>
        </div>
    );
});

AppTopbar.displayName = 'AppTopbar';

export default AppTopbar;
