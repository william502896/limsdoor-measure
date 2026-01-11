"use client";

import React, { useState } from "react";
import CustomerList from "@/app/components/Manage/CustomerList";
import CustomerDetail from "@/app/components/Manage/CustomerDetail";

export default function ConsultingPage() {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">상담 / 예약 관리</h1>
                <p className="text-sm text-slate-500">인입된 상담 고객 및 실측 예약 건을 관리합니다.</p>
            </div>

            <div className="h-full">
                {selectedCustomerId ? (
                    <CustomerDetail
                        customerId={selectedCustomerId}
                        onBack={() => setSelectedCustomerId(null)}
                    />
                ) : (
                    <CustomerList
                        onSelectCustomer={setSelectedCustomerId}
                        filterType="consulting"
                    />
                )}
            </div>
        </div>
    );
}
