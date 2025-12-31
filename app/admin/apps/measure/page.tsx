"use client";

import React from "react";
import { Ruler, CheckCircle, AlertTriangle, FileText } from "lucide-react";

export default function MeasureAppDashboard() {
    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">실측 앱 (Measure) 모니터링</h1>
                    <p className="text-slate-500">등록된 실측 기사 사용 현황 및 API 과금 내역</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "활성 기사", value: "0명", icon: Ruler, color: "text-indigo-600 bg-indigo-50" },
                    { label: "오늘 실측 완료", value: "0건", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
                    { label: "API 호출 수", value: "0회", icon: FileText, color: "text-slate-600 bg-slate-50" },
                    { label: "오류 발생", value: "0건", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
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

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">최근 활동 로그</h3>
                <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
                    데이터 수집 대기 중...
                </div>
            </div>
        </div>
    );
}
