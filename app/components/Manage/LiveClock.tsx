"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LiveClock() {
    const router = useRouter();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClick = () => {
        router.push("/schedule");
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm hover:bg-white hover:text-indigo-600 transition border border-slate-200"
        >
            <Clock size={16} className="text-slate-500 animate-[pulse_2s_infinite]" />
            <span className="text-sm font-mono font-bold text-slate-700" suppressHydrationWarning>
                {time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} {time.toLocaleTimeString('ko-KR', { hour12: false })}
            </span>
        </button>
    );
}
