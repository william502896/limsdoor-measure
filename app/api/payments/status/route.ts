import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

type PaymentStatus =
    | "CREATED"
    | "LINK_SENT"
    | "PAID_REPORTED"
    | "CONFIRMED"
    | "EXPIRED"
    | "CANCELED";

function mapLeadStatus(paymentStatus: PaymentStatus) {
    // ✅ 운영 기준 추천
    switch (paymentStatus) {
        case "LINK_SENT":
            return "PAY_PENDING";
        case "PAID_REPORTED":
            return "PAY_PENDING"; // 입금증/결제 제보 단계
        case "CONFIRMED":
            return "PAID";
        case "EXPIRED":
        case "CANCELED":
            return "CLOSED";
        default:
            return null; // CREATED 등은 리드 상태 변경 안 함
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const paymentId: string | undefined = body?.paymentId;
        const status: PaymentStatus | undefined = body?.status;
        const payhere_link_url: string | undefined = body?.payhere_link_url; // 링크 저장도 같이 가능(선택)
        const leadId: string | undefined = body?.leadId; // (선택) 없으면 DB의 payments.lead_id 사용

        if (!paymentId || !status) {
            return NextResponse.json({ error: "paymentId, status는 필수입니다." }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // 1) 결제 row 업데이트
        const updatePayload: any = { status };
        if (payhere_link_url) updatePayload.payhere_link_url = payhere_link_url;

        const { data: payment, error: pErr } = await sb
            .from("payments")
            .update(updatePayload)
            .eq("id", paymentId)
            .select("id,status,lead_id,estimate_id,customer_phone")
            .single();

        if (pErr) throw pErr;

        // 2) leadId 확정
        const finalLeadId = leadId || payment?.lead_id || null;

        // 3) 리드 상태 동기화
        const nextLeadStatus = mapLeadStatus(status);

        if (finalLeadId && nextLeadStatus) {
            // lead 업데이트
            const { error: lErr } = await sb
                .from("leads")
                .update({ status: nextLeadStatus })
                .eq("id", finalLeadId);
            if (lErr) throw lErr;

            // 이벤트 기록
            const { error: eErr } = await sb.from("lead_events").insert({
                lead_id: finalLeadId,
                event_type: "PAYMENT_STATUS_SYNC",
                payload: {
                    paymentId,
                    paymentStatus: status,
                    leadStatus: nextLeadStatus,
                    estimate_id: payment?.estimate_id,
                },
            });
            if (eErr) throw eErr;
        }

        return NextResponse.json({ ok: true, payment, syncedLeadId: finalLeadId, nextLeadStatus });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "status sync error" }, { status: 500 });
    }
}
