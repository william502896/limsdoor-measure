import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/address-change-requests - List address change requests
 * Query params: status (default: PENDING)
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const sb = supabaseAdmin();
    const { data, error } = await sb
        .from("address_change_requests")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}

/**
 * POST /api/address-change-requests - Create address change request
 */
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const sb = supabaseAdmin();

    const { data, error } = await sb
        .from("address_change_requests")
        .insert({
            measurement_id: body.measurement_id,
            requested_by_role: body.requested_by_role,
            requested_by_name: body.requested_by_name || null,
            proposed_address_text: body.proposed_address_text || null,
            proposed_lat: body.proposed_lat ?? null,
            proposed_lng: body.proposed_lng ?? null,
            reason: body.reason || null,
            status: "PENDING",
        })
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}
