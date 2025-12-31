
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiModel } from "@/app/lib/gemini-client";

// Types for Context
type ScheduleItem = {
    id: string;
    customer: string;
    type: string;
    status: string;
    date: string;
    summary: string;
};

type ContextData = {
    recentSchedules: ScheduleItem[];
    notifications: any[];
    kpi: any;
};

const SYSTEM_PROMPT = `
You are the **AI Executive Assistant (AI 총괄 비서)** for a Window & Door Construction Company (LimsDoor).
Your role is to act as a "General Manager" or "Chief of Staff".
You are professional, concise, and strategic. You speak Korean (Business Formal).

**Your Capabilities:**
1. **Morning Briefing**: Summarize recent installations and upcoming schedules.
2. **Issue Analysis**: Analyze "Urgent" notifications and suggest actions.
3. **Customer Care**: Draft "Happy Call" messages for completed customers.
4. **Strategic Advice**: Offer advice on cost saving or schedule optimization based on provided data.

**Context Data:**
The user will provide a JSON object containing:
- recentSchedules: List of recent measures/installs.
- notifications: Current alerts.
- kpi: Monthly financial stats (Profit, BEP).

**Response Guidelines:**
- **Briefing**: "어제는 A, B 현장 시공이 완료되었습니다. 오늘은 C 현장 실측이 예정되어 있습니다."
- **Happy Call**: "안녕하세요 [고객명]님, 임스도어입니다. 어제 시공해드린 [품목]은 마음에 드시는지요? ..."
- **Alerts**: "현재 [자재 부족] 알림이 있습니다. 발주처에 확인이 필요합니다."
- Use emoji sparingly (e.g., 📅, ⚠️, ✅).
- Keep responses under 3-4 sentences unless asked for a draft.
`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, context } = body; // context = { recentSchedules, notifications, kpi }

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
        }

        // Initialize Gemini
        const model = getGeminiModel();
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                {
                    role: "model",
                    parts: [{ text: "네, 알겠습니다. 임스도어의 AI 총괄 비서로서 업무를 보좌하겠습니다. 현재 현황 데이터를 바탕으로 무엇을 도와드릴까요?" }]
                }
            ]
        });

        // Construct User Message with Context Injection
        // We inject context into the *latest* message to ensure it's fresh.
        const lastUserMessage = messages[messages.length - 1];
        const contextString = JSON.stringify(context, null, 2);

        const promptWithContext = `
        [Critical Context Data - Real-time]
        ${contextString}
        
        [User Request]
        ${lastUserMessage.content}
        `;

        const result = await chat.sendMessage(promptWithContext);
        const responseText = result.response.text();

        return NextResponse.json({
            role: "assistant",
            content: responseText
        });

    } catch (error: any) {
        console.error("AI ERP Executor Error:", error);
        return NextResponse.json(
            { error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
