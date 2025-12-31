"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Summary = {
    lead: { total: number; urgent: number; byStatus: Record<string, number> };
    outbound: { total: number; byStatus: Record<string, number> };
};

export function MarketingSummaryCard() {
    const [s, setS] = useState<Summary | null>(null);

    useEffect(() => {
        fetch("/api/marketing/dashboard/summary")
            .then((r) => r.json())
            .then((d) => setS(d));
    }, []);

    return (
        <Card className="border-l-4 border-indigo-500 bg-slate-900 border-y-slate-800 border-r-slate-800 shadow-lg">
            <CardContent className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="font-semibold text-slate-100 flex items-center gap-2">
                        마케팅 요약
                        {s?.lead?.urgent && s.lead.urgent > 0 ? <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span> : null}
                    </div>
                    <div className="text-sm text-slate-400">
                        오늘 우선 처리: <b className="text-red-400">{s?.lead?.urgent ?? "-"}</b>건 (NEW + 결제대기)
                    </div>

                    <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300">리드 {s?.lead?.total ?? "-"}</Badge>
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300">발송큐 {s?.outbound?.total ?? "-"}</Badge>
                        {s?.outbound?.byStatus?.QUEUED ? <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">대기 {s.outbound.byStatus.QUEUED}</Badge> : null}
                        {s?.outbound?.byStatus?.FAILED ? <Badge variant="destructive">실패 {s.outbound.byStatus.FAILED}</Badge> : null}
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button asChild variant="outline" className="flex-1 md:flex-none border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                        <Link href="/marketing/crm">CRM 보기</Link>
                    </Button>
                    <Button asChild className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white">
                        <Link href="/marketing/funnel">마케팅 시작</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
