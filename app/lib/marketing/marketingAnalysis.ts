import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function generateMarketingInsights() {
    const sb = supabaseAdmin();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch Data
    const [landings, messages, leads] = await Promise.all([
        sb.from("marketing_landing_pages").select("id, title, goal_type, stats"),
        sb.from("marketing_message_queue").select("status, msg_type, created_at").gte("created_at", weekAgo),
        sb.from("marketing_landing_submissions").select("landing_id, customer_phone")
    ]);

    const landingList = landings.data || [];
    const msgList = messages.data || [];
    const subList = leads.data || [];

    // 2. Analyze Landings (Conversion Rate)
    const landingPerformance = landingList.map(l => {
        const views = l.stats?.views || 0;
        const actions = l.stats?.conversions || 0;
        const rate = views > 0 ? (actions / views) * 100 : 0;
        return { ...l, rate, views, actions };
    }).sort((a, b) => b.rate - a.rate);

    // 3. Analyze Messages (Approximate via Status)
    const sentCount = msgList.filter(m => m.status === 'SENT').length;
    const failCount = msgList.filter(m => m.status === 'FAILED').length;

    // 4. Generate AI Insights (Heuristics)
    const insights = [];

    // Insight: Best Landing
    if (landingPerformance.length > 0) {
        const top = landingPerformance[0];
        if (top.actions > 0) {
            insights.push({
                type: "SUCCESS",
                title: "🔥 이번 주 성과 1위 랜딩페이지",
                message: `"${top.title}" 전환율이 ${top.rate.toFixed(1)}%로 가장 높습니다.`,
                recommendation: "이 랜딩페이지를 문자 캠페인 메인 링크로 사용하세요.",
                action: "USE_LANDING",
                targetId: top.id
            });
        }
    }

    // Insight: Underperforming Landing
    const bad = landingPerformance.filter(l => l.views > 20 && l.rate < 5);
    if (bad.length > 0) {
        insights.push({
            type: "WARNING",
            title: "📉 개선이 필요한 랜딩페이지",
            message: `"${bad[0].title}"의 전환율(${bad[0].rate.toFixed(1)}%)이 낮습니다.`,
            recommendation: "메인 카피나 이미지를 더 매력적으로 수정해 보세요.",
            action: "EDIT_LANDING",
            targetId: bad[0].id
        });
    }

    // Insight: Message System Health
    if (failCount > 0 && (failCount / msgList.length) > 0.1) {
        insights.push({
            type: "ERROR",
            title: "⚠ 메시지 발송 실패율 주의",
            message: `최근 메시지 중 ${failCount}건이 실패했습니다.`,
            recommendation: "잔액 부족이나 통신사 장애 여부를 확인하세요.",
            action: "CHECK_LOGS"
        });
    }

    return {
        summary: {
            totalViews: landingList.reduce((acc, c) => acc + (c.stats?.views || 0), 0),
            totalConversions: landingList.reduce((acc, c) => acc + (c.stats?.conversions || 0), 0),
            msgSent: sentCount,
            msgFail: failCount
        },
        topLandings: landingPerformance.slice(0, 3),
        insights
    };
}
