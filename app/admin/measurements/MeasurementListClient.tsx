"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ruler, Search, Filter, Plus, Phone, Copy, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";

type Measurement = any; // We'll infer/refine type later or use strict type if available

export default function MeasurementListClient({
    initialMeasurements
}: {
    initialMeasurements: Measurement[]
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // URL State
    const query = searchParams.get("q") || "";
    const typeFilter = searchParams.get("type") || "ALL"; // ALL, 3DS, 1SL, SWING...
    const periodFilter = searchParams.get("period") || "7"; // 7, 30, ALL
    const sort = searchParams.get("sort") || "latest"; // latest, price

    // Local Search State (debounced in real app, here simple)
    const [searchTerm, setSearchTerm] = useState(query);

    // Update URL on filter change
    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "ALL") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`/admin/measurements?${params.toString()}`);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilter("q", searchTerm);
    };

    // Copy Helper
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`복사되었습니다: ${text}`);
    };

    return (
        <div className="space-y-4">
            {/* (A) Top Bar: Search + Filter + New Button */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative w-full md:w-auto flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-neutral-500" size={18} />
                    <input
                        type="text"
                        placeholder="이름 / 전화 / 주소 검색"
                        className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-neutral-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>

                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar">
                    <select
                        className="bg-neutral-800 text-white border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                        value={typeFilter}
                        onChange={(e) => updateFilter("type", e.target.value)}
                    >
                        <option value="ALL">모든 문종</option>
                        <option value="3연동">3연동</option>
                        <option value="원슬라이딩">원슬라이딩</option>
                        <option value="스윙">스윙</option>
                        <option value="여닫이">여닫이</option>
                    </select>

                    <select
                        className="bg-neutral-800 text-white border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                        value={periodFilter}
                        onChange={(e) => updateFilter("period", e.target.value)}
                    >
                        <option value="7">최근 7일</option>
                        <option value="30">최근 30일</option>
                        <option value="ALL">전체 기간</option>
                    </select>
                </div>

                {/* New Button */}
                <Link
                    href="/field/new?from=admin"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap"
                >
                    <Plus size={18} />
                    <span>새 실측 작성</span>
                </Link>
            </div>

            {/* (B) List */}
            <div className="grid grid-cols-1 gap-3">
                {initialMeasurements.map((m: any) => {
                    const o = m.options_json ?? {};
                    const p = m.pricing_json ?? {};
                    const created = m.created_at ? new Date(m.created_at).toLocaleString("ko-KR", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-";

                    // Display Data
                    const doorInfo = `${m.door_type || "문종미지정"} (${m.width_mm || 0} x ${m.height_mm || 0})`;
                    const detailSummary = `${o.frameColor || "-"} / ${o.glassType || "-"}`;
                    const totalPrice = p.totalWon ? Number(p.totalWon).toLocaleString() + "원" : "-";
                    const status = m.status || "DRAFT";

                    return (
                        <div key={m.id} className="group relative block rounded-xl border border-neutral-800 bg-neutral-900 hover:border-indigo-500/50 transition">
                            <Link href={`/admin/measurements/${m.id}`} className="block p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-white">{m.customer_name || "(이름 없음)"}</span>
                                        <Badge status={status} />
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-emerald-400 text-lg">{totalPrice}</div>
                                        <div className="text-xs text-neutral-500">{created}</div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-neutral-300">
                                        <Phone size={14} className="text-neutral-500" />
                                        <span onClick={(e) => { e.preventDefault(); copyToClipboard(m.customer_phone); }} className="hover:text-white cursor-copy hover:underline">
                                            {m.customer_phone || "-"}
                                        </span>
                                    </div>
                                    <div className="text-sm text-neutral-400 truncate">
                                        {m.customer_address || "주소 없음"}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-sm">
                                    <div className="font-medium text-indigo-300">
                                        {doorInfo}
                                    </div>
                                    <div className="text-neutral-500 text-xs">
                                        {detailSummary}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    );
                })}

                {initialMeasurements.length === 0 && (
                    <div className="p-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                        <FileText className="mx-auto mb-2 opacity-50" size={32} />
                        검색 결과가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}

function Badge({ status }: { status: string }) {
    let color = "bg-neutral-800 text-neutral-400";
    let label = status;

    if (status === "DRAFT") { color = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"; label = "작성중"; }
    else if (status === "COMPLETED") { color = "bg-blue-500/10 text-blue-500 border border-blue-500/20"; label = "견적완료"; }
    else if (status === "CONTRACTED") { color = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"; label = "계약완료"; }

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${color}`}>
            {label}
        </span>
    );
}
