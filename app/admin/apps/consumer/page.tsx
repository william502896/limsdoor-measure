"use client";

import React from "react";
import { Users, MapPin, Clock, BarChart3 } from "lucide-react";

export default function ConsumerAppDashboard() {
    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">소비자 앱 (Consumer) 모니터링</h1>
                    <p className="text-slate-500">고객용 피팅/견적 앱 사용 현황 및 통계</p>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "실시간 접속자", value: "0명", icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "오늘 방문자", value: "0명", icon: MapPin, color: "text-green-600 bg-green-50" },
                    { label: "평균 체류 시간", value: "0분", icon: Clock, color: "text-orange-600 bg-orange-50" },
                    { label: "견적 완료율", value: "0%", icon: BarChart3, color: "text-purple-600 bg-purple-50" },
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

            {/* Charts Area (Placeholder) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-slate-400">
                    <MapPin size={48} className="mb-4 opacity-20" />
                    <p>지역별 접속 현황 (지도)</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-slate-400">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p>성별 / 연령대 분포</p>
                </div>
            </div>
        </div>
    );
}
