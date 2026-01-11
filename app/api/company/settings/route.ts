
import { createSupabaseServer } from "@/app/lib/supabaseServer";
import { NextResponse } from "next/server";
import { LIMSDOOR_COMPANY_ID } from "@/app/lib/features";

// GET: Fetch Company Settings (NO STRICT ADMIN CHECK)
export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseServer();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // *** SECURITY REMOVED: Any logged-in user can access ***

        // Use supabaseAdmin to bypass RLS
        const { supabaseAdmin } = await import("@/app/lib/supabaseAdmin");

        const { data, error } = await supabaseAdmin()
            .from("company_settings")
            .select("*")
            .eq("company_id", LIMSDOOR_COMPANY_ID)
            .single();

        return NextResponse.json({ ok: true, data: data || null });

    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

// POST: Upsert Company Settings (NO STRICT ADMIN CHECK)
export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServer();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // *** SECURITY REMOVED: Any logged-in user can save ***

        const body = await req.json();

        const settings = {
            company_id: LIMSDOOR_COMPANY_ID,
            company_name: body.company_name,
            ceo_name: body.ceo_name,
            business_number: body.business_number,
            address: body.address,
            phone: body.phone,
            email: body.email,
            homepage_url: body.homepage_url,
            shop_url: body.shop_url,
            youtube_url: body.youtube_url,
            tiktok_url: body.tiktok_url,
            google_photos_url: body.google_photos_url,
            instagram_url: body.instagram_url,
            threads_url: body.threads_url,
            facebook_url: body.facebook_url,
            kakao_chat_url: body.kakao_chat_url,
            kakao_channel_id: body.kakao_channel_id,
            portfolio_url: body.portfolio_url,
            updated_at: new Date().toISOString(),
        };

        const { supabaseAdmin } = await import("@/app/lib/supabaseAdmin");
        const { data, error } = await supabaseAdmin()
            .from("company_settings")
            .upsert(settings)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ ok: true, data });

    } catch (e: any) {
        console.error("Settings save error:", e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
