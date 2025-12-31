import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    return !!process.env.ADMIN_SECRET && key === process.env.ADMIN_SECRET;
}

export async function POST(req: Request) {
    if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const secret = process.env.REPORT_CRON_SECRET || "";
    if (!secret) return NextResponse.json({ ok: false, error: "REPORT_CRON_SECRET missing" }, { status: 500 });

    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;

    const workerUrl = `${origin}/api/marketing/report/worker?key=${encodeURIComponent(secret)}`;

    const res = await fetch(workerUrl, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ ok: false, error: `HTTP_${res.status}`, detail: json }, { status: 500 });

    return NextResponse.json({ ok: true, result: json });
}
