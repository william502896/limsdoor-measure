import { NextRequest } from "next/server";
import { newRequestId, json, error, requireRole, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { callInstallChecklistAI } from "@/app/lib/ai/calls";

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

        // 🔥 AI Logic Injection (REAL)
        const checklist = await callInstallChecklistAI(body);

        const latency = nowMs() - started;
        await logApi({ request_id, endpoint: "install-checklist", role: req.headers.get("x-role"), ok: true, latency_ms: latency });

        return json({
            status: "ok",
            request_id,
            checklist,
            confidence: 85,
            latency_ms: latency,
            model: "gpt-4o-2024-08-06"
        });
    } catch (e: any) {
        return error({ request_id, code: "AI_FAILED", message: e.message }, 500);
    }
}
