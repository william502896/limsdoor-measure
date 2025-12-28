import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/translate
 * body: { text: string, source?: string, target: string }
 * source: "ko" | "en" | "ja" | "zh-CN" ...
 * target: same
 */
export async function POST(req: Request) {
    try {
        const { text, source = "ko", target = "en" } = await req.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "text is required" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                {
                    error:
                        "Google Translate API 키가 설정되지 않았습니다. 환경변수 GOOGLE_TRANSLATE_API_KEY 를 설정해주세요.",
                },
                { status: 500 }
            );
        }

        // Google Translate API v2 endpoint
        const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: text,
                source: source,
                target: target,
                format: "text",
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            const msg = data?.error?.message || "Google translate failed";
            return NextResponse.json({ error: msg, raw: data }, { status: res.status });
        }

        const translated = data?.data?.translations?.[0]?.translatedText;
        if (!translated) {
            return NextResponse.json({ error: "translatedText not found", raw: data }, { status: 500 });
        }

        // Google handles HTML entities sometimes, usually fine for plain text flow but decoding might be needed if they send entities.
        // For now returning as is.

        return NextResponse.json({ translated });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "translate failed" }, { status: 500 });
    }
}
