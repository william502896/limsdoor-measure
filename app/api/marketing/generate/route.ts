import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "mock-key-for-build",
});

async function searchSecretContext(q: string) {
    const sb = supabaseAdmin();
    const { data } = await sb
        .from("secret_doc_chunks")
        .select("content")
        .ilike("content", `%${q}%`)
        .limit(10);

    return (data || []).map(d => d.content).join("\n---\n");
}

export async function POST(req: Request) {
    try {
        const { type, context } = await req.json();
        // type: "hook" | "script" | "plan"

        const secretContext = await searchSecretContext(
            type === "hook" ? "후킹" :
                type === "script" ? "상담" :
                    "마케팅"
        );

        const systemPrompt = `
당신은 실전 마케팅 설계자입니다.
아래 자료는 검증된 마케팅/브랜드/트래픽/스토리/스타트업 설계 문서입니다.
출력은 반드시 현장 영업에 바로 쓸 수 있어야 합니다.
`;

        const userPrompt = `
[참고 문서 발췌]
${secretContext}

[현재 상황]
${context}

[요청 출력]
${type === "hook" ? "현관중문 AR 실측 고객을 위한 후킹 문장 20개를 생성하세요."
                : type === "script" ? "현관중문 상담용 스크립트를 고객용/사무실용 2버전으로 작성하세요."
                    : "현관중문 AR 실측 기반 1페이지 마케팅 플랜을 작성하세요."}

조건:
- 과장 금지
- 숫자/사례/구조 강조
- 바로 복사해서 써먹을 수 있는 문장
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
        });

        return NextResponse.json({
            result: completion.choices[0].message.content,
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
