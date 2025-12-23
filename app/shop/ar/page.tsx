"use client";

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ArrowLeft, Check, Info, X } from "lucide-react";
import { useGlobalStore } from "../../lib/store-context";

// --- Types ---
type FrameColor = "화이트" | "블랙" | "샴페인골드" | "네이비";
type GlassType = "투명" | "브론즈" | "워터큐브" | "미스트";
type DoorType = "원슬라이딩" | "3연동" | "스윙" | "여닫이";

const FRAME_COLORS: Record<FrameColor, string> = {
    "화이트": "#ffffff",
    "블랙": "#1f2937",
    "샴페인골드": "#d4af37",
    "네이비": "#1e3a8a"
};

const GLASS_STYLES: Record<GlassType, React.CSSProperties> = {
    "투명": { background: "rgba(255, 255, 255, 0.1)" }, // Clear
    "브론즈": { background: "rgba(120, 80, 40, 0.4)" }, // Bronze tint
    "워터큐브": { background: "rgba(200, 230, 255, 0.5)", backdropFilter: "blur(4px)" },
    "미스트": { background: "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(8px)" }
};

export default function ShopArPage() {
    const router = useRouter();
    const { login, addOrder, user } = useGlobalStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [permission, setPermission] = useState<boolean | null>(null);

    // Config State
    const [doorType, setDoorType] = useState<DoorType>("3연동");
    const [frameColor, setFrameColor] = useState<FrameColor>("화이트");
    const [glassType, setGlassType] = useState<GlassType>("투명");

    // Door Transform (Simulate AR placement)
    const [scale, setScale] = useState(1);
    const [posX, setPosX] = useState(0);

    // Current Price Estimate
    const basePrice = doorType === "원슬라이딩" ? 590000 : 690000;
    const optionPrice = (glassType === "투명" ? 0 : 50000) + (frameColor === "화이트" ? 0 : 30000);
    const totalPrice = basePrice + optionPrice;

    useEffect(() => {
        // Start Camera
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setPermission(true);
                }
            } catch (err) {
                console.error("Camera Error", err);
                setPermission(false);
            }
        };
        startCamera();

        return () => {
            // Cleanup stream
            // eslint-disable-next-line react-hooks/exhaustive-deps
            const v = videoRef.current;
            if (v && v.srcObject) {
                const tracks = (v.srcObject as MediaStream).getTracks();
                tracks.forEach(t => t.stop());
            }
        };
    }, []);



    const handleCreateOrder = () => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        const newOrder: any = { // Using any temporarily to bypass strict typing if Store types aren't fully exported or mismatched, but ideally should be Order
            id: `ord_${Date.now()}`,
            customerId: user.id || "guest", // In real app, this comes from auth
            tenantId: user.currentTenantId || "t_head",
            status: "AR_SELECTED",
            createdAt: new Date().toISOString(),
            estPrice: totalPrice,
            finalPrice: 0,
            deposit: 0,
            balance: 0,
            paymentStatus: "Unpaid",
            items: [
                {
                    category: "중문",
                    detail: doorType,
                    location: "현관",
                    glass: glassType,
                    color: frameColor,
                    width: 1250, // Mocked AR measurement
                    height: 2100,
                    quantity: 1,
                    arScene: {
                        doorType,
                        frameColor,
                        glassType,
                        openDirection: "Right",
                        width: 1250,
                        height: 2100
                    }
                }
            ],
            measureFiles: [],
            installFiles: [],
            asHistory: []
        };

        addOrder(newOrder);
        alert(`견적 저장 완료!\n\n마이페이지에서 확인하실 수 있습니다.\n(예상가: ${totalPrice.toLocaleString()}원)`);
        router.push("/shop");
    };

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden">
            {/* 1. Camera Layer */}
            {permission === false ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <p>카메라 권한이 필요합니다.</p>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* 2. AR Overlay Layer (Simulated Door) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                    className="relative transition-all duration-300"
                    style={{
                        width: "80%",
                        height: "70%",
                        transform: `scale(${scale}) translateX(${posX}px)`,
                        border: `12px solid ${FRAME_COLORS[frameColor]}`,
                        ...GLASS_STYLES[glassType],
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                    }}
                >
                    {/* Door Handles / Lines depending on Type */}
                    {doorType === "3연동" && (
                        <div className="flex h-full w-full">
                            <div className="flex-1 border-r border-slate-400/30"></div>
                            <div className="flex-1 border-r border-slate-400/30"></div>
                            <div className="flex-1"></div>
                        </div>
                    )}
                    {doorType === "원슬라이딩" && (
                        <div className="absolute top-1/2 left-4 w-2 h-20 bg-slate-400/50 rounded-full"></div>
                    )}

                    {/* Virtual Dimensions (Fake AR Analysis) */}
                    <div className="absolute -top-10 left-0 w-full text-center">
                        <span className="bg-black/60 px-2 py-1 rounded text-xs font-bold text-white">
                            자동 인식: 1250mm
                        </span>
                    </div>
                    <div className="absolute top-0 -right-12 h-full flex items-center">
                        <span className="bg-black/60 px-2 py-1 rounded text-xs font-bold text-white -rotate-90">
                            2100mm
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. UI Layer */}
            <div className="absolute inset-0 flex flex-col justify-between z-20 pointer-events-none">
                {/* Top Bar */}
                <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                    <button onClick={() => router.back()} className="p-2 bg-white/10 rounded-full backdrop-blur">
                        <ArrowLeft />
                    </button>
                    <div className="text-sm font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur">
                        👀 가상 시공 체험 중
                    </div>
                    <button className="p-2 bg-white/10 rounded-full backdrop-blur">
                        <Info />
                    </button>
                </div>

                {/* Bottom Control Panel */}
                <div className="bg-white text-slate-900 rounded-t-3xl shadow-2xl pb-8 animate-slide-up pointer-events-auto">
                    {/* Config Tabs (Scrollable) */}
                    <div className="flex space-x-6 overflow-x-auto p-4 border-b border-slate-100 no-scrollbar">
                        <div className="flex flex-col gap-2 min-w-max">
                            <span className="text-xs font-bold text-slate-400">도어 종류</span>
                            <div className="flex gap-2">
                                {(["3연동", "원슬라이딩", "스윙", "여닫이"] as DoorType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setDoorType(t)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${doorType === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-6 overflow-x-auto p-4 no-scrollbar">
                        {/* Frame Color */}
                        <div className="flex flex-col gap-2 min-w-max">
                            <span className="text-xs font-bold text-slate-400">프레임 컬러</span>
                            <div className="flex gap-3">
                                {(Object.keys(FRAME_COLORS) as FrameColor[]).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFrameColor(c)}
                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${frameColor === c ? "border-indigo-500 scale-110" : "border-slate-200"
                                            }`}
                                        style={{ backgroundColor: FRAME_COLORS[c] }}
                                    >
                                        {frameColor === c && <Check size={16} className={c === "화이트" || c === "샴페인골드" ? "text-black" : "text-white"} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Glass Type */}
                        <div className="flex flex-col gap-2 min-w-max">
                            <span className="text-xs font-bold text-slate-400">유리 디자인</span>
                            <div className="flex gap-2">
                                {(["투명", "브론즈", "워터큐브", "미스트"] as GlassType[]).map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setGlassType(g)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${glassType === g ? "bg-slate-100 border-slate-900 text-slate-900" : "bg-white border-slate-200 text-slate-400"
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="px-6 pt-2 select-none">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-xs text-slate-500 font-bold">예상 견적가 (시공비 포함)</div>
                                <div className="text-2xl font-black text-indigo-600">
                                    {totalPrice.toLocaleString()}원
                                </div>
                            </div>
                            <button
                                onClick={handleCreateOrder}
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-transform flex items-center gap-2"
                            >
                                <Camera size={18} />
                                견적 저장하기
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">
                            * 정확한 견적은 방문 실측 후 확정됩니다. AR 이미지는 참고용입니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
