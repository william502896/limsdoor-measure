import { NextRequest } from "next/server";
import { newRequestId, json, error, requireRole, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { callMemoPolishAI } from "@/app/lib/ai/calls";

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
        if (!body?.input?.raw) {
            return error({ request_id, code: "BAD_REQUEST", message: "raw memo required" }, 400);
        }
        // 🔥 AI Logic Injection (REAL)
        const output = await callMemoPolishAI(body);

        const latency = nowMs() - started;
        await logApi({ request_id, endpoint: "memo-polish", role: req.headers.get("x-role"), ok: true, latency_ms: latency });

        return json({
            status: "ok",
            request_id,
            output,
            confidence: 90,
            latency_ms: latency,
            model: "gpt-4o-2024-08-06"
        });
    } catch (e: any) {
        return error({ request_id, code: "AI_FAILED", message: e.message }, 500);
    }
}
