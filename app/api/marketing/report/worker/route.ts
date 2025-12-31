import { NextResponse } from "next/server";
import { buildDailyReport } from "@/app/lib/marketing/reportDaily";
import { sendDailyReportEmail } from "@/app/lib/marketing/sendReportEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowed(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    const headerKey = req.headers.get("x-cron-key");
    const secret = process.env.REPORT_CRON_SECRET;

    return !!secret && (key === secret || headerKey === secret);
}

export async function GET(req: Request) {
    if (!isAllowed(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const to = (process.env.REPORT_TO_EMAIL || "").trim();
    if (!to) return NextResponse.json({ ok: false, error: "REPORT_TO_EMAIL missing" }, { status: 500 });

    const { subject, text, payload, reportDate } = await buildDailyReport();
    const sent = await sendDailyReportEmail({ to, subject, text, payload, reportDate });

    return NextResponse.json({ ok: true, worker: "report", reportDate, sent });
}
