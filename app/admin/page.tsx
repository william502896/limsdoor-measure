"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import CustomerList from "@/app/components/Manage/CustomerList";
import CustomerDetail from "@/app/components/Manage/CustomerDetail";
import AnalyticsDashboard from "@/app/components/Manage/AnalyticsDashboard";
import RadioUserList from "@/app/components/Manage/RadioUserList"; // NEW IMPORT
import { useGlobalStore } from "@/app/lib/store-context"; // NEW IMPORT

function AdminContent() {
    const searchParams = useSearchParams();
    const initialView = searchParams.get("view") || "dashboard";
    const [view, setView] = useState(initialView);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    const { user, tenants, currentTenant, switchTenant } = useGlobalStore(); // NEW HOOK

    useEffect(() => {
        const v = searchParams.get("view");
        if (v) setView(v);
    }, [searchParams]);

    // Dynamic Title based on view
    const getTitle = () => {
        switch (view) {
            case "dashboard": return "통합 대시보드 (Admin)";
            case "customer": return "고객 관리";
            case "contract": return "계약 / 견적 관리";
            case "as": return "AS / 하자 관리";

            case "voice": return "음성 / AI 기록";
            case "radio": return "무전기 사용자 관리"; // New
            case "reports": return "영업 리포트";
            case "settings": return "설정";
            default: return "관리 허브";
        }
    };

    const handleSelectCustomer = (id: string) => {
        setSelectedCustomerId(id);
        setView("customer");
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header / Title Area */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{getTitle()}</h1>
            </div>

            {/* Tenant Switcher & Radio Moved to AnalyticsDashboard */}

            {view === "dashboard" && <AnalyticsDashboard />}

            {view === "customer" && (
                <div className="h-full">
                    {selectedCustomerId ? (
                        <CustomerDetail
                            customerId={selectedCustomerId}
                            onBack={() => setSelectedCustomerId(null)}
                        />
                    ) : (
                        <CustomerList onSelectCustomer={handleSelectCustomer} />
                    )}
                </div>
            )}

            {view === "radio" && <RadioUserList />}

            {/* Placeholders for other views */}
            {["contract", "as", "voice", "reports", "settings"].includes(view) && (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                    <div className="text-4xl mb-4">🚧</div>
                    <div className="text-lg font-medium">관리자 기능 준비 중</div>
                    <div className="text-sm">({view} module)</div>
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={<div>Loading Admin...</div>}>
            <AdminContent />
        </Suspense>
    );
}
