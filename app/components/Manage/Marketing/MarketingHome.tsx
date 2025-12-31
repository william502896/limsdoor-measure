"use client";

import React, { useState, useEffect } from "react";
import {
    Megaphone,
    ArrowRight,
    MousePointerClick,
    MessageSquare,
    Video,
    FileText,
    Users,
    CheckCircle2,
    Clock,
    CreditCard,
    AlertCircle,
    ShoppingBag,
    Loader2
} from "lucide-react";
import FunnelBuilder from "./FunnelBuilder";
import ContentGenerator from "./ContentGenerator";

export default function MarketingHome() {
    // View State: 'home' | 'funnel' | 'content'
    const [currentView, setCurrentView] = useState("home");
    const [contentType, setContentType] = useState("carrot");

    // Data State
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentView === "home") {
            fetchStats();
        }
    }, [currentView]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/marketing/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch marketing stats", e);
        } finally {
            setLoading(false);
        }
    };

    const goToContent = (type: string) => {
        setContentType(type);
        setCurrentView("content");
    };

    if (currentView === "funnel") {
        return <FunnelBuilder onBack={() => setCurrentView("home")} />;
    }

    if (currentView === "content") {
        return <ContentGenerator onBack={() => setCurrentView("home")} defaultType={contentType} />;
    }

    const unreadCount = stats?.actions?.unanswered || 0;
    const pendingCount = stats?.actions?.pending || 0;
    const newLeadsCount = stats?.actions?.newLeads || 0;
    const funnel = stats?.funnel || { inflow: 0, consulting: 0, measured: 0, closing: 0 };

    return (
        <div className="p-6 space-y-8 max-w-6xl mx-auto pb-24 animate-in fade-in duration-500">
            {/* 1. 오늘의 마케팅 액션 (Action Cards) */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🔥</span>
                    <h2 className="text-xl font-bold text-slate-100">오늘의 마케팅 액션</h2>
                    <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded ml-2">
                        지금 당장 해야 할 일
                    </span>
                    {loading && <Loader2 size={16} className="animate-spin text-slate-500 ml-2" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Critical Action */}
                    <button className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 p-5 rounded-2xl text-left transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <AlertCircle size={60} className="text-red-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                            <span className="text-red-400 font-bold text-sm">긴급</span>
                        </div>
                        <h3 className="text-lg font-bold text-red-100 mb-1">미응답 리드 {unreadCount}건</h3>
                        <p className="text-sm text-red-300/70 mb-4">고객이 기다리고 있습니다</p>
                        <div className="inline-flex items-center text-sm font-semibold text-red-400 group-hover:translate-x-1 transition-transform">
                            바로 응답하기 <ArrowRight size={14} className="ml-1" />
                        </div>
                    </button>

                    {/* Warning Action */}
                    <button className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 p-5 rounded-2xl text-left transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Clock size={60} className="text-amber-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-amber-400 font-bold text-sm">실측 후 대기</span>
                        </div>
                        <h3 className="text-lg font-bold text-amber-100 mb-1">미결정 고객 {pendingCount}명</h3>
                        <p className="text-sm text-amber-300/70 mb-4">골든타임을 놓치지 마세요</p>
                        <div className="inline-flex items-center text-sm font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                            후속 메시지 보내기 <ArrowRight size={14} className="ml-1" />
                        </div>
                    </button>

                    {/* Success Action */}
                    <button className="bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 p-5 rounded-2xl text-left transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Users size={60} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-emerald-400 font-bold text-sm">신규 유입</span>
                        </div>
                        <h3 className="text-lg font-bold text-emerald-100 mb-1">오늘 {newLeadsCount}건 도착</h3>
                        <p className="text-sm text-emerald-300/70 mb-4">새로운 기회가 왔습니다</p>
                        <div className="inline-flex items-center text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                            리드 보기 <ArrowRight size={14} className="ml-1" />
                        </div>
                    </button>
                </div>
            </section>

            {/* 2. 퍼널 빠른 시작 (Funnel Quick Start) */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-100">퍼널 빠른 시작</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setCurrentView("funnel")}
                        className="bg-slate-800 hover:bg-indigo-900/40 hover:border-indigo-500/50 border border-slate-700 p-6 rounded-2xl text-left transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Megaphone size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mb-2">신규 고객 유입 만들기</h3>
                        <p className="text-sm text-slate-400">무료 체크리스트, 정보성 콘텐츠로 잠재 고객을 모으세요.</p>
                    </button>

                    <button
                        onClick={() => setCurrentView("funnel")}
                        className="bg-slate-800 hover:bg-violet-900/40 hover:border-violet-500/50 border border-slate-700 p-6 rounded-2xl text-left transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <MousePointerClick size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mb-2">상담·실측 전환 늘리기</h3>
                        <p className="text-sm text-slate-400">상담 유도 메시지와 실측 예약 페이지를 만듭니다.</p>
                    </button>

                    <button
                        onClick={() => setCurrentView("funnel")}
                        className="bg-slate-800 hover:bg-pink-900/40 hover:border-pink-500/50 border border-slate-700 p-6 rounded-2xl text-left transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <CreditCard size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mb-2">계약·결제 마무리</h3>
                        <p className="text-sm text-slate-400">결정 유도 메시지와 한정 혜택으로 매출을 확정하세요.</p>
                    </button>
                </div>
            </section>

            {/* 3. 콘텐츠 즉시 생성 (Content Gen) */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-100">콘텐츠 즉시 생성</h2>
                    <span className="text-xs text-slate-500">* 실측 데이터를 자동으로 반영합니다</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => goToContent("carrot")}
                        className="flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800 hover:border-orange-500/50 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <ShoppingBag size={20} />
                        </div>
                        <span className="font-medium text-slate-300 group-hover:text-white">당근마켓 글</span>
                    </button>
                    <button
                        onClick={() => goToContent("script")}
                        className="flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800 hover:border-yellow-500/50 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-3 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                            <MessageSquare size={20} />
                        </div>
                        <span className="font-medium text-slate-300 group-hover:text-white">상담 스크립트</span>
                    </button>
                    <button
                        onClick={() => goToContent("shorts")}
                        className="flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800 hover:border-red-500/50 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <Video size={20} />
                        </div>
                        <span className="font-medium text-slate-300 group-hover:text-white">쇼츠 대본</span>
                    </button>
                    <button
                        onClick={() => goToContent("blog")}
                        className="flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800 hover:border-green-500/50 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-3 group-hover:bg-green-500 group-hover:text-white transition-colors">
                            <FileText size={20} />
                        </div>
                        <span className="font-medium text-slate-300 group-hover:text-white">블로그 구조</span>
                    </button>
                </div>
            </section>

            {/* 4. 나의 퍼널 현황 (Status Summary) */}
            <section className="border-t border-slate-800 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-300">나의 퍼널 현황</h2>
                    <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">CRM 전체보기 →</button>
                </div>
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex justify-between items-center px-8 md:px-16">
                    <div className="text-center group cursor-pointer">
                        <div className="text-slate-500 text-sm mb-1 font-medium group-hover:text-indigo-400 transition-colors">유입</div>
                        <div className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{funnel.inflow}</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="text-center group cursor-pointer">
                        <div className="text-slate-500 text-sm mb-1 font-medium group-hover:text-indigo-400 transition-colors">상담중</div>
                        <div className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{funnel.consulting}</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="text-center group cursor-pointer">
                        <div className="text-slate-500 text-sm mb-1 font-medium group-hover:text-indigo-400 transition-colors">실측완료</div>
                        <div className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{funnel.measured}</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="text-center group cursor-pointer">
                        <div className="text-slate-500 text-sm mb-1 font-medium group-hover:text-indigo-400 transition-colors">결제대기</div>
                        <div className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{funnel.closing}</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
