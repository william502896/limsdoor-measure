
import { useState, useEffect, useRef, useCallback } from "react";
import { AngleBuffer, isAngleLevel, LEVEL_TOLERANCE_DEFAULT } from "./leveling";

type LevelingState = {
    available: boolean;
    permissionGranted: boolean;
    alpha: number; // Compass
    beta: number;  // Front-to-back tilt (-180 to 180)
    gamma: number; // Left-to-right tilt (-90 to 90)
    isLevel: boolean; // Main check (based on gamma/roll for portrait)
    status: "ok" | "warning" | "error" | "off";
};

export function useLeveling(enabled: boolean = true) {
    const [state, setState] = useState<LevelingState>({
        available: false,
        permissionGranted: false,
        alpha: 0,
        beta: 0,
        gamma: 0,
        isLevel: true, // Default true to not block if sensor fails
        status: "off",
    });

    const bufferBeta = useRef(new AngleBuffer(10));
    const bufferGamma = useRef(new AngleBuffer(10));

    // Permission handling (mainly iOS)
    const requestPermission = useCallback(async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                if (response === "granted") {
                    setState((prev) => ({ ...prev, permissionGranted: true, status: "ok" }));
                    return true;
                } else {
                    alert("센서 권한이 거부되었습니다.");
                    setState((prev) => ({ ...prev, permissionGranted: false, status: "error" }));
                    return false;
                }
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        // Non-iOS or older devices (no perm needed)
        setState((prev) => ({ ...prev, permissionGranted: true }));
        return true;
    }, []);

    useEffect(() => {
        if (!enabled) {
            setState((prev) => ({ ...prev, status: "off" }));
            return;
        }

        if (typeof window === "undefined") return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            const { beta, gamma, alpha } = event;
            if (beta === null || gamma === null) return;

            // Smoothing
            bufferBeta.current.push(beta);
            bufferGamma.current.push(gamma);

            const avgBeta = bufferBeta.current.getAverage();
            const avgGamma = bufferGamma.current.getAverage();

            // Check Level (Portrait Mode: Gamma should be ~0)
            const level = isAngleLevel(avgGamma, LEVEL_TOLERANCE_DEFAULT);

            setState({
                available: true,
                permissionGranted: true,
                alpha: alpha || 0,
                beta: avgBeta,
                gamma: avgGamma,
                isLevel: level,
                status: level ? "ok" : "warning",
            });
        };

        // Initialize / Check support
        if (window.DeviceOrientationEvent) {
            // For iOS 13+, we might need to wait for permission request manually.
            // We attach the listener anyway; if perm needed, it won't fire until granted.
            window.addEventListener("deviceorientation", handleOrientation);
        } else {
            setState((prev) => ({ ...prev, available: false, status: "error" }));
        }

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation);
        };
    }, [enabled]);

    return {
        ...state,
        requestPermission,
    };
}
