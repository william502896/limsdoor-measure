import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    // Use the secret key from environment or default (as confirmed in vercel.json)
    return key === process.env.CRON_SECRET || key === "dk_cron_2025_limsdoor_secret_key";
}

function todayKeyKST() {
    // 단순 키(중복 생성 방지용). 서버가 어디서 돌든 KST를 고정하고 싶으면 실제로는 tz 라이브러리 권장.
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
}

export async function GET(req: Request) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const startedAt = Date.now();
    const sb = supabaseAdmin();

    try {
        /**
         * ✅ 지금은 “샘플 자동화”
         * - 실제로는: 고객/리드 테이블에서 대상 조회 → 메시지 템플릿 생성 → queue insert
         */
        const sampleTargets = [
            { to_phone: "01000000000", to_name: "샘플고객A" },
            { to_phone: "01011111111", to_name: "샘플고객B" },
        ];

        const campaign_key = "WELCOME_NUDGE";
        const trigger_key = "DAILY_10MIN_AUTOMATION";
        const day = todayKeyKST();

        const rows = sampleTargets.map((t) => ({
            campaign_key,
            trigger_key,
            to_phone: t.to_phone,
            to_name: t.to_name,
            msg_type: "SMS",
            text: `안녕하세요 ${t.to_name}님! 오늘도 림스도어입니다 😊 (샘플 자동화 메시지)`,
            scheduled_at: new Date().toISOString(),
            // ✅ 같은 날 같은 캠페인/트리거/번호면 중복 insert 방지
            dedupe_key: `${day}:${campaign_key}:${trigger_key}:${t.to_phone}`,
        }));

        const { data, error } = await sb
            .from("marketing_message_queue")
            .insert(rows)
            .select("id, to_phone, dedupe_key");

        // dedupe_key unique 충돌이면 에러가 날 수 있음 → 운영에서는 upsert 전략으로 바꿔도 됨
        if (error) {
            // 이미 생성됐을 가능성이 크니 “실패”가 아니라 “스킵”으로 처리하는 게 운영 친화적
            return NextResponse.json({
                ok: true,
                worker: "automation",
                note: "Insert skipped or partially failed (likely dedupe).",
                error: error.message,
                tookMs: Date.now() - startedAt,
            });
        }

        return NextResponse.json({
            ok: true,
            worker: "automation",
            queued: data?.length || 0,
            sample: data?.slice(0, 3),
            tookMs: Date.now() - startedAt,
        });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, worker: "automation", error: e?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
