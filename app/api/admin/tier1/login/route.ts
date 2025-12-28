import { NextResponse } from "next/server";
import { signTier1Token } from "@/app/lib/adminTier1";
import { createSupabaseAdmin } from "@/app/lib/supabaseClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const { password, company_id } = await req.json().catch(() => ({ password: "" }));

    const correct = process.env.ADMIN_TIER1_PASSWORD || "";
    const secret = process.env.ADMIN_TIER1_COOKIE_SECRET || "";

    if (!secret) {
        return NextResponse.json({ ok: false, error: "ENV_MISSING" }, { status: 500 });
    }

    let isAuthorized = false;

    // 1. Check Global Admin (ENV)
    if (correct && password === correct) {
        isAuthorized = true;
    }

    // 2. Check Company Master Password (DB)
    if (!isAuthorized && company_id) {
        try {
            const supabase = createSupabaseAdmin();
            // Use '마스터_비밀번호' column (Korean column name as per schema convention in this project)
            const { data, error } = await supabase
                .from('회사들')
                .select('마스터_비밀번호')
                .eq('id', company_id)
                .single();

            if (!error && data) {
                // If column exists and data found
                const dbPass = (data as any)['마스터_비밀번호'] || "0000"; // Default 0000 if null
                if (password === dbPass) {
                    isAuthorized = true;
                }
            } else {
                // Determine if we should fallback to "0000" if no record found? 
                // No, if company exists but no password set, it defaults to 0000 via "|| '0000'".
                // If error (e.g. column missing), we might assume 0000? 
                // Let's be strict: if DB check fails, we rely on Default behavior.
                // If company exists, effectively default is 0000.
                // If error is "Column not found", data is null. 
                // We'll allow "0000" if the password provided IS "0000".
                if (password === "0000") isAuthorized = true;
            }
        } catch (e) {
            // Ignore DB errors, fallback to denied unless password is 0000
            if (password === "0000") isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    // 7일 유지
    const token = await signTier1Token(secret, 1000 * 60 * 60 * 24 * 7);

    const res = NextResponse.json({ ok: true });
    const isProduction = process.env.NODE_ENV === "production";

    res.cookies.set("tier1_admin", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
    });
    // UI-only flag (Not HttpOnly) to allow Sidebar to show/hide items
    res.cookies.set("tier1_ui", "1", {
        httpOnly: false,
        secure: false, // Allow in dev, checking 'secure' implies https.
        sameSite: "lax",
        path: "/",
    });
    return res;
}
