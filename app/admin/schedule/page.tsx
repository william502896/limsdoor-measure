"use client";

import { Suspense } from "react";
import CalendarView from "@/app/components/Manage/CalendarView";

// Force dynamic rendering to support useSearchParams
export const dynamic = 'force-dynamic';

export default function SchedulePage() {
    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500">로딩 중...</div>}>
                <CalendarView />
            </Suspense>
        </div>
    );
}
