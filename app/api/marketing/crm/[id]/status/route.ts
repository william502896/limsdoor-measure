import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { enqueueAutomationForLead } from "@/app/lib/automation";

export const dynamic = 'force-dynamic';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { status } = await req.json();
        const sb = supabaseAdmin();

        await sb.from("leads").update({ status }).eq("id", id);
        await sb.from("lead_events").insert({
            lead_id: id,
            event_type: "STATUS_UPDATE",
            payload: { status },
        });

        // ✅ Trigger Automation
        await enqueueAutomationForLead(id, status);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
