"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";

type Lead = {
    id: string;
    name?: string;
    phone: string;
    region?: string;
    status: string;
    tags: string[];
    last_contact_at?: string;
    created_at: string;
};

const STATUS_ORDER = [
    "NEW",
    "CONTACTED",
    "CONSULTING",
    "MEASUREMENT_SCHEDULED",
    "MEASURED",
    "ESTIMATED",
    "PAY_PENDING",
    "PAID",
    "INSTALLED",
    "REVIEW_REQUESTED",
    "CLOSED",
];

export default function CRMPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [status, setStatus] = useState<string>("ALL");
    const [q, setQ] = useState("");

    useEffect(() => {
        fetch("/api/marketing/crm/list")
            .then((r) => r.json())
            .then((d) => setLeads(d.items || []));
    }, []);

    const filtered = useMemo(() => {
        let xs = leads;
        if (status !== "ALL") xs = xs.filter((l) => l.status === status);
        if (q) xs = xs.filter((l) => (l.name || l.phone || "").includes(q));
        return xs;
    }, [leads, status, q]);

    const urgent = filtered.filter(
        (l) => l.status === "NEW" || l.status === "PAY_PENDING"
    );
    const rest = filtered.filter(
        (l) => !(l.status === "NEW" || l.status === "PAY_PENDING")
    );

    return (
        <ManageLayout>
            <div className="space-y-6 max-w-6xl mx-auto p-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">CRM · 리드 관리</h1>
                    <p className="text-sm text-slate-400">
                        미응답/결제대기를 우선 처리하세요.
                    </p>
                </div>

                {/* 필터 */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-4 flex flex-wrap gap-2 items-center">
                        <select
                            className="border rounded px-2 py-1 bg-slate-800 border-slate-700 text-slate-200 h-10 w-[180px]"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="ALL">전체</option>
                            {STATUS_ORDER.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <Input
                            placeholder="이름 또는 전화 검색"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="max-w-xs"
                        />
                        <Badge variant="secondary" className="h-8 px-3">전체 {filtered.length}</Badge>
                    </CardContent>
                </Card>

                {/* 긴급 */}
                {urgent.length > 0 && (
                    <Card className="border-l-4 border-red-500 bg-slate-900 shadow-lg shadow-red-900/10">
                        <CardContent className="py-4 space-y-2">
                            <div className="font-semibold text-red-400 flex items-center gap-2">
                                <span className="animate-pulse">🔥</span> 지금 처리
                            </div>
                            {urgent.map((l) => (
                                <LeadRow key={l.id} lead={l} />
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* 나머지 */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-4 space-y-2">
                        {rest.length === 0 && urgent.length === 0 ? (
                            <div className="text-center py-6 text-slate-500">리드가 없습니다.</div>
                        ) : null}
                        {rest.map((l) => (
                            <LeadRow key={l.id} lead={l} />
                        ))}
                    </CardContent>
                </Card>
            </div>
        </ManageLayout>
    );
}

function LeadRow({ lead }: { lead: Lead }) {
    return (
        <div className="flex items-center justify-between border border-slate-800 rounded px-4 py-3 bg-slate-950/30 hover:bg-slate-800/50 transition-colors">
            <div className="space-y-1">
                <div className="font-medium text-slate-200">
                    {lead.name || "고객"} <span className="text-slate-500 mx-1">·</span> {lead.phone}
                </div>
                <div className="text-xs text-slate-500">
                    {lead.region || "지역미상"} · {new Date(lead.created_at).toLocaleString()}
                </div>
                <div className="flex gap-1 flex-wrap mt-1">
                    <Badge variant="outline" className="border-slate-700 text-slate-400">{lead.status}</Badge>
                    {lead.tags?.map((t) => (
                        <Badge key={t} variant="secondary" className="bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20">{t}</Badge>
                    ))}
                </div>
            </div>
            <Button asChild variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700">
                <Link href={`/marketing/crm/${lead.id}`}>보기</Link>
            </Button>
        </div>
    );
}
