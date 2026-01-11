import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function cleanPhone(p?: string | null) {
    return (p ?? "").replace(/[^\d]/g, "");
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const sb = supabaseAdmin(); // ✅ service_role 사용

        // 필수 최소값 방어
        const customer_name = body?.customer?.name ?? "";
        const customer_phone = cleanPhone(body?.customer?.phone ?? "");
        const width_mm = Number(body?.measurement?.widthMm ?? 0);
        const height_mm = Number(body?.measurement?.heightMm ?? 0);

        if (!customer_name || !customer_phone) {
            return NextResponse.json({ error: "고객명/전화번호가 필요합니다." }, { status: 400 });
        }

        // ✅ measurements insert
        const { data, error } = await sb
            .from("measurements")
            .insert({
                customer_name,
                customer_phone,
                customer_address: body?.customer?.address ?? null,

                door_type: body?.options?.doorType ?? null,
                door_detail: body?.options?.doorDetail ?? null,
                open_direction: body?.options?.openDirection ?? null,

                width_mm,
                height_mm,

                // 가격/할인/추가작업 포함
                pricing_json: body?.pricing ?? null,
                options_json: body?.options ?? null,
                extras_json: body?.extras ?? null,

                memo: body?.memo ?? null,
                status: body?.status ?? "DRAFT",
            })
            .select("id")
            .single();

        if (error) {
            return NextResponse.json({ error: `DB 저장 실패: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ ok: true, id: data.id });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
