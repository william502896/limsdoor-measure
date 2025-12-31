"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GitBranch, Clock, Send, Power } from "lucide-react";

export default function ScenariosPage() {
    const searchParams = useSearchParams();
    const adminKey = searchParams.get("key") || "";
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (adminKey) fetchList();
    }, [adminKey]);

    async function fetchList() {
        setLoading(true);
        const res = await fetch(`/api/admin/marketing/scenarios?key=${encodeURIComponent(adminKey)}`);
        const json = await res.json();
        if (json.ok) setList(json.data);
        setLoading(false);
    }

    async function toggle(id: string, current: boolean) {
        if (!confirm(current ? "비활성화 하시겠습니까?" : "활성화 하시겠습니까?")) return;

        const res = await fetch(`/api/admin/marketing/scenarios?key=${encodeURIComponent(adminKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle", id, is_active: !current })
        });
        if (res.ok) fetchList();
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">자동 시나리오 트리</h1>
                <p className="text-slate-500 mt-1">If/Then 규칙에 따라 메시지를 자동으로 발송합니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((item) => (
                    <div key={item.id} className={`rounded-2xl border p-6 transition ${item.is_active ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-75"}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${item.is_active ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-400"}`}>
                                    <GitBranch size={20} />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase">{item.trigger_type}</span>
                            </div>
                            <button onClick={() => toggle(item.id, item.is_active)} className={`p-1.5 rounded-full transition ${item.is_active ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-slate-400 hover:bg-slate-200"}`}>
                                <Power size={18} />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>

                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} />
                                {item.wait_minutes === 0 ? "즉시 실행" : `${item.wait_minutes}분 대기`}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Send size={14} />
                                {item.stats?.triggered || 0}건 실행됨
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100 line-clamp-3">
                            {item.message_template}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
