"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flame, ThermometerSun, ThermometerSnowflake, PhoneCall, MessageSquare, Clock } from "lucide-react";

import { Suspense } from "react";

function LeadScoringContent() {
    const searchParams = useSearchParams();
    const adminKey = searchParams.get("key") || "";
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (adminKey) fetchList();
    }, [adminKey]);

    async function fetchList() {
        setLoading(true);
        const res = await fetch(`/api/admin/marketing/leads?key=${encodeURIComponent(adminKey)}`);
        const json = await res.json();
        if (json.ok) setList(json.data);
        setLoading(false);
    }

    const hotCount = list.filter(i => i.grade === "HOT").length;

    const GradeBadge = ({ grade }: { grade: string }) => {
        if (grade === "HOT") return <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200"><Flame size={12} fill="currentColor" /> HOT</div>;
        if (grade === "WARM") return <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200"><ThermometerSun size={12} /> WARM</div>;
        return <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200"><ThermometerSnowflake size={12} /> COLD</div>;
    };

    const RecommendAction = ({ grade }: { grade: string }) => {
        if (grade === "HOT") return <span className="text-red-600 font-bold flex items-center gap-1"><PhoneCall size={14} /> 지금 전화/실측 권장</span>;
        if (grade === "WARM") return <span className="text-orange-600 font-medium flex items-center gap-1"><MessageSquare size={14} /> 상담 유도 메시지</span>;
        return <span className="text-slate-400 text-xs text-center block">자동 관리 유지</span>;
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">리드 점수 현황</h1>
                <p className="text-slate-500 mt-1">고객 행동 기반으로 자동 계산된 우선순위입니다.</p>
            </div>

            {hotCount > 0 && (
                <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 flex items-center justify-between shadow-sm animate-pulse-slow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                            <Flame size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-900">🔥 즉시 대응 필요 리드 <span className="text-2xl">{hotCount}</span>건</h3>
                            <p className="text-red-700/80 text-sm">점수가 높은 고객입니다. 놓치기 전에 연락해보세요.</p>
                        </div>
                    </div>
                    <button className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow hover:bg-red-700 transition">
                        HOT 리드만 보기
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-xs font-bold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">전화번호</th>
                            <th className="px-6 py-4">리드 점수</th>
                            <th className="px-6 py-4">등급</th>
                            <th className="px-6 py-4">추천 액션</th>
                            <th className="px-6 py-4 text-right">최근 활동</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.map((item) => (
                            <tr key={item.phone} className={item.grade === "HOT" ? "bg-red-50/30" : "hover:bg-slate-50"}>
                                <td className="px-6 py-4 font-mono font-bold text-slate-700">
                                    {item.phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-lg font-black text-slate-800">{item.score}점</div>
                                </td>
                                <td className="px-6 py-4">
                                    <GradeBadge grade={item.grade} />
                                </td>
                                <td className="px-6 py-4">
                                    <RecommendAction grade={item.grade} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-bold text-slate-600">{item.last_action}</span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(item.last_action_at).toLocaleString()}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {list.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-400">데이터가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function LeadScoringPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center bg-slate-50 min-h-screen">Loading Leads...</div>}>
            <LeadScoringContent />
        </Suspense>
    );
}
