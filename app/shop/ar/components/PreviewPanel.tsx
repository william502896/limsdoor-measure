"use client";

import React, { useRef, useEffect } from "react";
import { Camera, Upload, RotateCcw, ZoomIn, ZoomOut, Maximize, Minimize } from "lucide-react";

type PreviewPanelProps = {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    bgFile: File | null;
    setBgFile: (file: File | null) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    displayScale: number;
    onReset?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    className?: string;
    isMobile?: boolean; // To toggle fullscreen mode if needed
};

export default function PreviewPanel({
    canvasRef,
    bgFile,
    setBgFile,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    displayScale,
    onReset,
    onZoomIn,
    onZoomOut,
    className = "",
    isMobile = false,
}: PreviewPanelProps) {

    return (
        <div className={`relative bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col ${className}`}>
            {/* Header / Meta Info */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
                <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white text-xs font-bold rounded-full shadow-sm">
                    미리보기 {Math.round(displayScale * 100)}%
                </span>
            </div>

            {/* Toolbar (Right Top or Bottom) */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                    onClick={onReset}
                    className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-white transition-all"
                    title="4점 초기화"
                >
                    <RotateCcw size={18} />
                </button>
                {/* Zoom Controls (Mockup functionality for now or real if parent implements) */}
                {onZoomIn && (
                    <>
                        <button
                            onClick={onZoomIn}
                            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-white transition-all"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <button
                            onClick={onZoomOut}
                            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-white transition-all"
                        >
                            <ZoomOut size={18} />
                        </button>
                    </>
                )}
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative w-full h-full bg-[url('/grid-pattern.png')] bg-repeat flex items-center justify-center overflow-hidden touch-none select-none">
                {!bgFile ? (
                    <label
                        className="group flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-300"
                    >
                        <div className="flex gap-4">
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 group-hover:scale-110 transition-transform">
                                <Camera size={26} className="text-slate-500 group-hover:text-indigo-600" />
                            </div>
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 group-hover:scale-110 transition-transform delay-75">
                                <Upload size={26} className="text-slate-500 group-hover:text-indigo-600" />
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-bold text-slate-600 mb-1 group-hover:text-indigo-700">
                                현장 사진 업로드
                            </span>
                            <span className="text-xs text-slate-400">
                                촬영 또는 갤러리 선택
                            </span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setBgFile(e.target.files?.[0] ?? null)}
                            className="hidden"
                        />
                    </label>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center overflow-auto">
                        <canvas
                            ref={canvasRef}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            className="max-w-none shadow-2xl rounded-lg cursor-crosshair touch-none"
                            style={{
                                // Canvas specific styles can go here if needed
                            }}
                        />

                        {/* Re-upload overlay (Optional: tiny button to change photo) */}
                        <label className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-black/80 transition-all shadow-lg z-20">
                            <Camera size={14} />
                            사진 변경
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setBgFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                        </label>
                    </div>
                )}
            </div>

            {/* Guide Text */}
            {bgFile && (
                <div className="absolute bottom-4 right-4 z-0 pointer-events-none opacity-50 hidden md:block">
                    <div className="text-[10px] text-slate-500 bg-white/80 px-2 py-1 rounded-md shadow-sm border border-slate-200">
                        드래그하여 4점을 문틀에 맞추세요
                    </div>
                </div>
            )}
        </div>
    );
}
