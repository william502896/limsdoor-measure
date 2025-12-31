
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Payload destructuring
        const {
            customer, // { name, phone, address }
            widthPoints,
            heightPoints,
            widthMm,
            heightMm,
            category,
            detail,
            glass,
            openDirection,
            slidingMode,
            design,
            color,          // [NEW] Added
            addMaterials,   // [NEW] Added
            memo,
            photos, // Array of { name, type, size } - or URLs if we upload them
            requestDate,
            requestTime
        } = body;

        // Validation
        if (!customer || !customer.name || !customer.phone) {
            return NextResponse.json({ error: "고객 정보(이름, 전화번호)가 필수입니다." }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // Normalize Phone (Remove dashes)
        const cleanPhone = customer.phone.replace(/-/g, "").trim();
        console.log(`[API] Processing Submit for: ${customer.name}, Phone: ${cleanPhone} (Raw: ${customer.phone})`);

        // 1. Upsert Customer (by Phone)
        let customerId: string | null = null;
        let isNewCustomer = false;

        // Try exact match first
        const { data: existingC, error: findErr } = await sb
            .from("crm_customers")
            .select("id, phone")
            .eq("phone", cleanPhone)
            .maybeSingle();

        if (findErr) console.error("[API] Find Customer Error:", findErr);

        if (existingC) {
            customerId = existingC.id;
            console.log(`[API] Found Existing Customer: ${customerId}`);
        } else {
            console.log(`[API] Customer not found, creating new...`);
            const { data: newC, error: createErr } = await sb
                .from("crm_customers")
                .insert({
                    name: customer.name,
                    phone: cleanPhone,
                    address: customer.address || "",
                    memo: "실측 앱에서 자동 등록됨"
                })
                .select("id")
                .single();

            if (createErr) {
                console.error("[API] Create Customer Error:", createErr);
                throw createErr;
            }
            customerId = newC.id;
            isNewCustomer = true;
            console.log(`[API] Created New Customer: ${customerId}`);
        }

        if (!customerId) throw new Error("Customer ID creation failed");

        // 2. Create Schedule (Quote/Measure Data)
        const title = `${category} ${detail}`;

        console.log(`[API] Inserting Schedule linked to Customer ID: ${customerId}`);

        // Helper string for DB readability
        const contentStr = `[${category}] ${detail} / ${widthMm}x${heightMm}`;

        // Full JSON payload for the app to reconstruct
        const itemsJson = {
            category,
            detail,
            widthMm,
            heightMm,
            widthPoints,
            heightPoints,
            glass,
            openDirection,
            slidingMode,
            design,
            color,          // [NEW] Added
            addMaterials,   // [NEW] Added
            photos: photos || [], // [NEW] Added for frontend access
            requestDate,
            requestTime,
            memoRaw: memo
        };

        const { data: scheduleData, error: schedErr } = await sb
            .from("sc_schedules")
            .insert({
                customer_id: customerId,
                title: title,
                type: 'measure',
                status: 'MEASURED',
                content: contentStr,
                items_json: itemsJson,
                photos: photos || [],
                install_date: requestDate ? requestDate : null,
                memo: memo
            })
            .select("id")
            .single();

        if (schedErr) throw schedErr;

        return NextResponse.json({
            ok: true,
            message: "Quote created successfully",
            scheduleId: scheduleData.id,
            customerId
        });

    } catch (e: any) {
        console.error("Field Submit Error Stack:", e);
        const errorDetails = {
            message: e.message || "Unknown Server Error",
            code: e.code,
            details: e.details,
            hint: e.hint,
            full: JSON.stringify(e)
        };

        return NextResponse.json({ error: errorDetails, success: false }, { status: 500 });
    }
}
