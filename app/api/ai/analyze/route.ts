import { NextResponse } from "next/server";

// ✅ Next.js App Router API Route
export async function POST(req: Request) {
    try {
        const { apiKey, prompt } = await req.json();

        if (!apiKey || !apiKey.startsWith("sk-")) {
            return NextResponse.json(
                { message: "유효하지 않은 API Key입니다." },
                { status: 400 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                { message: "프롬프트 내용이 없습니다." },
                { status: 400 }
            );
        }

        // OpenAI API 호출
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content:
                            "당신은 인테리어/시공 전문 AI 어시스턴트입니다. 주어진 실측 정보를 바탕으로 정확하고 안전한 시공을 위한 체크리스트와 리스크 분석을 제공하세요.",
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenAI API Error:", errorData);
            return NextResponse.json(
                { message: errorData?.error?.message ?? "AI 서버 응답 오류" },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? "분석 결과를 생성하지 못했습니다.";

        return NextResponse.json({ result: content });
    } catch (error) {
        console.error("AI Route Error:", error);
        return NextResponse.json(
            { message: "서버 내부 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
