import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ImportBody = {
    company_id: string;
    payload: any; // 단가 JSON 전체
    mode?: "upsert" | "replace"; // 기본 upsert
};

function assertNoForbiddenFields(obj: any) {
    const forbiddenKeys = [
        "install_price",
        "install",
        "시공",
        "시공비",
        "knockdown",
        "넉다운",
        "knockdown_price",
        "넉다운단가",
    ];

    const stack: any[] = [obj];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== "object") continue;

        for (const k of Object.keys(cur)) {
            const lk = String(k).toLowerCase();
            if (forbiddenKeys.some((f) => lk.includes(String(f).toLowerCase()))) {
                throw new Error(`금지 필드 감지: "${k}" (시공/넉다운은 업로드 불가)`);
            }
            const v = cur[k];
            if (v && typeof v === "object") stack.push(v);
        }
    }
}

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as ImportBody;

        if (!body?.company_id) {
            return NextResponse.json({ error: "company_id required" }, { status: 400 });
        }
        if (!body?.payload) {
            return NextResponse.json({ error: "payload required" }, { status: 400 });
        }

        // ✅ 시공/넉다운 차단
        assertNoForbiddenFields(body.payload);

        const supabase = createClient(
            requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
            requireEnv("SUPABASE_SERVICE_ROLE_KEY")
        );

        const mode = body.mode ?? "upsert";
        const payload = body.payload;

        // payload 구조 기대:
        // payload.products[]: { product_type, title, base_height_mm, variants[] }
        // variants[]: { coating, coating_label, size_prices[] }
        // size_prices[]: { width_mm, height_mm, glass_group, price, ... }

        const products = Array.isArray(payload.products) ? payload.products : [];
        if (!products.length) {
            return NextResponse.json({ error: "payload.products[] is empty" }, { status: 400 });
        }

        // (옵션) replace 모드면, 기존 단가를 비활성화/삭제하고 새로 넣도록 확장 가능
        // 지금은 안전하게 upsert 중심으로 구현합니다.
        if (mode !== "upsert" && mode !== "replace") {
            return NextResponse.json({ error: "mode must be upsert|replace" }, { status: 400 });
        }

        // 1) price_products upsert
        const prodUpserts = products.map((p: any) => ({
            company_id: body.company_id,
            product_type: p.product_type,
            title: p.title ?? p.product_type,
            base_height_mm: Number(p.base_height_mm ?? 2400),
            is_active: p.is_active ?? true,
        }));

        const { data: prodRows, error: prodErr } = await supabase
            .from("price_products")
            .upsert(prodUpserts, { onConflict: "company_id,product_type" })
            .select("id, product_type");

        if (prodErr) {
            return NextResponse.json({ error: "price_products upsert failed", detail: prodErr.message }, { status: 500 });
        }

        const productIdByType = new Map<string, string>();
        for (const r of prodRows ?? []) productIdByType.set(r.product_type, r.id);

        // 2) price_variants upsert
        const variantUpserts: any[] = [];
        for (const p of products) {
            const product_id = productIdByType.get(p.product_type);
            if (!product_id) continue;

            const variants = Array.isArray(p.variants) ? p.variants : [];
            for (const v of variants) {
                variantUpserts.push({
                    company_id: body.company_id,
                    product_id,
                    coating: v.coating,
                    coating_label: v.coating_label ?? v.coating,
                });
            }
        }

        const { data: variantRows, error: varErr } = await supabase
            .from("price_variants")
            .upsert(variantUpserts, { onConflict: "company_id,product_id,coating" })
            .select("id, product_id, coating");

        if (varErr) {
            return NextResponse.json({ error: "price_variants upsert failed", detail: varErr.message }, { status: 500 });
        }

        const variantIdByKey = new Map<string, string>();
        for (const r of variantRows ?? []) variantIdByKey.set(`${r.product_id}__${r.coating}`, r.id);

        // 3) price_size_prices upsert
        const sizeUpserts: any[] = [];
        for (const p of products) {
            const product_id = productIdByType.get(p.product_type);
            if (!product_id) continue;

            const variants = Array.isArray(p.variants) ? p.variants : [];
            for (const v of variants) {
                const variant_id = variantIdByKey.get(`${product_id}__${v.coating}`);
                if (!variant_id) continue;

                const sizePrices = Array.isArray(v.size_prices) ? v.size_prices : [];
                for (const sp of sizePrices) {
                    sizeUpserts.push({
                        company_id: body.company_id,
                        variant_id,
                        width_mm: Number(sp.width_mm),
                        height_mm: Number(sp.height_mm),
                        glass_group: sp.glass_group,
                        price: Number(sp.price), // ✅ 완제품만
                    });
                }
            }
        }

        const { error: sizeErr } = await supabase
            .from("price_size_prices")
            .upsert(sizeUpserts, { onConflict: "company_id,variant_id,width_mm,height_mm,glass_group" });

        if (sizeErr) {
            return NextResponse.json({ error: "price_size_prices upsert failed", detail: sizeErr.message }, { status: 500 });
        }

        // 4) addons upsert (materials_and_parts / handles / hardware / sliding_hardware_set / pomax_arch_3t)
        // payload.price_addons 형태로 이미 있으면 우선 사용하고,
        // 없으면 기존 구조를 대충 흡수하는 간단 변환도 지원합니다.
        const addonsUpserts: any[] = [];

        // (a) payload.price_addons[]가 있다면 그대로
        if (Array.isArray(payload.price_addons)) {
            for (const a of payload.price_addons) {
                addonsUpserts.push({
                    company_id: body.company_id,
                    category: a.category,
                    code: a.code,
                    label: a.label,
                    unit: a.unit ?? "ea",
                    price: Number(a.price ?? 0),
                    meta: a.meta ?? {},
                    is_active: a.is_active ?? true,
                });
            }
        }

        // (b) 없으면: handles/hardware를 흡수 (당장 운영용 최소)
        if (!addonsUpserts.length) {
            const handles = Array.isArray(payload.handles) ? payload.handles : [];
            for (const h of handles) {
                addonsUpserts.push({
                    company_id: body.company_id,
                    category: "HANDLE",
                    code: h.code,
                    label: h.label,
                    unit: h.unit ?? "ea",
                    price: Number(h.price ?? 0),
                    meta: {},
                    is_active: true,
                });
            }

            const hardware = payload.hardware ?? {};
            const flatHw = [
                ...(Array.isArray(hardware.sensors) ? hardware.sensors : []),
                ...(Array.isArray(hardware.tdu) ? hardware.tdu : []),
                ...(Array.isArray(hardware.damper) ? hardware.damper : []),
            ];
            for (const hw of flatHw) {
                addonsUpserts.push({
                    company_id: body.company_id,
                    category: "HARDWARE",
                    code: hw.code,
                    label: hw.label,
                    unit: hw.unit ?? "ea",
                    price: Number(hw.price ?? 0),
                    meta: {},
                    is_active: true,
                });
            }

            const sliding = payload.sliding_hardware_set;
            if (sliding?.price_by_width) {
                addonsUpserts.push({
                    company_id: body.company_id,
                    category: "SLIDING",
                    code: "SLIDING_HW_BASE",
                    label: sliding.title ?? "연동철물(공급가)",
                    unit: "once",
                    price: 0,
                    meta: { price_by_width: sliding.price_by_width, extras: sliding.extras ?? [] },
                    is_active: true,
                });
            }
        }

        if (addonsUpserts.length) {
            const { error: addErr } = await supabase
                .from("price_addons")
                .upsert(addonsUpserts, { onConflict: "company_id,category,code" });

            if (addErr) {
                return NextResponse.json({ error: "price_addons upsert failed", detail: addErr.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            ok: true,
            company_id: body.company_id,
            summary: {
                products: prodUpserts.length,
                variants: variantUpserts.length,
                size_prices: sizeUpserts.length,
                addons: addonsUpserts.length,
            },
            note: "시공/넉다운 필드가 있으면 업로드가 즉시 차단됩니다.",
        });
    } catch (e: any) {
        return NextResponse.json({ error: "import failed", detail: e?.message }, { status: 500 });
    }
}
