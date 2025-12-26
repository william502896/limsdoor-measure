import { NextRequest } from "next/server";
import { newRequestId, json, error, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { callArJudgeAI } from "@/app/lib/ai/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const started = nowMs();
    const request_id = newRequestId();

    try {
        const body = await req.json();
        const { ar_state } = body;

        // 🔥 AI Logic Injection (REAL)
        const judge = await callArJudgeAI(body);

        const latency = nowMs() - started;
        await logApi({ request_id, endpoint: "ar-judge", role: "customer", ok: true, latency_ms: latency });

        return json({
            status: "ok",
            request_id,
            judge,
            latency_ms: latency,
            model: "gpt-4o-2024-08-06"
        });
    } catch (e: any) {
        return error({ request_id, code: "AI_FAILED", message: e.message }, 500);
    }
}
