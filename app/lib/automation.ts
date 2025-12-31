import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function addHours(h: number) {
    const d = new Date();
    d.setHours(d.getHours() + h);
    return d.toISOString();
}

export async function enqueueAutomationForLead(leadId: string, newStatus: string) {
    const sb = supabaseAdmin();

    // 상태별 예약 규칙
    const jobs: { job_type: string; run_at: string; payload?: any }[] = [];

    if (newStatus === "NEW") {
        jobs.push({ job_type: "NEW_24H", run_at: addHours(24) });
    }

    if (newStatus === "ESTIMATED") {
        jobs.push({ job_type: "ESTIMATED_24H", run_at: addHours(24) });
    }

    if (newStatus === "PAID") {
        // 즉시 메시지
        jobs.push({ job_type: "PAID_IMMEDIATE", run_at: addHours(0) });
    }

    if (newStatus === "INSTALLED") {
        jobs.push({ job_type: "INSTALLED_24H", run_at: addHours(24) });
    }

    if (!jobs.length) return;

    // upsert (lead_id + job_type QUEUED 유니크 인덱스 기준)
    for (const j of jobs) {
        await sb.from("automation_jobs").upsert(
            {
                lead_id: leadId,
                job_type: j.job_type,
                status: "QUEUED",
                run_at: j.run_at,
                payload: j.payload || {},
            },
            { onConflict: "lead_id,job_type" }
        );
    }
}
