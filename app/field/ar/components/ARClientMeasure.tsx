"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { isInAppBrowser, startCamera, stopStream } from "../../../lib/ar/utils";
import { loadOpenCV } from "../../../lib/ar/opencvDetect";
import { XCircle } from "lucide-react";
import { detectDoorQuadFromCanvas, emaQuad, quadWH, Quad, Pt } from "../../../lib/ar/quadDetect";
import CalibrationPanel from "./CalibrationPanel"; // Import new component
import { round1 } from "../../../lib/ar/calibration"; // Import shared util

const RESULT_KEY = "fieldx_measure_ar_result_v1";

type CornerKey = "tl" | "tr" | "br" | "bl";

const DRAG_HIT_RADIUS = 26; // 손가락 반경(픽셀)
const MIN_QUAD_SIZE_PX = 40; // 너무 찌그러지는 것 방지(최소 변 길이)

// (A) 결과 전송 함수
function emitMeasureResult(payload: {
    quad: Quad;
    widthPx: number;
    heightPx: number;
    widthMm?: number;
    heightMm?: number;
    mmPerPx?: number;
    captureDataUrl?: string;
}) {
    // 1) 로컬 저장
    try {
        localStorage.setItem(RESULT_KEY, JSON.stringify(payload));
    } catch { }

    // 2) opener / parent로 전달
    try {
        window.opener?.postMessage({ type: "LIMSDOOR_AR_MEASURE", payload }, "*");
    } catch { }
    try {
        window.parent?.postMessage({ type: "LIMSDOOR_AR_MEASURE", payload }, "*");
    } catch { }

    // 3) field/new 로 이동
    const q = new URLSearchParams();
    q.set("wPx", String(payload.widthPx));
    q.set("hPx", String(payload.heightPx));
    if (payload.widthMm != null) q.set("wMm", String(payload.widthMm));
    if (payload.heightMm != null) q.set("hMm", String(payload.heightMm));
    if (payload.mmPerPx != null) q.set("mmPerPx", String(payload.mmPerPx));
    q.set("src", "ar");
    window.location.href = `/field/new?${q.toString()}`;
}

type Mode = "CALIBRATE" | "AUTO_DETECT" | "CONFIRMED";

export default function ARClientMeasure() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null);

    const [err, setErr] = useState("");
    const [ready, setReady] = useState(false);
    const [cvReady, setCvReady] = useState(false);

    const [mode, setMode] = useState<Mode>("CALIBRATE");

    // 스케일 (mm / px)
    const [mmPerPx, setMmPerPx] = useState<number | null>(null);

    // Load saved mmPerPx
    useEffect(() => {
        try {
            const v = localStorage.getItem("limsdoor_mm_per_px_v1");
            if (v) setMmPerPx(Number(v));
        } catch { }
    }, []);

    const confirmMmPerPx = (v: number) => {
        setMmPerPx(v);
        try {
            localStorage.setItem("limsdoor_mm_per_px_v1", String(v));
        } catch { }
        setMode("AUTO_DETECT");
    };

    // 자동탐지 Quad
    const [tracking, setTracking] = useState(true);
    const [quad, setQuad] = useState<Quad | null>(null); // preview 좌표계 quad
    const [confirmed, setConfirmed] = useState<Quad | null>(null);

    // 결과(mm)
    const [widthMm, setWidthMm] = useState<number | null>(null);
    const [heightMm, setHeightMm] = useState<number | null>(null);

    const [dragCorner, setDragCorner] = useState<CornerKey | null>(null);
    const [dragging, setDragging] = useState(false);

    const inApp = useMemo(() => (typeof window === "undefined" ? false : isInAppBrowser()), []);

    // 1) 카메라 시작(게이트)
    useEffect(() => {
        let stream: MediaStream | null = null;

        (async () => {
            try {
                setErr("");
                const v = videoRef.current;
                if (!v) return;

                // InApp Block
                if (isInAppBrowser()) {
                    throw new Error("인앱 브라우저 제한 (크롬 사용 권장)");
                }

                stream = await startCamera(v);

                const ok = await waitForVideoFrame(v, 2500);
                if (!ok) throw new Error("카메라 프레임이 준비되지 않았습니다(권한/브라우저 문제).");

                setReady(true);
            } catch (e: any) {
                setErr(e?.message || "카메라 시작 실패");
            }
        })();

        return () => stopStream(stream);
    }, []);

    // 2) OpenCV 로드
    useEffect(() => {
        if (!ready) return;
        (async () => {
            try {
                await loadOpenCV();
                setCvReady(true);
            } catch {
                setCvReady(false);
            }
        })();
    }, [ready]);

    // 3) 자동탐지 루프 (다운샘플 360px 폭, 10fps)
    useEffect(() => {
        if (!ready || !cvReady || !tracking) return;
        if (mode !== "AUTO_DETECT") return;

        let alive = true;

        const v = videoRef.current!;
        const work = document.createElement("canvas");
        const ctx = work.getContext("2d", { willReadFrequently: true });

        const tick = () => {
            if (!alive) return;

            try {
                const cv = (window as any).cv;
                if (!cv?.Mat || !ctx) return;

                const vw = v.videoWidth || 0;
                const vh = v.videoHeight || 0;
                if (!vw || !vh) return;

                // 다운샘플
                const targetW = 360;
                const scale = targetW / vw;
                const targetH = Math.max(1, Math.round(vh * scale));
                work.width = targetW;
                work.height = targetH;

                ctx.drawImage(v, 0, 0, targetW, targetH);

                const qSmall = detectDoorQuadFromCanvas(cv, work);
                if (qSmall) {
                    // small -> preview 좌표로 스케일업
                    // NOTE: preview is video element size BUT we need to consider object-fit
                    // Here we assume 'cover' mostly, but let's map to Video Element Client Size to be safe.
                    // Or wait, the video is object-fit: cover.
                    // Drawing logic below uses `v.clientWidth`.
                    // So let's map Video Frame -> Client Size (assuming Aspect Ratio match or centered cover).

                    const pw = v.clientWidth || window.innerWidth;
                    const ph = v.clientHeight || window.innerHeight;

                    // Simple Uniform Scale if we assume almost matching AR or handled by CSS
                    // To be precise we should use `mapPreviewToImageRect` inverse, but valid Quad usually implies mostly visible.
                    // Let's us simple scale for now as requested in user logic, but refine sx/sy

                    // Actually, if object-fit is cover, we need to know the scale factor used by CSS
                    // Let's implement robust 'Frame to Screen' mapping
                    const vidAR = vw / vh;
                    const screenAR = pw / ph;

                    let renderScale = 1;
                    let offX = 0;
                    let offY = 0;

                    if (screenAR > vidAR) {
                        // Screen is wider, video is cropped top/bottom (covered by width)
                        renderScale = pw / vw;
                        offY = (ph - (vh * renderScale)) / 2;
                    } else {
                        // Screen is taller, video is cropped left/right (covered by height)
                        renderScale = ph / vh;
                        offX = (pw - (vw * renderScale)) / 2;
                    }

                    // Small -> Video Frame
                    const smScale = vw / targetW;

                    const remap = (p: Pt) => ({
                        x: (p.x * smScale) * renderScale + offX,
                        y: (p.y * smScale) * renderScale + offY
                    });

                    const qNext: Quad = {
                        tl: remap(qSmall.tl),
                        tr: remap(qSmall.tr),
                        br: remap(qSmall.br),
                        bl: remap(qSmall.bl),
                    };

                    setQuad((prev) => (prev ? emaQuad(prev, qNext, 0.20) : qNext));
                }
            } finally {
                setTimeout(tick, 100);
            }
        };

        tick();
        return () => {
            alive = false;
        };
    }, [ready, cvReady, tracking, mode]);

    // 4) 오버레이 드로잉(코너/라인/결과 표시)
    useEffect(() => {
        if (!ready) return;

        let raf = 0;
        const draw = () => {
            const v = videoRef.current;
            const c = overlayRef.current;
            if (!v || !c) return;

            const w = v.clientWidth || window.innerWidth;
            const h = v.clientHeight || window.innerHeight;

            c.width = w;
            c.height = h;

            const ctx = c.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, w, h);

            // 상단 상태 텍스트
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.font = "bold 14px sans-serif";
            const status =
                mode === "CALIBRATE"
                    ? "스케일 설정: 기준 길이를 2점으로 찍기"
                    : mode === "AUTO_DETECT"
                        ? (quad ? "탐지됨! [문틀 확정]을 누르세요" : `문틀 탐지중... 문틀 전체를 비춰주세요`)
                        : "확정됨(자동 입력 준비)";
            ctx.fillText(status, 12, 24);

            // CALIBRATE 포인트/라인 -> CalibrationPanel이 담당하므로 제거
            // AUTO_DETECT / CONFIRMED Quad

            // AUTO_DETECT / CONFIRMED Quad
            const q = confirmed || quad;
            if (q) {
                drawQuad(ctx, q, confirmed ? "rgba(79,70,229,1)" : "rgba(0,255,120,1)");

                // 폭/높이 표시
                const wh = quadWH(q);
                ctx.fillStyle = confirmed ? "rgba(79,70,229,1)" : "rgba(0,255,120,1)";
                ctx.font = "bold 16px sans-serif";

                if (mmPerPx) {
                    const wmm = wh.wPx * mmPerPx;
                    const hmm = wh.hPx * mmPerPx;
                    ctx.fillText(`폭: ${wmm.toFixed(1)}mm`, 12, 52);
                    ctx.fillText(`높이: ${hmm.toFixed(1)}mm`, 12, 76);
                } else {
                    ctx.fillText(`폭(px): ${wh.wPx.toFixed(1)}`, 12, 52);
                    ctx.fillText(`높이(px): ${wh.hPx.toFixed(1)}`, 12, 76);
                }
            }

            raf = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(raf);
    }, [ready, mode, quad, confirmed, mmPerPx, cvReady]);

    // 5) 터치 & 드래그 입력
    const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!ready) return;

        // CALIBRATE 모드는 기존 onTap(2점 찍기)만 사용
        if (mode === "CALIBRATE") return;

        const host = e.currentTarget as HTMLDivElement;
        const p = getEventPoint(e, host);

        // 조정 대상: confirmed가 있으면 confirmed, 없으면 quad
        const q = (confirmed || quad);
        if (!q) return;

        const hit = nearestCorner(q, p);
        if (!hit) return;

        // 드래그 시작
        setDragCorner(hit);
        setDragging(true);

        // 드래그할 때 자동탐지 흔들림 방지
        setTracking(false);

        // pointer capture (모바일에서 드래그 안정)
        try { host.setPointerCapture(e.pointerId); } catch { }
    };

    const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging || !dragCorner) return;
        if (!ready) return;

        const host = e.currentTarget as HTMLDivElement;
        const p = getEventPoint(e, host);

        const v = videoRef.current;
        const w = v?.clientWidth || window.innerWidth;
        const h = v?.clientHeight || window.innerHeight;

        // 현재 기준 quad
        const base = (confirmed || quad);
        if (!base) return;

        const next = safeQuad(setCorner(base, dragCorner, p), w, h);

        // confirmed 상태라면 confirmed를 수정, 아니면 quad를 수정
        if (confirmed) setConfirmed(next);
        else setQuad(next);
    };

    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging) return;

        const host = e.currentTarget as HTMLDivElement;
        try { host.releasePointerCapture(e.pointerId); } catch { }

        setDragging(false);
        setDragCorner(null);

        // 드래그 끝났으면 mm 재계산(스케일 있을 때)
        const q = confirmed || quad;
        if (q && mmPerPx) {
            const wh = quadWH(q);
            setWidthMm(round1(wh.wPx * mmPerPx));
            setHeightMm(round1(wh.hPx * mmPerPx));
        }
    };
    const onTap = (e: React.PointerEvent) => {
        if (!ready) return;

        // Prevent default touch actions (scrolling etc)
        // e.preventDefault(); 

        // Coordinates relative to overlay
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        // AUTO_DETECT/CONFIRMED에서는 "수동 코너 편집"은 다음 단계로 확장 가능
    };

    /* REMOVED OLD CONFIRM SCALE LOGIC */

    // 7) 문틀(4코너) 확정 + mm 자동 계산 + 결과 전송
    const confirmQuadAndCalc = () => {
        const q = (confirmed || quad);
        if (!q) {
            alert("문틀(ROI)을 먼저 잡아주세요.");
            return;
        }

        if (!mmPerPx) {
            alert("스케일(mm) 확정이 아직입니다. 먼저 캘리브레이션(카드/A4/100mm)을 해주세요.");
            // Reset to calibrate? or just alert
            return;
        }

        // 1) 확정
        setConfirmed(q);
        setTracking(false);

        // 2) px 계산
        const wh = quadWH(q);
        const widthPx = Math.round(wh.wPx);
        const heightPx = Math.round(wh.hPx);

        // 3) mm 계산
        const wMm = round1(widthPx * mmPerPx);
        const hMm = round1(heightPx * mmPerPx);

        setWidthMm(wMm);
        setHeightMm(hMm);
        setMode("CONFIRMED");

        // 4) 결과 전달 + field/new로 이동 (즉시 실행)
        emitMeasureResult({
            quad: q,
            widthPx,
            heightPx,
            widthMm: wMm,
            heightMm: hMm,
            mmPerPx: mmPerPx,
        });
    };

    // 8) 결과 저장 + field/new로 이동하면서 자동기입
    const applyToFieldNew = () => {
        if (!widthMm || !heightMm) return;

        const payload = {
            widthMm,
            heightMm,
            measuredAt: new Date().toISOString(),
            source: "AR_AUTO_QUAD_V1",
        };

        localStorage.setItem(RESULT_KEY, JSON.stringify(payload));

        // Use window.location to navigate to field/new
        window.location.href = `/field/new?width=${encodeURIComponent(String(widthMm))}&height=${encodeURIComponent(String(heightMm))}`;
    };

    const resetAll = () => {
        setMode("CALIBRATE");
        setMmPerPx(null);
        setQuad(null);
        setConfirmed(null);
        setWidthMm(null);
        setHeightMm(null);
        setTracking(true);
    };

    // 에러 화면
    if (err) {
        return (
            <div style={wrap}>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center">
                    <XCircle size={48} className="text-red-500 mb-4" />
                    <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 18 }}>실측 카메라 오류</div>
                    <div style={{ fontSize: 13, opacity: 0.92, whiteSpace: "pre-wrap" }}>{err}</div>
                    {inApp && (
                        <div className="bg-gray-800 p-4 rounded-xl text-sm mt-4">
                            ⚠️ 인앱브라우저에서는 카메라가 차단될 수 있습니다.<br />
                            우측 메뉴 [다른 브라우저로 열기] 후 크롬을 사용하세요.
                        </div>
                    )}
                    <button style={{ ...btnPrimary, marginTop: 20, width: 150 }} onClick={() => location.reload()}>다시 시도</button>
                </div>
            </div>
        );
    }

    return (
        <div style={wrap}>
            {/* Camera layer */}
            <div style={cameraLayer}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover", background: "black" }}
                />
                <canvas ref={overlayRef} style={overlayCanvas} />
            </div>

            {/* Touch/UI layer */}
            <div
                style={touchLayer}
                onPointerDown={(e) => {
                    // 1) CALIBRATE는 CalibrationPanel 내부에서 처리
                    if (mode === "CALIBRATE") return;

                    // 2) 그 외 모드는 코너 드래그 시도
                    beginDrag(e);
                }}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <div style={topBar}>
                    <div style={{ fontWeight: 900 }}>AR 실측(4코너 자동)</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {mode} · CV:{cvReady ? "OK" : ".."}
                    </div>
                </div>

                <div style={panel}>
                    {mode === "CALIBRATE" && (
                        <CalibrationPanel
                            previewW={videoRef.current?.clientWidth || window.innerWidth}
                            previewH={videoRef.current?.clientHeight || window.innerHeight}
                            onConfirmMmPerPx={confirmMmPerPx}
                        />
                    )}

                    {mode === "AUTO_DETECT" && (
                        <>
                            <div style={txtSm}>
                                2. 문틀 전체가 나오게 비추면 4코너를 자동으로 찾습니다.
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    style={{
                                        ...btnPrimary,
                                        opacity: (!quad || !mmPerPx) ? 0.5 : 1,
                                        background: (!quad) ? "#6b7280" : "#4f46e5"
                                    }}
                                    onClick={confirmQuadAndCalc}
                                    disabled={!quad || !mmPerPx}
                                >
                                    {quad ? "문틀 확정 & 계산" : "탐지중..."}
                                </button>
                                <button style={btnGhost} onClick={() => setTracking((v) => !v)}>
                                    {tracking ? "일시정지" : "탐지재개"}
                                </button>
                            </div>

                            {!mmPerPx && <div style={warnTxt}>* 스케일 미설정: 계산 불가</div>}
                            {!cvReady && <div style={warnTxt}>* OpenCV 로딩중..잠시만 기다려주세요</div>}
                            {!quad && <div style={{ fontSize: 13, color: "#fbbf24", marginTop: 4 }}>* 녹색 사각형이 생길 때까지 문틀을 비춰보세요</div>}
                            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                                ✅ 코너 미세조정: {quad ? "녹색 점을 드래그하여 수정하세요" : "탐지된 후에 가능합니다"}
                            </div>
                        </>
                    )}

                    {mode === "CONFIRMED" && (
                        <>
                            <div style={txtSm}>
                                3. 계산 결과입니다. field/new로 자동 입력하시겠습니까?
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                <div style={miniBox}>
                                    <div style={txtLabel}>폭(mm)</div>
                                    <div style={{ fontWeight: 900, fontSize: 18 }}>{widthMm ?? "-"}</div>
                                </div>
                                <div style={miniBox}>
                                    <div style={txtLabel}>높이(mm)</div>
                                    <div style={{ fontWeight: 900, fontSize: 18 }}>{heightMm ?? "-"}</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <button style={btnPrimary} onClick={applyToFieldNew} disabled={!widthMm || !heightMm}>
                                    입력하러 가기
                                </button>
                                <button style={btnGhost} onClick={resetAll}>
                                    다시 측정
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* helpers */
function dist(a: Pt, b: Pt) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}



function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function getEventPoint(e: PointerEvent | React.PointerEvent, target: HTMLElement): Pt {
    const r = target.getBoundingClientRect();
    return { x: (e as any).clientX - r.left, y: (e as any).clientY - r.top };
}

function nearestCorner(q: Quad, p: Pt, radius = DRAG_HIT_RADIUS): CornerKey | null {
    const d = (a: Pt) => Math.hypot(a.x - p.x, a.y - p.y);
    const list: Array<[CornerKey, number]> = [
        ["tl", d(q.tl)],
        ["tr", d(q.tr)],
        ["br", d(q.br)],
        ["bl", d(q.bl)],
    ];
    list.sort((a, b) => a[1] - b[1]);
    return list[0][1] <= radius ? list[0][0] : null;
}

function setCorner(q: Quad, key: CornerKey, p: Pt): Quad {
    return { ...q, [key]: p } as Quad;
}

function safeQuad(q: Quad, w: number, h: number): Quad {
    // 화면 밖으로 나가지 않도록 클램프
    const c = (p: Pt) => ({ x: clamp(p.x, 0, w), y: clamp(p.y, 0, h) });
    const qq: Quad = { tl: c(q.tl), tr: c(q.tr), br: c(q.br), bl: c(q.bl) };

    // 너무 작은 사각형 방지(간단 안전장치)
    const wh = quadWH(qq);
    if (wh.wPx < MIN_QUAD_SIZE_PX || wh.hPx < MIN_QUAD_SIZE_PX) return q; // 이전 유지
    return qq;
}

async function waitForVideoFrame(v: HTMLVideoElement, timeoutMs: number) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (v.videoWidth > 0 && v.videoHeight > 0) return true;
        await new Promise((r) => setTimeout(r, 80));
    }
    return false;
}

function drawPoints(ctx: CanvasRenderingContext2D, pts: Pt[], color: string) {
    ctx.fillStyle = color;
    for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        // white inner
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
    }
}

function drawLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, w = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
}

function drawQuad(ctx: CanvasRenderingContext2D, q: Quad, color: string) {
    // 면 마스크(살짝)
    ctx.fillStyle = "rgba(0,180,100,0.15)";
    ctx.beginPath();
    ctx.moveTo(q.tl.x, q.tl.y);
    ctx.lineTo(q.tr.x, q.tr.y);
    ctx.lineTo(q.br.x, q.br.y);
    ctx.lineTo(q.bl.x, q.bl.y);
    ctx.closePath();
    ctx.fill();

    // 외곽선
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(q.tl.x, q.tl.y);
    ctx.lineTo(q.tr.x, q.tr.y);
    ctx.lineTo(q.br.x, q.br.y);
    ctx.lineTo(q.bl.x, q.bl.y);
    ctx.closePath();
    ctx.stroke();

    // 코너 점
    const dot = (p: Pt, label: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(label, p.x + 10, p.y - 10);
    };

    dot(q.tl, "TL");
    dot(q.tr, "TR");
    dot(q.br, "BR");
    dot(q.bl, "BL");
}

/* styles */
const wrap: React.CSSProperties = { position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#000" };
const cameraLayer: React.CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };
const overlayCanvas: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
const touchLayer: React.CSSProperties = { position: "absolute", inset: 0, pointerEvents: "auto", display: "flex", flexDirection: "column", justifyContent: "space-between" };
const topBar: React.CSSProperties = { margin: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(0,0,0,0.45)", color: "#fff", display: "flex", justifyContent: "space-between", backdropFilter: "blur(6px)" };
const panel: React.CSSProperties = { margin: 16, padding: 16, borderRadius: 18, background: "rgba(20,20,30,0.6)", color: "#fff", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" };
const miniBox: React.CSSProperties = { padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" };
const btnPrimary: React.CSSProperties = { flex: 1, padding: "14px", borderRadius: 14, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnGhost: React.CSSProperties = { flex: 1, padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const input: React.CSSProperties = { width: 80, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.2)", color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "bold" };
const txtLabel: React.CSSProperties = { fontSize: 12, opacity: 0.7, marginBottom: 4 };
const txtSm: React.CSSProperties = { fontSize: 14, opacity: 0.9, marginBottom: 16, lineHeight: 1.4 };
const warnTxt: React.CSSProperties = { marginTop: 10, fontSize: 12, color: "#f87171" };
