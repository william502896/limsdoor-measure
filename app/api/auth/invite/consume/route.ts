import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { code } = await req.json();
        if (!code) return NextResponse.json({ ok: false, error: "Code required" }, { status: 400 });

        const admin = supabaseAdmin();

        // Call RPC
        const { data, error } = await admin.rpc("consume_invite_code", { p_code: code });

        if (error) {
            console.error("RPC Error:", error);
            return NextResponse.json({ ok: false, error: "System Error" }, { status: 500 });
        }

        // data structure from RPC: { success: boolean, message: string }
        if (data && data.success) {
            return NextResponse.json({ ok: true, message: data.message });
        } else {
            return NextResponse.json({ ok: false, error: data?.message || "Invalid Code" }, { status: 400 });
        }

    } catch (e) {
        return NextResponse.json({ ok: false, error: "Server Error" }, { status: 500 });
    }
}
