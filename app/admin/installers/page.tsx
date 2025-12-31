"use client";

import React from "react";
import { Hammer, Users, Calendar, ClipboardCheck } from "lucide-react";

export default function InstallersManagementPage() {
    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">시공 관리 (Construction Management)</h1>
                    <p className="text-slate-500">시공 팀 배정, 현장 관리 및 작업 승인</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition">
                    + 새 시공 등록
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "배정 대기", value: "2건", icon: Calendar, color: "text-orange-600 bg-orange-50" },
                    { label: "진행 중 현장", value: "5곳", icon: Hammer, color: "text-blue-600 bg-blue-50" },
                    { label: "시공 완료 (금월)", value: "12건", icon: ClipboardCheck, color: "text-emerald-600 bg-emerald-50" },
                    { label: "등록된 시공팀", value: "3팀", icon: Users, color: "text-slate-600 bg-slate-50" },
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
                <Hammer size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">시공 관리 기능 준비 중</p>
                <p className="text-sm">시공 스케줄링 및 리포트 검수 기능이 곧 추가됩니다.</p>
            </div>
        </div>
    );
}
