"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, ChevronRight, Hammer, Briefcase, Home } from "lucide-react";

function SaasOnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan") || "STARTER";

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [industry, setIndustry] = useState("");

    const handleNext = async () => {
        if (step === 3) {
            setLoading(true);
            // Simulate Provisioning
            await new Promise(r => setTimeout(r, 2000));
            setLoading(false);
            setStep(4);
        } else {
            setStep(step + 1);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">

                {/* Progress Bar */}
                <div className="h-2 bg-slate-100">
                    <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${step * 25}%` }}></div>
                </div>

                <div className="p-10">
                    {/* Step 1: Industry Selection */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-2xl font-bold mb-2">어떤 업종이신가요?</h2>
                            <p className="text-slate-500 mb-8">업종에 맞는 랜딩페이지와 시나리오를 자동으로 세팅해드립니다.</p>

                            <div className="space-y-4">
                                {[
                                    { id: "door", label: "중문 / 도어 시공", icon: Home },
                                    { id: "interior", label: "종합 인테리어", icon: Hammer },
                                    { id: "misc", label: "기타 설비 / 시공", icon: Briefcase },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { setIndustry(item.id); handleNext(); }}
                                        className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition group text-left"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition">
                                            <item.icon size={24} />
                                        </div>
                                        <span className="font-bold text-lg text-slate-700 group-hover:text-indigo-900">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Auto Setup Preview */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-2xl font-bold mb-2">기본 시스템 세팅 중...</h2>
                            <p className="text-slate-500 mb-8">사장님을 위해 다음 자산들을 생성합니다.</p>

                            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">전용 랜딩페이지 생성</h4>
                                        <p className="text-xs text-slate-500">"무료 견적/상담 신청" 기본 템플릿 적용</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">마케팅 PDF 자료 탑재</h4>
                                        <p className="text-xs text-slate-500">업종별 필수 체크리스트 자동 연결</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">자동 시나리오(ON)</h4>
                                        <p className="text-xs text-slate-500">신청 즉시 문자 발송 로직 활성화</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleNext} className="mt-8 w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                                다음 단계
                            </button>
                        </div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 text-center">
                            <h2 className="text-2xl font-bold mb-4">준비가 완료되었습니다</h2>
                            <p className="text-slate-500 mb-10">
                                선택하신 <b>{plan} 플랜</b>으로<br />
                                자동 영업 시스템을 시작합니다.
                            </p>

                            <button
                                onClick={handleNext}
                                disabled={loading}
                                className="w-full py-4 bg-black text-white font-bold rounded-xl hover:scale-[1.02] transition flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "시스템 가동 시작"}
                            </button>
                            <p className="text-xs text-slate-400 mt-4">초기 14일은 무료체험 기간입니다.</p>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="animate-in fade-in zoom-in text-center py-10">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">자동 영업이 시작됩니다!</h2>
                            <p className="text-slate-500 mb-8">
                                관리자 페이지로 이동하여<br />
                                생성된 랜딩페이지를 확인해보세요.
                            </p>

                            <button
                                onClick={() => router.push("/manage")}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition"
                            >
                                관리자 대시보드 입장 <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SaasOnboarding() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}>
            <SaasOnboardingContent />
        </Suspense>
    );
}
