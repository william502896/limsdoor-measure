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

        // ✅ 5) 결제 상태 변경 시 -> 리드 상태 자동 업데이트 (Marketing Engine)
        if (patch.status === "CONFIRMED" || patch.status === "PAID_REPORTED") {
            try {
                // Use service role key to bypass RLS for background updates
                const { createClient } = require("@supabase/supabase-js");
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    { auth: { persistSession: false } }
                );

                // Find linked lead
                const { data: link } = await supabaseAdmin
                    .from("lead_links")
                    .select("lead_id")
                    .eq("payment_id", paymentId)
                    .single();

                if (link?.lead_id) {
                    // Update Lead Status -> PAID
                    await supabaseAdmin
                        .from("leads")
                        .update({ status: "PAID" })
                        .eq("id", link.lead_id);

                    // Log Event
                    await supabaseAdmin.from("lead_events").insert({
                        lead_id: link.lead_id,
                        event_type: "PAID",
                        payload: { paymentId, status: patch.status, managedBy: adminName }
                    });
                }
            } catch (ignore) {
                console.error("Marketing Engine Auto-Update Failed:", ignore);
                // 메인 로직(결제 업데이트)은 성공했으므로 에러를 던지지 않음
            }
        }

        return NextResponse.json({ ok: true, payment: data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
