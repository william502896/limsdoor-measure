"use client";

import { useParams } from "next/navigation";
import CustomerList from "@/app/components/Manage/CustomerList";

export default function FilteredCustomerPage() {
    const params = useParams();
    // type: all | prospective | consulting | contract | purchased
    const type = params?.type as string || "all";

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden">
            <CustomerList
                filterType={type}
                onSelectCustomer={(id) => console.log("Selected customer:", id)}
            />
        </div>
    );
}
