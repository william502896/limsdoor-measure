"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    Bell, // Import Bell
    Check,
    X
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();
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
        { id: "dispatch", label: "배차 관제 (Dispatch)", icon: Truck, href: "/admin/dispatch" }, // New Link
        { id: "schedule", label: "현장 관리 (스케줄)", icon: Calendar, href: "/schedule" },
        { id: "install", label: "시공/기사 관리", icon: Hammer, href: "/admin/dispatch?tab=personnel" }, // Redirect to Admin View
        { id: "gallery", label: "시공 포트폴리오", icon: ImageIcon, href: "/portfolio" },
        { id: "customer", label: "고객 관리", icon: Users, href: "/manage?view=customer" }, // Keeping inside manage for now or extract later
        { id: "contract", label: "계약 / 견적", icon: FileText, href: "/manage?view=contract" },
        { id: "as", label: "AS / 하자 관리", icon: Wrench, href: "/manage?view=as" },
        { id: "voice", label: "음성 / AI 기록", icon: Mic, href: "/manage?view=voice" },
        { id: "reports", label: "영업 리포트", icon: BarChart3, href: "/manage?view=reports" },
        // { id: "settings", label: "설정", icon: Settings, href: "/manage?view=settings" },
    ];

    return (
        <div className="w-64 bg-slate-900 h-full flex flex-col text-slate-300 shadow-xl z-20 transition-all duration-300 relative">
            {/* Logo Area */}
            <Link href="/" className="group h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors">
                <div className="font-bold text-xl text-white tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform">L</div>
                    LIMSDOOR
                </div>
            </Link>

            {/* Notification & Profile Area */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                            AD
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-white">관리자</div>
                            <div className="text-xs text-slate-500">통합 관리자 허브</div>
                        </div>
                    </div>
                    {/* Notification Bell */}
                    <button
                        onClick={() => setShowNotif(!showNotif)}
                        className="relative p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
                        )}
                    </button>
                </div>

                {/* Notification Dropdown (Simple Inline) */}
                {showNotif && (
                    <div className="bg-slate-800 rounded-xl p-2 mb-4 animate-in fade-in slide-in-from-top-2 border border-slate-700">
                        <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-slate-700/50">
                            <span className="text-xs font-bold text-white">알림 ({unreadCount})</span>
                            <button onClick={() => setShowNotif(false)}><X size={12} /></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500">알림이 없습니다.</div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotifClick(n.id, n.link)}
                                        className={`p-2 rounded-lg cursor-pointer transition ${n.isRead ? 'bg-slate-800/50 opacity-50' : 'bg-slate-700 hover:bg-slate-600 border-l-2 border-indigo-500'}`}
                                    >
                                        <div className="text-xs font-bold text-slate-200 mb-0.5">{n.message}</div>
                                        {n.subText && <div className="text-[10px] text-slate-400">{n.subText}</div>}
                                        <div className="text-[9px] text-slate-500 mt-1 text-right">{new Date(n.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</div>
                <ul className="space-y-1 px-2">
                    <li className="mb-2">
                        <Link
                            href="/"
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-all text-slate-400"
                        >
                            <Home size={18} />
                            런처 홈으로
                        </Link>
                    </li>
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (pathname === "/manage" && item.href.includes("view") && pathname + window.location.search === item.href);
                        // Note: window usage in SSR might be tricky, but pathname check is usually enough for top level.
                        // For query params, simpler check:
                        const isActiveSimple = pathname === item.href.split("?")[0];

                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                        ${isActiveSimple && item.href.startsWith(pathname)
                                            ? "bg-indigo-600/10 text-indigo-400" // Sub-highlight or something
                                            : "hover:bg-slate-800 hover:text-white"
                                        }
                                        ${pathname === item.href ? "!bg-indigo-600 !text-white shadow-lg shadow-indigo-900/20" : ""}
                                    `}
                                >
                                    <Icon size={18} className={pathname === item.href ? "text-white" : "text-slate-400"} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                    <li>
                        <Link
                            href="/settings"
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                            ${pathname === '/settings' ? "!bg-indigo-600 !text-white shadow-lg shadow-indigo-900/20" : "bg-white/5 text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                        >
                            <Settings size={18} className={pathname === '/settings' ? "text-white" : "text-slate-400"} />
                            설정
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 space-y-2">
                <Link href="/field/new" className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-900/50">
                    <span className="text-lg">📏</span>
                    현장 실측 입력
                </Link>

                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    <LogOut size={16} />
                    로그아웃
                </button>
            </div>
        </div>
    );
}
