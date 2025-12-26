import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const phone = url.searchParams.get("phone");
    if (!phone) return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });

    const { data, error } = await supabase
        .from("radio_users")
        .select("id, phone, name, role, status")
        .eq("phone", phone)
        .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: true, user: null });

    return NextResponse.json({ ok: true, user: data });
}
