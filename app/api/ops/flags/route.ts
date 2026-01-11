
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/app/lib/authServer";
import { logAudit } from "@/app/lib/opsAudit";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(req: Request) {
    const { authorized, response } = await requireSuperAdmin();
    if (!authorized) return response;

    const admin = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'GLOBAL';
    const company_id = searchParams.get('company_id');

    let q = admin.from('feature_flags').select('*').eq('scope', scope);

    if (scope === 'COMPANY' && company_id) {
        q = q.eq('company_id', company_id);
    }

    const { data } = await q;
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const { authorized, response, user } = await requireSuperAdmin();
    if (!authorized) return response;

    const { scope, company_id, key, enabled, reason } = await req.json();
    const admin = supabaseAdmin();

    const { data, error } = await admin
        .from('feature_flags')
        .upsert({ scope, company_id: company_id || null, key, enabled, reason, updated_by: user?.id }, { onConflict: 'scope, company_id, key' })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(
        enabled ? 'ENABLE_FLAG' : 'DISABLE_FLAG',
        'feature_flag',
        key,
        { scope, company_id, reason, updated_by: user?.id }
    );

    return NextResponse.json(data);
}
