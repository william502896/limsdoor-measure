import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const sb = supabaseAdmin();
    let query = sb
        .from("measurements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

    if (since) {
        query = query.gte("created_at", since);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
