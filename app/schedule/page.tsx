"use client";

import React, { useState } from "react";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";
import CalendarView from "@/app/components/Manage/CalendarView";
import CustomerDetail from "@/app/components/Manage/CustomerDetail";

export default function SchedulePage() {
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
