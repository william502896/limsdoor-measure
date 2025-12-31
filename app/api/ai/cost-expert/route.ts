
import { NextRequest, NextResponse } from "next/server";
import { newRequestId, json, error, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { getGeminiModel, MODEL_TEXT } from "@/app/lib/gemini-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

        const { messages, context } = body;

        if (!messages || !Array.isArray(messages)) {
            return error({ request_id: requestId, code: "INVALID_REQUEST", message: "Messages array is required" }, 400);
        }

        // Convert messages to Gemini format
        let history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content as string }]
        }));

        // Gemini requires history to start with 'user'. Remove leading 'model' messages.
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        const lastMessage = messages[messages.length - 1];
        const userPrompt = lastMessage.content;

        // System Prompt Construction with Context
        let systemPrompt = `
당신은 '림스도어(Limsdoor)'의 **최고 세무/경비 관리 전문가 AI**입니다. 
당신의 목표는 사장님이 입력한 재무 데이터를 바탕으로 **가장 합법적이고 효과적인 절세 방안**과 **비용 관리 조언**을 제공하는 것입니다.

항상 정중하고("사장님" 호칭), 전문적이며, 구체적인 수치(KRW)를 인용하여 답변하세요.

**현재 사장님의 재무 상황 (Context)**:
${JSON.stringify(context, null, 2)}

**행동 지침**:
1. **경비 인정 여부 판단**: 사용자가 특정 지출(예: 공구, 식대, 차량유지비)에 대해 물으면, 한국 세법 기준(일반/간이/법인 등)에 맞춰 명확히 "경비 인정 가능/불가능"을 판단하고 이유를 설명하세요.
2. **세금 최적화**: 현재 매출액과 이익률을 분석하여, 부가세나 소득세를 줄일 수 있는 합법적 팁(예: 노란우산공제, 차량운행일지 작성 등)을 제안하세요.
3. **오류 지적**: 과태료(Fines) 등 세금 공제가 불가능한 항목이 보이면 부드럽게 경고하세요.
4. **절세 팁**: "지금 마진율이 OO%로 매우 높습니다. 법인 카드를 활용하여 소모품을 미리 구매하시면 이번 달 부가세를 약 OO원 줄일 수 있습니다." 처럼 구체적으로 조언하세요.
`;

        const model = getGeminiModel(MODEL_TEXT);

        // Start Chat
        const chat = model.startChat({
            history: history,
            systemInstruction: {
                role: "system",
                parts: [{ text: systemPrompt }]
            },
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();

        await logApi({
            request_id: requestId,
            endpoint: "ai-cost-expert",
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
        console.error("[COST EXPERT ERROR]", e);
        return error({ request_id: requestId, code: "AI_ERROR", message: e.message }, 500);
    }
}
