import { NextResponse } from "next/server";
import { getGeminiModel, MODEL_TEXT } from "@/app/lib/gemini-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const model = getGeminiModel(MODEL_TEXT);

        // Simple generation test
        const result = await model.generateContent("Say 'OK' in Korean");
        const reply = result.response.text();

        return NextResponse.json({
            status: "ok",
            route: "/api/gemini/check",
            sdk: "@google/generative-ai",
            model: MODEL_TEXT,
            test_reply: reply
        });
    } catch (e: any) {
        return NextResponse.json({
            status: "failed",
            route: "/api/gemini/check",
            sdk: "@google/generative-ai",
            error: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
