import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const estimateId: string | undefined = body?.estimateId;
        const leadIdDirect: string | undefined = body?.leadId; // 선택
        const payload = body?.payload || {};

        if (!estimateId && !leadIdDirect) {
            return NextResponse.json({ error: "estimateId 또는 leadId가 필요합니다." }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // 1) leadId 결정 (estimateId → lead_links → lead_id)
        let leadId = leadIdDirect || null;

        if (!leadId && estimateId) {
            const { data: link, error: linkErr } = await sb
                .from("lead_links")
                .select("lead_id")
                .eq("estimate_id", estimateId)
                .single();

            if (linkErr) {
                return NextResponse.json(
                    { error: "lead_links에서 lead_id를 찾지 못했습니다. 먼저 link-estimate를 호출하세요." },
                    { status: 400 }
                );
            }
            leadId = link?.lead_id || null;
        }

        if (!leadId) return NextResponse.json({ error: "leadId를 확정할 수 없습니다." }, { status: 400 });

        // 2) lead 상태 업데이트 → MEASURED
        const { error: lErr } = await sb.from("leads").update({ status: "MEASURED" }).eq("id", leadId);
        if (lErr) throw lErr;

        // 3) 이벤트 기록
        const { error: eErr } = await sb.from("lead_events").insert({
            lead_id: leadId,
            event_type: "MEASURE_DONE",
            payload: { estimateId, ...payload },
        });
        if (eErr) throw eErr;

        return NextResponse.json({ ok: true, leadId, status: "MEASURED" });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "measurement hook error" }, { status: 500 });
    }
}
