
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/app/lib/authServer";
import { logAudit } from "@/app/lib/opsAudit";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(req: Request) {
    const { authorized, response } = await requireSuperAdmin();
    if (!authorized) return response;

    const admin = supabaseAdmin();
    const { data } = await admin.from('invite_codes').select('*').order('created_at', { ascending: false });
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const { authorized, response, user } = await requireSuperAdmin();
    if (!authorized) return response;

    const { code, max_uses, note } = await req.json();
    const admin = supabaseAdmin();

    // Auto-generate if empty
    const finalCode = code || `LIMS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { data, error } = await admin.from('invite_codes').insert({
        code: finalCode,
        max_uses: max_uses || 1,
        note
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit('CREATE_INVITE', 'invite_code', finalCode, { note, updated_by: user?.id });
    return NextResponse.json(data);
}

export async function PATCH(req: Request) {
    // Single Endpoint for Toggle/Update usually via ID in URL, but let's support body ID for simplicity or separate route
    return NextResponse.json({ error: "Use /api/ops/invites/[id]" }, { status: 404 });
}
