import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTier1Token } from "@/app/lib/adminTier1";

// 1. Onboarding Check Exemptions
const ONBOARDING_ALLOW_PREFIXES = [
    "/admin/onboarding",
    "/admin/tier1/login",
    "/api", // API는 차단하지 않음
];

// 2. Tier 1 Admin Protected Paths
const TIER1_PREFIXES = [
    "/admin/partners",       // 거래처 관리 (vendors)
    "/admin/purchase-costs", // 단가 관리 (pricing)
    "/admin/items",          // 품목/자재 (materials)
    "/admin/prices",         // 단가/마진 (margins)
    "/admin/invoices",       // 전자 명세서 (statement)
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Inject x-pathname for Server Component visibility (Always do this first)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", pathname);

    // --- Onboarding Check (Global Admin Guard) ---
    // Only check if it starts with /admin and is NOT in allow list
    if (pathname.startsWith("/admin")) {
        const isAllowed = ONBOARDING_ALLOW_PREFIXES.some((p) => pathname.startsWith(p));

        if (!isAllowed) {
            const onboarded = req.cookies.get("onboarded")?.value;
            // onboarded !== "1" && NOT allowed -> Redirect to Onboarding
            if (onboarded !== "1") {
                const url = req.nextUrl.clone();
                url.pathname = "/admin/onboarding";
                return NextResponse.redirect(url);
            }
        }
    }

    // --- Tier 1 Admin Check (Specific Guard) ---
    const isTier1Target = TIER1_PREFIXES.some((p) => pathname.startsWith(p));
    if (isTier1Target) {
        const token = req.cookies.get("tier1_admin")?.value || "";
        const secret = process.env.ADMIN_TIER1_COOKIE_SECRET || "fallback-secret-key-1234";

        const redirectToLogin = () => {
            const url = req.nextUrl.clone();
            url.pathname = "/admin/tier1/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        };

        if (!token || !secret) {
            return redirectToLogin();
        }

        const ok = await verifyTier1Token(secret, token);
        if (!ok.ok) {
            return redirectToLogin();
        }
    }

    // Pass headers to next request
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ["/admin/:path*"],
};
