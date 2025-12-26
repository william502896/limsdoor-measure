"use client";

import React, { useRef, useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Camera, ArrowLeft, Check, AlertTriangle, Wand2 } from "lucide-react";
import { useGlobalStore } from "../../lib/store-context";
import styles from "./ar.module.css";
import DoorModel, { DoorType, FrameColor, GlassType } from "@/app/components/Shop/AR/DoorModel";
import { useConsumerAI, Recommendation } from "@/app/hooks/useConsumerAI"; // NEW
import AICoachOverlay from "@/app/components/Shop/AICoachOverlay"; // NEW

// --- Constants ---
const FRAME_COLORS: Record<FrameColor, string> = {
    "화이트": "#ffffff",
    "블랙": "#1f2937",
    "샴페인골드": "#d4af37",
    "네이비": "#1e3a8a"
};

// Standard Dimensions for calculation
const STD_WIDTH = 1250; // mm
const STD_HEIGHT = 2100; // mm

function ShopArContent() {
    const router = useRouter();
    const { addOrder, user } = useGlobalStore();

    // AI Hooks
    const { analyze, getRecommendations, createConsultationRequest, matchStyle } = useConsumerAI(); // NEW
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- State Management ---
    // Workflow Steps: 'select' -> 'calibrate' -> 'scan' -> 'placed'
    type ARStep = "select" | "calibrate" | "scan" | "placed";
    const [step, setStep] = useState<ARStep>("select");
    const [isOpen, setIsOpen] = useState(false);

    // Config State
    const [doorType, setDoorType] = useState<DoorType>("3연동");
    const [frameColor, setFrameColor] = useState<FrameColor>("화이트");
    const [glassType, setGlassType] = useState<GlassType>("투명");

    // Geometric State
    const [scale, setScale] = useState(1.0); // 1.0 = Calibration Start
    const [posY, setPosY] = useState(0);
    const [posX, setPosX] = useState(0);

    // Manual Size Corrections
    const [widthMod, setWidthMod] = useState(0);
    const [heightMod, setHeightMod] = useState(0);

    // Gyroscope
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    // System State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [permission, setPermission] = useState<boolean | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Initial Mount Check (Prevent Hydration Mismatch)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculated Dimensions
    const calcWidth = Math.round((STD_WIDTH * scale) + widthMod);
    const calcHeight = Math.round((STD_HEIGHT * scale) + heightMod);

    // Price
    const basePrice = doorType === "원슬라이딩" ? 590000 : 690000;
    const optionPrice = (glassType === "투명" ? 0 : 50000) + (frameColor === "화이트" ? 0 : 30000);
    const totalPrice = basePrice + optionPrice;

    // AI Helpers
    const handleAIStyleMatch = async () => {
        if (!videoRef.current) return;
        setIsAnalyzing(true);
        try {
            // 1. Capture Frame
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

                // 2. Call AI
                const result = await matchStyle(dataUrl);

                // 3. Apply Config
                if (result?.suggested_config) {
                    const cfg = result.suggested_config;
                    // Safety mapping
                    if (cfg.glass) setGlassType(cfg.glass.replace("유리", "").trim() as any || "투명");
                    if (cfg.frame_color) setFrameColor(cfg.frame_color as any || "화이트");
                    // Door type logic could be complex, keeping current selection or mapping 'design' to type?
                    // Let's assume user selected doorType (structure) but AI styles it.

                    alert(`AI 제안: ${result.reasoning}\n\n설정된 스타일:\n컬러: ${cfg.frame_color}\n유리: ${cfg.glass}`);
                    handlePlaceDoor();
                }
            }
        } catch (e) {
            alert("AI 분석 실패. 다시 시도해주세요.");
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // AI Analysis (Memoized)
    const aiAnalysis = React.useMemo(() => analyze({
        isPlaced: step === "placed",
        isCalibrated: scale !== 1.0,
        doorType
    }), [step, scale, doorType]);

    const recommendations = React.useMemo(() => getRecommendations(doorType), [doorType]);

    const handleApplyRecommendation = (rec: Recommendation) => {
        setDoorType(rec.config.doorType as DoorType);
        setFrameColor(rec.config.design as FrameColor || "화이트"); // Map design to frame color roughly
        setGlassType(rec.config.glass as GlassType);
    };

    const handleRequestConsult = () => {
        const req = createConsultationRequest({ isPlaced: step === "placed", isCalibrated: true, doorType });
        // In real app, send to API. For now, alert
        alert(`상담이 접수되었습니다!\n[접수번호: ${req.requestedAt.slice(-6)}]`);
    };

    const handleSaveQuote = () => {
        const workflow = {
            id: Date.now().toString(),
            customerName: "AR 체험 고객", // Demo
            status: "ESTIMATE",
            items: [{
                name: `${doorType} (${frameColor})`,
                category: "door",
                unit: "set",
                scanData: { width: calcWidth, height: calcHeight },
                price: totalPrice
            }],
            createdAt: new Date().toISOString()
        };
        addOrder(workflow as any);
        alert("견적이 저장되었습니다.");
        router.push("/manage");
    };

    // --- Gyroscope Logic ---
    useEffect(() => {
        if (step === "select") return;

        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (!e.gamma || !e.beta) return;
            // Damped tilt
            const maxTilt = 10;
            const rotY = Math.max(-maxTilt, Math.min(maxTilt, e.gamma / 3));
            const rotX = Math.max(-maxTilt, Math.min(maxTilt, (e.beta - 45) / 3));
            setRotation({ x: rotX, y: rotY });
        };
        window.addEventListener("deviceorientation", handleOrientation);
        return () => window.removeEventListener("deviceorientation", handleOrientation);
    }, [step]);

    // --- Camera Logic (Robust) ---
    useEffect(() => {
        if (step === "select") {
            // Cleanup phase
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(t => t.stop());
                videoRef.current.srcObject = null;
            }
            return;
        }

        const startCamera = async () => {
            try {
                // SECURITY CHECK: browsers block mediaDevices on insecure HTTP (except localhost)
                if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Camera API unavailable (Insecure Context or Not Supported)");
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1280 }, // Lower resolution for stability
                        height: { ideal: 720 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setPermission(true);
                }
            } catch (err) {
                console.error("Camera Init Failed:", err);
                setPermission(false); // Triggers "Demo Mode" / Error UI
            }
        };

        // Slight delay to ensure DOM is ready
        const timeout = setTimeout(startCamera, 100);
        return () => clearTimeout(timeout);
    }, [step]);

    // Touch Handling (Only active in PLACED mode)
    const touchStartRef = useRef<{ x: number, y: number, iX: number, iY: number } | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        if (step !== "placed") return;
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY, iX: posX, iY: posY };
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (step !== "placed" || !touchStartRef.current) return;
        const t = e.touches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;

        setPosX(touchStartRef.current.iX + dx);
        // Vertical move (percent)
        const dYP = (dy / window.innerHeight) * 100 * -1;
        setPosY(Math.max(-20, Math.min(50, touchStartRef.current.iY + dYP)));
    };

    // --- Actions ---
    const handleConfirmCalibration = () => {
        setStep("scan");
    };

    const handlePlaceDoor = () => {
        setStep("placed");
        // Reset position to center for visibility guarantee
        setPosX(0);
        setPosY(0);
    };

    const handleReset = () => {
        // Full Reset
        setStep("calibrate");
        setScale(1.0);
        setWidthMod(0); setHeightMod(0);
        setIsOpen(false);
    };

    const handleCreateOrder = () => {
        // STRICT CHECK: Only allow order in 'placed' step
        if (step !== "placed") return;

        const newOrder: any = {
            id: `ord_${Date.now()}`,
            customerId: user?.id || "guest",
            status: "AR_SELECTED",
            estPrice: totalPrice,
            items: [{
                category: "중문",
                detail: doorType,
                glass: glassType,
                color: frameColor,
                width: calcWidth,
                height: calcHeight,
                quantity: 1
            }]
        };
        addOrder(newOrder);
        alert(`견적 저장 완료!\n${calcWidth}x${calcHeight}mm`);
        router.push("/shop");
    };

    if (!isMounted) return <div className="bg-slate-900 h-screen w-screen" />;

    return (
        <div className={styles.arRoot}>
            {/* STEP 1: SELECTION UI */}
            {step === "select" && (
                <div className="flex flex-col h-screen bg-slate-900 text-white overflow-y-auto safe-bottom">
                    <header className="p-6 pt-12 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
                        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowLeft size={24} /></button>
                        <h1 className="text-lg font-bold">AR 시공 시뮬레이션</h1>
                        <div className="w-10"></div>
                    </header>
                    <div className="flex-1 px-6 pb-32">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-black mb-2">우리 집에 딱 맞는<br />중문을 찾아보세요</h2>
                            <p className="text-slate-400 text-sm">거리 측정 캘리브레이션 기술 적용</p>
                        </div>

                        <div className="space-y-8 mt-4">
                            <section>
                                <label className="text-sm font-bold text-slate-400 mb-2 block">도어 종류</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["3연동", "원슬라이딩", "스윙", "여닫이", "파티션"] as DoorType[]).map(t => (
                                        <button key={t} onClick={() => setDoorType(t)} className={`p-4 rounded-xl font-bold border-2 transition-all ${doorType === t ? "border-indigo-500 bg-indigo-500/20 text-indigo-400" : "border-slate-800 text-slate-400"}`}>{t}</button>
                                    ))}
                                </div>
                            </section>
                            <section>
                                <label className="text-sm font-bold text-slate-400 mb-2 block">프레임 컬러</label>
                                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                    {(Object.keys(FRAME_COLORS) as FrameColor[]).map(c => (
                                        <button key={c} onClick={() => setFrameColor(c)} className="flex flex-col items-center gap-2 min-w-[60px]">
                                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${frameColor === c ? "border-indigo-500 ring-2 ring-indigo-500/50" : "border-slate-700"}`} style={{ backgroundColor: FRAME_COLORS[c] }}>
                                                {frameColor === c && <Check size={16} className={c === "화이트" || c === "샴페인골드" ? "text-black" : "text-white"} />}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">{c}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                            <section>
                                <label className="text-sm font-bold text-slate-400 mb-3 block">유리 디자인</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {(["투명", "브론즈", "워터큐브", "미스트"] as GlassType[]).map(g => (
                                        <button key={g} onClick={() => setGlassType(g)} className={`px-4 py-3 rounded-lg text-sm font-bold border transition-all whitespace-nowrap ${glassType === g ? "bg-white text-slate-900 border-white" : "bg-transparent text-slate-500 border-slate-700"}`}>{g}</button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950 safe-bottom">
                        <button onClick={() => setStep("calibrate")} className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                            <Camera size={24} /> 내 집에 적용하기
                        </button>
                    </div>
                </div>
            )}

            {/* AR CORE VIEW (Shared for Calibrate/Scan/Placed) */}
            {step !== "select" && (
                <>
                    {/* CAMERA LAYER */}
                    <div className={styles.cameraLayer}>
                        {permission === false ? (
                            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white p-6 text-center z-0">
                                <div>
                                    <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={48} />
                                    <p className="font-bold text-lg mb-2">카메라를 실행할 수 없습니다</p>
                                    <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                                        보안 문제로 카메라 접근이 차단되었습니다.<br />
                                        (IP 접속 시 브라우저가 카메라를 차단함)<br />
                                        <span className="text-indigo-400 font-bold mt-2 block">데모 모드(검은 배경)로 진행합니다.</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        )}
                    </div>

                    {/* 3D SCENE CONTAINER */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ perspective: "800px" }}>
                        <div className="absolute left-1/2 bottom-0 w-full max-w-[500px] transition-transform duration-100 ease-out origin-bottom"
                            style={{
                                bottom: `${posY}%`,
                                transform: `translate(calc(-50% + ${posX}px), 0) scale(${scale}) rotateX(${rotation.x}deg) rotateY(${-rotation.y}deg)`
                            }}>

                            {/* 1. CALIBRATION GHOST BOX (Strictly Before Scan) */}
                            {step === "calibrate" && (
                                <div className="flex flex-col items-center">
                                    <div className="border-4 border-red-500/80 bg-red-500/10 w-full h-[600px] flex items-center justify-center relative animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                                        <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
                                            기준 높이 2100mm
                                        </div>
                                        {/* Corners */}
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500"></div>
                                    </div>
                                    <div className="mt-4 bg-black/60 backdrop-blur px-4 py-2 rounded-lg text-white text-xs font-bold text-center">
                                        이 박스 높이를<br />실제 설치 위치 높이와 맞춰주세요
                                    </div>
                                </div>
                            )}

                            {/* 2. PLACEMENT & VERIFIED DOOR */}
                            {(step === "placed") && (
                                <div className="pointer-events-auto" onClick={() => setIsOpen(!isOpen)}>
                                    <div className="relative shadow-2xl drop-shadow-2xl">
                                        <DoorModel
                                            type={doorType}
                                            frameColor={frameColor}
                                            glassType={glassType}
                                            width={calcWidth}
                                            height={calcHeight}
                                            isOpen={isOpen}
                                        />

                                        {/* Interaction Hint */}
                                        {!isOpen && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse z-50">
                                                <span className="bg-black/40 text-white text-[10px] px-2 py-1 rounded-full border border-white/20 backdrop-blur">👆 터치 OPEN</span>
                                            </div>
                                        )}

                                        {/* Size Labels */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded font-bold">{calcWidth}mm</div>
                                        <div className="absolute top-1/2 -left-10 -translate-y-1/2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded font-bold -rotate-90">{calcHeight}mm</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TOUCH LAYER (Active in Placed Mode) */}
                    {step === "placed" && (
                        <div className="absolute inset-0 z-10"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={() => touchStartRef.current = null}
                        />
                    )}

                    {/* HUD / CONTROLS LAYER */}
                    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between safe-bottom">
                        {/* Top Bar */}
                        <div className="p-4 pt-12 flex justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                            <button onClick={() => step === "placed" ? handleReset() : setStep("select")} className="p-3 bg-white/20 text-white rounded-full backdrop-blur hover:bg-white/30 transition">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="bg-black/50 backdrop-blur px-4 py-1.5 rounded-full border border-white/20 text-white font-bold text-sm flex items-center gap-2">
                                {step === "calibrate" && <span className="text-red-400">📏 거리 기준점 잡기</span>}
                                {step === "scan" && <span className="text-yellow-400">🎯 설치 위치 조준</span>}
                                {step === "placed" && <span className="text-green-400">✅ 사이즈 & 위치 확정</span>}
                            </div>
                            <div className="w-10" />
                        </div>

                        {/* Center Reticle (Scan Mode Only) */}
                        {step === "scan" && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                                <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center box-border shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                                <div className="mt-6 bg-black/60 backdrop-blur text-white text-sm px-4 py-2 rounded-xl text-center font-bold">
                                    바닥 경계선에 십자선을 맞추세요
                                </div>
                            </div>
                        )}

                        {/* AI COACH OVERLAY (NEW) */}
                        {(step === "placed" || step === "scan") && (
                            <AICoachOverlay
                                analysis={aiAnalysis}
                                recommendations={recommendations}
                                onApplyRecommendation={handleApplyRecommendation}
                                onRequestConsult={handleRequestConsult}
                                onSaveQuote={handleSaveQuote}
                            />
                        )}

                        {/* Bottom Controls */}
                        <div className="p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-auto pt-16">

                            {/* CALIBRATION CONTROLS */}
                            {step === "calibrate" && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
                                    <div className="bg-slate-800/80 p-4 rounded-xl backdrop-blur border border-slate-700">
                                        <div className="flex justify-between text-white/70 text-xs uppercase font-bold mb-2">
                                            <span>Scale (거리 조절)</span>
                                            <span>{Math.round(scale * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0.5" max="1.5" step="0.01"
                                            value={scale} onChange={e => setScale(parseFloat(e.target.value))}
                                            className="w-full h-4 bg-slate-600 rounded-full appearance-none accent-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                    <button onClick={handleConfirmCalibration} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-900/30 active:scale-95 transition-all text-lg">
                                        기준 설정 완료
                                    </button>
                                </div>
                            )}

                            {/* SCAN CONTROLS */}
                            {step === "scan" && (
                                <div className="flex justify-center items-center gap-6 pb-8 animate-in zoom-in fade-in duration-300">

                                    {/* AI AUTO STYLE */}
                                    <button onClick={handleAIStyleMatch} disabled={isAnalyzing} className="flex flex-col items-center gap-2 group">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur transition-all ${isAnalyzing ? "bg-indigo-500 animate-pulse" : "bg-black/40 group-active:scale-95"}`}>
                                            {isAnalyzing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 className="text-white" size={24} />}
                                        </div>
                                        <span className="text-white text-xs font-bold shadow-black drop-shadow-md">AI Stylist</span>
                                    </button>

                                    {/* MANUAL PLACE */}
                                    <button onClick={handlePlaceDoor} className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_0_8px_rgba(255,255,255,0.2)] active:scale-90 transition-transform">
                                        <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white">
                                            <Camera className="text-white" size={36} />
                                        </div>
                                    </button>

                                    {/* Spacer for balance */}
                                    <div className="w-14"></div>
                                </div>
                            )}

                            {/* PLACED CONTROLS */}
                            {step === "placed" && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
                                    {/* Manual Size Controls */}
                                    <div className="bg-black/60 backdrop-blur rounded-xl p-4 flex flex-col gap-3 border border-white/10">
                                        <div className="flex items-center justify-between text-white text-sm font-bold">
                                            <span className="flex items-center gap-2"><ArrowLeft size={14} className="rotate-180" /> 가로 폭 ({calcWidth}mm)</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setWidthMod(p => p - 50)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition">-</button>
                                                <button onClick={() => setWidthMod(p => p + 50)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition">+</button>
                                            </div>
                                        </div>
                                        <div className="h-[1px] bg-white/10 w-full" />
                                        <div className="flex items-center justify-between text-white text-sm font-bold">
                                            <span className="flex items-center gap-2"><ArrowLeft size={14} className="-rotate-90" /> 세로 높이 ({calcHeight}mm)</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setHeightMod(p => p - 50)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition">-</button>
                                                <button onClick={() => setHeightMod(p => p + 50)} className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition">+</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={handleReset} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm shadow-lg active:scale-95 transition-transform">
                                            다시 촬영
                                        </button>
                                        <button onClick={handleCreateOrder} className="flex-[2] py-4 bg-white text-indigo-900 font-black rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 text-lg">
                                            <Check size={24} strokeWidth={3} />
                                            견적 저장
                                        </button>
                                    </div>
                                    <div className="text-center text-xs text-slate-400 font-medium">
                                        예상 견적가: {totalPrice.toLocaleString()}원
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ShopArPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-white bg-slate-900">AR 로딩중...</div>}>
            <ShopArContent />
        </Suspense>
    );
}
