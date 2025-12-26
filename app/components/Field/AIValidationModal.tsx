"use client";

import React from "react";
import { AnalysisResult } from "@/app/hooks/useFieldAI";
import { CheckCircle, AlertTriangle, AlertOctagon, X, ArrowRight, Camera } from "lucide-react";

interface AIValidationModalProps {
    result: AnalysisResult;
    onClose: () => void;
    onProceed: () => void;
}

export default function AIValidationModal({ result, onClose, onProceed }: AIValidationModalProps) {
    const isCritical = result.status === "critical";
    const isWarning = result.status === "warning";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`px-6 py-5 flex items-center gap-3 ${isCritical ? "bg-red-50 text-red-700" :
                        isWarning ? "bg-amber-50 text-amber-700" :
                            "bg-green-50 text-green-700"
                    }`}>
                    {isCritical ? <AlertOctagon size={28} className="shrink-0" /> :
                        isWarning ? <AlertTriangle size={28} className="shrink-0" /> :
                            <CheckCircle size={28} className="shrink-0" />}

                    <div>
                        <h3 className="font-bold text-lg leading-tight">
                            {isCritical ? "실측 데이터 위험 감지" :
                                isWarning ? "실측 데이터 주의" :
                                    "실측 데이터 정상"}
                        </h3>
                        <p className="text-xs opacity-80 mt-1">AI 신뢰도 {result.confidence}%</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Issues List */}
                    {result.issues.length > 0 && (
                        <div>
                            <span className="text-xs font-bold text-slate-500 block mb-2">분석된 문제점</span>
                            <ul className="space-y-2">
                                {result.issues.map((issue, idx) => (
                                    <li key={idx} className="text-sm font-medium text-slate-800 flex items-start gap-2">
                                        <span className="text-red-500 font-bold">•</span>
                                        {issue}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions Checklist */}
                    {result.actions.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-indigo-600 block mb-2 flex items-center gap-1">
                                <CheckCircle size={12} /> AI 제안 체크리스트
                            </span>
                            <ul className="space-y-2">
                                {result.actions.map((act, idx) => (
                                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                                        <input type="checkbox" className="mt-0.5" />
                                        <span>{act}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Required Photos */}
                    {result.requiredPhotos.length > 0 && (
                        <div>
                            <span className="text-xs font-bold text-slate-500 block mb-2">필수 첨부 사진</span>
                            <div className="flex flex-wrap gap-2">
                                {result.requiredPhotos.map((p, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border flex items-center gap-1">
                                        <Camera size={10} /> {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
                    >
                        다시 확인하기
                    </button>
                    <button
                        onClick={onProceed}
                        className={`flex-1 py-3 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 ${isCritical ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                    >
                        {isCritical ? "위험 감수하고 저장" : "확인 및 저장"}
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
