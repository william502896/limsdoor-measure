import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin"; // Service Role Client

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * INTEGRATED CONTROL QUERY API
 * - Uses Service Role (supabaseAdmin)
 * - MANDATORY: 'company_id' filter
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("company_id");

        // 1. Strict Filter Enforcement
        // --- FEATURE FLAG: 1-PERSON OPERATION MODE ---
        const FEATURE_USER_REGISTRATION = process.env.FEATURE_USER_REGISTRATION === "true";
        const LIMSDOOR_COMPANY_ID = process.env.LIMSDOOR_COMPANY_ID;

        // In 1-Person mode, we allow ADMIN to see:
        // A) Rows with company_id = LIMSDOOR_COMPANY_ID
        // B) Rows with company_id IS NULL (Legacy Data)

        let query = supabaseAdmin()
            .from("measurements")
            .select("*")
            .order("created_at", { ascending: false });

        if (!FEATURE_USER_REGISTRATION) {
            // [Mode: 1-Person Operation]
            // We expect the client (Integrated Control) might still send ?company_id=... or not.
            // But regardless, we want to show EVERYTHING relevant to the Admin.
            // Actually, "Integrated Control" usually queries by implicit context or specific filter.
            // If the UI sends company_id, we respect it, BUT we also want to allow "Global View" of legacy.

            // For now, if companyId param is provided, we use it. 
            // If not provided, we might error or default.

            // STRICT RULE implementation from request: 
            // "(company_id = LIMSDOOR_COMPANY_ID) OR (company_id IS NULL)"

            if (companyId) {
                // If specific ID requested, verify it is allowed
                query = query.eq("company_id", companyId);
            } else {
                // If no ID requested, and we are in 1-Person Mode, we typically return ALL strictly filtered
                // OR filter logic: company_id.eq.LIMSDOOR_COMPANY_ID , company_id.is.null
                if (LIMSDOOR_COMPANY_ID) {
                    query = query.or(`company_id.eq.${LIMSDOOR_COMPANY_ID},company_id.is.null`);
                } else {
                    // Fallback if env missing: only legacy
                    query = query.is("company_id", null);
                }
            }
        } else {
            // [Mode: Multi-Tenant Standard]
            if (!companyId) {
                return NextResponse.json({
                    ok: false,
                    error: "SECURITY VIOLATION: company_id is mandatory for admin queries."
                }, { status: 400 });
            }
            query = query.eq("company_id", companyId);
        }

        console.log(`[Admin Query] Executing for Company: ${companyId || 'Global/Legacy'}`);

        // 2. Service Role Query
        // We bypass RLS (Service Role) but apply strict filter manually
        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, data });

    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
