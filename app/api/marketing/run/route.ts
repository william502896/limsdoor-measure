import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const FRAMEWORK_PROMPTS: Record<string, string> = {
    MARKETING: "당신은 세계 최고 수준의 마케팅 설계자입니다. 아래 텍스트를 기반으로 퍼널 구조, 리드마그넷, CTA까지 포함한 실행 가능한 마케팅 전략을 작성하세요.",
    BRAND: "당신은 브랜드 설계자입니다. 아래 텍스트를 기반으로 브랜드 컨셉, 핵심 메시지, 톤앤매너, 슬로건을 설계하세요.",
    TRAFFIC: "당신은 트래픽 설계자입니다. 아래 텍스트를 기반으로 유입 채널 전략, 콘텐츠 포맷, 광고 구조를 제안하세요.",
    STORY: "당신은 스토리 설계자입니다. 아래 텍스트를 기반으로 고객을 설득하는 스토리 구조(문제→갈등→해결→비전)를 작성하세요.",
    STARTUP: "당신은 스타트업 설계자입니다. 아래 텍스트를 기반으로 비즈니스 모델, 수익 구조, 초기 실행 전략을 정리하세요.",
    ONEPAGE: "아래 텍스트를 기반으로 1페이지 마케팅 플랜(목표, 고객, 제안, 채널, KPI)을 작성하세요."
};

export async function POST(req: Request) {
    try {
        const sb = await supabaseServer();
        const { data: auth } = await sb.auth.getUser();
        if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { table, id, framework } = await req.json();
        if (!table || !id || !framework) {
            return NextResponse.json({ error: "table, id, framework required" }, { status: 400 });
        }

        const { data: profile } = await sb
            .from("profiles")
            .select("company_id")
            .eq("id", auth.user.id)
            .single();

        if (!profile?.company_id) {
            return NextResponse.json({ error: "company_id missing" }, { status: 403 });
        }

        const { data: doc, error: dErr } = await sb
            .from(table)
            .select("extracted_text")
            .eq("id", id)
            .single();

        if (dErr || !doc?.extracted_text) {
            return NextResponse.json({ error: "OCR 텍스트가 없습니다." }, { status: 400 });
        }

        const basePrompt = FRAMEWORK_PROMPTS[framework];
        if (!basePrompt) return NextResponse.json({ error: "invalid framework" }, { status: 400 });

        const finalPrompt = `${basePrompt}\n\n[원본 텍스트]\n${doc.extracted_text}`;

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "mock-key" });

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: finalPrompt }],
            temperature: 0.4,
        });

        const result = completion.choices[0].message.content || "";

        const { data: row, error: iErr } = await sb
            .from("marketing_runs")
            .insert({
                company_id: profile.company_id,
                source_table: table,
                source_id: id,
                framework,
                prompt: finalPrompt,
                result,
            })
            .select("*")
            .single();

        if (iErr) throw new Error(iErr.message);

        return NextResponse.json({ ok: true, row });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
