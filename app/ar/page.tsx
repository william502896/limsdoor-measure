"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, RefreshCw, Lock, Settings } from "lucide-react";
import { findDoorQuad, lerpQuad } from "./lib/vision";

export default function ArPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>("");
    const [confidence, setConfidence] = useState<"LOW" | "MED" | "HIGH">("LOW");

    // Init Camera
    useEffect(() => {
        let stream: MediaStream | null = null;

        async function initCamera() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setError("보안 컨텍스트 필요: 카메라 사용은 HTTPS 또는 localhost 환경에서만 가능합니다. \n\n[해결 방법]\n1. PC와 USB 연결 후 Chrome 원격 디버깅 사용 (Port Forwarding: 3000 -> localhost:3000)\n2. 또는 HTTPS 배포 환경에서 접속");
                    return;
                }

                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });

                const v = videoRef.current;
                if (stream && v) {
                    v.srcObject = stream;
                    // iOS/Mobile stability pattern
                    await v.play();
                    setStream(stream);
                }
            } catch (e: any) {
                console.error("Camera Init Failed", e);
                if (e.name === 'NotAllowedError') {
                    setError("카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.");
                } else {
                    setError("카메라를 실행할 수 없습니다: " + (e.message || "알 수 없는 오류"));
                }
            }
        }
        initCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // State for Vision
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const [currentQuad, setCurrentQuad] = useState<{ x: number, y: number }[]>([
        { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }
    ]);
    const quadRef = useRef(currentQuad); // Ref for animation loop access



    // Init Offscreen Canvas
    useEffect(() => {
        const off = document.createElement("canvas");
        off.width = 320; // Processing Resolution
        off.height = 180; // 16:9
        offscreenRef.current = off;
    }, []);

    // Loop
    useEffect(() => {
        let aniId: number;
        let frameCount = 0;

        const loop = () => {
            aniId = requestAnimationFrame(loop);
            frameCount++;

            const canvas = canvasRef.current;
            const video = videoRef.current;
            const off = offscreenRef.current;

            if (canvas && video && video.readyState >= 2 && off) {
                // Resize Canvas to Window
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                const ctx = canvas.getContext("2d");

                // 1. Run Detection (Every 3 frames)
                if (frameCount % 3 === 0) {
                    const result = findDoorQuad(video, off);
                    if (result) {
                        const smoothFactor = 0.2;
                        const nextQuad = lerpQuad(quadRef.current, result.quad, smoothFactor);
                        quadRef.current = nextQuad;
                        setConfidence(result.confidence);
                    } else {
                        setConfidence("LOW");
                    }
                }

                // 2. Draw UI
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const q = quadRef.current;
                    const w = canvas.width;
                    const h = canvas.height;
                    const p = q.map(pt => ({ x: pt.x * w, y: pt.y * h }));

                    // Draw Quad Mask
                    ctx.beginPath();
                    ctx.moveTo(p[0].x, p[0].y);
                    ctx.lineTo(p[1].x, p[1].y);
                    ctx.lineTo(p[2].x, p[2].y);
                    ctx.lineTo(p[3].x, p[3].y);
                    ctx.closePath();

                    ctx.fillStyle = "rgba(0, 180, 0, 0.22)";
                    ctx.shadowColor = "rgba(0, 255, 0, 0.35)";
                    ctx.shadowBlur = 14;
                    ctx.fill();

                    ctx.strokeStyle = "rgba(0, 255, 0, 0.85)";
                    ctx.lineWidth = 2;
                    ctx.lineJoin = "round";
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Corner Dots
                    ctx.fillStyle = "#00ff00";
                    const r = 6;
                    p.forEach(pt => {
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#fff";
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, r / 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#00ff00";
                    });

                    // Guide text
                    if (confidence === "HIGH") {
                        ctx.font = "bold 16px sans-serif";
                        ctx.fillStyle = "#00ff00";
                        ctx.textAlign = "center";
                        ctx.fillText("LOCK을 눌러주세요", w / 2, p[2].y + 30);
                    }
                }
            }
        };
        loop();
        return () => cancelAnimationFrame(aniId);
    }, []);

    const handleLock = () => {
        const video = videoRef.current;
        if (!video) return;

        // Capture High-Res Frame
        const capCanvas = document.createElement("canvas");
        capCanvas.width = video.videoWidth;
        capCanvas.height = video.videoHeight;
        const ctx = capCanvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const url = capCanvas.toDataURL("image/jpeg", 0.9);

        // Save session with ACTUAL DETECTED QUAD
        const session = {
            imageDataUrl: url,
            quad: quadRef.current, // Current smoothed quad
            confidence,
            timestamp: Date.now()
        };
        localStorage.setItem("limsdoor_ar_session_v1", JSON.stringify(session));

        router.push("/ar/result");
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-900 text-slate-100 p-8 text-center">
                <div className="max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
                    <div className="text-red-400 mb-4 flex justify-center">
                        <Camera size={48} />
                    </div>
                    <div className="text-lg font-bold mb-4">카메라 연결 실패</div>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {error}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-700">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition"
                        >
                            다시 시도
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* Fullscreen Video */}
            <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay Canvas (No Click) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* UI: Top Badge */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/20 pointer-events-none">
                신뢰도: <span className={confidence === "HIGH" ? "text-green-400" : "text-yellow-400"}>{confidence}</span>
            </div>

            {/* UI: Bottom Bar (Auto Click) */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between px-6 pb-6 z-10 pointer-events-auto">
                <button
                    onClick={() => router.replace("/field")}
                    className="p-3 rounded-full bg-white/10 text-white backdrop-blur active:scale-95 transition"
                >
                    <Settings size={22} />
                </button>

                <button
                    onClick={handleLock}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform"
                >
                    <Lock size={18} />
                    <span>LOCK</span>
                </button>

                <button
                    onClick={() => window.location.reload()}
                    className="p-3 rounded-full bg-white/10 text-white backdrop-blur active:scale-95 transition"
                >
                    <RefreshCw size={22} />
                </button>
            </div>
        </div>
    );
}
