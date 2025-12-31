import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { sendMessage } from "@/app/lib/messaging/sendMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Render용 데이터 조회
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const sb = supabaseAdmin();
    const { id } = await params;

    // 1. 랜딩 정보 조회
    const { data: landing, error } = await sb
        .from("marketing_landing_pages")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !landing) {
        return NextResponse.json({ ok: false, error: "Not Found or Inactive" }, { status: 404 });
    }

    // 2. 조회수 증가 (비동기)
    // 단순 증가라 lock 없이 처리 (정확도보다는 성능)
    const views = (landing.stats?.views || 0) + 1;
    const newStats = { ...landing.stats, views };
    await sb.from("marketing_landing_pages").update({ stats: newStats }).eq("id", id);

    return NextResponse.json({ ok: true, data: landing });
}

// POST: 제출/클릭 액션 처리
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const sb = supabaseAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // 1. 랜딩 정보 확인
    const { data: landing } = await sb
        .from("marketing_landing_pages")
        .select("*")
        .eq("id", id)
        .single();

    if (!landing) return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });

    // 2. 제출 정보 저장 (수집 설정된 경우)
    if (landing.collect_phone && body.phone) {
        const { customer_name, phone } = body;

        // Submissions 테이블 저장
        await sb.from("marketing_landing_submissions").insert({
            landing_id: id,
            customer_name: customer_name,
            customer_phone: phone
        });

        // CRM Leads에도 저장/업데이트 (선택)
        // await sb.from("crm_leads").upsert(...) 

        // 3. 리드 점수 업데이트 (Lead Scoring)
        // Goal Type에 따라 점수 차등 적용
        const actionMap: any = {
            "PDF": "PDF_DOWNLOAD",
            "RSVP": "RSVP",
            "MEASURE": "MEASURE_REQ",
            "EVENT": "RSVP"
        };
        const action = actionMap[landing.goal_type] || "RSVP";

        // 비동기로 실행 (응답 속도 저하 방지)
        import("@/app/lib/marketing/leadScoring").then(mod => {
            mod.updateLeadScore(phone, action, `Landing: ${landing.title}`);
        });

        // 5. 자동 시나리오 트리거 (Scenario Engine)
        if (landing.goal_type === "PDF") {
            import("@/app/lib/marketing/scenarioEngine").then(mod => {
                mod.triggerScenario(phone, "PDF_DOWNLOAD");
            });
        }

        // 4. 자동 메시지 발송 (연결된 메시지가 있다면) - 시나리오 2 구현
        if (landing.connected_message_type && phone) {
            // 템플릿 로직이 복잡하므로 여기선 간단한 안내 메시지로 대체 혹은 추후 확장
            // 우선 "자료 발송" 시나리오 가정
            let msgText = "";
            if (landing.goal_type === "PDF") {
                msgText = `[LimsDoor] 요청하신 자료입니다.\n${landing.title}\n\n다운로드: ${landing.cta_target_url || "준비중"}`;
            } else {
                msgText = `[LimsDoor] ${landing.title} 신청이 접수되었습니다. 담당자가 곧 연락드리겠습니다.`;
            }

            await sendMessage({
                to: phone,
                text: msgText,
                type: landing.connected_message_type === "KAKAO" ? "KAKAO" : "LMS", // 카카오 템플릿 연동 필요시 확장
                // kakaoOptions: ... (템플릿 ID 등을 사용하려면 여기서 로드)
            });
        }
    }

    // 4. 전환수(Conversion) 증가
    const conversions = (landing.stats?.conversions || 0) + 1;
    const newStats = { ...landing.stats, conversions };
    await sb.from("marketing_landing_pages").update({ stats: newStats }).eq("id", id);

    return NextResponse.json({ ok: true });
}
