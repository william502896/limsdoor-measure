"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";

type Lead = {
    id: string;
    name?: string;
    phone: string;
    region?: string;
    status: string;
    tags: string[];
    created_at: string;
};

type Event = {
    id: string;
    event_type: string;
    payload: any;
    created_at: string;
};

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [lead, setLead] = useState<Lead | null>(null);
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        fetch(`/api/marketing/crm/${id}`)
            .then((r) => r.json())
            .then((d) => {
                setLead(d.lead);
                setEvents(d.events || []);
            });
    }, [id]);

    async function updateStatus(leadId: string, status: string) {
        await fetch(`/api/marketing/crm/${leadId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        location.reload();
    }

    if (!lead) return (
        <ManageLayout>
            <div className="p-6 text-slate-500">로딩 중...</div>
        </ManageLayout>
    );

    return (
        <ManageLayout>
            <div className="space-y-6 max-w-6xl mx-auto p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" /> 목록으로
                    </Button>
                </div>

                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-6 space-y-2">
                        <div className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            {lead.name || "고객"}
                            <span className="text-lg text-slate-500 font-normal">· {lead.phone}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center mt-2">
                            <Badge variant="outline" className="border-indigo-500 text-indigo-400 px-3 py-1 text-sm">{lead.status}</Badge>
                            {lead.tags && lead.tags.map((t) => (
                                <Badge key={t} variant="secondary" className="bg-slate-800 text-slate-300">{t}</Badge>
                            ))}
                        </div>
                        <div className="text-sm text-slate-500 mt-2">
                            유입일: {new Date(lead.created_at).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                {/* 빠른 액션 */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-4">
                        <div className="text-sm font-semibold text-slate-400 mb-3">상태 변경 액션</div>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => updateStatus(id, "CONSULTING")}>상담중</Button>
                            <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => updateStatus(id, "MEASURED")}>실측완료</Button>
                            <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => updateStatus(id, "PAY_PENDING")}>결제대기</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => updateStatus(id, "PAID")}>결제완료</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 이벤트 타임라인 */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-6 space-y-4">
                        <div className="font-semibold text-lg text-slate-200">이벤트 타임라인</div>
                        <div className="space-y-4 border-l-2 border-slate-800 ml-2 pl-6 relative">
                            {events.map((e) => (
                                <div key={e.id} className="relative">
                                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900 ring-2 ring-slate-800"></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-medium text-slate-300">{e.event_type}</div>
                                        <span className="text-xs text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            {new Date(e.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    {e.payload && Object.keys(e.payload).length > 0 && (
                                        <pre className="text-xs mt-2 bg-slate-950 p-3 rounded border border-slate-800 text-slate-400 overflow-auto max-h-40">
                                            {JSON.stringify(e.payload, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                        {events.length === 0 && <div className="text-slate-500 text-sm">기록된 이벤트가 없습니다.</div>}
                    </CardContent>
                </Card>
            </div>
        </ManageLayout>
    );
}
