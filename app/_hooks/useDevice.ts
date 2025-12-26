"use client";

import { useEffect, useMemo, useState } from "react";

type DeviceType = "mobile" | "tablet" | "desktop";
type Orientation = "portrait" | "landscape";

function getDeviceType(w: number): DeviceType {
    if (w <= 767) return "mobile";
    if (w <= 1023) return "tablet";
    return "desktop";
}

export function useDevice() {
    // Use a sensible default (desktop) to avoid hydration mismatch on first render if possible, 
    // but for responsive logic, we often want to know the real size. 
    // We start with 0 to indicate "unknown" but logic below handles it.
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);

    useEffect(() => {
        const onResize = () => {
            setWidth(window.innerWidth);
            setHeight(window.innerHeight);
        };

        // Initial call
        onResize();

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const device = useMemo<DeviceType>(() => {
        if (width === 0) return "desktop"; // Default for SSR/initial
        return getDeviceType(width);
    }, [width]);

    const orientation = useMemo<Orientation>(() => {
        if (!width || !height) return "portrait";
        return width >= height ? "landscape" : "portrait";
    }, [width, height]);

    const isTouch = useMemo(() => {
        if (typeof window === "undefined") return false;
        return (
            "ontouchstart" in window ||
            (navigator as any).maxTouchPoints > 0 ||
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
        );
    }, []);

    const prefersReducedMotion = useMemo(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    }, []);

    return {
        width,
        height,
        device, // mobile/tablet/desktop
        orientation, // portrait/landscape
        isTouch,
        prefersReducedMotion,
    };
}
