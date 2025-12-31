import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

type ActionType = "LANDING_VISIT" | "PDF_DOWNLOAD" | "LINK_CLICK" | "RSVP" | "MEASURE_REQ" | "REVISIT";

const POINTS: Record<ActionType, number> = {
    LANDING_VISIT: 5,
    PDF_DOWNLOAD: 10,
    LINK_CLICK: 5,
    RSVP: 20,
    MEASURE_REQ: 30,
    REVISIT: 10
};

function normalizePhone(p: string) {
    return (p || "").replace(/[^\d]/g, "");
}

function calculateGrade(score: number): "HOT" | "WARM" | "COLD" {
    if (score >= 40) return "HOT";
    if (score >= 20) return "WARM";
    return "COLD";
}

export async function updateLeadScore(phoneRaw: string, action: ActionType, detail?: string) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) return;

    const sb = supabaseAdmin();
    const points = POINTS[action] || 0;
    const now = new Date().toISOString();

    // 1. 기존 점수 조회
    const { data: current } = await sb
        .from("marketing_lead_scores")
        .select("*")
        .eq("phone", phone)
        .single();

    let newScore = (current?.score || 0) + points;
    let history = current?.history || [];

    // 2. 7일 이상 미반응 감점 로직 (간단 구현: 이번 액션 전에 체크)
    if (current?.last_action_at) {
        const last = new Date(current.last_action_at).getTime();
        const diffDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
        if (diffDays >= 7) {
            newScore -= 10;
            history.push({ action: "INACTIVE_7DAYS", delta: -10, ts: now });
        }
    }

    // 3. 히스토리 추가
    history.push({ action, delta: points, detail, ts: now });
    // 최근 50개만 유지
    if (history.length > 50) history = history.slice(-50);

    const newGrade = calculateGrade(newScore);

    // 4. 저장 (Upsert)
    await sb.from("marketing_lead_scores").upsert({
        phone,
        score: newScore,
        grade: newGrade,
        last_action: action,
        last_action_at: now,
        history: history,
        updated_at: now
    });

    return { newScore, newGrade };
}
