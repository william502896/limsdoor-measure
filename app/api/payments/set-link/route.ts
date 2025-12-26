import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const paymentId: string = body.paymentId;
        const linkUrl: string = body.linkUrl;

        if (!paymentId) return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });
        if (!linkUrl || !/^https?:\/\//.test(linkUrl)) {
            return NextResponse.json({ ok: false, error: "valid linkUrl required" }, { status: 400 });
        }

        const supabase = supabaseServer();
        const { data, error } = await supabase
            .from("payments")
            .update({ payhere_link_url: linkUrl, status: "LINK_SENT" })
            .eq("id", paymentId)
            .select("*")
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, payment: data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
