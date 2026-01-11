import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createSupabaseServer } from "@/app/lib/supabaseServer"; // Authenticated client for user check

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * STRICT MEASUREMENT SAVE API
 * 1. Authenticate User (Supabase Auth)
 * 2. Lookup Profile -> Company ID (Server Side)
 * 3. Force Inject Company ID
 */
export async function POST(req: Request) {
    try {
        // 1. Authenticate User
        const supabase = await createSupabaseServer();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // 2. Resolve Company ID (Trust Server Only)
        // Query "프로필" table to find my company.
        const sbAdmin = supabaseAdmin();

        // --- FEATURE FLAG: 1-PERSON OPERATION MODE ---
        // If registration is CLOSED, we enforce strict 1-person rules
        const FEATURE_USER_REGISTRATION = process.env.FEATURE_USER_REGISTRATION === "true";
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const LIMSDOOR_COMPANY_ID = process.env.LIMSDOOR_COMPANY_ID;

        let myCompanyId = null;

        if (!FEATURE_USER_REGISTRATION) {
            // [Mode: 1-Person Operation]
            // Rule: Only ADMIN_EMAIL can write. Forced to LIMSDOOR_COMPANY_ID.
            if (!user.email || user.email !== ADMIN_EMAIL) {
                return NextResponse.json({ ok: false, error: "Operation Mode: Only Administrator can save measurements." }, { status: 403 });
            }
            if (!LIMSDOOR_COMPANY_ID) {
                return NextResponse.json({ ok: false, error: "Server Configuration Error: LIMSDOOR_COMPANY_ID missing." }, { status: 500 });
            }
            myCompanyId = LIMSDOOR_COMPANY_ID;
            console.log(`[Measurement API] Single-Tenant Mode Enforced. User: ${user.email} -> Company: ${myCompanyId}`);
        } else {
            // [Mode: Multi-Tenant Standard]
            // We use Admin client for this lookup to ensure we can see the profile, 
            // though RLS should allow reading own profile. Admin is safer for system lookups.
            const { data: profile, error: profileErr } = await sbAdmin
                .from("프로필")
                .select("company_id, role")
                .eq("id", user.id)
                .single();

            if (profileErr || !profile || !profile.company_id) {
                console.error(`[Measurement API] No Company ID for user ${user.id}`);
                return NextResponse.json({
                    ok: false,
                    error: "Registration Incomplete: No Company ID Linked."
                }, { status: 403 });
            }
            myCompanyId = profile.company_id;
            console.log(`[Measurement API] Resolved Company: ${myCompanyId} for User: ${user.id}`);
        }

        // 3. Parse Body
        const body = await req.json().catch(() => ({}));

        // 4. Force Inject Company ID on Insert
        // Using "measurements" table as defined in Strict Architecture
        const { data: inserted, error: insertErr } = await sbAdmin
            .from("measurements")
            .insert({
                company_id: myCompanyId, // <--- FORCED INJECTION
                created_by: user.id,     // <--- FORCED INJECTION
                customer_name: body.customer_name,
                customer_phone: body.customer_phone,
                width_mm: body.width_mm || 0,
                height_mm: body.height_mm || 0,
                photos: body.photos || [],
                status: "submitted"
            })
            .select("id, company_id, created_at")
            .single();

        if (insertErr) {
            console.error(`[Measurement API] Insert Error: ${insertErr.message}`);
            return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            inserted_id: inserted.id,
            company_id: inserted.company_id, // Confirm back to client (debugging)
            message: "Measurement saved securely."
        });

    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
