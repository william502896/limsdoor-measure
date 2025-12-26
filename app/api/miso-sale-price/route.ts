import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

function toInt(v: string | null, fallback: number) {
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: Request) {
    try {
        const SUPABASE_URL = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });

        const { searchParams } = new URL(req.url);

        const product_type = searchParams.get("product_type") ?? "";
        const coating = searchParams.get("coating") ?? "";
        const glass_group = searchParams.get("glass_group") ?? "";

        // 정규화: 없으면 -1 / ""
        const width_key = toInt(searchParams.get("width_key"), -1);
        const variant = searchParams.get("variant") ?? "";

        const color = searchParams.get("color") ?? "";
        const glass_type = searchParams.get("glass_type") ?? "";
        const design_id = searchParams.get("design_id") ?? "";

        // 필수 최소 조합
        if (!product_type || !coating || !glass_group || !color || !glass_type || !design_id) {
            return NextResponse.json(
                { ok: false, error: "Missing required query params" },
                { status: 400 }
            );
        }

        /**
         * ✅ 조회 전략(운영 안정):
         * 1) 완전 일치(width_key, variant 포함)에서 우선순위(priority desc) 최상단 1개
         * 2) 없으면 fallback:
         *    - width_key=-1(공통)으로 재조회
         *    - variant=""(공통)으로 재조회
         *    - 둘다 공통으로 재조회
         */

        async function fetchOne(wk: number, va: string) {
            const { data, error } = await supabase
                .from("miso_sale_prices")
                .select("*")
                .eq("is_published", true)
                .eq("product_type", product_type)
                .eq("coating", coating)
                .eq("glass_group", glass_group)
                .eq("width_key", wk)
                .eq("variant", va)
                .eq("color", color)
                .eq("glass_type", glass_type)
                .eq("design_id", design_id)
                .order("priority", { ascending: false })
                .order("updated_at", { ascending: false })
                .limit(1);

            if (error) throw error;
            return data?.[0] ?? null;
        }

        // 1) 완전일치
        let row = await fetchOne(width_key, variant);

        // 2) fallback (wk 공통)
        if (!row && width_key !== -1) row = await fetchOne(-1, variant);

        // 3) fallback (variant 공통)
        if (!row && variant !== "") row = await fetchOne(width_key, "");

        // 4) fallback (둘다 공통)
        if (!row) row = await fetchOne(-1, "");

        return NextResponse.json({ ok: true, data: row });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
