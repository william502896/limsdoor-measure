"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight, BarChart2, PieChart } from "lucide-react";

import { Suspense } from "react";

function MarketingStatsContent() {
    const searchParams = useSearchParams();
    const adminKey = searchParams.get("key") || "";
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (adminKey) fetchStats();
    }, [adminKey]);

    async function fetchStats() {
        setLoading(true);
        const res = await fetch(`/api/admin/marketing/insights?key=${encodeURIComponent(adminKey)}`);
        const json = await res.json();
        if (json.ok) setData(json.data);
        setLoading(false);
    }

    if (loading || !data) return <div className="p-10 text-center text-slate-400">데이터 분석 중...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-indigo-500" />
                    AI 마케팅 인사이트
                </h1>
                <p className="text-slate-500 mt-1">전체 마케팅 데이터를 분석하여 행동을 추천합니다.</p>
            </div>

            {/* AI Insights Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {data.insights.map((ins: any, idx: number) => (
                    <div key={idx} className={`rounded-2xl p-6 border shadow-sm ${ins.type === "SUCCESS" ? "bg-indigo-50 border-indigo-100" : ins.type === "WARNING" ? "bg-orange-50 border-orange-100" : "bg-red-50 border-red-100"}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg ${ins.type === "SUCCESS" ? "bg-white text-indigo-600" : "bg-white text-orange-600"}`}>
                                {ins.type === "SUCCESS" ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
                            </div>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{ins.title}</h3>
                        <p className="text-slate-700 text-sm mb-4 leading-relaxed">{ins.message}</p>

                        <div className="bg-white/60 rounded-xl p-3 border border-white/50">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">RECOMMENDATION</div>
                            <div className="text-sm font-bold text-slate-800">{ins.recommendation}</div>
                        </div>
                    </div>
                ))}
                {data.insights.length === 0 && (
                    <div className="col-span-3 py-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                        아직 충분한 분석 데이터가 모이지 않았습니다. (랜딩페이지 방문 필요)
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">TOTAL VIEWS</div>
                    <div className="text-2xl font-black text-slate-900">{data.summary.totalViews.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">CONVERSIONS</div>
                    <div className="text-2xl font-black text-indigo-600">{data.summary.totalConversions.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">MSG SENT</div>
                    <div className="text-2xl font-black text-slate-900">{data.summary.msgSent.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">MSG FAIL RATE</div>
                    <div className="text-2xl font-black text-slate-900">
                        {data.summary.msgSent > 0 ? ((data.summary.msgFail / data.summary.msgSent) * 100).toFixed(1) : 0}%
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart2 size={18} />
                랜딩페이지별 성과 TOP 3
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-xs font-bold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">랜딩명</th>
                            <th className="px-6 py-4 text-center">방문</th>
                            <th className="px-6 py-4 text-center">전환</th>
                            <th className="px-6 py-4 text-center">전환율</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.topLandings.map((l: any) => (
                            <tr key={l.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-700">{l.title}</td>
                                <td className="px-6 py-4 text-center">{l.views}</td>
                                <td className="px-6 py-4 text-center">{l.actions}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-block px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                                        {l.rate.toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {data.topLandings.length === 0 && (
                            <tr><td colSpan={4} className="py-10 text-center text-slate-400">데이터 없음</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function MarketingStatsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center bg-slate-50 min-h-screen">Loading Stats...</div>}>
            <MarketingStatsContent />
        </Suspense>
    );
}
