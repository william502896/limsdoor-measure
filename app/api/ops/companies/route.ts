
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/app/lib/authServer";
import { logAudit } from "@/app/lib/opsAudit";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(req: Request) {
    const { authorized, response } = await requireSuperAdmin();
    if (!authorized) return response;

    const admin = supabaseAdmin();
    const { data } = await admin.from('companies').select('*, company_members(count)').order('created_at', { ascending: false });

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const { authorized, response, user } = await requireSuperAdmin();
    if (!authorized) return response;

    const { company_id, action, reason } = await req.json();
    const admin = supabaseAdmin();

    // SUSPEND / RESUME
    const status = action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';

    const { data, error } = await admin
        .from('companies')
        .update({ status })
        .eq('id', company_id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(
        action === 'SUSPEND' ? 'SUSPEND_COMPANY' : 'RESUME_COMPANY',
        'company',
        company_id,
        { reason, updated_by: user?.id, company_id }
    );

    return NextResponse.json(data);
}
