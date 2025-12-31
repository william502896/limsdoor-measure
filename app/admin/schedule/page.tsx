"use client";

import CalendarView from "@/app/components/Manage/CalendarView";

export default function SchedulePage() {
    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden">
            <CalendarView />
        </div>
    );
}
