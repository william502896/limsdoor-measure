"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import PreviewPanel from "./components/PreviewPanel";
import OptionsPanel from "./components/OptionsPanel";
import RotationControls from "./components/RotationControls";
import { DoorRenderer, type Quad } from "./lib/DoorRenderer";

/* ===============================
   Types & Assets
================================ */
type DoorCategory = "3연동" | "원슬라이딩" | "스윙" | "호폐" | "파티션";
type FrameColor = "블랙" | "화이트" | "브론즈" | "실버";
type GlassType = "투명강화" | "샤틴" | "다크" | "브론즈" | "플루트" | "특수";

type DoorAsset = {
    id: string;
    label: string;
    src: string;
    category: DoorCategory;
    frame: FrameColor;
    glass: GlassType;
};

// Default fallback assets
const DOORS: DoorAsset[] = [
    { id: "3t_default", label: "3연동 기본형", src: "/doors/3t_black_clear.png", category: "3연동", frame: "블랙", glass: "투명강화" },
    { id: "oneslide_default", label: "원슬라이딩 기본형", src: "/doors/oneslide_white_satin.png", category: "원슬라이딩", frame: "화이트", glass: "샤틴" },
];

/* ===============================
   Math & Homography Utils
================================ */
type Pt = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function dist(a: Pt, b: Pt) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function solveHomography(src: Pt[], dst: Pt[]) {
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < 4; i++) {
        const { x, y } = src[i];
        const { x: u, y: v } = dst[i];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
        b.push(u);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
        b.push(v);
    }
    const h = gaussianElimination(A, b);
    const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
    return [
        [h11, h12, h13],
        [h21, h22, h23],
        [h31, h32, 1],
    ];
}

function gaussianElimination(A: number[][], b: number[]) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < 8; col++) {
        let pivot = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
        }
        [M[col], M[pivot]] = [M[pivot], M[col]];
        const diag = M[col][col];
        if (Math.abs(diag) < 1e-12) return Array(8).fill(0); // Fail safe
        for (let j = col; j <= 8; j++) M[col][j] /= diag;
        for (let row = 0; row < n; row++) {
            if (row === col) continue;
            const factor = M[row][col];
            for (let j = col; j <= 8; j++) M[row][j] -= factor * M[col][j];
        }
    }
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
    if (Math.abs(det) < 1e-12) return m; // Fail safe
    const invDet = 1 / det;
    return [
        [A * invDet, D * invDet, G * invDet],
        [B * invDet, E * invDet, H * invDet],
        [C * invDet, F * invDet, I * invDet],
    ];
}

function applyHomography(invH: number[][], p: Pt) {
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

// Barycentric helper
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
function pointInQuad(p: Pt, q: Pt[]) {
    return pointInTri(p, q[0], q[1], q[2]) || pointInTri(p, q[0], q[2], q[3]);
}

function warpAndComposite(
    baseCanvas: HTMLCanvasElement,
    doorImg: HTMLCanvasElement | HTMLImageElement, // Support Canvas as source
    quad: Pt[],
    opacity: number
) {
    const ctx = baseCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const W = baseCanvas.width;
    const H = baseCanvas.height;
    // Source dimensions
    const sw = doorImg.width;
    const sh = doorImg.height;

    const srcPts: Pt[] = [{ x: 0, y: 0 }, { x: sw, y: 0 }, { x: sw, y: sh }, { x: 0, y: sh }];
    const dstPts = quad;
    const Hm = solveHomography(srcPts, dstPts);
    const invH = invert3x3(Hm);

    const minX = Math.floor(Math.min(...dstPts.map(p => p.x)));
    const maxX = Math.ceil(Math.max(...dstPts.map(p => p.x)));
    const minY = Math.floor(Math.min(...dstPts.map(p => p.y)));
    const maxY = Math.ceil(Math.max(...dstPts.map(p => p.y)));

    const off = document.createElement("canvas");
    off.width = sw; off.height = sh;
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;
    offCtx.drawImage(doorImg, 0, 0);
    const doorData = offCtx.getImageData(0, 0, sw, sh).data;

    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    const x0 = clamp(minX, 0, W - 1);
    const x1 = clamp(maxX, 0, W - 1);
    const y0 = clamp(minY, 0, H - 1);
    const y1 = clamp(maxY, 0, H - 1);

    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const p = { x, y };
            if (!pointInQuad(p, dstPts)) continue;
            const sp = applyHomography(invH, p);
            const sx = Math.round(sp.x);
            const sy = Math.round(sp.y);
            if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;

            const sIdx = (sy * sw + sx) * 4;
            const sa = doorData[sIdx + 3] / 255;
            if (sa <= 0.001) continue;

            const a = clamp(sa * opacity, 0, 1);
            const dIdx = (y * W + x) * 4;

            data[dIdx] = Math.round(doorData[sIdx] * a + data[dIdx] * (1 - a));
            data[dIdx + 1] = Math.round(doorData[sIdx + 1] * a + data[dIdx + 1] * (1 - a));
            data[dIdx + 2] = Math.round(doorData[sIdx + 2] * a + data[dIdx + 2] * (1 - a));
            // alpha stays same
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

/* ===============================
   Main Component
================================ */
export default function DoorCompositePage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // -- Assets --
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgUrl, setBgUrl] = useState<string>("");
    const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);

    // Raw Base Image (Active Door)
    const [baseDoorImg, setBaseDoorImg] = useState<HTMLImageElement | null>(null);
    // Composed Image (with Tint/Glass applied)
    const [composedDoor, setComposedDoor] = useState<HTMLCanvasElement | null>(null);

    const [allDoors, setAllDoors] = useState<DoorAsset[]>(DOORS);
    const [doorId, setDoorId] = useState<string>(DOORS[0]?.id ?? "");

    // Filter & Options
    const [selCategory, setSelCategory] = useState<DoorCategory>("3연동");
    const [selFrame, setSelFrame] = useState<FrameColor>("블랙");
    const [selGlass, setSelGlass] = useState<GlassType>("투명강화");

    // UI State
    const [opacity, setOpacity] = useState<number>(0.9);
    const [displayScale, setDisplayScale] = useState<number>(1);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    // 3D Rotation State
    const [yaw, setYaw] = useState(0);
    const [pitch, setPitch] = useState(0);
    const [roll, setRoll] = useState(0);
    const [doorScale, setDoorScale] = useState(1.0); // Size relative to "standard"

    // Upload
    const [estimateId, setEstimateId] = useState<string>("");
    const [uploadedUrl, setUploadedUrl] = useState<string>("");
    const [isUploading, setIsUploading] = useState<boolean>(false);

    // Quad (Start centered)
    const [quad, setQuad] = useState<Pt[]>([
        { x: 200, y: 200 }, { x: 500, y: 200 },
        { x: 500, y: 700 }, { x: 200, y: 700 },
    ]);

    // Data Fetching
    useEffect(() => {
        const supabase = createSupabaseBrowser();
        async function fetchDoors() {
            const { data } = await supabase.from("marketing_assets").select("*").eq("category", "ar_door");
            if (data && data.length > 0) {
                const dbDoors: DoorAsset[] = data.map((d: any) => ({
                    id: d.id,
                    label: `${d.metadata?.category || '기타'} | ${d.metadata?.frame || '기타'}`,
                    src: d.file_url,
                    category: d.metadata?.category || "3연동",
                    frame: d.metadata?.frame || "블랙", // Default
                    glass: d.metadata?.glass || "투명강화" // Default
                }));
                const merged = [...DOORS, ...dbDoors].reduce((acc, curr) => {
                    if (!acc.find(item => item.src === curr.src)) acc.push(curr);
                    return acc;
                }, [] as DoorAsset[]);
                setAllDoors(merged);
            }
        }
        fetchDoors();
    }, []);

    // Filter Logic: Only Filter by Category (and maybe 'design' if we had it)
    // We ignore Frame/Glass in filter because we want to APPLY those options dynamically.
    const filteredDoors = useMemo(() => {
        return allDoors.filter(d => d.category === selCategory);
    }, [allDoors, selCategory]);

    useEffect(() => {
        if (!filteredDoors.some(d => d.id === doorId)) {
            setDoorId(filteredDoors[0]?.id ?? allDoors[0]?.id ?? "");
        }
    }, [filteredDoors, doorId, allDoors]);

    const activeDoorAsset = useMemo(() => allDoors.find(d => d.id === doorId) ?? allDoors[0], [doorId, allDoors]);

    // Background Loading
    useEffect(() => {
        if (!bgFile) return;
        const url = URL.createObjectURL(bgFile);
        setBgUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [bgFile]);

    useEffect(() => {
        if (!bgUrl) return;
        loadImage(bgUrl).then(setBgImg);
    }, [bgUrl]);

    // Base Door Loading
    useEffect(() => {
        if (!activeDoorAsset?.src) return;
        loadImage(activeDoorAsset.src).then(setBaseDoorImg);
    }, [activeDoorAsset?.src]);

    // Composition (Layering)
    useEffect(() => {
        if (!baseDoorImg) return;

        // Map Korean GlassType to English for DoorRenderer
        let glass: "clear" | "satin" | "flute" | "bronze" | "dark" = "clear";
        if (selGlass === "샤틴") glass = "satin";
        else if (selGlass === "다크") glass = "dark";
        else if (selGlass === "브론즈") glass = "bronze";
        else if (selGlass === "플루트") glass = "flute";

        // Compose Layers
        DoorRenderer.compose(baseDoorImg, null, selFrame, glass)
            .then(setComposedDoor);
    }, [baseDoorImg, selFrame, selGlass]);

    // 3D Projection Update
    // Triggered when 3D sliders change.
    // NOTE: We only update Quad if we have a valid Canvas dimension (bg loaded)
    useEffect(() => {
        if (!canvasRef.current || !composedDoor) return;

        // If user is Dragging, don't update from sliders (prevent conflict)
        // Actually, we want Sliders to OVERRIDE manual position to "reset" it to 3D.
        // But if user drags, we shouldn't snap back unless slider moves.
        // This useEffect runs on [yaw, pitch, roll, doorScale].

        const canvas = canvasRef.current;
        const q = DoorRenderer.calculateQuad(
            yaw, pitch, roll, doorScale,
            composedDoor.width, composedDoor.height,
            canvas.width, canvas.height
        );
        setQuad(q);

    }, [yaw, pitch, roll, doorScale, composedDoor /* canvasRef is ref */]);


    /* ===========================
       Canvas Rendering 
    ============================ */
    function fitCanvasToBg(img: HTMLImageElement) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxW = 1200;
        const maxH = 1200;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const s = Math.min(maxW / iw, maxH / ih, 1);
        setDisplayScale(s);
        canvas.width = Math.round(iw * s);
        canvas.height = Math.round(ih * s);
        // Reset 3D params on new BG
        setYaw(0); setPitch(0); setRoll(0); setDoorScale(1.0);
    }

    function drawBgOnly() {
        const canvas = canvasRef.current;
        if (!canvas || !bgImg) return;
        // Check resize
        if (canvas.width === 0 || Math.abs(canvas.width - bgImg.naturalWidth * displayScale) > 5) {
            fitCanvasToBg(bgImg);
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

    function drawOverlay() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.save();
        if (!quad || quad.length < 4) {
            ctx.restore();
            return;
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00FFB4";
        ctx.beginPath();
        ctx.moveTo(quad[0].x, quad[0].y);
        ctx.lineTo(quad[1].x, quad[1].y);
        ctx.lineTo(quad[2].x, quad[2].y);
        ctx.lineTo(quad[3].x, quad[3].y);
        ctx.closePath();
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.arc(quad[i].x, quad[i].y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "#00FFB4";
            ctx.arc(quad[i].x, quad[i].y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (!bgImg) return;

        // 1. Draw BG
        drawBgOnly();

        // 2. Warping
        if (composedDoor) {
            warpAndComposite(canvas, composedDoor, quad, opacity);
        }

        // 3. UI Overlay
        drawOverlay();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bgImg, composedDoor, quad, opacity]);


    // Interaction
    function getCanvasPoint(e: React.PointerEvent) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
    }

    function onPointerDown(e: React.PointerEvent) {
        if (!canvasRef.current || !bgImg) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const p = getCanvasPoint(e);
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < 4; i++) {
            const d = dist(p, quad[i]);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        if (bestD <= 40) setDragIdx(best);
    }

    function onPointerMove(e: React.PointerEvent) {
        if (dragIdx === null || !canvasRef.current) return;
        const p = getCanvasPoint(e);
        const nx = clamp(p.x, 0, canvasRef.current.width);
        const ny = clamp(p.y, 0, canvasRef.current.height);
        setQuad(prev => {
            const next = [...prev];
            next[dragIdx] = { x: nx, y: ny };
            return next;
        });
        // Note: Manual Move does NOT update Yaw/Pitch/Roll. 
        // Logic: 3D controls set "Initial" pose. Manual handles set "Final" pose.
    }

    function onPointerUp(e: React.PointerEvent) {
        setDragIdx(null);
    }

    // Actions
    function handleDownload() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Redraw without overlay
        drawBgOnly();
        if (composedDoor) warpAndComposite(canvas, composedDoor, quad, opacity);

        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `door_composite_${Date.now()}.png`;
        a.click();

        // Restore overlay
        drawOverlay();
    }

    async function handleUpload() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Clean render
        drawBgOnly();
        if (composedDoor) warpAndComposite(canvas, composedDoor, quad, opacity);
        const dataUrl = canvas.toDataURL("image/png");
        // Restore
        drawOverlay();

        setIsUploading(true);
        setUploadedUrl("");
        try {
            const res = await fetch("/api/composite/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dataUrl, estimateId: estimateId.trim() || undefined }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Upload failed");
            setUploadedUrl(json.url);
        } catch (e: any) {
            alert(e?.message ?? "업로드 실패");
        } finally {
            setIsUploading(false);
        }
    }

    async function handleShare() {
        if (!uploadedUrl) return alert("먼저 업로드를 해주세요.");
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "림스도어 합성 이미지",
                    text: "합성 결과 확인 링크입니다.",
                    url: uploadedUrl,
                });
                return;
            }
        } catch { }
        await navigator.clipboard.writeText(uploadedUrl);
        alert("링크를 복사했습니다.");
    }

    function handleSms() {
        if (!uploadedUrl) return alert("먼저 업로드를 해주세요.");
        const msg = encodeURIComponent(`림스도어 합성 이미지 링크: ${uploadedUrl}`);
        window.location.href = `sms:?body=${msg}`;
    }

    // 3D Presets
    const handlePreset = (type: 'front' | 'side-left' | 'side-right') => {
        if (type === 'front') { setYaw(0); setPitch(0); setRoll(0); }
        if (type === 'side-left') { setYaw(-45); setPitch(0); setRoll(0); }
        if (type === 'side-right') { setYaw(45); setPitch(0); setRoll(0); }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                            <span className="text-indigo-600">AR</span> 도어 합성 스튜디오 <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">3D BETA</span>
                        </h1>
                    </div>
                </div>
            </header>

            {/* Layout Wrapper */}
            <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
                <div className="lg:grid lg:grid-cols-[400px_1fr] lg:gap-8 flex flex-col gap-4">

                    {/* PREVIEW PANEL (Main Content) */}
                    <div className="lg:col-start-2 lg:row-start-1 relative">
                        <div className="lg:sticky lg:top-24 space-y-4">
                            <PreviewPanel
                                className="h-[60vh] md:h-[65vh] lg:h-[calc(100vh-240px)] w-full shadow-lg border-slate-300"
                                canvasRef={canvasRef as any}
                                bgFile={bgFile}
                                setBgFile={setBgFile}
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                displayScale={displayScale}
                                onReset={() => {
                                    handlePreset('front');
                                    setDoorScale(1.0);
                                }}
                            />

                            {/* 3D Controls (Mobile: Below Preview. Desktop: Below Preview as well) */}
                            {bgFile && (
                                <RotationControls
                                    yaw={yaw} setYaw={setYaw}
                                    pitch={pitch} setPitch={setPitch}
                                    roll={roll} setRoll={setRoll}
                                    scale={doorScale} setScale={setDoorScale}
                                    onReset={() => handlePreset('front')}
                                    onPreset={handlePreset}
                                />
                            )}
                        </div>
                    </div>

                    {/* OPTIONS PANEL */}
                    <div className="lg:col-start-1 lg:row-start-1 h-full">
                        <OptionsPanel
                            doors={allDoors}
                            filteredDoors={filteredDoors}
                            selCategory={selCategory} setSelCategory={setSelCategory}
                            selFrame={selFrame} setSelFrame={setSelFrame}
                            selGlass={selGlass} setSelGlass={setSelGlass}
                            doorId={doorId} setDoorId={setDoorId}
                            opacity={opacity} setOpacity={setOpacity}
                            onDownload={handleDownload}
                            onUpload={handleUpload}
                            onShare={handleShare}
                            onSms={handleSms}
                            isUploading={isUploading}
                            uploadedUrl={uploadedUrl}
                            estimateId={estimateId}
                            setEstimateId={setEstimateId}
                        />
                    </div>

                </div>
            </main>
        </div>
    );
}
