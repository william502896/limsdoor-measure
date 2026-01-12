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
        // 필수 최소값 방어 & Payload Parsing (Flat vs Nested)
        const customer_name = body?.customer_name ?? body?.customer?.name ?? "";
        const customer_phone = cleanPhone(body?.customer_phone ?? body?.customer?.phone ?? "");
        const customer_address = body?.customer_address ?? body?.customer?.address ?? null;

        const width_mm = Number(body?.measure?.widthMm ?? body?.measurement?.widthMm ?? 0);
        const height_mm = Number(body?.measure?.heightMm ?? body?.measurement?.heightMm ?? 0);

        const door_type = body?.door?.type ?? body?.options?.doorType ?? null;
        const open_direction = body?.door?.openDirection ?? body?.options?.openDirection ?? null;

        // JSON Columns
        const door_detail = body?.door_detail ?? body?.options?.doorDetail ?? null; // New logic prefers explicit door_detail
        const trust_check = body?.trust_check ?? null;

        const pricing_json = body?.pricing ?? null;
        const options_json = body?.options ?? null;
        const extras_json = body?.extras ?? null;

        if (!customer_name || !customer_phone) {
            return NextResponse.json({ error: "고객명/전화번호가 필요합니다." }, { status: 400 });
        }

        // ✅ measurements insert
        const { data, error } = await sb
            .from("measurements")
            .insert({
                customer_name,
                customer_phone,
                customer_address,

                door_type,
                door_detail,
                open_direction,

                width_mm,
                height_mm,

                // 가격/할인/추가작업 포함
                pricing_json,
                options_json,
                extras_json,

                // Trust Check (New)
                trust_check,

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
