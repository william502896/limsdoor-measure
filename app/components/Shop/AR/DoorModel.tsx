import React from "react";
import { DoorStructure, FrameColor, GlassType } from "@/app/lib/doorCatalog";

// --- Types ---
// "DoorType" in this component is essentially "DoorStructure"
// We alias it or use it directly.

interface DoorModelProps {
    type: DoorStructure | string; // Allow string to support legacy/mismatch safe fallback
    frameColor: FrameColor | string;
    glassType: GlassType | string;
    width: number; // width in mm (visual)
    height: number; // height in mm (visual)
    isOpen?: boolean; // New prop for simulation
}

// --- Style Maps ---
const FRAME_HEX: Record<string, string> = {
    "화이트": "#f3f4f6",
    "블랙": "#1f2937",
    "골드": "#d4af37", // Canonical Name
    "샴페인골드": "#d4af37", // Legacy Fallback
    "그레이": "#666666", // Added from Catalog
    "네이비": "#1e3a8a" // Legacy, keep just in case but usually not reachable
};

// Map Catalog Glass Types to styles. 
// Fallback to "투명" style for unknown types.
const GLASS_STYLES: Record<string, React.CSSProperties> = {
    "투명": { background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(0px)" },
    "브론즈": { background: "rgba(120, 80, 40, 0.3)", backdropFilter: "blur(0px)" },
    "다크그레이": { background: "rgba(30, 30, 30, 0.5)", backdropFilter: "blur(0px)" },
    "샤틴": { background: "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(4px)" },
    "아쿠아": {
        background: "rgba(200, 230, 255, 0.4)",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 2px, transparent 1px)",
        backgroundSize: "20px 20px",
        backdropFilter: "blur(4px)"
    },
    "미스트": { background: "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(12px)" },
    // Defaults for others
    "default": { background: "rgba(255, 255, 255, 0.3)", backdropFilter: "blur(2px)" }
};

export default function DoorModel({ type, frameColor, glassType, width, height, isOpen = false }: DoorModelProps) {
    const colorHex = FRAME_HEX[frameColor] || FRAME_HEX["블랙"];
    const glassStyle = GLASS_STYLES[glassType] || GLASS_STYLES["default"];


    // Common Transition
    const transitionStyle: React.CSSProperties = {
        transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)"
    };

    // Metallic Gradient for frames to look realistic
    const metallicGradient = `linear-gradient(45deg, ${colorHex} 0%, ${colorHex} 40%, rgba(255,255,255,0.4) 50%, ${colorHex} 60%, ${colorHex} 100%)`;
    const frameStyle: React.CSSProperties = {
        background: metallicGradient,
        boxShadow: "2px 2px 10px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.3)"
    };

    /**
     * 3-Panel Sliding Door (3연동)
     * - Top Rail
     * - 3 overlapping vertical panels
     */
    if (type === "3연동") {
        return (
            <div className="relative w-full h-full flex flex-col pointer-events-none">
                {/* Top Rail Box */}
                <div className="w-full h-[6%] relative z-20" style={frameStyle}>
                    {/* Rail Groves */}
                    <div className="absolute bottom-1 left-2 right-2 h-[2px] bg-black/20"></div>
                </div>

                {/* Panels Container */}
                <div className="flex-1 relative flex overflow-hidden">
                    {/* Side Frame Left */}
                    <div className="w-[5%] h-full z-10" style={frameStyle}></div>

                    {/* 3 Panels */}
                    <div className="flex-1 relative flex">
                        {/* We simulate 3 panels slightly overlapping. 
                             In a closed state, they cover the width evenly. 
                             Open state: All stack to the left (or right)
                         */}
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 flex flex-col"
                                style={{
                                    width: "38%", // > 33% for overlap
                                    zIndex: 3 - i, // First on top usually
                                    border: `1px solid rgba(0,0,0,0.2)`,
                                    transform: isOpen ? `translateX(-${i * 85}%)` : "none",
                                    ...transitionStyle,
                                    left: isOpen ? `${i * 5}%` : `${i * 31}%` // Dynamic left
                                }}
                            >
                                {/* Panel Frame */}
                                <div className="absolute inset-0 border-[12px]" style={{ borderColor: colorHex, ...frameStyle }}></div>
                                {/* Glass */}
                                <div className="absolute inset-[12px]" style={glassStyle}></div>
                                {/* Divider (Optional styling detail) */}
                                <div className="absolute top-1/2 left-0 right-0 h-[8px]" style={frameStyle}></div>
                            </div>
                        ))}
                    </div>

                    {/* Side Frame Right */}
                    <div className="w-[5%] h-full z-10" style={frameStyle}></div>
                </div>

                {/* Bottom Rail (Flat) */}
                <div className="w-full h-[1.5%]" style={{ background: "#e5e7eb", borderTop: "1px solid #ccc" }}></div>
            </div>
        );
    }

    /**
     * One Sliding Door (원슬라이딩)
     * - Minimalist frame
     * - Big glass area
     * - Top Rail (often mounted on wall/ceiling)
     */
    if (type === "원슬라이딩") {
        return (
            <div className="relative w-full h-full flex flex-col pointer-events-none">
                {/* Rail (Usually wider than door, but constrained to box here) */}
                <div className="w-full h-[4%] mb-1 rounded-full" style={frameStyle}></div>

                {/* Door Panel */}
                <div
                    className="flex-1 relative mx-auto w-[95%] border-[2px] shadow-2xl origin-left"
                    style={{
                        borderColor: colorHex,
                        transform: isOpen ? "translateX(90%)" : "none",
                        ...transitionStyle
                    }}
                >
                    {/* Slim Frame */}
                    <div className="absolute inset-0 border-[20px]" style={{ borderColor: colorHex, ...frameStyle }}>
                        {/* Inner Glass */}
                        <div className="w-full h-full" style={glassStyle}>
                            {/* Optional Grid Divider for specific design (Simple Version for now) */}
                            {/* <div className="w-full h-full border-2 border-dashed border-white/20"></div> */}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Swing Door (스윙도어)
     * - Handle
     * - Hinge
     */
    if (type === "스윙도어" || type === "스윙" || type === "여닫이") {
        return (
            <div className="relative w-full h-full pointer-events-none p-2" >
                {/* Outer Frame */}
                <div className="w-full h-full relative" style={{ border: `16px solid ${colorHex}`, ...frameStyle }}>
                    {/* Inner Sash (The moving part) */}
                    <div
                        className="absolute inset-0 border-[20px] origin-left"
                        style={{
                            borderColor: colorHex,
                            opacity: 0.9,
                            transform: isOpen ? "rotateY(-100deg)" : "none", // Open inwards/outwards
                            ...transitionStyle
                        }}
                    >
                        <div className="w-full h-full relative" style={glassStyle}>
                            {/* Bottom Plate (Common in Swing) */}
                            <div className="absolute bottom-0 left-0 right-0 h-[25%]" style={frameStyle}></div>

                            {/* Grid Pattern (Common) */}
                            <div className="absolute inset-0 flex">
                                <div className="flex-1 border-r-[8px]" style={{ borderColor: colorHex }}></div>
                                <div className="flex-1"></div>
                            </div>
                            <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1 border-b-[8px]" style={{ borderColor: colorHex }}></div>
                                <div className="flex-1"></div>
                            </div>
                        </div>
                        {/* Handle attached to Sash */}
                        <div
                            className="absolute top-1/2 right-[24px] w-[12px] h-[60px] rounded-full shadow-md z-30"
                            style={{ background: "#d1d5db", border: "1px solid #9ca3af" }}
                        >
                            <div className="absolute top-1/2 right-1 w-[40px] h-[8px] -translate-y-1/2 rounded-full" style={{ background: "#d1d5db" }}></div>
                        </div>
                    </div>


                    {/* Hinge Hint (Static on Frame) */}
                    <div className="absolute top-[10%] left-0 w-[4px] h-[30px] bg-slate-400"></div>
                    <div className="absolute bottom-[10%] left-0 w-[4px] h-[30px] bg-slate-400"></div>
                </div>
            </div>
        )
    }

    /**
     * Partition (파티션)
     * - Fixed grid
     */
    if (type === "파티션") {
        return (
            <div className="relative w-full h-full pointer-events-none p-4">
                <div className="w-full h-full border-[10px]" style={{ borderColor: colorHex, ...frameStyle }}>
                    <div className="w-full h-full flex" style={glassStyle}>
                        {/* Simple 2-window grid */}
                        <div className="w-full h-[60%] border-b-[8px]" style={{ borderColor: colorHex }}></div>
                    </div>
                </div>
            </div>
        )
    }

    return null;
}
