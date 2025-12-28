import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/address-change-requests/[id] - Approve or reject address change request
 * Body: { action: "APPROVE" | "REJECT", reviewed_by, review_note }
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as "APPROVE" | "REJECT";
    const reviewed_by = body.reviewed_by || "ADMIN";
    const review_note = body.review_note || null;

    const sb = supabaseAdmin();

    // 1) Load the change request
    const { data: reqRow, error: reqErr } = await sb
        .from("address_change_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (reqErr) {
        return NextResponse.json({ ok: false, error: reqErr.message }, { status: 500 });
    }
    if (!reqRow) {
        return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (reqRow.status !== "PENDING") {
        return NextResponse.json({ ok: false, error: "Already processed" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 2) REJECT - just update the request status
    if (action === "REJECT") {
        const { data, error } = await sb
            .from("address_change_requests")
            .update({
                status: "REJECTED",
                reviewed_at: now,
                reviewed_by,
                review_note,
            })
            .eq("id", id)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, data });
    }

    // 3) APPROVE - update measurement + log event + update request
    // Get current measurement
    const { data: mRow, error: mErr } = await sb
        .from("measurements")
        .select("*")
        .eq("id", reqRow.measurement_id)
        .single();

    if (mErr) {
        return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
    }

    // Update measurements
    const { data: updatedM, error: upErr } = await sb
        .from("measurements")
        .update({
            address_text: reqRow.proposed_address_text,
            lat: reqRow.proposed_lat,
            lng: reqRow.proposed_lng,
            verified_level: "CONFIRMED_BY_ADMIN",
        })
        .eq("id", reqRow.measurement_id)
        .select("*")
        .single();

    if (upErr) {
        return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    // Log address event
    const { error: logErr } = await sb.from("address_events").insert({
        measurement_id: reqRow.measurement_id,
        actor_role: "ADMIN",
        actor_name: reviewed_by,
        before_address_text: mRow?.address_text || null,
        before_lat: mRow?.lat ?? null,
        before_lng: mRow?.lng ?? null,
        after_address_text: reqRow.proposed_address_text || null,
        after_lat: reqRow.proposed_lat ?? null,
        after_lng: reqRow.proposed_lng ?? null,
        reason: `APPROVED: ${reqRow.reason || ""}`,
        mismatch_m: null,
    });

    if (logErr) {
        return NextResponse.json({ ok: false, error: logErr.message }, { status: 500 });
    }

    // Update request status
    const { data: updatedReq, error: reqUpErr } = await sb
        .from("address_change_requests")
        .update({
            status: "APPROVED",
            reviewed_at: now,
            reviewed_by,
            review_note,
        })
        .eq("id", id)
        .select("*")
        .single();

    if (reqUpErr) {
        return NextResponse.json({ ok: false, error: reqUpErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, measurement: updatedM, request: updatedReq });
}
