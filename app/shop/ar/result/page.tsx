"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, LayoutGrid, Palette, Sliders, Settings } from "lucide-react";
import { warpImage } from "../lib/compose";
import { generateDoorPngDataUrl } from "../lib/doorGenerator";
import { detectFitMode } from "../lib/coordUtils";
import {
    DoorConfig, DoorStructure, FrameColor, GlassType, DesignType
} from "../types";
import {
    DOOR_STRUCTURES as ALL_STRUCTURES,
    FRAME_COLORS as ALL_FRAMES,
    GLASS_TYPES as ALL_GLASSES,
    DOOR_DESIGNS as ALL_DESIGNS
} from "@/app/lib/doorCatalog";

// Option Lists (Mapped from Catalog)
const STRUCTURES = ALL_STRUCTURES.map(s => ({ id: s, label: s }));
const FRAMES = ALL_FRAMES.map(f => ({
    id: f,
    label: f,
    color: f === "화이트" ? "#f0f0f0" : f === "블랙" ? "#111" : f === "그레이" ? "#666" : "#d4af37"
}));
const GLASSES = ALL_GLASSES.map(g => ({ id: g, label: g }));
const DESIGNS = ALL_DESIGNS.map(d => ({ id: d, label: d }));


export default function ArResultPage() {
    const router = useRouter();
    // Base State
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [quad, setQuad] = useState<{ x: number, y: number }[]>([]);

    // Config State
    const [config, setConfig] = useState<DoorConfig>({
        structure: "원슬라이딩",
        frameColor: "블랙",
        glassType: "투명",
        designType: "유럽형 통유리"
    });

    // UI State
    const [activeTab, setActiveTab] = useState<"structure" | "frame" | "glass" | "design">("structure");
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isCompositing, setIsCompositing] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null); // Container for robust sizing
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Initial Load (Robust)
    useEffect(() => {
        try {
            // Try both keys (User requested flow vs Existing flow)
            const keys = ["limsdoor_consumer_ar_capture_v1", "limsdoor_ar_session_v1"];
            let found = null;
            for (const k of keys) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    found = JSON.parse(raw);
                    break;
                }
            }

            if (found) {
                setImgUrl(found.imageDataUrl || found.captureDataUrl); // Handle both field names
                setQuad(found.quad);
            }
        } catch (e) {
            console.error("Failed to load AR session", e);
        }
    }, []);

    // Load Base Image
    useEffect(() => {
        if (imgUrl) {
            const img = new Image();
            img.src = imgUrl;
            img.onload = () => { imgRef.current = img; drawPreview(); };
        }
    }, [imgUrl]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => drawPreview();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Re-Draw on Config Change
    useEffect(() => {
        drawPreview();
    }, [config, quad]);


    const drawPreview = async () => {
        const canvas = canvasRef.current;
        const container = previewRef.current;
        const baseImg = imgRef.current;
        if (!canvas || !baseImg || !container) return;

        // 1. Sync Canvas to Container Size
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 2. Draw Background
        const imgW = baseImg.naturalWidth;
        const imgH = baseImg.naturalHeight;
        const fit = detectFitMode(w, h, imgW, imgH);
        const scaleX = w / imgW;
        const scaleY = h / imgH;
        const scale = fit === "contain" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
        const displayedW = imgW * scale;
        const displayedH = imgH * scale;
        const drawX = (w - displayedW) / 2;
        const drawY = (h - displayedH) / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(baseImg, drawX, drawY, displayedW, displayedH);

        // 3. Generate Door Overlay (Fallback enabled)
        // Check valid quad
        if (!quad || quad.length !== 4) return;

        // Create Temp Canvas for Door Texture
        const TEX_W = 600;
        const TEX_H = 1200;
        const doorCanvas = document.createElement("canvas");
        doorCanvas.width = TEX_W;
        doorCanvas.height = TEX_H;
        const dCtx = doorCanvas.getContext("2d");
        if (!dCtx) return;

        // Draw Vector Fallback directly (No await needed for basic Vector)
        drawFallbackDoor(dCtx, 0, 0, TEX_W, TEX_H, {
            frameColor: config.frameColor,
            glass: config.glassType,
            design: config.designType
        });

        // 4. Warp
        // Image Pixel Coords
        const p = quad.map(pt => ({
            x: drawX + (pt.x * imgW) * scale,
            y: drawY + (pt.y * imgH) * scale
        }));

        // Warp the generated door texture
        warpImage(ctx, doorCanvas, p);
    };

    /**
     * PNG 없이도 무조건 그려지는 벡터/그라데이션 도어 (Fallback)
     */
    function drawFallbackDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opt: any) {
        // Frame
        ctx.save();
        const lw = Math.max(6, w * 0.04); // Frame width
        ctx.lineWidth = lw;
        ctx.strokeStyle = opt.frameColor === "골드" ? "rgba(212,175,55,1)"
            : opt.frameColor === "그레이" ? "rgba(80,80,80,1)"
                : opt.frameColor === "블랙" ? "rgba(20,20,20,1)"
                    : "rgba(240,240,240,1)"; // White
        ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);

        // Glass
        let glassColor = "rgba(200,225,255,0.15)"; // Default clear
        if (opt.glass?.includes("샤틴")) glassColor = "rgba(255,255,255,0.35)";
        if (opt.glass?.includes("브론즈")) glassColor = "rgba(120,80,40,0.25)";
        if (opt.glass?.includes("다크")) glassColor = "rgba(30,30,30,0.4)";
        if (opt.glass?.includes("아쿠아")) glassColor = "rgba(0,180,220,0.2)";

        ctx.fillStyle = glassColor;
        ctx.fillRect(x + lw, y + lw, w - lw * 2, h - lw * 2);

        // Design (Grid/Divider)
        if (opt.design === "격자디자인" || opt.design === "분할") {
            ctx.strokeStyle = opt.frameColor === "블랙" ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.7)";
            ctx.lineWidth = lw * 0.4;

            // Simple Grid 2x3
            const cw = w / 3;
            const ch = h / 4;
            ctx.beginPath();
            for (let i = 1; i < 3; i++) {
                ctx.moveTo(x + cw * i, y);
                ctx.lineTo(x + cw * i, y + h);
            }
            for (let i = 1; i < 4; i++) {
                ctx.moveTo(x, y + ch * i);
                ctx.lineTo(x + w, y + ch * i);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    const handleSaveOpen = async () => {
        setIsCompositing(true);
        // Create Full Res Composite for Modal
        const baseImg = imgRef.current;
        if (!baseImg) return;

        const canvas = document.createElement("canvas");
        canvas.width = baseImg.naturalWidth;
        canvas.height = baseImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw Base
        ctx.drawImage(baseImg, 0, 0);

        // Generate Door (High Res matched to quad size approx?)
        // Calculate BBox size in px
        // Quad is normalized 0-1.
        const qx_min = Math.min(...quad.map(p => p.x));
        const qx_max = Math.max(...quad.map(p => p.x));
        const qy_min = Math.min(...quad.map(p => p.y));
        const qy_max = Math.max(...quad.map(p => p.y));
        const qw = (qx_max - qx_min) * baseImg.naturalWidth;
        const qh = (qy_max - qy_min) * baseImg.naturalHeight;

        const doorDataUrl = await generateDoorPngDataUrl(config, qw, qh); // Generate matched resolution
        const doorImg = new Image();
        doorImg.src = doorDataUrl;
        await new Promise(r => doorImg.onload = r);

        // Warp
        const p = quad.map(pt => ({
            x: pt.x * baseImg.naturalWidth,
            y: pt.y * baseImg.naturalHeight
        }));
        warpImage(ctx, doorImg, p);

        // Open Modal
        const finalUrl = canvas.toDataURL("image/jpeg", 0.9);
        // We need to pass this to a modal state or just use a ref
        const modalImg = document.getElementById("result-modal-img") as HTMLImageElement;
        if (modalImg) modalImg.src = finalUrl;

        setShowModal(true);
        setIsCompositing(false);
    };

    const downloadResult = () => {
        const modalImg = document.getElementById("result-modal-img") as HTMLImageElement;
        if (modalImg) {
            const a = document.createElement("a");
            a.href = modalImg.src;
            a.download = `limsdoor_complete_${Date.now()}.jpg`;
            a.click();
        }
    };

    return (
        <div className="relative w-full h-full bg-black flex flex-col font-sans">
            {/* Canvas Area */}
            <div ref={previewRef} className="flex-1 relative overflow-hidden bg-slate-900">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-4 left-4 p-2 bg-black/40 rounded-full text-white backdrop-blur outline-none"
                >
                    <ArrowLeft />
                </button>
            </div>

            {/* Controls Layer */}
            <div className={`
                bg-white rounded-t-2xl shadow-2xl transition-all duration-300 z-10 flex flex-col
                ${isMenuOpen ? "h-[45%]" : "h-20"}
            `}>
                {/* Drag Handle / Toggle */}
                <div
                    className="w-full h-8 flex items-center justify-center cursor-pointer active:bg-gray-50 rounded-t-2xl"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>

                {isMenuOpen && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Tab Bar */}
                        <div className="flex border-b border-gray-100 px-2 overflow-x-auto scrollbar-hide">
                            <TabBtn active={activeTab === "structure"} onClick={() => setActiveTab("structure")} icon={LayoutGrid} label="형태" />
                            <TabBtn active={activeTab === "frame"} onClick={() => setActiveTab("frame")} icon={Palette} label="색상" />
                            <TabBtn active={activeTab === "glass"} onClick={() => setActiveTab("glass")} icon={Sliders} label="유리" />
                            <TabBtn active={activeTab === "design"} onClick={() => setActiveTab("design")} icon={LayoutGrid} label="디자인" />
                        </div>

                        {/* Options Grid */}
                        <div className="flex-1 overflow-y-auto p-4 content-start pb-20">
                            {activeTab === "structure" && <OptionGrid items={STRUCTURES} current={config.structure} onSelect={v => setConfig({ ...config, structure: v as any })} />}

                            {activeTab === "frame" && (
                                <div className="grid grid-cols-4 gap-3">
                                    {FRAMES.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setConfig({ ...config, frameColor: f.id })}
                                            className={`
                                                flex flex-col items-center gap-2 p-2 rounded-xl border transition-all
                                                ${config.frameColor === f.id ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"}
                                            `}
                                        >
                                            <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: f.color }} />
                                            <span className="text-xs font-medium text-gray-700">{f.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTab === "glass" && <OptionGrid items={GLASSES} current={config.glassType} onSelect={v => setConfig({ ...config, glassType: v as any })} />}

                            {activeTab === "design" && <OptionGrid items={DESIGNS} current={config.designType} onSelect={v => setConfig({ ...config, designType: v as any })} />}
                        </div>
                    </div>
                )}

                {/* Fixed Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white/95 backdrop-blur pb-6 flex gap-3">
                    <button
                        onClick={() => router.replace("/shop/ar")}
                        className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                        <RotateCcw size={18} /> 촬영 다시
                    </button>
                    <button
                        onClick={handleSaveOpen}
                        className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition"
                    >
                        {isCompositing ? "합성 중..." : <><Check size={18} /> 합성 보기</>}
                    </button>
                </div>
            </div>

            {/* Result Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">합성 결과</h3>
                            <button onClick={() => setShowModal(false)} className="px-3 py-1 text-sm font-bold border border-gray-300 rounded-lg">닫기</button>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-100 p-2">
                            <img id="result-modal-img" className="w-full h-auto rounded-lg shadow-sm" />
                        </div>
                        <div className="p-4 border-t bg-gray-50">
                            <button
                                onClick={downloadResult}
                                className="w-full py-3 bg-black text-white font-bold rounded-xl shadow-lg active:scale-95 transition"
                            >
                                앨범에 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
                ${active ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"}
            `}
        >
            <Icon size={16} />
            {label}
        </button>
    );
}

function OptionGrid({ items, current, onSelect }: any) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {items.map((item: any) => (
                <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={`
                        py-3 px-2 rounded-xl text-sm font-medium border transition-all truncate
                        ${current === item.id ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}
                    `}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
