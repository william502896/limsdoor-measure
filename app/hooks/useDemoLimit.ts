"use client";

import { useState, useEffect } from "react";

const MAX_LAUNCHES = 5;
const MAX_ACTIONS = 5;

type DemoLimitState = {
    isReady: boolean;
    isDevMode: boolean;
    canLaunch: boolean;
    canAction: boolean;
    launchCount: number;
    actionCount: number;
    recordLaunch: () => void;
    recordAction: () => boolean;
    toggleDevMode: () => void;
};

export function useDemoLimit(): DemoLimitState {
    const [isDevMode, setIsDevMode] = useState(false);
    const [launchCount, setLaunchCount] = useState(0);
    const [actionCount, setActionCount] = useState(0);

    const [isReady, setIsReady] = useState(false);

    // Initialize & Check Daily Reset
    useEffect(() => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const lastDate = localStorage.getItem("demo_date");
        const dev = localStorage.getItem("dev_mode") === "true";

        setIsDevMode(dev);

        if (lastDate !== today) {
            // New Day: Reset
            localStorage.setItem("demo_date", today);
            localStorage.setItem("demo_launches", "0");
            localStorage.setItem("demo_actions", "0");
            setLaunchCount(0);
            setActionCount(0);
        } else {
            // Same Day: Load
            setLaunchCount(parseInt(localStorage.getItem("demo_launches") || "0", 10));
            setActionCount(parseInt(localStorage.getItem("demo_actions") || "0", 10));
        }
        setIsReady(true);
    }, []);

    const toggleDevMode = () => {
        const newVal = !isDevMode;
        setIsDevMode(newVal);
        localStorage.setItem("dev_mode", String(newVal));
        // Optional: Reset counts on dev mode toggle? No, keep authentic.
    };

    const recordLaunch = () => {
        if (isDevMode) return;

        // Prevent double counting on React Strict Mode or re-renders if called multiple times quickly?
        // Basic implementation: Caller should ensure single call per session ideally, or we can use session storage to track "active session"
        // For simplicity: Just increment. The guard component should use a ref to prevent double call on mount.

        const newCount = launchCount + 1;
        setLaunchCount(newCount);
        localStorage.setItem("demo_launches", String(newCount));
    };

    const recordAction = (): boolean => {
        if (isDevMode) return true;

        if (actionCount >= MAX_ACTIONS) return false;

        const newCount = actionCount + 1;
        setActionCount(newCount);
        localStorage.setItem("demo_actions", String(newCount));
        return true;
    };

    const canLaunch = isDevMode || launchCount < MAX_LAUNCHES;
    const canAction = isDevMode || actionCount < MAX_ACTIONS;

    return {
        isReady,
        isDevMode,
        canLaunch,
        canAction,
        launchCount,
        actionCount,
        recordLaunch,
        recordAction,
        toggleDevMode,
    };
}
