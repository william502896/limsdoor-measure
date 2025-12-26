import { NextRequest, NextResponse } from "next/server";
import { newRequestId, json, error, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { getGeminiModel, MODEL_TEXT } from "@/app/lib/gemini-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Health Check
export async function GET() {
    return json({
        status: "alive",
        route: "/api/admin/agent",
        note: "POST to this endpoint to use the AI agent (Gemini SDK)"
    });
}

export async function POST(req: NextRequest) {
    const start = nowMs();
    const requestId = newRequestId();

    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return error({ request_id: requestId, code: "INVALID_JSON", message: "Invalid JSON body" }, 400);
        }

        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return error({ request_id: requestId, code: "INVALID_REQUEST", message: "Messages array is required" }, 400);
        }

        // Convert messages to Gemini format
        const history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content as string }]
        }));

        const lastMessage = messages[messages.length - 1];
        const userPrompt = lastMessage.content;

        // logApi(requestId, "AI_AGENT", "request", { messageCount: messages.length });
        await logApi({
            request_id: requestId,
            endpoint: "admin-agent",
            role: "admin",
            ok: true,
            latency_ms: 0,
            meta: { messageCount: messages.length, type: "request" }
        });

        const model = getGeminiModel(MODEL_TEXT);

        // Start Chat with History
        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();

        // logApi(requestId, "AI_AGENT", "success", { len: responseText.length });
        await logApi({
            request_id: requestId,
            endpoint: "admin-agent",
            role: "admin",
            ok: true,
            latency_ms: nowMs() - start,
            meta: { len: responseText.length }
        });

        return json({
            status: "ok",
            message: {
                role: "assistant",
                content: responseText,
            }
        });

    } catch (e: any) {
        console.error("[AGENT ERROR]", e);
        // logApi(requestId, "AI_AGENT", "error", { message: e.message });
        await logApi({
            request_id: requestId,
            endpoint: "admin-agent",
            role: "admin",
            ok: false,
            latency_ms: nowMs() - start,
            meta: { message: e.message }
        });
        return error({ request_id: requestId, code: "AGENT_ERROR", message: e.message, detail: e.stack }, 500);
    }
}
