import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabaseClient";

export const runtime = "nodejs";

type OnboardingBody = {
    owner_user_id: string;

    business_number: string;
    company_name: string;
    address?: string;
    email?: string;
    fax?: string;
    kakao?: string;
    logo_url?: string;
    homepage_urls?: string[];
    shopping_mall_urls?: string[];
    youtube?: string; // New
    tiktok?: string; // New
    instagram?: string; // New
    facebook?: string; // New

    owner_name: string;
    owner_job_title?: string;
    owner_phone?: string;

    measurers?: Array<{ name: string; phone?: string; note?: string }>;
    installers?: Array<{ name: string; phone?: string; note?: string }>;
    master_password?: string; // New: For Tier 1 Admin
};

export async function POST(req: Request) {
    const supabase = createSupabaseAdmin();

    const body = (await req.json().catch(() => null)) as OnboardingBody | null;
    if (!body) return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });

    const {
        owner_user_id,
        business_number,
        company_name,
        address,
        email,
        fax,
        kakao,
        logo_url,
        homepage_urls,
        shopping_mall_urls,
        youtube, // New
        tiktok, // New
        instagram, // New
        facebook, // New
        owner_name,
        owner_job_title,
        owner_phone,
        measurers = [],
        installers = [],
    } = body;

    if (!business_number || !company_name || !owner_name) {
        return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // DEBUG: Validate User Existence
    console.log(`[Onboarding] Processing for User ID: ${owner_user_id}`);

    // 1. Check Service Role Key Security
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!serviceKey || serviceKey === anonKey) {
        console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing or identical to ANON_KEY.");
        return NextResponse.json({
            ok: false,
            error: "Server Configuration Error: Invalid Service Role Key. Please check Vercel Env Vars."
        }, { status: 500 });
    }

    // 2. Check Admin Accessibility (List Users)
    const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (listErr) {
        console.error("FATAL: Admin API Access Failed", listErr);
        return NextResponse.json({
            ok: false,
            error: `Admin API Error: ${listErr.message}. The Server Key might be invalid for this Project.`
        }, { status: 500 });
    }
    console.log("[Onboarding] Admin Access OK. Total Users visible:", userList.users.length > 0 ? "Yes" : "No (Empty DB)");

    // 3. Server-Side User Check & Creation (The Fix)
    // We ignore the client's transient user ID and rely on Email + Password to create/fetch a persistent Server User.

    let targetUserId = owner_user_id;

    // Force creation if ID is missing or if we want to ensure robustness
    if (email && body.master_password) {
        // Try creating user first
        const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
            email: email,
            password: body.master_password,
            email_confirm: true,
            user_metadata: { name: owner_name }
        });

        if (createData.user) {
            targetUserId = createData.user.id;
            console.log(`[Onboarding] Server-Created User ID: ${targetUserId}`);
        } else if (createErr) {
            console.log(`[Onboarding] Creation failed (might exist): ${createErr.message}`);

            // Fallback: If creation failed, try to sign in to get the User ID
            // This handles "User already registered" case gracefully.
            // IMPORTANT: Create a FRESH client for this check to avoid mutating 'supabase' (Admin Client) state!
            // If we use 'supabase.auth.signInWithPassword', it downgrades the Admin client to that user's role.
            const { createClient } = require('@supabase/supabase-js');
            const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

            const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
                email: email,
                password: body.master_password
            });

            if (signInData.user) {
                targetUserId = signInData.user.id;
                console.log(`[Onboarding] Recovered User ID via SignIn: ${targetUserId}`);
            } else {
                console.error(`[Onboarding] ID Recovery Failed. SignIn Error: ${signInErr?.message}`);
                return NextResponse.json({
                    ok: false,
                    error: `User already exists but password verification failed. Please check your password or use a different email.`
                }, { status: 400 });
            }
        }
    }

    if (!targetUserId) {
        return NextResponse.json({ ok: false, error: "USER_CREATION_FAILED_AND_no_ID_PROVIDED" }, { status: 400 });
    }

    // Verify User Exists (Final Check)
    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(targetUserId);
    if (authErr || !authUser.user) {
        return NextResponse.json({
            ok: false,
            error: `User Sync Error. Server cannot find User ${targetUserId}. Please use a different email or contact support.`
        }, { status: 400 });
    }

    // 1) 회사 생성 (Upsert for Idempotency)
    const { data: company, error: cErr } = await supabase
        .from('companies')
        .upsert({
            business_number: business_number,
            name: company_name,
            address: address ?? null,
            email: email ?? null,
            fax: fax ?? null,
            kakao_id: kakao ?? null,
            logo_url: logo_url ?? null,
            homepage_url: homepage_urls ? homepage_urls[0] : null,
            shopping_url: shopping_mall_urls ? shopping_mall_urls[0] : null,
            youtube_url: youtube ?? null,
            tiktok_url: tiktok ?? null,
            instagram_url: instagram ?? null,
            facebook_url: facebook ?? null,
            master_password: (body as any).master_password ?? "0000"
        }, { onConflict: 'business_number' })
        .select("id")
        .single();

    if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 }); // 400 -> 500 for SQL error

    // 2) OWNER 프로필 upsert (Strict Linking)
    if (!company || !company.id) {
        throw new Error("Company creation failed, ID is missing.");
    }

    const { error: pErr } = await supabase
        .from("프로필")
        .upsert({
            id: targetUserId, // Ensure we use the verified ID from Auth
            company_id: company.id, // STRICT LINKING: Use server-generated ID
            user_name: owner_name,
            role: "OWNER",
            job_title: owner_job_title ?? null,
            phone: owner_phone ?? null,
        });

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

    // 2-1) English Profile Sync
    const { error: pEngErr } = await supabase
        .from("profiles")
        .upsert({
            user_id: targetUserId,
            name: owner_name,
            phone: owner_phone ?? null,
        });
    if (pEngErr) console.warn("Failed to sync profiles (English):", pEngErr);

    // 3) 측정자/설치기사 생성 (company_id 포함)
    if (measurers.length) {
        const rows = measurers
            .filter((m) => (m.name || "").trim().length > 0)
            .map((m) => ({
                company_id: company.id,
                name: m.name.trim(),
                phone: m.phone ?? null,
                note: m.note ?? null,
            }));
        if (rows.length) {
            const { error } = await supabase.from("측정자").insert(rows);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
    }

    if (installers.length) {
        const rows = installers
            .filter((i) => (i.name || "").trim().length > 0)
            .map((i) => ({
                company_id: company.id,
                name: i.name.trim(),
                phone: i.phone ?? null,
                note: i.note ?? null,
            }));
        if (rows.length) {
            const { error } = await supabase.from("설치 기사").insert(rows);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
    }

    // 4) 온보딩 완료 쿠키 세팅 (미들웨어 가드용)
    const res = NextResponse.json({ ok: true, company_id: company.id });
    res.cookies.set("onboarded", "1", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    res.cookies.set("company_id", company.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });

    // Explicitly clear 'demo' if it behaves as a separate cookie due to domain/path quirks (Safety)
    // (Note: Overwriting usually works, but this is harmless)


    return res;
}
