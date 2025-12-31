import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const leadId: string | undefined = body?.leadId;
        const estimateId: string | undefined = body?.estimateId;
        const paymentId: string | undefined = body?.paymentId; // 선택

        if (!leadId || !estimateId) {
            return NextResponse.json({ error: "leadId, estimateId는 필수입니다." }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // upsert (estimateId 유니크 인덱스 기준)
        const { error } = await sb.from("lead_links").upsert(
            { lead_id: leadId, estimate_id: estimateId, payment_id: paymentId || null },
            { onConflict: "estimate_id" }
        );

        if (error) throw error;

        // 연결 이벤트 기록
        await sb.from("lead_events").insert({
            lead_id: leadId,
            event_type: "ESTIMATE_LINKED",
            payload: { estimateId, paymentId: paymentId || null },
        });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "link hook error" }, { status: 500 });
    }
}
