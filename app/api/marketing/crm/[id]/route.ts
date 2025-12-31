import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const sb = () =>
    createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

export async function GET(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { data: lead } = await sb()
            .from("leads")
            .select("*")
            .eq("id", id)
            .single();

        const { data: events } = await sb()
            .from("lead_events")
            .select("*")
            .eq("lead_id", id)
            .order("created_at", { ascending: false });

        return NextResponse.json({ lead, events });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
