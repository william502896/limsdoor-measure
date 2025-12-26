import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용(절대 공개 X)
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const product_type = searchParams.get("product_type") ?? "";
    const coating = searchParams.get("coating") ?? "";
    const glass_group = searchParams.get("glass_group") ?? "";
    const is_knockdown = searchParams.get("is_knockdown") ?? "";
    const width_key = searchParams.get("width_key") ?? "";
    const variant = searchParams.get("variant") ?? "";

    const q = supabase.from("miso_sale_prices").select("*");

    if (product_type) q.eq("product_type", product_type);
    if (coating) q.eq("coating", coating);
    if (glass_group) q.eq("glass_group", glass_group);
    if (is_knockdown) q.eq("is_knockdown", is_knockdown === "true");
    if (width_key) q.eq("width_key", Number(width_key));
    if (variant) q.eq("variant", variant);

    // 운영에 쓰는 값이면 published만
    if (searchParams.get("published") === "true") q.eq("is_published", true);

    const { data, error } = await q.order("updated_at", { ascending: false }).limit(50);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
    const body = await req.json();

    // upsert(키 기준)
    const payload = {
        product_type: body.product_type,
        coating: body.coating,
        glass_group: body.glass_group,
        is_knockdown: !!body.is_knockdown,
        width_key: Number(body.width_key),
        variant: body.variant ?? "",
        sale_base: Number(body.sale_base ?? 0),
        sale_option_policy: body.sale_option_policy ?? {},
        discount_rules: body.discount_rules ?? [], // NEW: Discount/Event Rules
        starts_at: body.starts_at || null,         // NEW: Start Date
        ends_at: body.ends_at || null,             // NEW: End Date
        priority: Number(body.priority ?? 0),      // NEW: Priority
        memo: body.memo ?? "",
    };

    const { data, error } = await supabase
        .from("miso_sale_prices")
        .upsert(payload, { onConflict: "product_type,coating,glass_group,is_knockdown,width_key,variant" })
        .select()
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: Request) {
    const body = await req.json();
    const id = body.id as string;

    const patch: any = {};
    if (typeof body.is_published === "boolean") {
        patch.is_published = body.is_published;
        patch.published_at = body.is_published ? new Date().toISOString() : null;
    }
    if (typeof body.sale_base === "number") patch.sale_base = body.sale_base;
    if (body.sale_option_policy) patch.sale_option_policy = body.sale_option_policy;
    if (body.discount_rules) patch.discount_rules = body.discount_rules; // NEW
    if (body.starts_at !== undefined) patch.starts_at = body.starts_at;   // NEW
    if (body.ends_at !== undefined) patch.ends_at = body.ends_at;         // NEW
    if (typeof body.priority === "number") patch.priority = body.priority;// NEW
    if (typeof body.memo === "string") patch.memo = body.memo;

    const { data, error } = await supabase
        .from("miso_sale_prices")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
}
