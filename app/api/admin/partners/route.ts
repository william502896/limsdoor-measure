import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyTier1Token } from "@/app/lib/adminTier1";
import { createSupabaseAdmin } from "@/app/lib/supabaseClient";

export const runtime = "nodejs";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("tier1_admin")?.value;
    const secret = process.env.ADMIN_TIER1_COOKIE_SECRET || "";

    if (!token || !secret) {
        return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { ok } = await verifyTier1Token(secret, token);
    if (!ok) {
        return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    // Assuming table name is "partners". If user used "radio_users" or similar, this might fail.
    // I will try to fetch "partners".
    const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}
