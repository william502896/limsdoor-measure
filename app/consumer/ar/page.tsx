"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, Move, Send, Upload } from "lucide-react";

// ===============================================
// Configuration
// ===============================================
const DOORS = [
    { id: "3t_manual", name: "3연동 도어", src: "/doors/3t_black_clear.png" },
    { id: "1w_sliding", name: "원슬라이딩", src: "/doors/oneslide_white_satin.png" },
];

type Step = "UPLOAD" | "EDIT" | "SUBMIT" | "SUCCESS";

export default function ConsumerPreviewPage() {
    const router = useRouter();

    // Workflow State
    const [step, setStep] = useState<Step>("UPLOAD");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    // Edit State
    const [selectedDoorId, setSelectedDoorId] = useState(DOORS[0].id);
    const [pos, setPos] = useState({ x: 0, y: 0 }); // percent or px? Let's use % for easier center
    // Let's use pixel offset from center for better drag feel
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1.0);

    // Submit State
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for Drag
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startOffsetRef = useRef({ x: 0, y: 0 });

    const selectedDoor = DOORS.find(d => d.id === selectedDoorId) || DOORS[0];

    // ===============================================
    // Handlers
    // ===============================================

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setPhotoUrl(url);
            setStep("EDIT");
            // Reset position
            setOffset({ x: 0, y: 0 });
            setScale(1.0);
        }
    }

    // --- Drag Logic (Mouse + Touch) ---
    function onPointerDown(e: React.PointerEvent) {
        if (step !== "EDIT") return;
        isDraggingRef.current = true;
        startPosRef.current = { x: e.clientX, y: e.clientY };
        startOffsetRef.current = { ...offset };
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: React.PointerEvent) {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        setOffset({
            x: startOffsetRef.current.x + dx,
            y: startOffsetRef.current.y + dy
        });
    }

    function onPointerUp(e: React.PointerEvent) {
        isDraggingRef.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    }

    async function handleSubmit() {
        if (!customerName || !customerPhone) return alert("이름과 연락처를 입력해주세요.");

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/measurements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    created_by_role: "CONSUMER",
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    address_source: "PREVIEW_APP",
                    address_text: "이미지 합성 상담 요청",
                    status: "SUBMITTED",
                    memo: `[앱 견적 요청] 선택도어: ${selectedDoor.name}`
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "전송 실패");
            setStep("SUCCESS");
        } catch (err: any) {
            alert("전송 실패: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    // ===============================================
    // UI Renders
    // ===============================================

    // 1. UPLOAD VIEW
    if (step === "UPLOAD") {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">우리집 중문 미리보기</h1>
                <p className="text-zinc-400 mb-8 whitespace-pre-wrap">
                    설치하고 싶은 현관 사진을 찍어주세요.{"\n"}
                    AI 없이도 가장 정확하게 확인할 수 있습니다.
                </p>

                <label className="relative flex flex-col items-center justify-center w-full max-w-sm aspect-[3/4] rounded-3xl bg-zinc-900 border-2 border-dashed border-zinc-700 cursor-pointer active:scale-95 transition-transform overflow-hidden group">
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />

                    <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />

                    <div className="z-10 bg-zinc-800 p-6 rounded-full mb-4 shadow-xl">
                        <Camera className="w-10 h-10 text-blue-400" />
                    </div>
                    <span className="z-10 text-lg font-bold text-white">사진 촬영 / 앨범 선택</span>
                    <span className="z-10 text-sm text-zinc-500 mt-2">터치하여 시작하기</span>
                </label>
            </div>
        );
    }

    // 2. SUCCESS VIEW
    if (step === "SUCCESS") {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <Send className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">상담 요청이 접수되었습니다!</h2>
                <p className="text-zinc-400 mb-8">
                    담당자가 확인 후 빠르게 연락드리겠습니다.
                </p>
                <div className="grid gap-3 w-full max-w-xs">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-zinc-800 rounded-xl text-white font-bold"
                    >
                        처음으로 돌아가기
                    </button>
                    {/* TODO: Link to website or close */}
                </div>
            </div>
        );
    }

    // 3. EDIT / SUBMIT VIEW
    // (Submit is an overlay on Edit)
    return (
        <div className="fixed inset-0 bg-black overflow-hidden flex flex-col">
            {/* --- Header --- */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <button
                    onClick={() => setStep("UPLOAD")}
                    className="pointer-events-auto p-2 bg-black/40 backdrop-blur-md rounded-full text-white/90 hover:bg-white/20 transition"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="pointer-events-auto px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs font-semibold text-white/80 border border-white/10">
                    {step === "SUBMIT" ? "정보 입력" : "미리보기 편집"}
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* --- Canvas Area --- */}
            <div
                ref={containerRef}
                className="relative flex-1 bg-zinc-900 overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{ touchAction: "none" }}
            >
                {/* User Photo */}
                {photoUrl && (
                    <img
                        src={photoUrl}
                        alt="Background"
                        className="absolute w-full h-full object-cover pointer-events-none select-none"
                    />
                )}

                {/* Dark Overlay for focus (optional, maybe too dark) */}
                {/* <div className="absolute inset-0 bg-black/20 pointer-events-none" /> */}

                {/* Door Overlay */}
                <div
                    className="absolute top-1/2 left-1/2 w-64 origin-center cursor-move"
                    style={{
                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        touchAction: "none"
                    }}
                >
                    <img
                        src={selectedDoor.src}
                        alt="Door"
                        className="w-full h-auto drop-shadow-2xl select-none dragging-none"
                        style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }}
                    />

                    {/* Guide Handle (Visual only) */}
                    {step === "EDIT" && (
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-80 pointer-events-none">
                            <Move className="text-white w-6 h-6 mb-1 drop-shadow-md" />
                            <span className="text-[10px] text-white font-medium bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">드래그하여 이동</span>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Controls Footer (Edit Mode) --- */}
            {step === "EDIT" && (
                <div className="bg-zinc-900 border-t border-zinc-800 p-4 pb-8 space-y-4 shadow-2xl z-40">
                    {/* Size Slider */}
                    <div className="flex items-center gap-4 px-2">
                        <span className="text-xs font-medium text-zinc-400 w-8">크기</span>
                        <input
                            type="range"
                            min={0.5}
                            max={2.0}
                            step={0.01}
                            value={scale}
                            onChange={(e) => setScale(Number(e.target.value))}
                            className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    {/* Door Selector */}
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {DOORS.map((door) => (
                            <button
                                key={door.id}
                                onClick={() => setSelectedDoorId(door.id)}
                                className={`
                                    flex-shrink-0 relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all
                                    ${selectedDoorId === door.id ? "border-blue-500 ring-2 ring-blue-500/30" : "border-zinc-700 opacity-60"}
                                `}
                            >
                                <img src={door.src} className="w-full h-full object-contain bg-zinc-800 p-2" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center py-1 truncate">
                                    {door.name}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => setStep("SUBMIT")}
                        className="w-full py-4 text-white font-bold text-lg rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition shadow-lg shadow-blue-900/20"
                    >
                        상담 및 견적 요청하기
                    </button>
                </div>
            )}

            {/* --- Submit Overlay (Modal-ish) --- */}
            {step === "SUBMIT" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl slide-up-anim">
                        <h3 className="text-xl font-bold text-white mb-2">거의 다 되었습니다!</h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            연락처를 남겨주시면 담당자가 합성된 예상 모습과 함께 자세한 견적 상담을 도와드립니다.
                        </p>

                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">성함</label>
                                <input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="예: 홍길동"
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">연락처</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="010-0000-0000"
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep("EDIT")}
                                className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50"
                            >
                                {isSubmitting ? "전송 중..." : "상담 요청 완료"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
