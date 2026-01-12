"use client";

import React, { useState, Suspense } from "react";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";
import CalendarView from "@/app/components/Manage/CalendarView";
import CustomerDetail from "@/app/components/Manage/CustomerDetail";

// Force dynamic rendering to support useSearchParams
export const dynamic = 'force-dynamic';

function ScheduleContent() {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    return (
        <ManageLayout title="스케줄 관리">
            {selectedCustomerId ? (
                <div className="h-full">
                    <CustomerDetail
                        customerId={selectedCustomerId}
                        onBack={() => setSelectedCustomerId(null)}
                    />
                </div>
            ) : (
                <CalendarView onSelectCustomer={setSelectedCustomerId} />
            )}
        </ManageLayout>
    );
}

export default function SchedulePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-500">로딩 중...</div>}>
            <ScheduleContent />
        </Suspense>
    );
}
