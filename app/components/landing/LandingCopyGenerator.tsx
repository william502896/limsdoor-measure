"use client";

import { useState } from "react";
import { Wand2, Loader2, Info } from "lucide-react";

type LandingMode = "LEAD" | "CONSULT" | "CLOSE";

export default function LandingCopyGenerator(props: {
    mode: LandingMode;
    industry?: string;
    titleHint?: string;
    brandTone?: "프리미엄" | "친근" | "강력한";

    // 생성 결과를 부모 폼에 반영
    onPick: (picked: {
        title: string;
        subtitle: string;
        ctaText: string;
        messageTemplate: string;
        formFields: string[];
    }) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    async function generate() {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch("/api/marketing/landing-copy/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: props.mode,
                    industry: props.industry,
                    titleHint: props.titleHint,
                    brandTone: props.brandTone ?? "프리미엄",
                }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error ?? "generate failed");
            setResult(json.data);
        } catch (e: any) {
            alert(e?.message ?? "카피 생성 실패");
        } finally {
            setLoading(false);
        }
    }

    function pick(i: number) {
        const title = result?.titles?.[i] ?? "";
        const subtitle = result?.subtitles?.[i] ?? "";
        const ctaText = result?.ctaTexts?.[0] ?? "무료로 시작하기";
        const messageTemplate = result?.messageTemplates?.[0] ?? "";
        const formFields = result?.formFields ?? ["이름", "전화번호"];

        props.onPick({ title, subtitle, ctaText, messageTemplate, formFields });
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Wand2 size={16} className="text-indigo-600" />
                    <span>AI 카피 생성 (Gemini)</span>
                </div>
                <button
                    onClick={generate}
                    disabled={loading}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                    {loading ? "생성 중..." : "제목/설명/CTA 생성"}
                </button>
            </div>

            {!result && (
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg">
                    <Info size={14} className="text-slate-400 mt-0.5" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                        <b>{props.mode} 모드</b>에 최적화된 마케팅 문구를 <b>Google Gemini</b>가 자동으로 작성해드립니다.<br />
                        제목, 서브카피, 버튼 문구, 발송 메시지까지 한 번에 제안받으세요.
                    </p>
                </div>
            )}

            {result?.titles?.length > 0 && (
                <div className="grid gap-2 mt-3">
                    {result.titles.slice(0, 5).map((t: string, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => pick(idx)}
                            className="text-left bg-white border border-slate-200 hover:border-indigo-400 hover:ring-1 hover:ring-indigo-100 p-3 rounded-xl transition group relative overflow-hidden"
                            title="클릭하면 폼에 자동 적용"
                        >
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition">{t}</div>
                            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{result.subtitles?.[idx] ?? ""}</div>
                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition">
                                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">적용</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
