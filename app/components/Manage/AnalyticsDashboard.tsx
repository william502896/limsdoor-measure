"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { TrendingUp, Users, Calendar, CheckSquare, Activity, Bot, Settings, Send, X, Lock, Play, Share2 } from "lucide-react";
import DashboardChatWidget from "./DashboardChatWidget";
import LiveClock from "./LiveClock";
import LiveWeather from "./LiveWeather";
import { useGlobalStore } from "@/app/lib/store-context";
import RadioClient from "../RadioClient";
import AISearchBar from "./AISearchBar";
import { Card } from "@/app/components/UI/Card";
import { ChipButton } from "@/app/components/UI/ChipButton";
import { PrimaryButton, SecondaryButton } from "@/app/components/UI/Buttons";
import { KPIStatCard } from "@/app/components/UI/KPIStatCard";

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
    };

    useEffect(() => {
        async function fetchMetrics() {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                let fetchedCompanyId = null;
                if (user) {
                    const { data: profile } = await supabase.from("프로필").select("company_id").eq("id", user.id).single();
                    fetchedCompanyId = profile?.company_id;
                    setCompanyId(fetchedCompanyId);
                }

                const isDemoCookie = document.cookie.includes("company_id=demo");
                const isRealCompany = fetchedCompanyId && fetchedCompanyId !== 'demo';

                if (!isRealCompany && (isDemoCookie || fetchedCompanyId === 'demo')) {
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

                const { count: staffCount } = await supabase.from("프로필").select("*", { count: "exact", head: true }).eq("company_id", fetchedCompanyId);
                const { count: measurCount } = await supabase.from("측정자").select("*", { count: "exact", head: true }).eq("company_id", fetchedCompanyId);
                const { count: installCount } = await supabase.from("설치 기사").select("*", { count: "exact", head: true }).eq("company_id", fetchedCompanyId);

                setMetrics({
                    revenue: 0,
                    orders: 0,
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

        const checkTier1 = () => {
            setIsAdminUnlocked(document.cookie.includes("tier1_ui=1"));
        };
        checkTier1();
        window.addEventListener("tier1-login", checkTier1);
        return () => window.removeEventListener("tier1-login", checkTier1);
    }, []);

    const { user, tenants, currentTenant, switchTenant } = useGlobalStore();

    return (
        <div className="space-y-6 pb-20 w-full max-w-[1600px] mx-auto px-4 lg:px-8">
            {/* 1. Branch & Radio Status Section */}
            <Card className="!p-0 overflow-hidden border-l-4 border-l-indigo-600">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <select
                            className="bg-transparent font-bold text-lg text-slate-900 border-none outline-none cursor-pointer pr-4 focus:ring-0 w-full"
                            value={currentTenant?.id}
                            onChange={(e) => switchTenant(e.target.value)}
                        >
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                            현재 접속중: {currentTenant?.name || "본사"}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <ChipButton
                            label="CH 1 (사무)"
                            onClick={() => openRadio("1")}
                            colorClass="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                        />
                        <ChipButton
                            label="CH 2 (실측)"
                            onClick={() => openRadio("2")}
                            colorClass="bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50"
                        />
                        <ChipButton
                            label="CH 3 (시공)"
                            onClick={() => openRadio("3")}
                            colorClass="bg-white text-orange-600 border border-orange-200 hover:bg-orange-50"
                        />
                        <ChipButton
                            label="AI 에이전트"
                            onClick={() => setShowAiChat(true)}
                            colorClass="bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm"
                        />
                    </div>
                </div>
            </Card>

            {/* 2. AI Search */}
            <div className="relative">
                <AISearchBar />
            </div>

            {/* 3. Monitoring Header */}
            <div className="flex items-end justify-between px-1">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-none mb-1">통합관제 모니터링</h2>
                    <p className="text-xs font-medium text-slate-500">실시간 회사 현황 (실제 데이터)</p>
                </div>
                <div className="flex items-center gap-2">
                    <LiveWeather />
                    <LiveClock />
                </div>
            </div>

            {/* 4. KPI Grid (New Design) */}
            <div className="grid grid-cols-2 gap-3">
                <KPIStatCard
                    label="활성 사용자"
                    value={metrics.activeUsers}
                    subValue="명"
                    icon={<Users size={16} />}
                />
                <KPIStatCard
                    label="시스템 상태"
                    value="정상"
                    subValue="All Good"
                    icon={<Activity size={16} className="text-emerald-500" />}
                />
                <KPIStatCard
                    label="오늘 견적"
                    value={metrics.orders}
                    subValue="건"
                    icon={<CheckSquare size={16} />}
                />
                <KPIStatCard
                    label="오늘 시공"
                    value={metrics.installers}
                    subValue="팀 가동중"
                    icon={<Calendar size={16} />}
                />
            </div>

            {/* 5. App Traffic & Control */}
            <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-500 mb-3 ml-1">앱 트래픽 및 제어</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AppControlCard
                        title="통합 ERP (Master)"
                        tag="관리자 전용"
                        onLaunch={() => window.open("/admin/apps/erp", "_blank")}
                        onShare={() => handleShare("통합 ERP", "/admin/apps/erp")}
                        highlightColor="text-indigo-600"
                    />
                    <AppControlCard
                        title="소비자 매장 (Shop)"
                        tag="손님 0명"
                        onLaunch={() => window.open("/shop", "_blank")}
                        onShare={() => handleShare("소비자 매장", "/shop")}
                        highlightColor="text-pink-600"
                    />
                    <AppControlCard
                        title="실측 파트너 (Field)"
                        tag={`지사 ${metrics.measurers}곳`}
                        onLaunch={() => window.open("/field/new", "_blank")}
                        onShare={() => handleShare("실측 파트너", "/field/new")}
                        highlightColor="text-blue-600"
                    />
                    <AppControlCard
                        title="시공 전문가 (Install)"
                        tag={`팀 ${metrics.installers}개`}
                        onLaunch={() => window.open("/install", "_blank")}
                        onShare={() => handleShare("시공 전문가", "/install")}
                        highlightColor="text-orange-600"
                    />
                </div>
            </div>


            {/* Share SMS Modal */}
            {shareModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
                    onClick={() => setShareModal(null)}
                >
                    <Card className="w-[90%] max-w-[320px] p-6 animate-in fade-in zoom-in" onClick={() => { }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">링크 공유</h3>
                            <button onClick={() => setShareModal(null)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <input
                            type="tel"
                            placeholder="휴대폰 번호 (-없이)"
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={sharePhone}
                            onChange={(e) => setSharePhone(e.target.value)}
                            autoFocus
                        />
                        <PrimaryButton onClick={sendSms} className="w-full" icon={<Send size={16} />}>
                            문자 전송
                        </PrimaryButton>
                    </Card>
                </div>
            )}

            {/* Radio Modal Overlay */}
            {showRadioModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
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

function AppControlCard({ title, tag, onLaunch, onShare, highlightColor }: any) {
    return (
        <Card>
            <div className="flex justify-between items-start mb-4">
                <h4 className={`font-bold text-lg ${highlightColor}`}>{title}</h4>
                <div className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-500 border border-slate-200">
                    {tag}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <PrimaryButton onClick={onLaunch} className="flex-1 font-bold !h-11">
                    앱 실행
                </PrimaryButton>
                <SecondaryButton onClick={onShare} className="!px-0 w-11 !h-11" icon={<Share2 size={18} />}>
                </SecondaryButton>
                <SecondaryButton onClick={() => window.location.href = '/admin/settings'} className="!px-0 w-11 !h-11" icon={<Settings size={18} />}>
                </SecondaryButton>
            </div>
        </Card>
    );
}
