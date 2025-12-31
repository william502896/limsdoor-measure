"use client";

import React, { useState } from "react";
import {
    CheckSquare,
    MessageCircle,
    Gift,
    ArrowRight,
    Smartphone,
    Monitor
} from "lucide-react";

type TemplateType = "checklist" | "consulting" | "event";

export default function FunnelBuilder({ onBack }: { onBack: () => void }) {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);

    const templates = [
        {
            id: "checklist",
            title: "무료 체크리스트 배포",
            desc: "잠재 소비자의 정보를 얻는 가장 쉬운 방법입니다.",
            tags: ["DB수집", "초기유입"],
            icon: CheckSquare,
            color: "indigo"
        },
        {
            id: "consulting",
            title: "1:1 상담/실측 유도",
            desc: "구매 의사가 있는 고객을 빠르게 상담으로 연결합니다.",
            tags: ["전환율↑", "매출직결"],
            icon: MessageCircle,
            color: "violet"
        },
        {
            id: "event",
            title: "한정 혜택 이벤트",
            desc: "선착순 할인 등으로 즉각적인 반응을 이끌어냅니다.",
            tags: ["단기매출", "마감효과"],
            icon: Gift,
            color: "pink"
        }
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto anime-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm"
                >
                    ← 뒤로가기
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">퍼널 템플릿 선택</h1>
                    <p className="text-slate-400 text-sm">목적에 맞는 마케팅 전략을 선택하세요. 시스템이 자동으로 세팅해드립니다.</p>
                </div>
            </div>

            {/* Template Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {templates.map((tpl) => {
                    const Icon = tpl.icon;
                    const isSelected = selectedTemplate === tpl.id;

                    return (
                        <button
                            key={tpl.id}
                            onClick={() => setSelectedTemplate(tpl.id as TemplateType)}
                            className={`
                                relative text-left p-6 rounded-2xl border-2 transition-all duration-200 group
                                ${isSelected
                                    ? `bg-${tpl.color}-900/20 border-${tpl.color}-500 ring-2 ring-${tpl.color}-500/20`
                                    : "bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
                                }
                            `}
                        >
                            <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
                                ${isSelected ? `bg-${tpl.color}-500 text-white` : `bg-slate-700 text-slate-400 group-hover:text-white`}
                            `}>
                                <Icon size={24} />
                            </div>

                            <h3 className={`text-lg font-bold mb-2 ${isSelected ? "text-white" : "text-slate-200"}`}>
                                {tpl.title}
                            </h3>
                            <p className="text-sm text-slate-400 mb-4 min-h-[40px]">
                                {tpl.desc}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {tpl.tags.map(tag => (
                                    <span key={tag} className="text-xs font-medium px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {isSelected && (
                                <div className={`absolute top-4 right-4 text-${tpl.color}-500`}>
                                    <div className="w-6 h-6 rounded-full bg-current flex items-center justify-center">
                                        <ArrowRight size={14} className="text-black" />
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Preview Section */}
            {selectedTemplate && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Info */}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-indigo-400">✓</span>
                                이 템플릿을 선택하면:
                            </h2>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 mt-1">
                                        <Smartphone size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200">랜딩 페이지 자동 생성</div>
                                        <div className="text-sm text-slate-400 mt-1">모바일에 최적화된 신청 페이지가 즉시 만들어집니다.</div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400 mt-1">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200">상담 시나리오 세팅</div>
                                        <div className="text-sm text-slate-400 mt-1">유입된 고객에게 보낼 알림톡과 상담 대본이 준비됩니다.</div>
                                    </div>
                                </li>
                            </ul>

                            <button className="mt-8 w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2">
                                퍼널 생성하기
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        {/* Visual Preview Placeholder */}
                        <div className="w-full md:w-80 aspect-[9/16] bg-slate-950 rounded-2xl border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                            {/* Fake Phone UI */}
                            <div className="h-6 bg-slate-900 w-full flex items-center justify-center gap-1">
                                <div className="w-10 h-3 bg-black rounded-b-lg"></div>
                            </div>
                            <div className="flex-1 p-4 flex flex-col items-center justify-center bg-white text-slate-900">
                                <div className="w-16 h-16 bg-slate-100 rounded-full mb-4"></div>
                                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-slate-100 rounded w-1/2 mb-6"></div>
                                <div className="w-full h-10 bg-indigo-600 rounded-lg mb-2"></div>
                                <div className="text-xs text-slate-300 mt-auto">Preview</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
