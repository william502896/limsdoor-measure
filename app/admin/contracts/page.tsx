"use client";

import ContractList from "@/app/components/Manage/ContractList";

export default function ContractsPage() {
    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden">
            <ContractList />
        </div>
    );
}
