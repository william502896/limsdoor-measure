import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { verifyOptoutSig } from "@/app/lib/messaging/optoutSignedLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));

    const p = String(body.p || body.phone || "");
    const ts = String(body.ts || "");
    const sig = String(body.sig || "");

    const v = verifyOptoutSig(p, ts, sig);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.reason }, { status: 400 });

    const sb = supabaseAdmin();
    const { error } = await sb
        .from("marketing_optouts")
        .upsert({ phone: v.phone, reason: "SIGNED_LINK" }, { onConflict: "phone" });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
