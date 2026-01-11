"use client";

// Simple singleton to load OpenCV once
let loadPromise: Promise<void> | null = null;

export function loadOpenCV(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if ((window as any).cv && (window as any).cv.Mat) return Promise.resolve();

    if (!loadPromise) {
        loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://docs.opencv.org/4.8.0/opencv.js";
            script.async = true;
            script.onload = () => {
                // sometimes cv is not ready immediately
                const check = setInterval(() => {
                    if ((window as any).cv && (window as any).cv.Mat) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            };
            script.onerror = () => {
                reject(new Error("Failed to load OpenCV.js"));
            };
            document.body.appendChild(script);
        });
    }
    return loadPromise;
}
