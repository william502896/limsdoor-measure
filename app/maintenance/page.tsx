"use client";

import { useSearchParams } from "next/navigation";
import { Lock, AlertTriangle } from "lucide-react";
import { PLATFORM_NAME } from "@/app/lib/constants";

import { Suspense } from "react";

function MaintenanceContent() {
    const searchParams = useSearchParams();
    const reason = searchParams.get('reason');

    const isSuspended = reason === 'company_suspended';

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800 shadow-2xl">
                        {isSuspended ? <Lock size={40} className="text-amber-500" /> : <AlertTriangle size={40} className="text-red-500" />}
                    </div>
                </div>

                <h1 className="text-3xl font-black text-white tracking-tight">
                    {isSuspended ? "서비스 이용 제한" : "시스템 점검 중"}
                </h1>

                <p className="text-slate-400 leading-relaxed">
                    {isSuspended
                        ? "귀사의 서비스 이용이 일시적으로 제한되었습니다.\n관리자에게 문의하시거나 고객센터로 연락해주세요."
                        : "현재 시스템 긴급 점검이 진행 중입니다.\n안정적인 서비스를 위해 잠시만 기다려주세요."}
                </p>

                <div className="pt-8 border-t border-slate-800">
                    <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">{PLATFORM_NAME} System</p>
                </div>
            </div>
        </div>
    );
}

export default function MaintenancePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
            <MaintenanceContent />
        </Suspense>
    );
}
