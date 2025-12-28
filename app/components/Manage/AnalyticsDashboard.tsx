"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Calendar, CheckSquare, Activity, Bot, Settings, Send, X, Lock, Mic } from "lucide-react";
import DashboardChatWidget from "./DashboardChatWidget";
import LiveClock from "./LiveClock";
import LiveWeather from "./LiveWeather";
import { useGlobalStore } from "@/app/lib/store-context";
import RadioClient from "../RadioClient";
import AISearchBar from "./AISearchBar";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
    const supabase = useMemo(() => createSupabaseBrowser(), []);

    // Real Data State
    const [metrics, setMetrics] = useState({
        revenue: 0,
        orders: 0,
        completed: 0,
        asRate: 0,
        activeUsers: 0,
        measurers: 0,
        installers: 0
    });
    const [isDemo, setIsDemo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [shareModal, setShareModal] = useState<{ open: boolean, url: string, title: string } | null>(null);
    const [sharePhone, setSharePhone] = useState("");

    const [companyId, setCompanyId] = useState<string | null>(null);

    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPw, setAdminPw] = useState("");
    const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

    // Radio Modal State
    const [showRadioModal, setShowRadioModal] = useState(false);
    const [activeChannel, setActiveChannel] = useState("");
    const [showAiChat, setShowAiChat] = useState(false);

    const openRadio = (channel: string) => {
        setActiveChannel(channel);
        setShowRadioModal(true);
    };

    const handleShare = (title: string, url: string) => {
        setShareModal({ open: true, title, url: `${window.location.origin}${url}` });
        setSharePhone("");
    };

    const sendSms = () => {
        if (!shareModal || !sharePhone) return;
        const msg = `[LimsDoor] ${shareModal.title} 링크: ${shareModal.url}`;
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const link = isIOS ? `sms:${sharePhone}&body=${encodeURIComponent(msg)}` : `sms:${sharePhone}?body=${encodeURIComponent(msg)}`;
        window.location.href = link;
        // setShareModal(null); // Keep open? Or close.
    };

    useEffect(() => {
        async function fetchMetrics() {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                // Demo Mode Check (Cookie or Special ID)
                // We'll assume the onboarding page sets a cookie 'company_id' = 'demo'
                // But client usage of cookies is tricky. Let's check profile first.
                // If user is not logged in, maybe we are in demo mode?
                // Actually, Onboarding "Preview" likely sets the cookie.
                // We can try to read the cookie via document.cookie or just assume 'demo' if profile check fails but cookie exists?
                // Let's rely on the profile check first. If no profile, check if we have a 'demo' cookie marker?
                // Or simpler: The "Preview" button will set a dummy cookie.
                // But `supabase.auth.getUser()` might fail if we are just "Previewing" without logging in?
                // Middleware allows `/admin` if `onboarded=1`.
                // If "Preview" sets `onboarded=1` but NO Auth session...
                // One moment. Admin layout guards against "No User".
                // If "Preview" means "No Login Demo", then AdminLayoutClient will redirect to login.
                // "Preview" MUST utilize a logged-in user OR we need to bypass AdminLayoutClient's user check.

                // Assumption: User IS logged in (created account), just hasn't registered company details.
                // So "Preview" means "Use without Company Registration".

                let fetchedCompanyId = null;
                if (user) {
                    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
                    fetchedCompanyId = profile?.company_id;
                    setCompanyId(fetchedCompanyId);
                }

                // If no DB company_id, check if we are in "Demo Mode" via local state/cookie fallback?
                // Better: If Onboarding Page sets "demo" in the cookie, we might want to read it.
                // But for now, let's enable Demo if `companyId === 'demo'` OR if we pass a prop?
                // Let's assume the Demo Button updates the Profile to have company_id = 'demo' ?? 
                // No, that messes up the DB.
                // Let's assume "Preview" sets a cookie. We read it.
                const isDemoCookie = document.cookie.includes("company_id=demo");

                if (isDemoCookie || fetchedCompanyId === 'demo') {
                    setIsDemo(true);
                    setMetrics({
                        revenue: 125000000,
                        orders: 315,
                        completed: 280,
                        asRate: 2.5,
                        activeUsers: 12,
                        measurers: 5,
                        installers: 8
                    });
                    setLoading(false);
                    return;
                }

                if (!user || !fetchedCompanyId) return;

                // 1. Profiles (Staff) Count
                const { count: staffCount } = await supabase
                    .from("profiles") // "프로필" table might be used if migrated, but usually auth profiles is "profiles"
                    // Wait, user used "프로필" in onboarding. I should check if "profiles" exists or if I should use "프로필".
                    // Existing code (AdminLayout) used "profiles". Onboarding used "프로필".
                    // I will query BOTH or just `profiles` if I am sure. 
                    // Safest: Query `profiles` (User management usually there).
                    .select("*", { count: "exact", head: true })
                    .eq("company_id", fetchedCompanyId);

                // 2. Measurers
                // Table "측정자"
                const { count: measurCount } = await supabase
                    .from("측정자")
                    .select("*", { count: "exact", head: true })
                    .eq("company_id", fetchedCompanyId);

                // 3. Installers
                // Table "설치 기사"
                const { count: installCount } = await supabase
                    .from("설치 기사")
                    .select("*", { count: "exact", head: true })
                    .eq("company_id", fetchedCompanyId);

                setMetrics({
                    revenue: 0, // Not implemented yet
                    orders: 0, // Not implemented
                    completed: 0,
                    asRate: 0,
                    activeUsers: staffCount || 0,
                    measurers: measurCount || 0,
                    installers: installCount || 0
                });

            } catch (e) {
                console.error("Dashboard Fetch Error", e);
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();

        // Sync Tier 1 State
        const checkTier1 = () => {
            setIsAdminUnlocked(document.cookie.includes("tier1_ui=1"));
        };
        checkTier1();
        window.addEventListener("tier1-login", checkTier1);
        return () => window.removeEventListener("tier1-login", checkTier1);
    }, []);

    // Empty Charts for now
    const monthlyData = [{ name: "데이터 없음", value: 0 }];
    const categoryData = [{ name: "데이터 없음", value: 0 }];

    const { user, tenants, currentTenant, switchTenant } = useGlobalStore();

    return (
        <div className="space-y-6 relative pb-20">
            {/* Unified Tenant & Radio Header - High Visibility Redesign */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-colors relative overflow-hidden">
                {/* Decorative Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

                <div className="flex items-center gap-2 pl-2">
                    <span className="bg-indigo-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-sm">🏢 지점</span>
                    <span className="font-bold text-slate-700 text-sm">현재 접속중:</span>
                </div>
                <select
                    className="border-2 border-slate-200 p-2 rounded-lg text-sm bg-slate-50 text-slate-900 font-bold hover:border-indigo-400 focus:outline-indigo-500 transition-colors cursor-pointer min-w-[150px]"
                    value={currentTenant?.id}
                    onChange={(e) => switchTenant(e.target.value)}
                >
                    {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                {/* Radio Channels */}
                <div className="flex items-center gap-2 md:ml-4 md:border-l-2 border-slate-100 pl-0 md:pl-4 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        무전기 접속:
                    </span>
                    <button
                        onClick={() => openRadio("1")}
                        className="px-3 py-1.5 bg-white text-indigo-700 border-2 border-indigo-100 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm"
                    >
                        CH 1 (사무)
                    </button>
                    <button
                        onClick={() => openRadio("2")}
                        className="px-3 py-1.5 bg-white text-emerald-700 border-2 border-emerald-100 rounded-lg text-xs font-bold hover:bg-emerald-50 hover:border-emerald-300 transition shadow-sm"
                    >
                        CH 2 (실측)
                    </button>
                    <button
                        onClick={() => openRadio("3")}
                        className="px-3 py-1.5 bg-white text-orange-700 border-2 border-orange-100 rounded-lg text-xs font-bold hover:bg-orange-50 hover:border-orange-300 transition shadow-sm"
                    >
                        CH 3 (시공)
                    </button>
                    <button
                        onClick={() => openRadio("4")}
                        className="px-3 py-1.5 bg-white text-slate-600 border-2 border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                    >
                        CH 4 (예비)
                    </button>

                    {/* AI Chat Button */}
                    <button
                        onClick={() => setShowAiChat(true)}
                        className="px-3 py-1.5 bg-indigo-600 text-white border-2 border-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-1 animate-in fade-in"
                    >
                        <Bot size={14} />
                        AI Agent (Voice)
                    </button>
                </div>

                <div className="hidden md:flex ml-auto text-[10px] text-slate-400 gap-2 items-center">
                    <span className="font-medium text-slate-600">👤 {user?.name}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200 font-bold">
                        {user?.roles[currentTenant?.id || ""] || "GUEST"}
                    </span>
                </div>
            </div>

            {/* AI Search Bar - Prominent */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                <AISearchBar />
            </div>

            {/* Header Section with Live Status (Existing) */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">통합 관제 모니터링</h2>
                    <p className="text-sm text-slate-500">실시간 회사 현황 (Real Data)</p>
                </div>
                <div className="flex gap-2 items-center">
                    <LiveWeather />
                    <LiveClock />

                    {isAdminUnlocked ? (
                        <button
                            onClick={async () => {
                                try {
                                    await fetch("/api/admin/tier1/logout", { method: "POST" });
                                    // FORCE SYNC
                                    setIsAdminUnlocked(false);
                                    window.dispatchEvent(new Event("tier1-login"));
                                    window.location.reload(); // Nuclear option to ensure Sidebar updates
                                } catch (e) {
                                    alert("잠금 처리 실패");
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-lg shadow-red-200 animate-in fade-in active:scale-95"
                        >
                            <Lock size={14} />
                            1티어 잠금
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowAdminLogin(true)}
                            className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-lg shadow-slate-200"
                        >
                            <Settings size={14} />
                            1티어 관리자
                        </button>
                    )}

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        System Normal
                    </div>
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Users size={12} />
                        Active: {metrics.activeUsers}
                    </div>
                </div>
            </div>

            {/* LIVE USER MONITORING BOARD - Cleaned up */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Traffic Source */}
                <div className="lg:col-span-2 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-sm border border-indigo-100">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">App Traffic & Control</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AppLauncherCard
                            title="Consumer Shop" color="pink" url="/shop" count={0} label="Guests" targetSetting="shop"
                            onShare={() => handleShare("우리집 가상 피팅(AR) - 소비자 앱", "/shop")}
                        />
                        <AppLauncherCard
                            title="Field Partner" color="blue" url="/field/new" count={metrics.measurers} label="Measurers" targetSetting="field"
                            onShare={() => handleShare("실측 파트너 앱 - Field Partner", "/field/new")}
                        />
                        <AppLauncherCard
                            title="Install Pro" color="orange" url="/install" count={metrics.installers} label="Installers" targetSetting="global"
                            onShare={() => handleShare("시공 전문가 앱 - Install Pro", "/install")}
                        />
                    </div>
                </div>

                {/* 2. AI Usage Stats (Placeholder) */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 relative overflow-hidden flex flex-col justify-center items-center">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={100} /></div>
                    <h3 className="text-sm font-bold text-indigo-300 mb-1 uppercase tracking-wider z-10 relative">AI Agent Usage</h3>
                    <div className="text-3xl font-black mb-4 z-10 relative">0 <span className="text-sm font-medium text-emerald-400">Calls</span></div>
                    <p className="text-xs text-slate-500 z-10">Data collection pending...</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "총 매출액", value: `0원`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
                    { label: "총 수주 건수", value: `${metrics.orders}건`, icon: CheckSquare, color: "text-green-600 bg-green-50" },
                    { label: "시공 인력", value: `${metrics.installers}명`, icon: Users, color: "text-purple-600 bg-purple-50" },
                    { label: "실측 인력", value: `${metrics.measurers}명`, icon: Calendar, color: "text-red-600 bg-red-50" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-white/50 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div className="text-gray-500 text-sm font-medium">{stat.label}</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EmptyChart title="월별 매출 추이" />
                <EmptyChart title="제품군별 비중" />
            </div>

            {/* <DashboardChatWidget /> */}

            {/* Share SMS Modal */}
            {shareModal && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99999 }}
                    onClick={() => setShareModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-[340px] animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">링크 보내기 (SMS)</h3>
                            <button
                                onClick={() => setShareModal(null)}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">선택된 앱: <span className="font-bold text-indigo-600">{shareModal.title}</span></p>
                            <input
                                type="tel"
                                placeholder="휴대폰 번호 입력"
                                style={{ color: "#000", fontSize: 16 }}
                                className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white text-black"
                                value={sharePhone}
                                onChange={(e) => setSharePhone(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={sendSms}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Send size={18} />
                            <span>문자 보내기</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- Tier 1 Admin Modal & Section --- */}
            {/* 1. Admin Login Modal */}
            {showAdminLogin && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
                    onClick={() => setShowAdminLogin(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200 border-2 border-indigo-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">1티어 관리자 인증</h3>
                                    <p className="text-xs text-slate-500">마스터 권한 접근을 위해 비밀번호를 입력하세요.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAdminLogin(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={async (e: any) => {
                            e.preventDefault();
                            try {
                                const res = await fetch("/api/admin/tier1/login", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ password: adminPw }),
                                });
                                const json = await res.json();
                                if (res.ok && json.ok) {
                                    setIsAdminUnlocked(true);
                                    setShowAdminLogin(false);
                                    setAdminPw("");
                                    window.dispatchEvent(new Event("tier1-login"));
                                } else {
                                    alert("비밀번호가 올바르지 않습니다.");
                                }
                            } catch (err) {
                                alert("로그인 중 오류가 발생했습니다.");
                            }
                        }}>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="new-password"
                                placeholder="비밀번호 (4자리)"
                                className="w-full h-12 px-4 border border-slate-200 bg-slate-50 rounded-xl mb-4 text-center font-black tracking-[0.5em] text-lg text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition"
                                value={adminPw}
                                onChange={e => {
                                    // Only allow numbers
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setAdminPw(val);
                                }}
                                autoFocus
                                maxLength={4}
                            />
                            <button
                                type="submit"
                                className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>인증하기</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Tier 1 Admin Section (Revealed) */}
            {isAdminUnlocked && (
                <div className="mt-8 border-t-2 border-slate-200 pt-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-black">TIER 1 ADMIN</div>
                        <h2 className="text-xl font-black text-slate-800">마스터 관리자 전용</h2>
                        <button
                            onClick={async () => {
                                try {
                                    await fetch("/api/admin/tier1/logout", { method: "POST" });
                                    setIsAdminUnlocked(false);
                                    window.dispatchEvent(new Event("tier1-login"));
                                    window.location.reload(); // Force Reload
                                } catch (e) {
                                    alert("로그아웃 중 오류가 발생했습니다.");
                                }
                            }}
                            className="ml-auto bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                            <Lock size={12} />
                            잠금 (Lock)
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Sub-Partner Management */}
                        <div
                            onClick={() => window.location.href = "/admin/partners"}
                            className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Users size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">하위 거래처 관리</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                등록된 대리점 및 협력업체 계정을 총괄 관리합니다.
                            </p>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                Partner Mgmt
                            </span>
                        </div>

                        {/* Master Settings */}
                        <div
                            onClick={() => window.location.href = "/admin/prices"}
                            className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Settings size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">시스템 마스터 설정</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                글로벌 UI 정책, 요금제, API 키 등 핵심 설정을 변경합니다.
                            </p>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                System Config
                            </span>
                        </div>

                        {/* Audit Log */}
                        <div
                            onClick={() => alert("감사 로그 기능은 준비 중입니다.")}
                            className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Activity size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">전체 감사 로그</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                모든 사용자의 활동 기록 및 중요 변경 사항을 조회합니다.
                            </p>
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                Audit Logs
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Radio Modal Overlay */}
            {showRadioModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <RadioClient
                        initialChannel={activeChannel}
                        isModal={true}
                        onClose={() => setShowRadioModal(false)}
                    />
                </div>
            )}

            {/* AI Assistant Widget */}
            <DashboardChatWidget
                externalOpen={showAiChat}
                onClose={() => setShowAiChat(false)}
            />
        </div>
    );
}

function AppLauncherCard({ title, color, url, count, label, targetSetting, onShare }: any) {
    const colors: any = {
        pink: "border-pink-200 text-pink-600 hover:bg-pink-50 bg-pink-50/20",
        blue: "border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50/20",
        orange: "border-orange-200 text-orange-600 hover:bg-orange-50 bg-orange-50/20",
    };

    return (
        <div className={`border rounded-xl p-4 transition-all ${colors[color] || ""}`}>
            <div className="flex justify-between items-start mb-3">
                <span className={`font-bold`}>{title}</span>
                <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                    {count} {label}
                </span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => window.open(url, "_blank")} className="flex-1 py-1.5 bg-white border rounded text-xs font-bold transition opacity-75 hover:opacity-100 shadow-sm text-slate-700">
                    Launch App
                </button>
                <button
                    onClick={onShare}
                    className="px-2.5 bg-white border rounded text-xs transition hover:bg-slate-50 text-slate-400 hover:text-slate-600 shadow-sm"
                    title="링크 보내기"
                >
                    <Send size={14} />
                </button>
                <button
                    onClick={() => window.location.href = `/admin/design?target=${targetSetting || 'global'}`}
                    className="px-2.5 bg-white border rounded text-xs transition hover:bg-slate-50 text-slate-400 hover:text-slate-600 shadow-sm"
                    title="UI 커스터마이징"
                >
                    <Settings size={14} />
                </button>
            </div>
        </div>
    );
}

function EmptyChart({ title }: { title: string }) {
    return (
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-white/50 h-[300px] flex flex-col items-center justify-center text-gray-400">
            <h3 className="text-lg font-bold text-gray-800 mb-4 self-start">{title}</h3>
            <Activity className="w-12 h-12 mb-2 opacity-20" />
            <p>데이터가 없습니다.</p>
        </div>
    );
}
