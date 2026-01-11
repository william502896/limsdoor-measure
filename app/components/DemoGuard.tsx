"use client";

import React, { useEffect, useState, useRef } from "react";
import { useDemoLimit } from "@/app/hooks/useDemoLimit";
import Link from "next/link";
import { Lock } from "lucide-react";

interface Props {
    children: React.ReactNode;
}

export default function DemoGuard({ children }: Props) {
    const { isReady, isDevMode, launchCount, recordLaunch } = useDemoLimit();
    // const [blocked, setBlocked] = useState(false); // REMOVED BLOCKING STATE
    const checkedRef = useRef(false);

    useEffect(() => {
        if (!isReady) return;
        if (checkedRef.current) return;
        checkedRef.current = true;

        // UNLIMITED MODE: Never block, just record.
        recordLaunch();
    }, [isReady, isDevMode, launchCount, recordLaunch]);

    if (!isReady) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse">Loading...</div>;
    }

    // REMOVED BLOCKING UI

    return <>{children}</>;
}
