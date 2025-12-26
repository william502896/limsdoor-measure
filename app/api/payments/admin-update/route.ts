import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";

type AdminAction = "CONFIRM" | "EXPIRE" | "CANCEL" | "MARK_PAID";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const paymentId: string = body.paymentId;
        const action: AdminAction = body.action;
        const adminName: string = body.adminName ?? "admin";

        if (!paymentId) return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });

        const patch: any = {};
        const now = new Date().toISOString();

        if (action === "CONFIRM") {
            patch.status = "CONFIRMED";
            patch.admin_confirmed_by = adminName;
            patch.confirmed_at = now;
        } else if (action === "EXPIRE") {
            patch.status = "EXPIRED";
        } else if (action === "CANCEL") {
            patch.status = "CANCELED";
        } else if (action === "MARK_PAID") {
            patch.status = "PAID_REPORTED";
        } else {
            return NextResponse.json({ ok: false, error: "invalid action" }, { status: 400 });
        }

        const supabase = supabaseServer();
        const { data, error } = await supabase
            .from("payments")
            .update(patch)
            .eq("id", paymentId)
            .select("*")
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, payment: data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
