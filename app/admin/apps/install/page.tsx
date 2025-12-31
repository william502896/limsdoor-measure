"use client";

import React from "react";
import { Hammer, CheckSquare, Clock, Users } from "lucide-react";

export default function InstallAppDashboard() {
    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">시공 앱 (Install) 모니터링</h1>
                    <p className="text-slate-500">시공 기사 작업 현황 및 완료 보고서 관리</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "활성 시공팀", value: "0팀", icon: Users, color: "text-orange-600 bg-orange-50" },
                    { label: "시공 완료", value: "0건", icon: CheckSquare, color: "text-blue-600 bg-blue-50" },
                    { label: "평균 소요 시간", value: "0h", icon: Clock, color: "text-slate-600 bg-slate-50" },
                    { label: "AS 접수", value: "0건", icon: Hammer, color: "text-red-600 bg-red-50" },
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
                <h3 className="text-lg font-bold text-slate-800 mb-4">시공 리포트 현황</h3>
                <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
                    데이터 수집 대기 중...
                </div>
            </div>
        </div>
    );
}
