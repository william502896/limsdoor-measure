"use client";

import React from 'react';
import { useGlobalStore } from '../lib/store-context';
import Link from 'next/link';
import { ArrowLeft, Building, Users, Monitor } from 'lucide-react';

export default function SettingsPage() {
    const { settings, currentTenant } = useGlobalStore();

    if (!settings) return <div className="p-10">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-full transition">
                        <ArrowLeft className="text-slate-600" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800">설정 (Settings)</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
                    ⚠️ 설정 페이지가 리뉴얼 중입니다. 주요 기능은 관리자 대시보드에서 이용해주세요.
                </div>

                {/* Company Info (Read Only) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-slate-800">
                        <Building size={20} className="text-indigo-600" />
                        회사 정보
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 border-b py-2">
                            <span className="text-slate-500 font-bold">지점명 (Tenant)</span>
                            <span className="col-span-2 text-slate-900 font-medium">{currentTenant?.name}</span>
                        </div>
                        <div className="grid grid-cols-3 border-b py-2">
                            <span className="text-slate-500 font-bold">브랜드명</span>
                            <span className="col-span-2 text-slate-900">{currentTenant?.brandName}</span>
                        </div>
                        <div className="grid grid-cols-3 py-2">
                            <span className="text-slate-500 font-bold">연락처</span>
                            <span className="col-span-2 text-slate-900">{settings.company?.contact}</span>
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="flex items-center gap-2 text-lg font-bold mb-4 text-slate-800">
                        <Monitor size={20} className="text-green-600" />
                        시스템 환경
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 border-b py-2">
                            <span className="text-slate-500 font-bold">모드</span>
                            <span className="col-span-2 text-slate-900">{currentTenant?.defaultUiMode}</span>
                        </div>
                        <div className="grid grid-cols-3 py-2">
                            <span className="text-slate-500 font-bold">테마</span>
                            <span className="col-span-2 text-slate-900 uppercase">{currentTenant?.theme}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
