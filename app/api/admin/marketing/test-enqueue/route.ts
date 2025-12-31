import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    return !!process.env.ADMIN_SECRET && key === process.env.ADMIN_SECRET;
}

export async function POST(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const sb = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const to_phone = body.to_phone;
    const msg_type = body.msg_type || "KAKAO";
    const kakao_template_key = body.kakao_template_key || null;
    const kakao_variables = body.kakao_variables || {};

    if (!to_phone) return NextResponse.json({ ok: false, error: "Missing to_phone" }, { status: 400 });

    const { data, error } = await sb
        .from("marketing_message_queue")
        .insert({
            campaign_key: "ADMIN_TEST",
            trigger_key: "ADMIN_TEST",
            to_phone,
            to_name: body.to_name || null,
            msg_type,
            text: body.text || "[ADMIN_TEST]",
            scheduled_at: new Date().toISOString(),
            status: "READY",
            kakao_template_key,
            kakao_variables,
            kakao_buttons: body.kakao_buttons || [],
            disable_sms: body.disable_sms ?? false,
        })
        .select("*")
        .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
}
