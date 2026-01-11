"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, BarChart2, FileText, Smartphone, ExternalLink } from "lucide-react";

import { Suspense } from "react";

function LandingListContent() {
    const searchParams = useSearchParams();
    const adminKey = searchParams.get("key") || "";
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (adminKey) fetchList();
    }, [adminKey]);

    async function fetchList() {
        setLoading(true);
        const res = await fetch(`/api/admin/marketing/landings?key=${encodeURIComponent(adminKey)}`);
        const json = await res.json();
        if (json.ok) setList(json.data);
        setLoading(false);
    }

    const badge = (status: string) => {
        if (status === "ACTIVE") return <span className="px-2 py-0.5 rounded textxs font-bold bg-green-100 text-green-700">활성</span>;
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">비활성</span>;
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">랜딩페이지 제작</h1>
                    <p className="text-slate-500 mt-1">PDF, 이벤트, 체크리스트를 활용해 고객 유입용 랜딩을 빠르게 만드세요.</p>
                </div>
                <Link
                    href={`/admin/marketing/landings/create?key=${adminKey}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg transition"
                >
                    <Plus size={18} /> 새 랜딩 만들기
                </Link>
            </div>

            {loading && <div className="py-20 text-center text-slate-400">로딩 중...</div>}

            {!loading && list.length === 0 && (
                <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">아직 생성된 랜딩페이지가 없습니다.</p>
                    <Link
                        href={`/admin/marketing/landings/create?key=${adminKey}`}
                        className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline"
                    >
                        첫 랜딩 만들기 &rarr;
                    </Link>
                </div>
            )}

            {list.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase text-xs font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">랜딩명</th>
                                <th className="px-6 py-4">연결 자료/메시지</th>
                                <th className="px-6 py-4 text-center">성과 (유입/전환)</th>
                                <th className="px-6 py-4 text-center">상태</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {list.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 text-base mb-0.5">{item.title}</div>
                                        <div className="text-xs text-slate-400">{item.sub_copy || "설명 없음"}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5 text-xs">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <FileText size={14} className="text-slate-400" />
                                                <span>{item.goal_type}</span>
                                            </div>
                                            {item.connected_message_type && (
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Smartphone size={14} className="text-indigo-400" />
                                                    <span>{item.connected_message_type} 연결됨</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            <div className="text-xs">
                                                <div className="text-slate-400 font-medium">VIEW</div>
                                                <div className="font-bold text-slate-700">{item.stats?.views || 0}</div>
                                            </div>
                                            <div className="w-px h-6 bg-slate-200"></div>
                                            <div className="text-xs">
                                                <div className="text-slate-400 font-medium">ACTION</div>
                                                <div className="font-bold text-indigo-600">{item.stats?.conversions || 0}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {badge(item.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/landing/${item.id}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition p-2"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function LandingListPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading List...</div>}>
            <LandingListContent />
        </Suspense>
    );
}
