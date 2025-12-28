"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ManageLayout from "../components/Manage/Layout/ManageLayout";
import CustomerList from "@/app/components/Manage/CustomerList";
import CustomerDetail from "@/app/components/Manage/CustomerDetail";
import AnalyticsDashboard from "@/app/components/Manage/AnalyticsDashboard";
import RadioUserList from "@/app/components/Manage/RadioUserList";
import DispatchConsole from "@/app/components/Manage/DispatchConsole"; // NEW IMPORT

function ManageContent() {
    const searchParams = useSearchParams();
    const initialView = searchParams.get("view") || "dashboard";
    const [view, setView] = useState(initialView);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    useEffect(() => {
        const v = searchParams.get("view");
        if (v) setView(v);
    }, [searchParams]);

    // Dynamic Title based on view
    const getTitle = () => {
        switch (view) {
            case "dashboard": return "대시보드";
            case "dispatch": return "배차 관제 센터";
            case "customer": return "고객 관리";
            case "contract": return "계약 / 견적 관리";
            case "as": return "AS / 하자 관리";
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
        <ManageLayout title={getTitle()}>
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
            {view === "dispatch" && <DispatchConsole />}

            {/* Placeholders for other views */}
            {["contract", "as", "voice", "reports", "settings"].includes(view) && (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                    <div className="text-4xl mb-4">🚧</div>
                    <div className="text-lg font-medium">아직 준비 중인 기능입니다.</div>
                    <div className="text-sm">({view} page functionality coming soon)</div>
                </div>
            )}
        </ManageLayout>
    );
}

export default function ManagePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ManageContent />
        </Suspense>
    );
}
