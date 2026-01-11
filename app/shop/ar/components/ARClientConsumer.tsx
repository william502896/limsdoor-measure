"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import {
    FitMode,
    detectFitMode,
    mapPreviewToImageRect,
    startCamera,
    stopStream,
    isInAppBrowser
} from "../../../lib/ar/utils";
import { Camera, RefreshCw, Smartphone } from "lucide-react";

declare global {
    interface Window {
        cv: any;
    }
}

export default function ARClientConsumer() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Status
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string>("");
    const [cvLoaded, setCvLoaded] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Display State
    const [fitMode, setFitMode] = useState<FitMode>("cover");
    const [roi, setRoi] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    // Capture Result
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const inApp = useMemo(() => isInAppBrowser(), []);

    // ========================================================
    // 1. Camera & Init
    // ========================================================
    useEffect(() => {
        let stream: MediaStream | null = null;
        (async () => {
            try {
                setError("");
                const v = videoRef.current;
                if (!v) return;

                stream = await startCamera(v);

                // Wait for dimension
                if (v.videoWidth === 0) {
                    await new Promise(r => setTimeout(r, 500));
                }

                setReady(true);
                updateFitMode();

                // Init default ROI (Center 60%)
                const vw = v.clientWidth || window.innerWidth;
                const vh = v.clientHeight || window.innerHeight;
                const w = Math.round(vw * 0.6);
                const h = Math.round(vh * 0.5);
                setRoi({ x: (vw - w) / 2, y: (vh - h) / 2, w, h });

            } catch (e: any) {
                setError(e.message || "카메라 시작 실패");
            }
        })();

        window.addEventListener('resize', updateFitMode);
        return () => {
            stopStream(stream);
            window.removeEventListener('resize', updateFitMode);
        };
    }, []);

    const updateFitMode = () => {
        const v = videoRef.current;
        if (!v) return;
        const mode = detectFitMode(
            v.clientWidth || window.innerWidth,
            v.clientHeight || window.innerHeight,
            v.videoWidth || 1280,
            v.videoHeight || 720,
            window.getComputedStyle(v).objectFit
        );
        setFitMode(mode);
    };

    // ========================================================
    // 2. OpenCV Detection Loop (Aperture Detection)
    // ========================================================
    const requestRef = useRef<number | null>(null);
    const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
    // Smoothing Refs (EMA)
    const emaRef = useRef({ x: 0, y: 0, w: 0, h: 0, initialized: false });

    const onCvLoad = () => {
        // Check CV existence
        const check = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                clearInterval(check);
                setCvLoaded(true);
                console.log("OpenCV Ready");
            }
        }, 200);
    };

    useEffect(() => {
        if (!ready || !cvLoaded) return;

        if (!procCanvasRef.current) procCanvasRef.current = document.createElement("canvas");
        const pc = procCanvasRef.current;
        let frameCount = 0;

        const loop = () => {
            requestRef.current = requestAnimationFrame(loop);
            frameCount++;

            // 10 FPS Limit (60/6 = 10)
            if (frameCount % 6 !== 0) return;

            const v = videoRef.current;
            if (!v || v.videoWidth === 0) return;

            try {
                const cv = window.cv;

                // 1. Downsample (Performance)
                const WORK_W = 320;
                const aspect = v.videoWidth / v.videoHeight;
                const WORK_H = Math.round(WORK_W / aspect);

                pc.width = WORK_W;
                pc.height = WORK_H;
                const ctx = pc.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(v, 0, 0, WORK_W, WORK_H);

                // 2. CV Pipeline
                let src = cv.imread(pc);
                let dst = new cv.Mat();

                // Grayscale
                cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
                // Blur (Less noise)
                // cv.GaussianBlur(src, src, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
                // Canny Edge
                cv.Canny(src, dst, 50, 150, 3, false);

                // Find Contours
                let contours = new cv.MatVector();
                let hierarchy = new cv.Mat();
                cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                let foundRect = null;
                let maxArea = 0;
                const minArea = (WORK_W * WORK_H) * 0.05; // at least 5% of screen

                for (let i = 0; i < contours.size(); ++i) {
                    let cnt = contours.get(i);
                    let rect = cv.boundingRect(cnt);
                    let area = rect.width * rect.height;

                    if (area > minArea && area > maxArea) {
                        // Check Aspect Ratio (Door-ish? 0.3 ~ 3.0)
                        let ratio = rect.width / rect.height;
                        if (ratio > 0.3 && ratio < 3.0) {
                            maxArea = area;
                            foundRect = rect;
                        }
                    }
                }

                // 3. Update ROI or set Searching
                if (foundRect) {
                    setIsSearching(false);

                    // Map WORK Coords -> Screen Coords
                    // Step A: WORK -> IMAGE
                    const scaleV = v.videoWidth / WORK_W;
                    const rx = foundRect.x * scaleV;
                    const ry = foundRect.y * scaleV;
                    const rw = foundRect.width * scaleV;
                    const rh = foundRect.height * scaleV;

                    // Step B: IMAGE -> PREVIEW (Screen)
                    const pW = v.clientWidth || window.innerWidth;
                    const pH = v.clientHeight || window.innerHeight;

                    // Compute Draw Scaling
                    const css = window.getComputedStyle(v).objectFit;
                    // Reuse util logic logic briefly inline for Projection
                    const sX = pW / v.videoWidth;
                    const sY = pH / v.videoHeight;
                    let scale = (fitMode === 'cover') ? Math.max(sX, sY) : Math.min(sX, sY);

                    const drawnW = v.videoWidth * scale;
                    const drawnH = v.videoHeight * scale;
                    const offX = (pW - drawnW) / 2;
                    const offY = (pH - drawnH) / 2;

                    const screenX = rx * scale + offX;
                    const screenY = ry * scale + offY;
                    const screenW = rw * scale;
                    const screenH = rh * scale;

                    // 4. EMA Smoothing
                    const alpha = 0.15; // Smooth factor
                    const ema = emaRef.current;
                    if (!ema.initialized) {
                        ema.x = screenX; ema.y = screenY; ema.w = screenW; ema.h = screenH;
                        ema.initialized = true;
                    } else {
                        ema.x += (screenX - ema.x) * alpha;
                        ema.y += (screenY - ema.y) * alpha;
                        ema.w += (screenW - ema.w) * alpha;
                        ema.h += (screenH - ema.h) * alpha;
                    }

                    setRoi({
                        x: Math.round(ema.x),
                        y: Math.round(ema.y),
                        w: Math.round(ema.w),
                        h: Math.round(ema.h)
                    });
                } else {
                    setIsSearching(true);
                    // Keep last ROI but maybe pulse color?
                }

                // Cleanup
                src.delete(); dst.delete();
                contours.delete(); hierarchy.delete();

            } catch (e) {
                console.error(e);
            }
        };

        loop();
        return () => cancelAnimationFrame(requestRef.current!);
    }, [ready, cvLoaded, fitMode]);

    // ========================================================
    // 3. Overlay Rendering
    // ========================================================
    useEffect(() => {
        const c = overlayCanvasRef.current;
        const v = videoRef.current;
        if (!ready || !c || !v) return;

        const render = () => {
            const w = v.clientWidth || window.innerWidth;
            const h = v.clientHeight || window.innerHeight;
            c.width = w;
            c.height = h;

            const ctx = c.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, w, h);

            // Mask (Dark)
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 0, w, h);

            if (roi) {
                // Hole
                ctx.clearRect(roi.x, roi.y, roi.w, roi.h);

                // Border (Green valid, Yellow searching)
                const color = isSearching ? "rgba(255, 200, 0, 0.6)" : "rgba(0, 255, 120, 0.9)";
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(roi.x, roi.y, roi.w, roi.h);

                // Label
                ctx.fillStyle = isSearching ? "#fbbf24" : "#4ade80";
                ctx.font = "bold 14px sans-serif";
                const label = !cvLoaded ? "시스템 로딩중..." : (isSearching ? "개구부(문틀) 찾는 중..." : "개구부 감지됨");
                ctx.fillText(label, roi.x, roi.y - 10 > 20 ? roi.y - 10 : roi.y + 20);
            }

            requestRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(requestRef.current!);
    }, [ready, roi, isSearching, cvLoaded]); // roi updates driven by CV loop

    // ========================================================
    // 4. Capture
    // ========================================================
    const onCapture = () => {
        if (!ready || !videoRef.current) return;
        const v = videoRef.current;

        const imageW = v.videoWidth;
        const imageH = v.videoHeight;
        const previewW = v.clientWidth || window.innerWidth;
        const previewH = v.clientHeight || window.innerHeight;

        const targetRect = roi || { x: 0, y: 0, w: previewW, h: previewH };

        const mapped = mapPreviewToImageRect({
            previewW, previewH, imageW, imageH,
            rect: targetRect,
            fitMode
        });

        // Full Frame
        const canvas = document.createElement("canvas");
        canvas.width = imageW;
        canvas.height = imageH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0);

        // Crop
        const finalC = document.createElement("canvas");
        finalC.width = mapped.w;
        finalC.height = mapped.h;
        const fCtx = finalC.getContext("2d");
        if (!fCtx) return;

        fCtx.drawImage(
            canvas,
            mapped.x, mapped.y, mapped.w, mapped.h,
            0, 0, mapped.w, mapped.h
        );

        setCapturedImage(finalC.toDataURL("image/png"));
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col justify-center items-center">
            <Script
                src="https://docs.opencv.org/4.8.0/opencv.js"
                strategy="afterInteractive"
                onLoad={onCvLoad}
            />

            {/* ERROR */}
            {error && (
                <div className="absolute inset-0 z-50 bg-black/90 p-8 flex flex-col justify-center items-center text-white text-center">
                    <Smartphone size={48} className="mb-4 text-red-500" />
                    <h2 className="text-xl font-bold mb-2">카메라 오류</h2>
                    <p className="mb-6 opacity-80">{error}</p>
                    {inApp && <p className="mb-6 text-sm bg-gray-600 p-2 rounded">인앱 브라우저입니다.<br />우측 메뉴에서 [다른 브라우저로 열기]를 해주세요.</p>}
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-black font-bold rounded">새로고침</button>
                </div>
            )}

            {/* CAMERA LAYER */}
            <div className="absolute inset-0 pointer-events-none">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ objectFit: fitMode }}
                    playsInline muted autoPlay
                />
                <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* UI LAYER */}
            <div className="absolute inset-0 pointer-events-auto flex flex-col justify-between p-5 z-10 w-full max-w-md mx-auto">
                {/* Top */}
                <div className="flex justify-between items-center text-white top-safe-pad">
                    <span className="font-bold opacity-80">Consumer AR</span>
                    <span className="text-xs bg-black/40 px-2 py-1 rounded">{fitMode}</span>
                </div>

                {/* Bottom */}
                <div className="flex justify-center items-center gap-6 pb-8">
                    <button onClick={() => window.location.reload()} className="p-4 bg-white/20 rounded-full text-white backdrop-blur">
                        <RefreshCw size={24} />
                    </button>

                    <button
                        onClick={onCapture}
                        disabled={!ready || !!error}
                        className="w-20 h-20 bg-white/30 rounded-full border-4 border-white flex items-center justify-center active:bg-white/50 transition-colors shadow-lg"
                    >
                        <div className="w-16 h-16 bg-white rounded-full" />
                    </button>
                </div>
            </div>

            {/* RESULT MODAL */}
            {capturedImage && (
                <div className="absolute inset-0 z-50 bg-black animate-in slide-in-from-bottom flex flex-col">
                    <div className="flex-1 p-6 flex items-center justify-center bg-gray-900 shadow-inner">
                        <img src={capturedImage} alt="Crop" className="max-w-full max-h-full rounded-lg shadow-2xl border border-gray-700" />
                    </div>
                    <div className="bg-white p-6 rounded-t-2xl shadow-xl safe-pb">
                        <h3 className="font-bold text-lg mb-4 text-center">개구부 캡처 완료</h3>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCapturedImage(null)}
                                className="flex-1 py-3 border border-gray-300 rounded-xl font-bold active:bg-gray-100"
                            >
                                다시 촬영
                            </button>
                            <button
                                onClick={() => {
                                    if (!capturedImage) return;
                                    const payload = {
                                        imageDataUrl: capturedImage,
                                        quad: [
                                            { x: 0, y: 0 },
                                            { x: 1, y: 0 },
                                            { x: 1, y: 1 },
                                            { x: 0, y: 1 }
                                        ]
                                    };
                                    localStorage.setItem("limsdoor_ar_session_v1", JSON.stringify(payload));
                                    window.location.href = "/shop/ar/result";
                                }}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold active:bg-indigo-700 shadow-md"
                            >
                                사용하기 (합성)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
