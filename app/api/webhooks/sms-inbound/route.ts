import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(p: string) {
    return (p || "").replace(/[^\d]/g, "");
}

function isOptoutText(text: string) {
    const keywords = (process.env.OPTOUT_KEYWORDS || "거부,수신거부,STOP,unsubscribe")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const t = (text || "").toLowerCase();
    return keywords.some((k) => t.includes(k.toLowerCase()));
}

export async function POST(req: Request) {
    // ✅ 공급사별 서명 검증(추천). 지금은 생략하고, 추후 솔라피/알리고 규격 맞춰 넣으면 됩니다.
    const body = await req.json().catch(() => ({}));

    const from = normalizePhone(body.from || body.sender || body.phone || "");
    const text = String(body.text || body.message || "");

    if (!from) return NextResponse.json({ ok: false, error: "Missing from" }, { status: 400 });

    // 수신 메시지 로그(원하면 테이블 만들고 저장)
    // if needed: insert inbound logs

    if (isOptoutText(text)) {
        const sb = supabaseAdmin();
        await sb.from("marketing_optouts").upsert({ phone: from, reason: "INBOUND_KEYWORD" }, { onConflict: "phone" });
        return NextResponse.json({ ok: true, action: "OPTED_OUT" });
    }

    return NextResponse.json({ ok: true, action: "IGNORED" });
}
