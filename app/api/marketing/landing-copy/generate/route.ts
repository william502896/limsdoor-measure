import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LandingMode = "LEAD" | "CONSULT" | "CLOSE";

function assertEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

// const GEMINI_API_KEY moved to runtime check inside geminiGenerate

// Gemini generateContent (Google AI for Developers)
// 인증: x-goog-api-key 헤더 :contentReference[oaicite:2]{index=2}
async function geminiGenerate(params: {
    mode: LandingMode;
    industry?: string;
    titleHint?: string;
    brandTone?: "프리미엄" | "친근" | "강력한";
}) {
    const modeGuide: Record<LandingMode, string> = {
        LEAD: "신규 고객 유입용: 신뢰 확보 + 무료자료/체크리스트 + 부담 없는 CTA",
        CONSULT: "상담/실측 전환용: 문제 공감 + 즉시 행동 유도 + 예약/일정 선택 CTA",
        CLOSE: "계약/결제 마무리용: 불안 제거 + 확정/보증/다음 단계 안내 + 결제/일정 확정 CTA",
    };

    const tone = params.brandTone ?? "프리미엄";
    const industry = params.industry ?? "중문/인테리어 시공";
    const titleHint = params.titleHint ?? "";

    const prompt = `
너는 한국 B2B 랜딩 전문 카피라이터다.
업종: ${industry}
모드: ${params.mode} (${modeGuide[params.mode]})
톤: ${tone}

요구:
- 랜딩 제목(title) 5개
- 서브 설명(subtitle) 5개 (각 제목에 매칭)
- CTA 문구(ctaText) 3개
- 고객 입력폼 라벨(formFields) 추천 (이름/전화 + 모드별 추가)
- 문자/카카오 1차 메시지 템플릿(messageTemplate) 3개 (짧고 현장 사장님 말투)
- 금지: 과장 광고/허위 보장/법적 문제 표현
- 이미지에 들어갈 텍스트는 만들지 말고, 화면에 얹는 텍스트만 작성

추가 힌트(있으면 반영): ${titleHint}

출력은 반드시 JSON만:
{
  "titles":[...],
  "subtitles":[...],
  "ctaTexts":[...],
  "formFields":[...],
  "messageTemplates":[...]
}
`.trim();

    // gemini-2.5-flash 계열이 일반적으로 빠르고 비용 효율적 (모델은 환경에 따라 바꿔도 됨)
    const model = "gemini-2.5-flash";
    const GEMINI_API_KEY = assertEnv("GEMINI_API_KEY");

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1200,
                },
            }),
        }
    );

    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Gemini error: ${res.status} ${t}`);
    }

    const json = await res.json();

    // Gemini 응답에서 텍스트 추출
    const text =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("") ?? "";

    // JSON만 오게 시켰지만, 혹시 앞뒤에 잡문이 섞이면 안전하게 파싱
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) throw new Error("Gemini returned no JSON object");

    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const mode: LandingMode = body.mode ?? "LEAD";
        const industry: string | undefined = body.industry;
        const titleHint: string | undefined = body.titleHint;
        const brandTone: any = body.brandTone;

        const out = await geminiGenerate({ mode, industry, titleHint, brandTone });

        return NextResponse.json({ ok: true, data: out });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message ?? "unknown error" },
            { status: 500 }
        );
    }
}
