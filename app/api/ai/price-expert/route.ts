
import { NextRequest, NextResponse } from "next/server";
import { newRequestId, json, error, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { getGeminiModel, MODEL_TEXT } from "@/app/lib/gemini-client";
import { supabase } from "@/app/lib/supabase";

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

        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return error({ request_id: requestId, code: "INVALID_REQUEST", message: "Messages array is required" }, 400);
        }

        // 1. Fetch Context Data from DB
        const [pRes, iRes, rRes] = await Promise.all([
            supabase.from("partners").select("id, name"),
            supabase.from("items").select("id, name, standard_price"),
            supabase.from("price_rules").select("partner_id, item_id, purchase_price, sales_price, margin_rate").neq("status", "archived")
        ]);

        const partners = pRes.data || [];
        const items = iRes.data || [];
        const rules = rRes.data || [];

        // 2. Prepare Context String
        // Optimize context size: Map IDs to Names
        const partnerMap = new Map(partners.map((p: any) => [p.id, p.name]));
        const itemMap = new Map(items.map((i: any) => [i.id, i.name]));

        const contextData = rules.map((r: any) => ({
            partner: partnerMap.get(r.partner_id) || "Unknown",
            item: itemMap.get(r.item_id) || "Unknown",
            purchase: r.purchase_price,
            sales: r.sales_price,
            margin: r.margin_rate + "%"
        }));

        const itemsinfo = items.map((i: any) => ({
            name: i.name,
            standard_price: i.standard_price
        }));

        // 3. Gemini History Format
        let history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content as string }]
        }));

        // Remove leading 'model' messages
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        const lastMessage = messages[messages.length - 1];
        const userPrompt = lastMessage.content;

        // 4. System Prompt
        let systemPrompt = `
당신은 '림스도어'의 **단가 분석 비서 AI**입니다.
아래 제공된 '업체별 단가 데이터'를 기반으로 사용자의 질문에 정확한 가격 정보를 답변해주세요.

**데이터 (Context)**:
- 품목 리스트: ${JSON.stringify(itemsinfo)}
- 업체별 계약 단가(Rules): ${JSON.stringify(contextData)}

**행동 지침**:
1. **가격 비교**: "가장 싼 업체가 어디야?" 같은 질문에 대해, 동일 품목의 매입가(purchase)를 비교하여 최저가 업체를 추천하세요.
2. **마진 분석**: "마진율이 좋은 품목은?" 같은 질문에 대해 마진율(margin) 데이터를 활용하세요.
3. **구체적 수치**: 답변에는 반드시 정확한 금액(원)과 업체명을 포함하세요.
4. **없는 정보**: 데이터에 없는 내용을 물어보면 "해당 정보가 시스템에 없습니다"라고 솔직히 말하고, 아는 범위 내에서 답변하세요.
5. 표(Markdown Table) 형식을 적극 활용하여 비교해주면 좋습니다.
`;

        const model = getGeminiModel(MODEL_TEXT);

        const chat = model.startChat({
            history: history,
            systemInstruction: {
                role: "system",
                parts: [{ text: systemPrompt }]
            },
        });

        const result = await chat.sendMessage(userPrompt);
        const responseText = result.response.text();

        // Log result
        await logApi({
            request_id: requestId,
            endpoint: "ai-price-expert",
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
        console.error("[PRICE EXPERT ERROR]", e);
        return error({ request_id: requestId, code: "AI_ERROR", message: e.message }, 500);
    }
}
