"use client";

import React, { useState } from "react";
import { Sparkles, AlertTriangle, CheckCircle, XCircle, ArrowRight, MessageCircle, ChevronRight } from "lucide-react";
import { InstallStatus, Recommendation, AIAnalysis } from "@/app/hooks/useConsumerAI";

interface AICoachOverlayProps {
    analysis: AIAnalysis;
    recommendations: Recommendation[];
    onApplyRecommendation: (rec: Recommendation) => void;
    onRequestConsult: () => void;
    onSaveQuote: () => void;
}

export default function AICoachOverlay({
    analysis,
    recommendations,
    onApplyRecommendation,
    onRequestConsult,
    onSaveQuote
}: AICoachOverlayProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentRec, setCurrentRec] = useState(0);

    const statusColor =
        analysis.status === 'possible' ? 'bg-green-500' :
            analysis.status === 'warning' ? 'bg-amber-500' : 'bg-red-500';

    const statusIcon =
        analysis.status === 'possible' ? <CheckCircle size={16} className="text-white" /> :
            analysis.status === 'warning' ? <AlertTriangle size={16} className="text-white" /> :
                <XCircle size={16} className="text-white" />;

    return (
        <div className="absolute top-24 left-4 right-4 z-20 flex flex-col items-center pointer-events-none">

            {/* 1. Floating Status Pill */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 ${isExpanded ? 'bg-white text-slate-900 w-full max-w-sm rounded-2xl flex-col items-stretch p-0 overflow-hidden' : 'bg-black/60 text-white'
                    }`}
            >
                {!isExpanded ? (
                    // Collapsed View
                    <>
                        <div className={`p-1 rounded-full ${statusColor}`}>
                            {statusIcon}
                        </div>
                        <span className="text-sm font-bold flex-1 text-left">
                            {analysis.status === 'possible' ? 'AI 설치 판정: 가능' :
                                analysis.status === 'warning' ? 'AI 설치 판정: 주의' : 'AI 설치 판정: 불가'}
                        </span>
                        <ChevronRight size={16} className="opacity-70 rotate-90" />
                    </>
                ) : (
                    // Expanded View (The Coach Panel)
                    <div className="flex flex-col w-full">
                        {/* Header */}
                        <div className={`flex items-center gap-3 px-4 py-3 ${analysis.status === 'possible' ? 'bg-green-50' :
                                analysis.status === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                            }`}>
                            <div className={`p-1 rounded-full ${statusColor}`}>
                                {statusIcon}
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold text-sm text-slate-900">
                                    {analysis.status === 'possible' ? '설치 가능해요!' :
                                        analysis.status === 'warning' ? '확인이 필요해요' : '설치가 어려울 수 있어요'}
                                </h3>
                                <p className="text-xs text-slate-600">{analysis.reason}</p>
                            </div>
                            <div onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-1 hover:bg-black/5 rounded">
                                <ChevronRight size={20} className="rotate-270 text-slate-400" />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 bg-white/90 space-y-4">
                            {analysis.solution && (
                                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex gap-2">
                                    <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                                    {analysis.solution}
                                </div>
                            )}

                            {/* Recommendations Carousel */}
                            {analysis.status !== 'impossible' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                            <Sparkles size={12} /> AI 추천 조합
                                        </span>
                                        <div className="flex gap-1">
                                            {recommendations.map((_, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentRec ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <div className="p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 rounded">
                                                    {recommendations[currentRec].title}
                                                </span>
                                                <span className="text-xs font-bold text-slate-900">
                                                    {recommendations[currentRec].priceRange}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-1">
                                                {recommendations[currentRec].description}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 line-clamp-2">
                                                {recommendations[currentRec].reason}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onApplyRecommendation(recommendations[currentRec]);
                                            }}
                                            className="w-full py-2 bg-slate-50 text-indigo-600 text-xs font-bold border-t hover:bg-indigo-50 transition"
                                        >
                                            이 스타일 적용하기
                                        </button>

                                        {/* Navigation Overlay */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCurrentRec(prev => (prev > 0 ? prev - 1 : recommendations.length - 1)); }}
                                            className="absolute left-0 top-0 bottom-8 px-1 hover:bg-black/5 flex items-center justify-center"
                                        >
                                            <ChevronRight size={16} className="rotate-180 text-slate-300" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCurrentRec(prev => (prev < recommendations.length - 1 ? prev + 1 : 0)); }}
                                            className="absolute right-0 top-0 bottom-8 px-1 hover:bg-black/5 flex items-center justify-center"
                                        >
                                            <ChevronRight size={16} className="text-slate-300" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            {analysis.status === 'impossible' ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRequestConsult(); }}
                                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 active:scale-95 transition flex items-center justify-center gap-2"
                                >
                                    <MessageCircle size={18} />
                                    전문가 상담 요청하기
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSaveQuote(); }}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition flex items-center justify-center gap-2"
                                >
                                    견적 저장하고 상담받기
                                    <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </button>
        </div>
    );
}
