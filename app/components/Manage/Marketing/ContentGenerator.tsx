"use client";

import React, { useState } from "react";
import {
    PenTool,
    MapPin,
    Target,
    MessageSquare,
    Sparkles,
    Copy,
    RefreshCw,
    Check
} from "lucide-react";

export default function ContentGenerator({ onBack, defaultType = "carrot" }: { onBack: () => void, defaultType?: string }) {
    const [contentType, setContentType] = useState(defaultType);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate AI generation
        setTimeout(() => {
            setGeneratedContent(`[${contentType === 'carrot' ? '당근마켓' : '블로그'} 홍보글 예시]\n\n안녕하세요! 송파구 주민 여러분 🥕\n우리집 중문, 아직도 고민하고 계신가요?\n\n소음 차단부터 인테리어 효과까지!\n림스도어가 꼼꼼하게 실측하고 시공해드립니다.\n\n✨ 지금 무료 실측 신청하면 5% 추가 할인!\n\n(실제 시공 사진 첨부)\n...`);
            setIsGenerating(false);
        }, 1500);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto h-full flex flex-col md:flex-row gap-6">
            {/* Left: Input Form */}
            <div className="w-full md:w-1/2 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm"
                    >
                        ← 뒤로가기
                    </button>
                    <h1 className="text-xl font-bold text-white">AI 콘텐츠 생성기</h1>
                </div>

                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 space-y-6">
                    {/* Content Type Selector */}
                    <div>
                        <label className="text-sm font-bold text-slate-400 mb-2 block">무엇을 만들까요?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: "carrot", label: "당근마켓 홍보글" },
                                { id: "script", label: "상담 스크립트" },
                                { id: "shorts", label: "쇼츠 대본" },
                                { id: "blog", label: "블로그 포스팅" }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setContentType(type.id)}
                                    className={`
                                        p-3 rounded-xl text-sm font-medium transition-all
                                        ${contentType === type.id
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                                            : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                                        }
                                    `}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                                <Target size={14} /> 타겟 고객
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                                placeholder="예: 30대 신혼부부, 육아맘"
                                defaultValue="30대 신혼부부"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                                <MapPin size={14} /> 지역 / 아파트명
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                                placeholder="예: 송파 헬리오시티"
                                defaultValue="송파 헬리오시티"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                                <MessageSquare size={14} /> 강조 포인트 (소구점)
                            </label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition h-24 resize-none"
                                placeholder="예: 층간소음 방지, 냉난방비 절약, 깔끔한 디자인"
                                defaultValue="층간생황소음 차단, 아기 있는 집 필수"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`
                            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                            ${isGenerating
                                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg hover:shadow-indigo-500/20"
                            }
                        `}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw size={20} className="animate-spin" />
                                AI가 글을 쓰고 있어요...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                콘텐츠 생성하기
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Right: Result */}
            <div className="w-full md:w-1/2 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6 h-[28px]">
                    <h2 className="text-xl font-bold text-white">생성 결과</h2>
                    {generatedContent && (
                        <button className="text-xs flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition">
                            <Copy size={12} /> 전체 복사
                        </button>
                    )}
                </div>

                <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-6 relative overflow-hidden group">
                    {!generatedContent && !isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                            <PenTool size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">좌측 정보를 입력하고 버튼을 눌러주세요</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-indigo-300 animate-pulse">고객의 마음을 움직이는 문구를 생각 중...</p>
                        </div>
                    )}

                    {generatedContent && (
                        <div className="h-full overflow-y-auto custom-scrollbar whitespace-pre-wrap text-slate-300 leading-relaxed">
                            {generatedContent}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
