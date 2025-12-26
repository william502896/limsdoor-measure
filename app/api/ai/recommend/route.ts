import { NextRequest } from "next/server";
import { newRequestId, json, error, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { callRecommendAI } from "@/app/lib/ai/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const started = nowMs();
    const request_id = newRequestId();

    try {
        const body = await req.json();
        if (!body?.inputs?.door_type) {
            return error({ request_id, code: "BAD_REQUEST", message: "door_type required" }, 400);
        }

        // 🔥 AI Logic Injection (REAL)
        const result = await callRecommendAI(body);

        const latency = nowMs() - started;
        await logApi({ request_id, endpoint: "recommend", role: "customer", ok: true, latency_ms: latency });

        return json({
            status: "ok",
            request_id,
            recommendations: result.recommendations,
            confidence: result.confidence,
            latency_ms: latency,
            model: "gpt-4o-2024-08-06"
        });
    } catch (e: any) {
        return error({ request_id, code: "AI_FAILED", message: e.message, detail: e.toString() }, 500);
    }
}
