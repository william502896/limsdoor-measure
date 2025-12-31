import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    return !!process.env.ADMIN_SECRET && key === process.env.ADMIN_SECRET;
}

export async function GET(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const sb = supabaseAdmin();
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "READY").toUpperCase();
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 300);

    let query = sb
        .from("marketing_message_queue")
        .select("*")
        .eq("status", status)
        .order("scheduled_at", { ascending: true })
        .limit(limit);

    if (q) {
        query = query.or(
            `to_phone.ilike.%${q}%,to_name.ilike.%${q}%,campaign_key.ilike.%${q}%,trigger_key.ilike.%${q}%,last_error.ilike.%${q}%`
        );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const sb = supabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (!action) return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 });

    // 재시도: FAILED/READY 상관없이 READY로 복구 + next_retry_at 제거
    if (action === "retry") {
        const id = body.id;
        if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

        const { data, error } = await sb
            .from("marketing_message_queue")
            .update({
                status: "READY",
                next_retry_at: null,
                sending_at: null,
                last_error: null,
                last_error_at: null,
                fail_reason: null,
            })
            .eq("id", id)
            .select("*")
            .maybeSingle();

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, item: data });
    }

    // 실패 확정: READY/SENDING이라도 FAILED로 강제
    if (action === "force_fail") {
        const id = body.id;
        const reason = body.reason || "FORCED_BY_ADMIN";
        if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

        const { data, error } = await sb
            .from("marketing_message_queue")
            .update({
                status: "FAILED",
                next_retry_at: null,
                sending_at: null,
                last_error: reason,
                last_error_at: new Date().toISOString(),
                fail_reason: "FORCED",
            })
            .eq("id", id)
            .select("*")
            .maybeSingle();

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, item: data });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
