"use client";

import { useParams } from "next/navigation";
import CalendarView from "@/app/components/Manage/CalendarView";
import ScheduleListView from "@/app/components/Manage/ScheduleListView";

export default function FilteredSchedulePage() {
    const params = useParams();
    // type: all | consulting | measure | install | reform | as
    const type = params?.type as string || "all";

    if (type === "all") {
        return (
            <div className="h-[calc(100vh-64px)] overflow-hidden">
                <CalendarView filterType={type} />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden p-6 bg-slate-50">
            <ScheduleListView filterType={type} />
        </div>
    );
}
