import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/measurements - List measurements with filters
 * Query params: status, verified, limit
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const verified = searchParams.get("verified");
    const limit = Number(searchParams.get("limit") || "200");

    const sb = supabaseAdmin();
    let query = sb
        .from("measurements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (status) query = query.eq("status", status);
    if (verified) query = query.eq("verified_level", verified);

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}

/**
 * POST /api/measurements - Create new measurement
 */
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));

    const sb = supabaseAdmin();
    const { data, error } = await sb
        .from("measurements")
        .insert({
            created_by_role: body.created_by_role || "CONSUMER",
            customer_name: body.customer_name || null,
            customer_phone: body.customer_phone || null,
            address_text: body.address_text || null,
            lat: body.lat ?? null,
            lng: body.lng ?? null,
            address_source: body.address_source || null,
            gps_lat: body.gps_lat ?? null,
            gps_lng: body.gps_lng ?? null,
            distance_mismatch_m: body.distance_mismatch_m ?? null,
            verified_level: body.verified_level || "UNVERIFIED",
            status: body.status || "SUBMITTED",
        })
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}
