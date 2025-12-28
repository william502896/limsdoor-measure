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
    Coins,
    ShieldCheck, // Tier 1 Header Icon
    Building2,   // Vendor
    Package,     // Items
    Banknote,    // Price/Margin
    Receipt,      // Statement
    Palette,       // Design
    Lock          // Locked Icon
} from "lucide-react";

// ...

// Tier 1 (Super Admin) Group
const TIER1_ITEMS = [
    { id: "vendors", label: "거래처 관리", icon: Building2, href: "/admin/partners" },
    { id: "pricing", label: "단가 관리", icon: Coins, href: "/admin/purchase-costs" },
    { id: "materials", label: "품목/자재", icon: Package, href: "/admin/items" },
    { id: "margins", label: "단가/마진", icon: Banknote, href: "/admin/prices" },
    { id: "statement", label: "전자 명세서", icon: Receipt, href: "/admin/invoices" },
    { id: "design", label: "UI 디자인", icon: Palette, href: "/admin/design" },
];

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

    // Tier 1 Visibility State
    const [isTier1, setIsTier1] = useState(false);

    React.useEffect(() => {
        const check = () => setIsTier1(document.cookie.includes("tier1_ui=1"));
        check(); // Check on mount
        window.addEventListener("tier1-login", check);
        return () => window.removeEventListener("tier1-login", check);
    }, []);

    // Auto-lock Timer (3 minutes)
    const lastActivityRef = React.useRef(Date.now());

    React.useEffect(() => {
        const reset = () => { lastActivityRef.current = Date.now(); };
        window.addEventListener("mousemove", reset);
        window.addEventListener("keydown", reset);
        window.addEventListener("click", reset);
        window.addEventListener("scroll", reset);
        return () => {
            window.removeEventListener("mousemove", reset);
            window.removeEventListener("keydown", reset);
            window.removeEventListener("click", reset);
            window.removeEventListener("scroll", reset);
        };
    }, []);

    React.useEffect(() => {
        if (!isTier1) return;

        const checkInterval = setInterval(async () => {
            const idleTime = Date.now() - lastActivityRef.current;
            if (idleTime > 3 * 60 * 1000) { // 3 minutes
                // Auto Logout
                try {
                    await fetch("/api/admin/tier1/logout", { method: "POST" });
                    setIsTier1(false);
                    // Force Sidebar Update
                    window.dispatchEvent(new Event("tier1-login"));

                    // Optional: If on admin page, redirect? 
                    // But Sidebar is enough to lock. 
                    // Redirecting specific page content needs page-level logic, but hiding menu is key.
                } catch (e) {
                    console.error("Auto-logout failed", e);
                }
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(checkInterval);
    }, [isTier1]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotifClick = (id: string, link?: string) => {
        markNotificationRead(id);
        if (link) window.location.href = link;
    };

    const MENU_ITEMS = [
        { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/manage?view=dashboard" },
        { id: "dispatch", label: "배차 관제", icon: Truck, href: "/manage?view=dispatch" },
        { id: "schedule", label: "현장 관리", icon: Calendar, href: "/manage?view=schedule" },
        { id: "install", label: "시공/기사", icon: Hammer, href: "/manage?view=dispatch&tab=personnel" },
        { id: "gallery", label: "포트폴리오", icon: ImageIcon, href: "/manage?view=portfolio" },
        { id: "customer", label: "고객 관리", icon: Users, href: "/manage?view=customer" },
        { id: "contract", label: "계약/견적", icon: FileText, href: "/manage?view=contract" },
        { id: "as", label: "AS/하자", icon: Wrench, href: "/manage?view=as" },
        { id: "voice", label: "음성/AI", icon: Mic, href: "/manage?view=voice" },
        { id: "radio", label: "무전기", icon: Radio, href: "/manage?view=radio" },
        { id: "reports", label: "리포트", icon: BarChart3, href: "/manage?view=reports" },
    ];

    // Tier 1 (Super Admin) Group
    const TIER1_ITEMS = [
        { id: "vendors", label: "거래처 관리", icon: Building2, href: "/admin/partners" },
        { id: "pricing", label: "단가 관리", icon: Coins, href: "/admin/purchase-costs" },
        { id: "materials", label: "품목/자재", icon: Package, href: "/admin/items" },
        { id: "margins", label: "단가/마진", icon: Banknote, href: "/admin/prices" },
        { id: "statement", label: "전자 명세서", icon: Receipt, href: "/admin/invoices" },
        { id: "design", label: "UI 디자인", icon: Palette, href: "/admin/design" },
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
                <Link href="/manage" className="flex items-center gap-2 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shrink-0">
                        L
                    </div>
                    {!collapsed && <span className="text-lg font-bold text-white whitespace-nowrap">LimsDoor</span>}
                </Link>
                {mobile && onClose && (
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Notification Area (Only if Expanded) */}
            {!collapsed && !mobile && (
                <div className="px-4 pt-4">
                    <div className="relative">
                        <button
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition border border-slate-700/50 group"
                            onClick={() => setShowNotif(!showNotif)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell size={18} className="text-slate-400 group-hover:text-indigo-400 transition" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-800"></span>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-slate-400">알림 센터</span>
                            </div>
                            <span className="text-[10px] font-bold bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 group-hover:bg-indigo-900 group-hover:text-indigo-300 transition">
                                {unreadCount} new
                            </span>
                        </button>

                        {/* Dropdown */}
                        {showNotif && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-20">
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
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
                </div>
            )}

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                {!collapsed && <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</div>}
                <ul className="space-y-1 px-2 mb-6">
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const currentView = searchParams?.get("view") || "dashboard";

                        // Extract view from item.href (e.g. /manage?view=dispatch)
                        let itemView = "dashboard";
                        if (item.href.includes("?view=")) {
                            itemView = item.href.split("?view=")[1].split("&")[0];
                        }

                        // Special case for 'install' which shares 'dispatch' view but different tab
                        if (item.id === "install") {
                            // Only active if tab=personnel
                            const currentTab = searchParams?.get("tab");
                            var isActive = currentView === "dispatch" && currentTab === "personnel";
                        } else {
                            // Normal view matching
                            var isActive = currentView === itemView;
                            // If item is dispatch main, ensure tab is NOT personnel
                            if (item.id === "dispatch" && isActive) {
                                const currentTab = searchParams?.get("tab");
                                if (currentTab === "personnel") isActive = false;
                            }
                        }

                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                                        ${isActive ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"}
                                        ${collapsed ? "justify-center" : ""}
                                    `}
                                    title={collapsed ? item.label : ""}
                                    onClick={mobile && onClose ? onClose : undefined}
                                >
                                    <Icon size={collapsed ? 22 : 18} className={isActive ? "text-white" : "text-slate-400"} />
                                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Tier 1 Group (Protected) - Visible ONLY when Unlocked */}
                {isTier1 && (
                    <>
                        <div className="h-px bg-slate-800 mx-4 my-2" />

                        {/* Folder Header */}
                        <div className={`px-3 py-2 flex items-center justify-between group cursor-pointer ${collapsed ? 'justify-center' : ''}`} title="1티어 관리자 메뉴">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold">
                                <ShieldCheck size={collapsed ? 20 : 16} />
                                {!collapsed && <span className="text-sm">1티어 관리자 메뉴</span>}
                            </div>
                            {!collapsed && (
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await fetch("/api/admin/tier1/logout", { method: "POST" });
                                        setIsTier1(false);
                                        window.dispatchEvent(new Event("tier1-login"));
                                        window.location.reload(); // Force Reload
                                    }}
                                    className="p-1 hover:bg-slate-800 rounded text-indigo-300 hover:text-red-400 transition"
                                    title="잠금 (로그아웃)"
                                >
                                    <Lock size={14} />
                                </button>
                            )}
                        </div>

                        {/* Folder Items (Indented) */}
                        <div className="pl-4 pr-2 space-y-1 mb-2 animate-in slide-in-from-left-2 duration-300">
                            {TIER1_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const active = pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`
                                            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                            ${active ? "bg-indigo-900/30 text-indigo-300 border-l-2 border-indigo-500" : "text-slate-400 hover:text-white hover:bg-slate-800"}
                                            ${collapsed ? "justify-center" : ""}
                                        `}
                                        title={collapsed ? item.label : ""}
                                        onClick={mobile && onClose ? onClose : undefined}
                                    >
                                        <Icon size={16} className={active ? "text-indigo-400" : "text-slate-500"} />
                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}

                <div className="h-px bg-slate-800 mx-4 my-2" />

                <ul className="space-y-1 px-2">
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
                    <button
                        onClick={async () => {
                            // Clear Tier 1
                            await fetch("/api/admin/tier1/logout", { method: "POST" });
                            // Clear Supabase (Client Side) - Assuming standard supabase client usage somewhere, or redirect
                            // For now, triggering Tier 1 Logout and redirecting to login
                            setIsTier1(false);
                            window.location.href = "/manage"; // Or /login if real logout
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
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
