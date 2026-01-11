import { NextRequest, NextResponse } from "next/server";
import { newRequestId, json, error, nowMs } from "@/app/lib/api-utils";
import { logApi } from "@/app/lib/logger";
import { getGeminiModel, MODEL_TEXT } from "@/app/lib/gemini-client";
import { supabaseServer } from "@/app/lib/supabase/server";
// Import key static tables for fallback reference
import { T_1S_MANUAL, T_3T_MANUAL } from "@/app/lib/miso_cost_data";

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

// 2025-12-27: Context Injection Helper
async function getSystemContext() {
    const supabase = await supabaseServer();
    let context = "You are LIMS AI Assistant, an expert helper for the 'Limsdoor Measure' system.\n";
    context += "You have access to internal data. Always prioritize 'CONFIRMED SALES PRICES' from the database.\n";
    context += "If specific sales price is missing, you MAY use the 'STATIC PURCHASE COST REFERENCE' below to estimate input costs, but clearly state these are 'Raw Material/Purchase Costs' not 'Sales Prices'.\n";
    context += "IMPORTANT: Provide detailed, comprehensive explanations. Do not be concise. The user prefers long, thorough answers.\n\n";

    // 1. Static Data Injection (Purchase Costs)
    context += "=== STATIC PURCHASE COST REFERENCE (Unit: KRW / VAT Excluded) ===\n";
    context += "Use this to answer 'Purchase Cost(매입단가)' inquiries if DB is empty.\n";

    // Simplification for 3-Interlocking (Most common) - Fluoro
    context += "[3-Interlocking Manual (3연동 수동) - Fluoro Coating]\n";
    context += "- Width 1300mm: Clear/Acqua/Bronze=260k, Satin=270k, Wire=280k (Knockdown)\n";
    context += "- Width 1500mm: Clear/Acqua/Bronze=270k, Satin=270k, Wire=280k (Knockdown)\n";
    context += "- Width 1700mm: Clear/Acqua/Bronze=280k, Satin=280k, Wire=280k (Knockdown)\n";
    context += "* For Completed Set (Finished), add approx +150k~250k. For Install, add +130k.\n\n";

    // Simplification for 1S Manual
    context += "[1-Swing Manual (1S 수동) - Fluoro Coating]\n";
    context += "- Width 1100mm: Clear=150k, Satin=160k, Wire=170k (Knockdown)\n";
    context += "- Width 1300mm: Clear=160k, Satin=160k, Wire=170k (Knockdown)\n";

    context += "=================================================================\n\n";

    try {
        // Fetch recent active sales prices
        const { data: prices, error } = await supabase
            .from("miso_sale_prices")
            .select("*")
            .eq("is_published", true)
            .order("updated_at", { ascending: false })
            .limit(20);

        if (prices && prices.length > 0) {
            context += "=== RECENT CONFIRMED SALES PRICES (Unit: KRW) ===\n";
            prices.forEach((p: any) => {
                const spec = `Type: ${p.product_type} / Glass: ${p.glass_group} / WidthKey: ${p.width_key} / Coating: ${p.coating}`;
                const detail = p.variant ? ` / Variant: ${p.variant}` : "";
                const price = `SaleBase: ${p.sale_base.toLocaleString()} KRW`;
                const memo = p.memo ? ` (Note: ${p.memo})` : "";
                context += `- [${spec}${detail}] -> ${price}${memo}\n`;
            });
            context += "=================================================\n\n";
            context += "If the user matches one of these specs, quote the exact amount. If not, explain that you see the above list but their specific request isn't there.\n";
        } else {
            context += "(No active confirmed sales prices found in database yet.)\n";
            context += "Since no sales prices are found, please rely on the STATIC PURCHASE COST REFERENCE above to at least provide the purchase cost (매입단가).\n";
        }

    } catch (e) {
        console.error("Context fetch error:", e);
        context += "(Error fetching real-time data. Apologize if data is missing.)\n";
    }

    return context;
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

        // 2025-12-27: Inject System Context
        const systemInstructionText = await getSystemContext();

        // Pass system instruction to model config (v0.24.1+)
        const model = getGeminiModel(MODEL_TEXT);

        // Start Chat with History
        const chat = model.startChat({
            history: history,
            // CORRECT FORMAT: Must be Content object, not string
            systemInstruction: {
                role: "system",
                parts: [{ text: systemInstructionText }]
            },
            generationConfig: {
                maxOutputTokens: 4000,
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
