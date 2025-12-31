"use client";

import React from "react";
import { Star, MessageCircle, RefreshCw, ThumbsUp } from "lucide-react";

export default function RetentionManagementPage() {
    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">후기 / 재구매 (Retention)</h1>
                    <p className="text-slate-500">고객 만족도 관리 및 재구매 유도 캠페인</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "이번 달 후기", value: "0건", icon: MessageCircle, color: "text-blue-600 bg-blue-50" },
                    { label: "평균 별점", value: "0.0", icon: Star, color: "text-yellow-500 bg-yellow-50" },
                    { label: "재구매율", value: "0%", icon: RefreshCw, color: "text-purple-600 bg-purple-50" },
                    { label: "추천 의향", value: "0%", icon: ThumbsUp, color: "text-emerald-600 bg-emerald-50" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 p-6 flex flex-col items-center justify-center text-slate-400">
                <Star size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">후기 관리 기능 준비 중</p>
                <p className="text-sm">리뷰 수집 및 포인트 지급 시스템이 곧 연동됩니다.</p>
            </div>
        </div>
    );
}
