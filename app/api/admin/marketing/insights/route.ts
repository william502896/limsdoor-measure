import { NextResponse } from "next/server";
import { generateMarketingInsights } from "@/app/lib/marketing/marketingAnalysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    return !!process.env.ADMIN_SECRET && key === process.env.ADMIN_SECRET;
}

export async function GET(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    try {
        const data = await generateMarketingInsights();
        return NextResponse.json({ ok: true, data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
