import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sb = supabaseAdmin();

        // 리드 상태 카운트
        const { data: leads, error: lErr } = await sb
            .from("leads")
            .select("status");
        if (lErr) throw lErr;

        const countByStatus: Record<string, number> = {};
        for (const r of leads || []) {
            countByStatus[r.status] = (countByStatus[r.status] || 0) + 1;
        }

        // 메시지 큐 요약
        const { data: msgs, error: mErr } = await sb
            .from("outbound_messages")
            .select("status");
        if (mErr) throw mErr;

        const msgByStatus: Record<string, number> = {};
        for (const r of msgs || []) {
            msgByStatus[r.status] = (msgByStatus[r.status] || 0) + 1;
        }

        const urgent = (countByStatus["NEW"] || 0) + (countByStatus["PAY_PENDING"] || 0);

        return NextResponse.json({
            ok: true,
            lead: {
                total: leads?.length || 0,
                urgent,
                byStatus: countByStatus,
            },
            outbound: {
                total: msgs?.length || 0,
                byStatus: msgByStatus,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "summary error" }, { status: 500 });
    }
}
