"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowRight, X, Layout, MessageSquare, Zap, GitBranch, PieChart, Star, ShieldCheck, Users } from "lucide-react";
import { SAAS_PLANS } from "@/app/lib/saas/plans";

export default function SaasLandingPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">

            {/* [SECTION 1] Hero */}
            <section className="bg-slate-900 text-white pt-32 pb-40 px-6 relative overflow-hidden">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                        상담은 많은데<br />
                        <span className="text-indigo-400">계약은 왜 안 될까요?</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                        랜딩부터 실측·결제까지,<br className="md:hidden" />
                        현장 영업을 자동으로 연결하는 SaaS
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/saas/onboarding" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-lg transition shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-2">
                            무료 체험 시작하기 <ArrowRight size={20} />
                        </Link>
                        <button className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-lg transition backdrop-blur-sm">
                            데모 요청하기
                        </button>
                    </div>
                </div>
            </section>

            {/* [SECTION 2] Problem */}
            <section className="py-24 px-6 bg-slate-50">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12">광고비는 늘어나는데<br />상담은 반복되고<br />실측 후에도 계약이 끊깁니다.</h2>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                        <p className="text-xl text-slate-600 leading-relaxed">
                            "대부분의 시공 업종은<br />
                            아직도 <span className="text-red-600 font-bold bg-red-50 px-1">사람의 기억과 감</span>에 의존해 영업합니다."
                        </p>
                    </div>
                </div>
            </section>

            {/* [SECTION 3] Solution Visualization */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 font-extrabold tracking-wider uppercase text-sm">SOLUTION</span>
                        <h2 className="text-3xl md:text-4xl font-bold mt-2">이제 영업은 시스템이 합니다</h2>
                        <p className="text-slate-500 mt-4">한 번 설정하면 고객 응대 흐름이 자동으로 이어집니다.</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 overflow-x-auto pb-4">
                        {[
                            { label: "PDF / 콘텐츠", icon: Layout },
                            { label: "랜딩페이지", icon: Zap },
                            { label: "문자·카톡 자동 발송", icon: MessageSquare },
                            { label: "리드 점수화", icon: Star },
                            { label: "상담 · 실측 · 결제", icon: ShieldCheck },
                        ].map((item, i) => (
                            <React.Fragment key={i}>
                                <div className="flex flex-col items-center gap-3 min-w-[120px]">
                                    <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-sm text-slate-700">
                                        <item.icon size={28} />
                                    </div>
                                    <span className="font-bold text-sm text-slate-600 text-center">{item.label}</span>
                                </div>
                                {i < 4 && <div className="hidden md:block w-8 h-[2px] bg-slate-200"></div>}
                                {i < 4 && <div className="md:hidden w-[2px] h-8 bg-slate-200"></div>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* [SECTION 4] Key Features */}
            <section className="py-24 px-6 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold">핵심 기능 요약</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6"><Layout size={24} /></div>
                            <h3 className="text-xl font-bold mb-2">랜딩페이지 제작</h3>
                            <p className="text-slate-500">고객 유입용 페이지를 5분 만에 생성하고 자동으로 연결합니다.</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-6"><MessageSquare size={24} /></div>
                            <h3 className="text-xl font-bold mb-2">자동 메시지 연결</h3>
                            <p className="text-slate-500">문자·카톡으로 고객에게 자동으로 인사하고 자료를 보냅니다.</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center mb-6"><Star size={24} /></div>
                            <h3 className="text-xl font-bold mb-2">리드 점수화</h3>
                            <p className="text-slate-500">누가 구매확률이 높은지 "지금 연락해야 할 고객"을 알려줍니다.</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6"><GitBranch size={24} /></div>
                            <h3 className="text-xl font-bold mb-2">자동 시나리오</h3>
                            <p className="text-slate-500">상담 완료 시 실측 안내, 실측 완료 시 결제 안내가 자동으로 나갑니다.</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mb-6"><PieChart size={24} /></div>
                            <h3 className="text-xl font-bold mb-2">AI 인사이트</h3>
                            <p className="text-slate-500">어떤 랜딩이 돈이 되는지, 어디서 고객이 끊기는지 분석합니다.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* [SECTION 5] Target Audience */}
            <section className="py-24 px-6 bg-slate-900 text-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">이런 분께 추천합니다</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            "상담은 많은데 계약 전환이 낮은 분",
                            "직원마다 응대 품질이 다른 업체",
                            "광고비 대비 성과가 안 나오는 사장님",
                            "현장·사무실·마케팅을 한 번에 관리하고 싶은 분"
                        ].map((text, i) => (
                            <div key={i} className="flex items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <Check className="text-indigo-400 shrink-0" />
                                <span className="font-bold text-lg">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* [SECTION 6] Pricing Summary */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">합리적인 요금제</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {SAAS_PLANS.map((plan) => (
                            <div key={plan.id} className={`p-8 rounded-3xl border ${plan.id === "PRO" ? "border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-100" : "border-slate-200 bg-white"}`}>
                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{plan.description}</p>
                                <div className="text-3xl font-black mb-8">{plan.price}</div>
                                <Link href={`/saas/onboarding?plan=${plan.id}`} className={`block w-full py-4 rounded-xl font-bold text-center transition ${plan.id === "PRO" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                                    선택하기
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* [SECTION 7] Trust */}
            <section className="py-24 px-6 bg-slate-50">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-block p-3 bg-white rounded-full shadow-sm mb-6">
                        <ShieldCheck className="text-indigo-600" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold mb-6">현장 실무에서 검증된 구조</h2>
                    <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                        LimsDoor는 개발자가 상상으로 만든 프로그램이 아닙니다.<br />
                        실제 림스도어 내부 운영 시스템을 기반으로<br />
                        현장 시공 프로세스에 최적화된 로직만 담았습니다.
                    </p>
                </div>
            </section>

            {/* [SECTION 8] Final CTA */}
            <section className="py-32 px-6 text-center">
                <h2 className="text-4xl font-black mb-8 leading-tight">오늘부터 영업을<br className="md:hidden" /> <span className="text-indigo-600">자동화</span>하세요</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/saas/onboarding" className="w-full sm:w-auto px-10 py-5 bg-black text-white rounded-2xl font-bold text-xl hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2">
                        무료 체험 시작하기 <ArrowRight />
                    </Link>
                    <button className="w-full sm:w-auto px-10 py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-xl hover:bg-slate-50 transition">
                        상담 요청하기
                    </button>
                </div>
            </section>
        </div>
    );
}
