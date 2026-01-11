import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";

function endOfTodayKST(): string {
    // 서버가 UTC든 뭐든 상관없이 "KST 기준 오늘 23:59:59"를 만들고 ISO로 반환
    const now = new Date();
    // KST로 보정한 "오늘" 계산
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = kstNow.getUTCFullYear();
    const m = kstNow.getUTCMonth();
    const d = kstNow.getUTCDate();
    // KST 오늘 23:59:59 -> UTC로 변환해 Date 생성
    const utc = new Date(Date.UTC(y, m, d, 14, 59, 59)); // 23:59:59 KST = 14:59:59 UTC
    return utc.toISOString();
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const estimateId: string = body.estimateId;
        const customerName: string | undefined = body.customerName;
        const customerPhone: string | undefined = body.customerPhone;

        const payType: "DEPOSIT" | "BALANCE" | "FULL" | "MATERIAL" | "INSTALLATION" = body.payType ?? "DEPOSIT";
        const amount: number = Number(body.amount ?? 0);
        const memo: string | undefined = body.memo;
        const method: string = body.method ?? "PAYHERE_LINK"; // "CASH", "PAYHERE_LINK", etc.
        const leadId: string | undefined = body.leadId;

        if (!estimateId) {
            return NextResponse.json({ ok: false, error: "estimateId is required" }, { status: 400 });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ ok: false, error: "amount must be > 0" }, { status: 400 });
        }

        const { insertWithCompany } = await import("@/app/lib/companyDb");

        const payment = await insertWithCompany("payments", {
            estimate_id: estimateId,
            customer_name: customerName,
            customer_phone: customerPhone,
            method,
            pay_type: payType,
            amount,
            status: "CREATED",
            expire_at: endOfTodayKST(),
            memo,
            lead_id: leadId,
        });

        return NextResponse.json({ ok: true, payment });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
