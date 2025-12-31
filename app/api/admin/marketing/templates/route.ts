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
    const q = (url.searchParams.get("q") || "").trim();

    let query = sb
        .from("marketing_kakao_templates")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);

    if (q) query = query.or(`template_key.ilike.%${q}%,template_id.ilike.%${q}%,pf_id.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const sb = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const payload = {
        template_key: body.template_key,
        pf_id: body.pf_id,
        template_id: body.template_id,
        content: body.content || "",
        variables: body.variables || [],
        required_variables: body.required_variables || [],
        strict_variables: body.strict_variables ?? true,
        enable_sms_fallback: body.enable_sms_fallback ?? true,
        fallback_text: body.fallback_text || null,
        buttons: body.buttons || [],
    };

    const { data, error } = await sb
        .from("marketing_kakao_templates")
        .insert(payload)
        .select("*")
        .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
}

export async function PUT(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const sb = supabaseAdmin();
    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const patch: any = {};
    for (const k of [
        "template_key",
        "pf_id",
        "template_id",
        "content",
        "variables",
        "required_variables",
        "strict_variables",
        "enable_sms_fallback",
        "fallback_text",
        "buttons",
    ]) {
        if (body[k] !== undefined) patch[k] = body[k];
    }

    const { data, error } = await sb
        .from("marketing_kakao_templates")
        .update(patch)
        .eq("id", body.id)
        .select("*")
        .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const sb = supabaseAdmin();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const { error } = await sb.from("marketing_kakao_templates").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
