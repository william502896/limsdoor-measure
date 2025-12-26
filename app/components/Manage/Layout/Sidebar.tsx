"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/app/lib/store-context";
import {
    LayoutDashboard,
    Calendar,
    Users,
    FileText,
    Wrench,
    Mic,
    BarChart3,
    Settings,
    LogOut,
    Hammer,
    Image as ImageIcon,
    Home,
    Truck,
    Bell,
    X,
    Radio,
    Coins
} from "lucide-react";

type SidebarProps = {
    collapsed?: boolean;
    mobile?: boolean;
    onClose?: () => void;
};

// Internal component using searchParams
function SidebarContent({ collapsed = false, mobile = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { global, markNotificationRead } = useGlobalStore();
    const notifications = global.notifications;
    const [showNotif, setShowNotif] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotifClick = (id: string, link?: string) => {
        markNotificationRead(id);
        if (link) window.location.href = link;
    };

    const MENU_ITEMS = [
        { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/manage" },
        { id: "dispatch", label: "배차 관제", icon: Truck, href: "/admin/dispatch" },
        { id: "schedule", label: "현장 관리", icon: Calendar, href: "/schedule" },
        { id: "install", label: "시공/기사", icon: Hammer, href: "/admin/dispatch?tab=personnel" },
        { id: "gallery", label: "포트폴리오", icon: ImageIcon, href: "/portfolio" },
        { id: "customer", label: "고객 관리", icon: Users, href: "/manage?view=customer" },
        { id: "contract", label: "계약/견적", icon: FileText, href: "/manage?view=contract" },
        { id: "as", label: "AS/하자", icon: Wrench, href: "/manage?view=as" },
        { id: "voice", label: "음성/AI", icon: Mic, href: "/manage?view=voice" },
        { id: "radio", label: "무전기", icon: Radio, href: "/manage?view=radio" },
        { id: "miso-costs", label: "매입단가(미소)", icon: Coins, href: "/admin/miso-costs" },
        { id: "reports", label: "리포트", icon: BarChart3, href: "/manage?view=reports" },
    ];

    return (
        <div
            className={`
                h-full flex flex-col bg-slate-900 text-slate-300 shadow-xl transition-all duration-300 z-50
                ${mobile ? "w-72 fixed inset-y-0 left-0" : (collapsed ? "w-20" : "w-64")}
            `}
        >
            {/* Logo Area */}
            <div className={`h-16 flex items-center ${collapsed && !mobile ? 'justify-center' : 'justify-between px-4'} border-b border-slate-800 bg-slate-950`}>
                <Link href="/" className="group flex items-center gap-2 overflow-hidden whitespace-nowrap">
                    <div className="w-8 h-8 flex-shrink-0 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform">L</div>
                    {!collapsed && (
                        <span className="font-bold text-xl text-white tracking-tight animate-in fade-in duration-300">LIMSDOOR</span>
                    )}
                </Link>
                {mobile && onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* Notification & Profile */}
            <div className={`p-4 border-b border-slate-800 bg-slate-900/50 ${collapsed ? "flex flex-col items-center" : ""}`}>
                {!collapsed ? (
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">AD</div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-semibold text-white truncate">관리자</div>
                                <div className="text-xs text-slate-500 truncate">통합 관리자</div>
                            </div>
                        </div>
                        <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
                            <Bell size={20} />
                            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>}
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <div onClick={() => setShowNotif(!showNotif)} className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold mb-4 cursor-pointer" title="관리자">
                            AD
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></span>}
                        </div>
                    </div>
                )}

                {/* Notifications Logic */}
                {showNotif && (
                    <div className={`
                        bg-slate-800 rounded-xl p-2 mb-4 animate-in fade-in slide-in-from-top-2 border border-slate-700 shadow-2xl z-50
                        ${collapsed ? "fixed left-20 top-20 w-64" : "absolute left-4 right-4 top-20"}
                    `}>
                        <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-slate-700/50">
                            <span className="text-xs font-bold text-white">알림 ({unreadCount})</span>
                            <button onClick={() => setShowNotif(false)}><X size={12} /></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                            {unreadCount === 0 && <div className="text-center py-4 text-xs text-slate-500">알림 없음</div>}
                            {notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotifClick(n.id, n.link)} className="p-2 rounded hover:bg-slate-700 cursor-pointer">
                                    <div className="text-xs font-bold text-slate-200">{n.message}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                {!collapsed && <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</div>}
                <ul className="space-y-1 px-2">
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href ||
                            (pathname !== "/manage" && pathname.startsWith(item.href + "?")) ||
                            (item.href.includes("?view=") && pathname + "?" + searchParams?.toString() === item.href);

                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                                        ${active ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"}
                                        ${collapsed ? "justify-center" : ""}
                                    `}
                                    title={collapsed ? item.label : ""}
                                    onClick={mobile && onClose ? onClose : undefined}
                                >
                                    <Icon size={collapsed ? 22 : 18} className={active ? "text-white" : "text-slate-400"} />
                                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                    <li>
                        <Link
                            href="/settings"
                            className={`
                                flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                                ${pathname === '/settings' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"}
                                ${collapsed ? "justify-center" : ""}
                            `}
                            title={collapsed ? "설정" : ""}
                        >
                            <Settings size={collapsed ? 22 : 18} />
                            {!collapsed && <span className="text-sm font-medium">설정</span>}
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 space-y-2">
                <Link href="/field/new" className={`flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-900/50 ${collapsed ? "justify-center px-0" : ""}`}>
                    <span className="text-lg">📏</span>
                    {!collapsed && <span>현장 실측</span>}
                </Link>
                {!collapsed && (
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        <LogOut size={16} />
                        로그아웃
                    </button>
                )}
            </div>
        </div>
    );
}

// Export default component wrapped in Suspense
export default function Sidebar(props: SidebarProps) {
    return (
        <Suspense fallback={<div className="w-64 bg-slate-900 h-screen" />}>
            <SidebarContent {...props} />
        </Suspense>
    );
}
