import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic'; // Ensure no caching for this API

function sb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export async function GET() {
    try {
        const { data, error } = await sb()
            .from("leads")
            .select("id,name,phone,region,status,tags,last_contact_at,created_at")
            .order("created_at", { ascending: false })
            .limit(200);

        if (error) throw error;
        return NextResponse.json({ items: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
