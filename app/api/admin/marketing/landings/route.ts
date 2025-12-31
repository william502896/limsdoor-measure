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
    const { data, error } = await sb
        .from("marketing_landing_pages")
        .select("*, marketing_assets(count)")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const sb = supabaseAdmin();

    const { data, error } = await sb
        .from("marketing_landing_pages")
        .insert({
            title: body.title,
            sub_copy: body.sub_copy,
            goal_type: body.goal_type,
            status: body.status || "ACTIVE",
            cta_text: body.cta_text,
            cta_action: body.cta_action,
            cta_target_url: body.cta_target_url,
            collect_name: body.collect_name,
            collect_phone: body.collect_phone,
            connected_message_type: body.connected_message_type,
            connected_template_id: body.connected_template_id,

            // New AI & Mode Fields
            landing_mode: body.landing_mode,
            main_image_url: body.main_image_url,
            hero_image_url: body.hero_image_url,
            icon_image_urls: body.icon_image_urls,
            section_image_urls: body.section_image_urls,

            // Flexible Options (Consult Type, Payment Opts)
            options: {
                consult_type: body.consult_type,
                payment_options: body.payment_options
            }
        })
        .select()
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
}
