import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GlassCode = "CLEAR" | "BRONZE" | "AQUA" | "SATIN" | "WIRE_MESH";
type GlassGroup = "CLEAR_BRONZE_AQUA" | "SATIN" | "WIRE_MESH";

function toGlassGroup(code: GlassCode): GlassGroup {
    if (code === "SATIN") return "SATIN";
    if (code === "WIRE_MESH") return "WIRE_MESH";
    return "CLEAR_BRONZE_AQUA";
}

// ✅ 정책 A: height는 2400 기준 매칭 + 2400초과는 옵션 플래그
function normalizeHeight(heightMm: number) {
    if (heightMm > 2400) return { finalHeight: 2400, heightOver2400: true };
    return { finalHeight: 2400, heightOver2400: false };
}

// ✅ 정책 A: width는 “입력 이상 최소값”으로 올림(표에 있는 width 중)
function ceilWidth(inputWidth: number, availableWidths: number[]) {
    const sorted = [...availableWidths].sort((a, b) => a - b);
    for (const w of sorted) if (w >= inputWidth) return w;
    // 입력이 표 최대보다 크면 마지막(최대)로 고정 + 사무실에서 별도처리 권장
    return sorted[sorted.length - 1] ?? inputWidth;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            company_id,
            input, // 실측앱 payload 그대로
        } = body as {
            company_id: string;
            input: {
                product_type: string;
                coating: "FLUORO" | "ANOD";
                width_mm: number;
                height_mm: number;
                glass_code: GlassCode;

                height_over_2400?: boolean; // 들어오면 참고, 없으면 자동
                vertical_division?: boolean;

                include_sliding_hardware?: boolean;
                pivot_qty?: number;
                extra_over_1900_mm?: number;

                tdu_add?: boolean;
                top_sensor_add_qty?: number;
                wireless_switch_add_qty?: number;

                addons_selected?: Array<{ category: string; code: string; qty: number }>;
            };

            customer?: { name?: string; phone?: string; address?: string };
            memo?: string;
            photos?: string[];
        };

        if (!company_id) {
            return NextResponse.json({ error: "company_id required" }, { status: 400 });
        }
        if (!input?.product_type || !input?.coating) {
            return NextResponse.json({ error: "product_type/coating required" }, { status: 400 });
        }

        // ✅ Service Role (서버 전용)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const glass_group = toGlassGroup(input.glass_code);

        // height normalize
        const h = normalizeHeight(Number(input.height_mm));
        const final_height_mm = h.finalHeight;
        const height_over_2400 = h.heightOver2400;

        // 1) product_id 찾기
        const { data: prod, error: prodErr } = await supabase
            .from("price_products")
            .select("id, title, base_height_mm")
            .eq("company_id", company_id)
            .eq("product_type", input.product_type)
            .eq("is_active", true)
            .maybeSingle();

        if (prodErr || !prod) {
            return NextResponse.json({ error: "Unknown product_type" }, { status: 404 });
        }

        // 2) variant_id 찾기
        const { data: variant, error: varErr } = await supabase
            .from("price_variants")
            .select("id, coating, coating_label")
            .eq("company_id", company_id)
            .eq("product_id", prod.id)
            .eq("coating", input.coating)
            .maybeSingle();

        if (varErr || !variant) {
            return NextResponse.json({ error: "Unknown coating variant" }, { status: 404 });
        }

        // 3) 해당 variant에서 사용 가능한 width 목록 조회 → width 올림
        const { data: widthsRows, error: wErr } = await supabase
            .from("price_size_prices")
            .select("width_mm")
            .eq("company_id", company_id)
            .eq("variant_id", variant.id)
            .eq("height_mm", final_height_mm)
            .eq("glass_group", glass_group);

        if (wErr || !widthsRows?.length) {
            return NextResponse.json({ error: `No size rows for this height(${final_height_mm})/glass_group(${glass_group})` }, { status: 404 });
        }

        const availableWidths = widthsRows.map((r) => r.width_mm);
        const final_width_mm = ceilWidth(Number(input.width_mm), availableWidths);
        const size_fixed = final_width_mm !== Number(input.width_mm) || Number(input.height_mm) !== final_height_mm;

        // 4) 완제품 base_price row 1개 매칭
        const { data: baseRow, error: baseErr } = await supabase
            .from("price_size_prices")
            .select("price")
            .eq("company_id", company_id)
            .eq("variant_id", variant.id)
            .eq("width_mm", final_width_mm)
            .eq("height_mm", final_height_mm)
            .eq("glass_group", glass_group)
            .maybeSingle();

        if (baseErr || !baseRow) {
            return NextResponse.json({ error: "Base price not found (table mismatch)" }, { status: 404 });
        }

        let base_price = Number(baseRow.price);
        let addons_total = 0;

        const items: Array<{ label: string; qty: number; unit: string; unit_price: number; line_total: number }> = [];

        // 5) 룰성 옵션(고정 가산)
        if (height_over_2400) {
            items.push({ label: "높이 2400 이상", qty: 1, unit: "once", unit_price: 10000, line_total: 10000 });
            addons_total += 10000;
        }
        if (input.vertical_division) {
            items.push({ label: "세로분할", qty: 1, unit: "once", unit_price: 10000, line_total: 10000 });
            addons_total += 10000;
        }

        // 6) 카탈로그(Addons) 선택항목 합산
        const selected = input.addons_selected ?? [];
        if (selected.length) {
            const codes = selected.map((s) => s.code);
            const { data: addonRows } = await supabase
                .from("price_addons")
                .select("category, code, label, unit, price")
                .eq("company_id", company_id)
                .in("code", codes)
                .eq("is_active", true);

            const byCode = new Map<string, any>((addonRows ?? []).map((r) => [r.code, r]));

            for (const s of selected) {
                const row = byCode.get(s.code);
                if (!row) continue;
                const qty = Number(s.qty ?? 1);
                const unitPrice = Number(row.price ?? 0);
                const lineTotal = qty * unitPrice;
                items.push({ label: row.label, qty, unit: row.unit, unit_price: unitPrice, line_total: lineTotal });
                addons_total += lineTotal;
            }
        }

        // Additional Logic for Specific Hardcoded Addons (TDU, etc from input flags)
        // The Input has explicit flags for TDU, Sensor, Switch, Sliding Hardware.
        // We should look them up in addons table as well if they are standard addons.
        // Assuming the user wants to strictly look up everything from price_addons.
        // I need to map input flags to codes to lookup.

        // TDU
        if (input.tdu_add) {
            // Code depends on product type usually (AUTO_1S_TDU / AUTO_3T_TDU)
            const tduCode = input.product_type.includes("1S") ? "AUTO_1S_TDU" : "AUTO_3T_TDU";
            const { data: tduRow } = await supabase.from("price_addons").select("*").eq("company_id", company_id).eq("code", tduCode).single();
            if (tduRow) {
                const price = Number(tduRow.price);
                items.push({ label: tduRow.label, qty: 1, unit: tduRow.unit, unit_price: price, line_total: price });
                addons_total += price;
            }
        }

        // Top Sensor Add
        if (input.top_sensor_add_qty && input.top_sensor_add_qty > 0) {
            const { data: row } = await supabase.from("price_addons").select("*").eq("company_id", company_id).eq("code", "TOP_SENSOR").single();
            if (row) {
                const price = Number(row.price);
                const qty = input.top_sensor_add_qty;
                items.push({ label: row.label, qty, unit: row.unit, unit_price: price, line_total: price * qty });
                addons_total += price * qty;
            }
        }

        // Wireless Switch Add
        if (input.wireless_switch_add_qty && input.wireless_switch_add_qty > 0) {
            const { data: row } = await supabase.from("price_addons").select("*").eq("company_id", company_id).eq("code", "WIRELESS_SWITCH").single();
            if (row) {
                const price = Number(row.price);
                const qty = input.wireless_switch_add_qty;
                items.push({ label: row.label, qty, unit: row.unit, unit_price: price, line_total: price * qty });
                addons_total += price * qty;
            }
        }

        // Sliding Hardware
        if (input.include_sliding_hardware) {
            // Complex logic: Price By Width
            // The user example had 'meta' with ranges.
            // Needs lookup code? "SLIDING_HW_BASE" maybe? User example used "SLIDING_HW_BASE".
            const { data: row } = await supabase.from("price_addons").select("*").eq("company_id", company_id).eq("code", "SLIDING_HW_BASE").single();
            if (row && row.meta && row.meta.ranges) {
                const ranges = row.meta.ranges.sort((a: any, b: any) => a.max - b.max);
                const matched = ranges.find((r: any) => final_width_mm <= r.max) || ranges[ranges.length - 1];
                const price = Number(matched.price);
                items.push({ label: `연동철물 (${matched.max}mm이하)`, qty: 1, unit: "set", unit_price: price, line_total: price });
                addons_total += price;
            }

            // Pivot
            if (input.pivot_qty && input.pivot_qty > 0) {
                const { data: pv } = await supabase.from("price_addons").select("*").eq("company_id", company_id).eq("code", "PIVOT").single();
                if (pv) {
                    const p = Number(pv.price);
                    items.push({ label: pv.label, qty: input.pivot_qty, unit: pv.unit, unit_price: p, line_total: p * input.pivot_qty });
                    addons_total += p * input.pivot_qty;
                }
            }

            // Over 1900
            if (input.extra_over_1900_mm && input.extra_over_1900_mm > 0) {
                const { data: ov } = await supabase.from("price_addons").select("*").eq("company_id", company_id).eq("code", "OVER_1900_PER_200").single();
                if (ov) {
                    const units = Math.ceil(input.extra_over_1900_mm / 200);
                    const p = Number(ov.price);
                    items.push({ label: ov.label, qty: units, unit: ov.unit, unit_price: p, line_total: p * units });
                    addons_total += p * units;
                }
            }
        }

        const total_price = base_price + addons_total;

        // 7) 저장
        const normalized = {
            product_type: input.product_type,
            coating: input.coating,
            glass_code: input.glass_code,
            glass_group,
            input_width_mm: Number(input.width_mm),
            input_height_mm: Number(input.height_mm),
            final_width_mm,
            final_height_mm,
            size_fixed
        };

        const breakdown = {
            base_price,
            addons_total,
            total_price,
            items
        };

        const { data: saved, error: saveErr } = await supabase
            .from("estimates")
            .insert({
                company_id,
                customer_name: body.customer?.name ?? null,
                customer_phone: body.customer?.phone ?? null,
                customer_address: body.customer?.address ?? null,
                input,
                normalized,
                breakdown,
                total_price,
                status: "DRAFT"
            })
            .select("id")
            .maybeSingle();

        if (saveErr || !saved) {
            return NextResponse.json({ error: "Failed to save estimate", detail: saveErr?.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            estimate_id: saved.id,
            normalized,
            breakdown
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Server error", detail: e?.message }, { status: 500 });
    }
}
