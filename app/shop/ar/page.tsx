"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ✅ 림스도어 실측앱 "도어 합성" (사진 + 도어 PNG) 퍼스펙티브(원근) 합성
 * - 사진 업로드
 * - 도어 PNG 선택
 * - 4점(좌상/우상/우하/좌하) 드래그 지정
 * - 캔버스에서 퍼스펙티브 워핑 후 합성
 * - 결과 다운로드
 *
 * ✅ 주의:
 * - 도어 PNG는 반드시 투명배경(알파)여야 가장 깔끔합니다.
 * - 모바일에서도 동작하도록 포인터 이벤트(pointerdown/move/up) 사용
 */

/* ===============================
   Door assets (public/doors)
================================ */
type DoorAsset = { id: string; label: string; src: string };

const DOORS: DoorAsset[] = [
    { id: "3t_black_clear", label: "3연동 | 블랙 | 투명강화", src: "/doors/3t_black_clear.png" },
    { id: "oneslide_white_satin", label: "원슬라이딩 | 화이트 | 샤틴", src: "/doors/oneslide_white_satin.png" },
    // 필요하면 계속 추가
];

type Pt = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function dist(a: Pt, b: Pt) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/** 3x3 행렬(호모그래피) 풀기 */
function solveHomography(src: Pt[], dst: Pt[]) {
    // src(도어 이미지 좌표) -> dst(캔버스 상 4점)
    // unknowns: h11 h12 h13 h21 h22 h23 h31 h32 (h33=1)
    // For each point:
    // x' = (h11 x + h12 y + h13) / (h31 x + h32 y + 1)
    // y' = (h21 x + h22 y + h23) / (h31 x + h32 y + 1)
    // Build 8 equations.
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < 4; i++) {
        const { x, y } = src[i];
        const { x: u, y: v } = dst[i];

        // u eq
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
        b.push(u);

        // v eq
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
        b.push(v);
    }

    const h = gaussianElimination(A, b); // length 8
    const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
    return [
        [h11, h12, h13],
        [h21, h22, h23],
        [h31, h32, 1],
    ];
}

function gaussianElimination(A: number[][], b: number[]) {
    // Solve A x = b for x
    const n = b.length;
    // Augment
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < 8; col++) {
        // find pivot
        let pivot = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
        }
        // swap
        [M[col], M[pivot]] = [M[pivot], M[col]];

        const diag = M[col][col];
        if (Math.abs(diag) < 1e-12) throw new Error("Homography solve failed: singular matrix");

        // normalize pivot row
        for (let j = col; j <= 8; j++) M[col][j] /= diag;

        // eliminate others
        for (let row = 0; row < n; row++) {
            if (row === col) continue;
            const factor = M[row][col];
            for (let j = col; j <= 8; j++) M[row][j] -= factor * M[col][j];
        }
    }

    // solution
    return M.slice(0, 8).map((row) => row[8]);
}

function invert3x3(m: number[][]) {
    const a = m[0][0], b = m[0][1], c = m[0][2];
    const d = m[1][0], e = m[1][1], f = m[1][2];
    const g = m[2][0], h = m[2][1], i = m[2][2];

    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const D = -(b * i - c * h);
    const E = a * i - c * g;
    const F = -(a * h - b * g);
    const G = b * f - c * e;
    const H = -(a * f - c * d);
    const I = a * e - b * d;

    const det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) throw new Error("Matrix invert failed: det≈0");

    const invDet = 1 / det;
    return [
        [A * invDet, D * invDet, G * invDet],
        [B * invDet, E * invDet, H * invDet],
        [C * invDet, F * invDet, I * invDet],
    ];
}

function applyHomography(invH: number[][], p: Pt) {
    // map dest -> src using inverse homography
    const x = p.x, y = p.y;
    const denom = invH[2][0] * x + invH[2][1] * y + invH[2][2];
    const sx = (invH[0][0] * x + invH[0][1] * y + invH[0][2]) / denom;
    const sy = (invH[1][0] * x + invH[1][1] * y + invH[1][2]) / denom;
    return { x: sx, y: sy };
}

async function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * ✅ 퍼스펙티브 워핑 + 알파 합성
 * - 배경(baseCtx)에 먼저 배경 이미지 그려두고
 * - doorImg를 4점에 맞춰 warp하여 합성
 */
function warpAndComposite(
    baseCanvas: HTMLCanvasElement,
    doorImg: HTMLImageElement,
    quad: Pt[],
    opacity: number
) {
    const ctx = baseCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const W = baseCanvas.width;
    const H = baseCanvas.height;

    // door source coords (door image rectangle)
    const sw = doorImg.naturalWidth;
    const sh = doorImg.naturalHeight;

    const srcPts: Pt[] = [
        { x: 0, y: 0 },       // TL
        { x: sw, y: 0 },      // TR
        { x: sw, y: sh },     // BR
        { x: 0, y: sh },      // BL
    ];

    // dst quad coords on canvas
    const dstPts = quad;

    // compute H: src -> dst, then invert to map dest->src
    const Hm = solveHomography(srcPts, dstPts);
    const invH = invert3x3(Hm);

    // bounding box of quad for speed
    const minX = Math.floor(Math.min(...dstPts.map(p => p.x)));
    const maxX = Math.ceil(Math.max(...dstPts.map(p => p.x)));
    const minY = Math.floor(Math.min(...dstPts.map(p => p.y)));
    const maxY = Math.ceil(Math.max(...dstPts.map(p => p.y)));

    // door image pixels
    const off = document.createElement("canvas");
    off.width = sw;
    off.height = sh;
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;
    offCtx.clearRect(0, 0, sw, sh);
    offCtx.drawImage(doorImg, 0, 0);
    const doorData = offCtx.getImageData(0, 0, sw, sh).data;

    // base image data
    const boxW = clamp(maxX - minX, 0, W);
    const boxH = clamp(maxY - minY, 0, H);
    if (boxW <= 0 || boxH <= 0) return;

    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    const x0 = clamp(minX, 0, W - 1);
    const x1 = clamp(maxX, 0, W - 1);
    const y0 = clamp(minY, 0, H - 1);
    const y1 = clamp(maxY, 0, H - 1);

    // simple point-in-quad using barycentric-like method via triangles
    function pointInQuad(p: Pt, q: Pt[]) {
        // split quad into two triangles: (0,1,2) and (0,2,3)
        return pointInTri(p, q[0], q[1], q[2]) || pointInTri(p, q[0], q[2], q[3]);
    }
    function sign(p1: Pt, p2: Pt, p3: Pt) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }
    function pointInTri(pt: Pt, v1: Pt, v2: Pt, v3: Pt) {
        const d1 = sign(pt, v1, v2);
        const d2 = sign(pt, v2, v3);
        const d3 = sign(pt, v3, v1);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    // nearest sampling (빠름). 필요하면 bilinear로 바꾸면 품질↑
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const p = { x, y };
            if (!pointInQuad(p, dstPts)) continue;

            const sp = applyHomography(invH, p);
            const sx = Math.round(sp.x);
            const sy = Math.round(sp.y);
            if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;

            const sIdx = (sy * sw + sx) * 4;
            const sr = doorData[sIdx];
            const sg = doorData[sIdx + 1];
            const sb = doorData[sIdx + 2];
            const sa = doorData[sIdx + 3] / 255;

            if (sa <= 0.001) continue;

            const a = clamp(sa * opacity, 0, 1);
            const dIdx = (y * W + x) * 4;

            // alpha blend: out = src*a + dst*(1-a)
            data[dIdx] = Math.round(sr * a + data[dIdx] * (1 - a));
            data[dIdx + 1] = Math.round(sg * a + data[dIdx + 1] * (1 - a));
            data[dIdx + 2] = Math.round(sb * a + data[dIdx + 2] * (1 - a));
            data[dIdx + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

export default function DoorCompositePage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgUrl, setBgUrl] = useState<string>("");

    const [doorId, setDoorId] = useState<string>(DOORS[0]?.id ?? "");
    const door = useMemo(() => DOORS.find(d => d.id === doorId) ?? DOORS[0], [doorId]);

    const [opacity, setOpacity] = useState<number>(0.9);

    const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
    const [doorImg, setDoorImg] = useState<HTMLImageElement | null>(null);

    // 캔버스 표시용(리사이즈) 스케일
    const [displayScale, setDisplayScale] = useState<number>(1);

    // 4점(캔버스 좌표)
    const [quad, setQuad] = useState<Pt[]>([
        { x: 200, y: 200 }, // TL
        { x: 500, y: 200 }, // TR
        { x: 500, y: 700 }, // BR
        { x: 200, y: 700 }, // BL
    ]);

    const [dragIdx, setDragIdx] = useState<number | null>(null);

    // 배경 업로드 처리
    useEffect(() => {
        if (!bgFile) return;
        const url = URL.createObjectURL(bgFile);
        setBgUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [bgFile]);

    // 이미지 로드
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!bgUrl) return;
            const img = await loadImage(bgUrl);
            if (!alive) return;
            setBgImg(img);
        })();
        return () => { alive = false; };
    }, [bgUrl]);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!door?.src) return;
            const img = await loadImage(door.src);
            if (!alive) return;
            setDoorImg(img);
        })();
        return () => { alive = false; };
    }, [door?.src]);

    // 캔버스 초기 렌더
    useEffect(() => {
        redraw(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bgImg, doorImg, quad, opacity]);

    function fitCanvasToBg(img: HTMLImageElement) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // 화면 너비에 맞춰 축소(모바일/태블릿 대응)
        const maxW = Math.min(window.innerWidth - 32, 980);
        const maxH = Math.min(window.innerHeight - 220, 800);

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        const s = Math.min(maxW / iw, maxH / ih, 1);
        setDisplayScale(s);

        canvas.width = Math.round(iw * s);
        canvas.height = Math.round(ih * s);
    }

    function drawBgOnly() {
        const canvas = canvasRef.current;
        if (!canvas || !bgImg) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        fitCanvasToBg(bgImg);

        // 캔버스 크기가 바뀌었을 수 있으니 다시 ctx를 얻습니다.
        const ctx2 = canvas.getContext("2d");
        if (!ctx2) return;

        ctx2.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

    function redraw(resetBg: boolean) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (!bgImg) {
            // 배경 없으면 안내
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = 900;
            canvas.height = 600;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#111";
            ctx.font = "16px sans-serif";
            ctx.fillText("① 현장 사진을 업로드하세요.", 24, 48);
            ctx.fillText("② 도어를 선택한 뒤 4점을 드래그로 맞추세요.", 24, 80);
            ctx.fillText("③ 합성 결과를 다운로드해 고객에게 전송하면 됩니다.", 24, 112);
            return;
        }

        // 배경 다시 그림
        drawBgOnly();

        // 도어 합성
        if (doorImg) {
            const scaledQuad = quad.map(p => ({
                x: p.x,
                y: p.y,
            }));
            warpAndComposite(canvas, doorImg, scaledQuad, opacity);
        }

        // 가이드 점/선 그리기
        drawOverlay();
    }

    function drawOverlay() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 선
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0, 255, 180, 0.9)";
        ctx.beginPath();
        ctx.moveTo(quad[0].x, quad[0].y);
        ctx.lineTo(quad[1].x, quad[1].y);
        ctx.lineTo(quad[2].x, quad[2].y);
        ctx.lineTo(quad[3].x, quad[3].y);
        ctx.closePath();
        ctx.stroke();

        // 점(핸들)
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.arc(quad[i].x, quad[i].y, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = "rgba(0, 255, 180, 1)";
            ctx.arc(quad[i].x, quad[i].y, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.font = "12px sans-serif";
            const label = ["TL", "TR", "BR", "BL"][i];
            ctx.fillText(label, quad[i].x + 14, quad[i].y + 4);
        }
        ctx.restore();
    }

    function getCanvasPoint(e: React.PointerEvent) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
    }

    function onPointerDown(e: React.PointerEvent) {
        if (!canvasRef.current) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const p = getCanvasPoint(e);

        // 가장 가까운 점 선택
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < 4; i++) {
            const d = dist(p, quad[i]);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        // 반경 30px 안에 있으면 잡기
        if (bestD <= 30) setDragIdx(best);
    }

    function onPointerMove(e: React.PointerEvent) {
        if (dragIdx === null) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const p = getCanvasPoint(e);
        const nx = clamp(p.x, 0, canvas.width);
        const ny = clamp(p.y, 0, canvas.height);

        setQuad(prev => {
            const next = [...prev];
            next[dragIdx] = { x: nx, y: ny };
            return next;
        });
    }

    function onPointerUp(e: React.PointerEvent) {
        setDragIdx(null);
    }

    function resetQuadToCenter() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.width;
        const h = canvas.height;

        // 화면 중앙에 적당한 크기
        const left = Math.round(w * 0.25);
        const right = Math.round(w * 0.75);
        const top = Math.round(h * 0.20);
        const bottom = Math.round(h * 0.85);

        setQuad([
            { x: left, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
            { x: left, y: bottom },
        ]);
    }

    function downloadResult() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `door_composite_${Date.now()}.png`;
        a.click();
    }

    return (
        <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>도어 합성(현장 사진 + 도어 PNG)</h1>
            <div style={{ opacity: 0.8, marginBottom: 12, lineHeight: 1.5 }}>
                ① 사진 업로드 → ② 도어 선택 → ③ 초록 점 4개를 문틀에 맞게 드래그 → ④ 다운로드
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(260px, 320px) 1fr",
                    gap: 12,
                    alignItems: "start",
                }}
            >
                {/* 좌측 패널 */}
                <div
                    style={{
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: 12,
                        padding: 12,
                        background: "white",
                        color: 'black'
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>1) 현장 사진</div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBgFile(e.target.files?.[0] ?? null)}
                        style={{ width: "100%" }}
                    />

                    <hr style={{ margin: "12px 0", opacity: 0.2 }} />

                    <div style={{ fontWeight: 700, marginBottom: 8 }}>2) 도어 선택</div>
                    <select
                        value={doorId}
                        onChange={(e) => setDoorId(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 10, color: 'black' }}
                    >
                        {DOORS.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.label}
                            </option>
                        ))}
                    </select>

                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>투명도</div>
                        <input
                            type="range"
                            min={0.2}
                            max={1}
                            step={0.05}
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            style={{ width: "100%" }}
                        />
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{Math.round(opacity * 100)}%</div>
                    </div>

                    <hr style={{ margin: "12px 0", opacity: 0.2 }} />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                            onClick={resetQuadToCenter}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.15)",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 700,
                                color: 'black'
                            }}
                        >
                            4점 초기화
                        </button>

                        <button
                            onClick={downloadResult}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.15)",
                                background: "#111",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            결과 다운로드
                        </button>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                        ✅ 팁: 점 4개를 <b>문틀의 실제 모서리</b>에 최대한 정확히 맞추면,
                        AR처럼 자연스럽게 합성됩니다.
                    </div>
                </div>

                {/* 캔버스 */}
                <div
                    style={{
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: 12,
                        padding: 12,
                        background: "white",
                        color: 'black'
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>미리보기</div>
                    <div style={{ width: "100%", overflow: "auto" }}>
                        <canvas
                            ref={canvasRef}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{
                                width: "100%",
                                maxWidth: 980,
                                borderRadius: 12,
                                border: "1px solid rgba(0,0,0,0.12)",
                                touchAction: "none",
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                        표시 스케일: {Math.round(displayScale * 100)}% (자동 축소)
                    </div>
                </div>
            </div>
        </div>
    );
}
