"use client";

import React, { useMemo, useState } from "react";
import { CAL_PRESETS, computeMmPerPx, round1 } from "../../../lib/ar/calibration";

type Pt = { x: number; y: number };

function dist(a: Pt, b: Pt) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export default function CalibrationPanel({
    previewW,
    previewH,
    onConfirmMmPerPx,
}: {
    previewW: number;
    previewH: number;
    onConfirmMmPerPx: (mmPerPx: number) => void;
}) {
    const [presetId, setPresetId] = useState(CAL_PRESETS[0].id);
    const preset = useMemo(() => CAL_PRESETS.find((p) => p.id === presetId)!, [presetId]);

    // 기준선 2점(뷰 좌표 기준)
    const [a, setA] = useState<Pt>({ x: previewW * 0.35, y: previewH * 0.65 });
    const [b, setB] = useState<Pt>({ x: previewW * 0.65, y: previewH * 0.65 });
    const [drag, setDrag] = useState<"A" | "B" | null>(null);

    const pxLen = dist(a, b);
    const mmPerPx = computeMmPerPx(preset.mm, pxLen);

    const onDown = (who: "A" | "B") => (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDrag(who);
    };

    const onMove = (e: React.PointerEvent) => {
        if (!drag) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const p = {
            x: Math.max(0, Math.min(previewW, x)),
            y: Math.max(0, Math.min(previewH, y)),
        };
        if (drag === "A") setA(p);
        if (drag === "B") setB(p);
    };

    const onUp = () => setDrag(null);

    return (
        <div style={{ width: "100%", maxWidth: 520 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <select value={presetId} onChange={(e) => setPresetId(e.target.value as any)}>
                    {CAL_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label} ({p.mm}mm)
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => {
                        if (!mmPerPx) return alert("기준선이 너무 짧습니다. 점을 더 벌려주세요.");
                        onConfirmMmPerPx(mmPerPx);
                    }}
                    style={{ padding: "6px 12px", borderRadius: 8, background: "#4f46e5", color: "#fff", fontWeight: "bold" }}
                >
                    스케일 확정
                </button>

                <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                    px: {Math.round(pxLen)} / mmPerPx: {mmPerPx ? round1(mmPerPx) : "-"}
                </div>
            </div>

            {/* 드래그 영역(미리보기 위에 오버레이로 올릴 것) */}
            <div
                style={{
                    position: "relative",
                    width: previewW,
                    height: previewH,
                    borderRadius: 12,
                    outline: "1px dashed rgba(255,255,255,0.35)",
                    touchAction: "none",
                }}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
            >
                {/* 기준선 */}
                <svg
                    width={previewW}
                    height={previewH}
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,0,0.9)" strokeWidth={3} />
                </svg>

                {/* 점 A */}
                <div
                    onPointerDown={onDown("A")}
                    style={{
                        position: "absolute",
                        left: a.x - 14,
                        top: a.y - 14,
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: "rgba(255,255,0,0.9)",
                        boxShadow: "0 0 0 4px rgba(0,0,0,0.25)",
                        cursor: "grab",
                    }}
                />
                {/* 점 B */}
                <div
                    onPointerDown={onDown("B")}
                    style={{
                        position: "absolute",
                        left: b.x - 14,
                        top: b.y - 14,
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: "rgba(255,255,0,0.9)",
                        boxShadow: "0 0 0 4px rgba(0,0,0,0.25)",
                        cursor: "grab",
                    }}
                />
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                ✅ 기준물(카드/A4/100mm)을 화면에 보이게 두고,<br />
                노란 점 2개를 기준물의 양 끝에 정확히 맞춘 뒤 <b>스케일 확정</b>을 누르세요.
            </div>
        </div>
    );
}
