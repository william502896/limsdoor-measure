import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { enqueueAutomationForLead } from "@/app/lib/automation"; // Reusing existing queue logic

export async function triggerScenario(phoneRaw: string, triggerType: string) {
    const sb = supabaseAdmin();
    const phone = (phoneRaw || "").replace(/[^\d]/g, "");

    // 1. 활성화된 해당 트리거 시나리오 조회
    const { data: scenarios } = await sb
        .from("marketing_scenarios")
        .select("*")
        .eq("trigger_type", triggerType)
        .eq("is_active", true);

    if (!scenarios || scenarios.length === 0) return;

    // 2. 각 시나리오별로 자동화 큐에 등록
    // 기존 automation_jobs 테이블 활용
    /*
      automation_jobs 구조: lead_id(optional), phone, job_type, status, scheduled_at...
    */

    const now = new Date();

    for (const scen of scenarios) {
        const runAt = new Date(now.getTime() + (scen.wait_minutes || 0) * 60000);

        await sb.from("automation_jobs").insert({
            phone: phone,
            job_type: "SCENARIO_MSG",
            payload: {
                scenario_id: scen.id,
                message: scen.message_template
            },
            status: "PENDING",
            scheduled_at: runAt.toISOString()
        });

        // 통계 업데이트 (단순 증가)
        const stats = scen.stats || { triggered: 0, completed: 0 };
        stats.triggered += 1;
        await sb.from("marketing_scenarios").update({ stats }).eq("id", scen.id);
    }
}
