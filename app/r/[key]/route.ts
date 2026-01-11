import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { key: string } }) {
    const sb = supabaseAdmin();
    const { key } = params;

    if (!key) return NextResponse.json({ error: "key missing" }, { status: 400 });

    const r = await sb
        .from("measurements")
        .select("pdf_customer_url")
        .eq("short_key", key)
        .single();

    if (r.error || !r.data?.pdf_customer_url) {
        return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }

    return NextResponse.redirect(r.data.pdf_customer_url);
}
