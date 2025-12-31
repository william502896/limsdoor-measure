"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/app/lib/store-context";
import {
    LayoutDashboard,
    Layout,
    GitBranch,
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
    ShieldCheck,
    Building2,
    Package,
    Banknote,
    Receipt,
    Palette,
    Lock,
    Megaphone,
    PhoneCall,
    Ruler,
    Star,
    ChevronDown,
    ChevronRight
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

    // Derived State
    const currentView = searchParams.get("view") || "dashboard";
    const currentTab = searchParams.get("tab");

    // Collapsible State for Marketing
    const [isMarketingOpen, setIsMarketingOpen] = useState(true);
    const [isScheduleOpen, setIsScheduleOpen] = useState(true);
    const [isCustomerOpen, setIsCustomerOpen] = useState(true);

    // Tier 1 Visibility State
    const [isTier1, setIsTier1] = useState(false);

    React.useEffect(() => {
        const check = () => setIsTier1(document.cookie.includes("tier1_ui=1"));
        check();
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
            if (idleTime > 3 * 60 * 1000) {
                try {
                    await fetch("/api/admin/tier1/logout", { method: "POST" });
                    setIsTier1(false);
                    window.dispatchEvent(new Event("tier1-login"));
                } catch (e) {
                    console.error("Auto-logout failed", e);
                }
            }
        }, 5000);
        return () => clearInterval(checkInterval);
    }, [isTier1]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotifClick = (id: string, link?: string) => {
        markNotificationRead(id);
        if (link) window.location.href = link;
    };

    const MARKETING_ITEMS = [
        { id: "landings", label: "랜딩 제작", icon: Layout, href: "/admin/marketing/landings" },
        { id: "leads", label: "리드 점수", icon: BarChart3, href: "/admin/marketing/leads" },
        { id: "scenarios", label: "자동 시나리오", icon: GitBranch, href: "/admin/marketing/scenarios" },
        { id: "stats", label: "성과 분석", icon: BarChart3, href: "/admin/marketing/stats" },

        { id: "consulting", label: "상담 / 예약", icon: PhoneCall, href: "/manage?view=consulting" },
    ];

    const SCHEDULE_ITEMS = [
        { id: "all", label: "통합 일정", icon: Calendar, href: "/manage?view=schedule&type=all" },
        { id: "consulting", label: "상담 일정", icon: PhoneCall, href: "/manage?view=schedule&type=consulting" },
        { id: "measure", label: "실측/견적", icon: Ruler, href: "/manage?view=schedule&type=measure" },
        { id: "install", label: "시공 일정", icon: Hammer, href: "/manage?view=schedule&type=install" },
        { id: "reform", label: "리폼/수리", icon: Wrench, href: "/manage?view=schedule&type=reform" },
        { id: "as", label: "AS 일정", icon: ShieldCheck, href: "/manage?view=schedule&type=as" },
    ];

    const CUSTOMER_ITEMS = [
        { id: "all", label: "통합 관리", icon: Users, href: "/manage?view=customer&type=all" },
        { id: "prospective", label: "가망 고객", icon: Star, href: "/manage?view=customer&type=prospective" },
        { id: "consulting", label: "상담 고객", icon: PhoneCall, href: "/manage?view=customer&type=consulting" },
        { id: "contract", label: "계약 고객", icon: FileText, href: "/manage?view=customer&type=contract" },
        { id: "purchased", label: "구매 고객", icon: Package, href: "/manage?view=customer&type=purchased" },
    ];

    const MENU_ITEMS = [
        { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/manage?view=dashboard" },
        // Marketing will be inserted here manually
        // Schedule will be inserted here manually
        { id: "contract", label: "견적 / 결제", icon: FileText, href: "/manage?view=contract" },
        { id: "construction", label: "시공 관리", icon: Hammer, href: "/manage?view=construction" },
        { id: "retention", label: "후기 / 재구매", icon: Star, href: "/manage?view=retention" },
    ];

    // Check if any marketing item is active
    const isMarketingActive = MARKETING_ITEMS.some(item => {
        if (item.href.includes("view=")) {
            const view = item.href.split("view=")[1];
            return currentView === view;
        }
        return pathname.includes(item.href);
    });

    // Auto open if active
    React.useEffect(() => {
        if (isMarketingActive) setIsMarketingOpen(true);
    }, [isMarketingActive]);

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
                <div className={`px-2 mb-6 ${collapsed ? 'text-center' : ''}`}>
                    <Link
                        href="/admin/onboarding"
                        className={`
                            flex items-center gap-2 w-full rounded-xl font-bold transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.3)] animate-pulse
                            bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/50 hover:scale-[1.02]
                            ${collapsed ? "justify-center p-3" : "px-3 py-3"}
                        `}
                        title="사용 등록하기"
                    >
                        <span className="text-lg">🚀</span>
                        {!collapsed && <span className="text-sm">사용 등록하기</span>}
                    </Link>
                </div>

                {!collapsed && <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</div>}
                <ul className="space-y-1 px-2 mb-6">
                    {/* Dashboard */}
                    <li>
                        <Link
                            href="/manage?view=dashboard"
                            className={`
                                flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                                ${currentView === "dashboard" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"}
                                ${collapsed ? "justify-center" : ""}
                            `}
                            title={collapsed ? "대시보드" : ""}
                        >
                            <LayoutDashboard size={collapsed ? 22 : 18} className={currentView === "dashboard" ? "text-white" : "text-slate-400"} />
                            {!collapsed && <span className="text-sm font-medium">대시보드</span>}
                        </Link>
                    </li>

                    {/* Marketing Folder */}
                    <li>
                        <button
                            onClick={() => setIsMarketingOpen(!isMarketingOpen)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white
                                ${collapsed ? "justify-center" : "justify-between"}
                                ${isMarketingActive ? "bg-slate-800/50 text-indigo-400" : ""}
                            `}
                            title={collapsed ? "마케팅" : ""}
                        >
                            <div className="flex items-center gap-3">
                                <Megaphone size={collapsed ? 22 : 18} />
                                {!collapsed && <span className="text-sm font-medium">마케팅</span>}
                            </div>
                            {!collapsed && (
                                isMarketingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                            )}
                        </button>

                        {/* Sub Items */}
                        {!collapsed && isMarketingOpen && (
                            <div className="ml-4 pl-4 border-l border-slate-700 mt-1 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                {MARKETING_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    let active = false;
                                    if (item.href.includes("view=")) {
                                        const view = item.href.split("view=")[1];
                                        active = currentView === view;
                                    } else {
                                        active = pathname.startsWith(item.href);
                                    }

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className={`
                                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                                ${active ? "text-indigo-400 font-bold bg-slate-800/50" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}
                                            `}
                                        >
                                            <Icon size={16} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </li>

                    {/* Schedule Folder */}
                    <li>
                        <button
                            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white
                                ${collapsed ? "justify-center" : "justify-between"}
                                ${currentView === "schedule" ? "bg-slate-800/50 text-indigo-400" : ""}
                            `}
                            title={collapsed ? "일정 관리" : ""}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar size={collapsed ? 22 : 18} />
                                {!collapsed && <span className="text-sm font-medium">일정 관리</span>}
                            </div>
                            {!collapsed && (
                                isScheduleOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                            )}
                        </button>

                        {/* Sub Items */}
                        {!collapsed && isScheduleOpen && (
                            <div className="ml-4 pl-4 border-l border-slate-700 mt-1 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                {SCHEDULE_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const type = item.href.split("type=")[1];
                                    const currentType = searchParams.get("type") || "all";
                                    const active = currentView === "schedule" && currentType === type;

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className={`
                                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                                ${active ? "text-indigo-400 font-bold bg-slate-800/50" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}
                                            `}
                                        >
                                            <Icon size={16} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </li>

                    {/* Customer Folder */}
                    <li>
                        <button
                            onClick={() => setIsCustomerOpen(!isCustomerOpen)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white
                                ${collapsed ? "justify-center" : "justify-between"}
                                ${currentView === "customer" ? "bg-slate-800/50 text-indigo-400" : ""}
                            `}
                            title={collapsed ? "고객 관리" : ""}
                        >
                            <div className="flex items-center gap-3">
                                <Users size={collapsed ? 22 : 18} />
                                {!collapsed && <span className="text-sm font-medium">고객 관리</span>}
                            </div>
                            {!collapsed && (
                                isCustomerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                            )}
                        </button>

                        {/* Sub Items */}
                        {!collapsed && isCustomerOpen && (
                            <div className="ml-4 pl-4 border-l border-slate-700 mt-1 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                {CUSTOMER_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const type = item.href.split("type=")[1];
                                    const currentType = searchParams.get("type") || "all";
                                    const active = currentView === "customer" && currentType === type;

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className={`
                                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                                ${active ? "text-indigo-400 font-bold bg-slate-800/50" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}
                                            `}
                                        >
                                            <Icon size={16} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </li>

                    {MENU_ITEMS.filter(i => i.id !== "dashboard").map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;

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
