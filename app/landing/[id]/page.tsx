"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, ChevronRight, CheckCircle2, User, Phone } from "lucide-react";
import { PLATFORM_NAME } from "@/app/lib/constants";

export default function LandingPagePublic() {
    const params = useParams();
    const id = params?.id as string;

    const [landing, setLanding] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Submit State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (id) loadLanding();
    }, [id]);

    async function loadLanding() {
        try {
            const res = await fetch(`/api/public/landing/${id}`);
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "Failed to load");
            setLanding(json.data);
        } catch (e) {
            setError("페이지를 찾을 수 없거나 삭제되었습니다.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        // Validation
        if (landing.collect_name && !name.trim()) return alert("이름을 입력해주세요.");
        if (landing.collect_phone && !phone.trim()) return alert("연락처를 입력해주세요.");

        setSubmitting(true);
        try {
            const res = await fetch(`/api/public/landing/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_name: name,
                    phone: phone
                })
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            setDone(true);

            // Handle CTA Action
            if (landing.cta_action === "LINK" && landing.cta_target_url) {
                window.location.href = landing.cta_target_url;
            } else if (landing.cta_action === "DOWNLOAD" && landing.cta_target_url) {
                // Trigger download
                const a = document.createElement("a");
                a.href = landing.cta_target_url;
                a.download = "";
                a.click();
            }
        } catch (e) {
            alert("처리 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin text-indigo-600">Loading...</div></div>;
    if (error || !landing) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">{error || "Not Found"}</div>;

    // Determine Icon based on Goal
    const GoalIcon = landing.goal_type === "PDF" ? Download : ChevronRight;

    return (
        <div className="min-h-screen bg-white md:bg-slate-50 relative overflow-hidden font-sans">
            {/* Background Decor (Desktop) */}
            <div className="hidden md:block absolute top-0 left-0 w-full h-96 bg-indigo-900 z-0"></div>

            <main className="relative z-10 max-w-lg mx-auto bg-white min-h-screen md:min-h-0 md:my-10 md:rounded-3xl md:shadow-2xl overflow-hidden pb-10">

                {/* Hero Image */}
                <div className="relative h-64 bg-slate-200">
                    {landing.main_image_url ? (
                        <img src={landing.main_image_url} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300">
                            <span className="font-bold text-2xl">{PLATFORM_NAME}</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                        <div className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-xs font-bold mb-3 shadow-lg border border-indigo-400">
                            {landing.goal_type === "PDF" ? "무료 자료" : landing.goal_type === "EVENT" ? "이벤트" : "상담 신청"}
                        </div>
                        <h1 className="text-2xl font-bold leading-tight shadow-sm">{landing.title}</h1>
                    </div>
                </div>

                {/* Content Body */}
                <div className="px-6 py-8">
                    <div className="prose prose-slate max-w-none mb-8">
                        <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                            {landing.sub_copy || "내용이 없습니다."}
                        </p>
                    </div>

                    {/* Done State */}
                    {done ? (
                        <div className="text-center py-10 bg-green-50 rounded-2xl border border-green-100 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-green-900">신청이 완료되었습니다!</h3>
                            <p className="text-green-700 mt-2 text-sm">
                                {landing.cta_action === "DOWNLOAD" ? "다운로드가 시작되지 않으면 다시 시도해주세요." : "담당자가 곧 연락드리겠습니다."}
                            </p>
                            {landing.cta_action === "DOWNLOAD" && landing.cta_target_url && (
                                <a
                                    href={landing.cta_target_url}
                                    target="_blank"
                                    download
                                    className="inline-block mt-6 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg"
                                >
                                    다시 다운로드 하기
                                </a>
                            )}
                        </div>
                    ) : (
                        /* Input Form */
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                정보 입력하고 {landing.cta_text || "신청하기"}
                            </h3>

                            <div className="space-y-4">
                                {landing.collect_name && (
                                    <div className="relative">
                                        <User size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="이름"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition"
                                        />
                                    </div>
                                )}

                                {landing.collect_phone && (
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="연락처 (예: 010-1234-5678)"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition"
                                            type="tel"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {submitting ? "처리 중..." : (
                                        <>
                                            {landing.cta_text || "지금 바로 확인하기"}
                                            <GoalIcon size={20} />
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-slate-400 text-center mt-3">
                                    버튼을 누르면 마케팅 정보 수신에 동의하게 됩니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-6 text-center">
                    <p className="text-xs text-slate-400 font-medium">© {PLATFORM_NAME} Corp. All rights reserved.</p>
                </div>
            </main>
        </div>
    );
}
