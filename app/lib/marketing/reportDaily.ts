import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function kstNow() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
    return new Date(utc + 9 * 60 * 60_000);
}

function kstTodayStartUtcIso() {
    const d = kstNow();
    d.setHours(0, 0, 0, 0);
    const utcMs = d.getTime() - 9 * 60 * 60_000;
    return new Date(utcMs).toISOString();
}

function kstDateString() {
    const d = kstNow();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export async function buildDailyReport() {
    const sb = supabaseAdmin();
    const todayStartIso = kstTodayStartUtcIso();
    const reportDate = kstDateString();

    // ✅ 상태 카운트
    const [{ count: sentToday }, { count: failedToday }, { count: readyNow }, { count: sendingNow }] =
        await Promise.all([
            sb
                .from("marketing_message_queue")
                .select("*", { count: "exact", head: true })
                .eq("status", "SENT")
                .gte("sent_at", todayStartIso),
            sb
                .from("marketing_message_queue")
                .select("*", { count: "exact", head: true })
                .eq("status", "FAILED")
                .gte("updated_at", todayStartIso),
            sb.from("marketing_message_queue").select("*", { count: "exact", head: true }).eq("status", "READY"),
            sb.from("marketing_message_queue").select("*", { count: "exact", head: true }).eq("status", "SENDING"),
        ]);

    // ✅ 오늘 실패 최근 200건 가져와 오류 TOP
    const { data: failedRows } = await sb
        .from("marketing_message_queue")
        .select("last_error,msg_type,campaign_key,trigger_key,updated_at")
        .eq("status", "FAILED")
        .gte("updated_at", todayStartIso)
        .order("updated_at", { ascending: false })
        .limit(200);

    const errorMap = new Map<string, number>();
    for (const r of failedRows || []) {
        const k = String(r.last_error || "UNKNOWN").slice(0, 120);
        errorMap.set(k, (errorMap.get(k) || 0) + 1);
    }
    const topErrors = Array.from(errorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([key, cnt]) => ({ key, cnt }));

    // ✅ 캠페인별 오늘 SENT 집계(상위 10)
    const { data: sentRows } = await sb
        .from("marketing_message_queue")
        .select("campaign_key")
        .eq("status", "SENT")
        .gte("sent_at", todayStartIso)
        .limit(5000);

    const campMap = new Map<string, number>();
    for (const r of sentRows || []) {
        const k = String(r.campaign_key || "UNKNOWN");
        campMap.set(k, (campMap.get(k) || 0) + 1);
    }
    const topCampaigns = Array.from(campMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, cnt]) => ({ key, cnt }));

    const payload = {
        reportDate,
        todayStartIso,
        counts: {
            sentToday: sentToday || 0,
            failedToday: failedToday || 0,
            readyNow: readyNow || 0,
            sendingNow: sendingNow || 0,
        },
        topErrors,
        topCampaigns,
    };

    const subject = `📌 마케팅 운영 리포트 (KST ${reportDate})`;
    const text = renderPlainText(payload);

    return { subject, text, payload, reportDate };
}

function renderPlainText(p: any) {
    const c = p.counts;
    const lines: string[] = [];

    lines.push(`마케팅 운영 리포트 (KST ${p.reportDate})`);
    lines.push(``);
    lines.push(`- 오늘 SENT: ${c.sentToday}`);
    lines.push(`- 오늘 FAILED: ${c.failedToday}`);
    lines.push(`- 현재 READY: ${c.readyNow}`);
    lines.push(`- 현재 SENDING: ${c.sendingNow}`);
    lines.push(``);

    lines.push(`[오류 TOP]`);
    if (!p.topErrors?.length) lines.push(`- (없음)`);
    else p.topErrors.forEach((e: any) => lines.push(`- ${e.cnt}건 · ${e.key}`));
    lines.push(``);

    lines.push(`[캠페인별 오늘 SENT TOP]`);
    if (!p.topCampaigns?.length) lines.push(`- (없음)`);
    else p.topCampaigns.forEach((e: any) => lines.push(`- ${e.cnt}건 · ${e.key}`));

    return lines.join("\n");
}
