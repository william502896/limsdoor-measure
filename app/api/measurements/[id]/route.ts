import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/measurements/[id] - Get single measurement by ID
 */
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const sb = supabaseAdmin();

    const { data, error } = await sb
        .from("measurements")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}

/**
 * PATCH /api/measurements/[id] - Update measurement
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const sb = supabaseAdmin();
    const { data, error } = await sb
        .from("measurements")
        .update(body)
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
}
