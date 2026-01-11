
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/app/lib/authServer";
import { logAudit } from "@/app/lib/opsAudit";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const { authorized, response, user } = await requireSuperAdmin();
    if (!authorized) return response;

    const { is_active } = await req.json(); // Simple Toggle
    const admin = supabaseAdmin();

    const { data, error } = await admin
        .from('invite_codes')
        .update({ is_active })
        .eq('id', params.id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(is_active ? 'ACTIVATE_INVITE' : 'DEACTIVATE_INVITE', 'invite_code', data.code, { id: params.id, updated_by: user?.id });
    return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const { authorized, response, user } = await requireSuperAdmin();
    if (!authorized) return response;

    const admin = supabaseAdmin();
    // Get code first for log
    const { data: old } = await admin.from('invite_codes').select('code').eq('id', params.id).single();

    const { error } = await admin
        .from('invite_codes')
        .delete()
        .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit('DELETE_INVITE', 'invite_code', old?.code || params.id, { id: params.id, updated_by: user?.id });
    return NextResponse.json({ success: true });
}
