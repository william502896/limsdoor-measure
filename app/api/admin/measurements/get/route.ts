import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const sb = supabaseAdmin();

        const m = await sb.from("measurements").select("*").eq("id", id).single();
        if (m.error) return NextResponse.json({ error: m.error.message }, { status: 500 });

        const photos = await sb
            .from("measurement_photos")
            .select("*")
            .eq("measurement_id", id)
            .order("created_at", { ascending: true });

        if (photos.error) return NextResponse.json({ error: photos.error.message }, { status: 500 });

        return NextResponse.json({ ok: true, measurement: m.data, photos: photos.data });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
    }
}
