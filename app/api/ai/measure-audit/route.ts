import { NextRequest } from "next/server";
import { newRequestId, json, error, requireRole, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { callMeasureAuditAI } from "@/app/lib/ai/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const started = nowMs();
    const request_id = newRequestId();

    if (!requireRole(req, ["measurer", "admin"])) {
        return error({ request_id, code: "FORBIDDEN", message: "measurer or admin required" }, 403);
    }

    try {
        const body = await req.json();
        if (!body?.measurement?.door_type) {
            return error({ request_id, code: "BAD_REQUEST", message: "door_type is required" }, 400);
        }

        // 🔥 AI Logic Injection
        const { measurement, policy } = body;
        const wPoints = measurement.width_points_mm || [];
        const hPoints = measurement.height_points_mm || [];
        const wDelta = wPoints.length ? Math.max(...wPoints) - Math.min(...wPoints) : 0;
        const hDelta = hPoints.length ? Math.max(...hPoints) - Math.min(...hPoints) : 0;
        const maxDelta = Math.max(wDelta, hDelta);

        let grade = "ok";
        const likely_causes = [];
        const next_actions = [];
        const flags: any = { needs_admin_approval: false };

        if (maxDelta >= (policy?.delta_danger_mm || 10)) {
            grade = "danger";
            flags.needs_admin_approval = true;
            flags.request_more_photos = true;
            likely_causes.push({ code: "LARGE_DEVIATION", title: "심각한 편차", detail: `${maxDelta}mm 오차` });
            next_actions.push({ priority: 1, action: "레벨기 측정 사진 첨부", why: "수직 불량 확인" });
        } else if (maxDelta >= (policy?.delta_warn_mm || 5)) {
            grade = "warning";
            flags.suggest_extra_material = true;
            likely_causes.push({ code: "MINOR_DEVIATION", title: "미세 편차", detail: `${maxDelta}mm 오차` });
            next_actions.push({ priority: 2, action: "실리콘 마감 확인", why: "단차 보정" });
        }

        // One Sliding Special
        if (measurement.door_type.includes("원슬라이딩") && grade === "danger") {
            next_actions.unshift({ priority: 0, action: "하부 레일 수평 재측정", why: "원슬라이딩 민감" });
        }

        const aiResult = {
            grade,
            confidence: 85 + (grade === "ok" ? 10 : 0),
            summary: grade === "ok" ? "특이사항 없음" : `오차 ${maxDelta}mm 감지됨. 주의 요망.`,
            likely_causes,
            next_actions,
            flags,
            extra_material: flags.suggest_extra_material ? [{ name: "평판 몰딩", reason: "보정용" }] : []
        };

        const latency = nowMs() - started;
        await logApi({ request_id, endpoint: "measure-audit", role: req.headers.get("x-role"), ok: true, latency_ms: latency });

        return json({
            status: "ok",
            request_id,
            audit: aiResult,
            latency_ms: latency,
            model: "internal-ai-v1"
        });
    } catch (e: any) {
        return error({ request_id, code: "AI_FAILED", message: e.message ?? "unknown error" }, 500);
    }
}
