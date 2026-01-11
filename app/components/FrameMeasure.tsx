"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Pt = { x: number; y: number };
type Corners = { TL: Pt; TR: Pt; BR: Pt; BL: Pt };

export type FrameConfirmPayload = {
    widthMm: number;
    heightMm: number;
    mmPerPx: number;
    corners: Corners;
    source: "camera" | "photo";
    imageDataUrl: string | null;
};

type Props = {
    initialMmPerPx?: number;
    warnThresholdMm?: number; // 10mm 이상 오차시 경고
    showGuides?: boolean;
    lockAfterConfirm?: boolean;
    onConfirm: (payload: FrameConfirmPayload) => void;
};

function speak(text: string) {
    try {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ko-KR";
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
    } catch { }
}

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

function dist(a: Pt, b: Pt) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function mid(a: Pt, b: Pt): Pt {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isIOSDevice() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOS13Plus = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
    return iOS || iPadOS13Plus;
}

async function isWebXRImmersiveArSupported() {
    try {
        // @ts-ignore
        if (!navigator.xr || !navigator.xr.isSessionSupported) return false;
        // @ts-ignore
        const ok = await navigator.xr.isSessionSupported("immersive-ar");
        return !!ok;
    } catch {
        return false;
    }
}

/** iOS 카메라 안정화: 버튼 클릭 후 호출 */
async function startCameraIOS(videoEl: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia 미지원 환경입니다.");
    }

    // iOS 블랙화면 방지 속성
    videoEl.setAttribute("playsinline", "true");
    videoEl.setAttribute("webkit-playsinline", "true");
    videoEl.muted = true;
    videoEl.autoplay = true;

    // 1차: 후면 ideal
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
        });

        videoEl.srcObject = stream;
        await new Promise<void>((resolve) => {
            videoEl.onloadedmetadata = () => resolve();
        });
        await videoEl.play();
        return stream;
    } catch {
        // 2차: 아무 비디오
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoEl.srcObject = stream;
        await new Promise<void>((resolve) => {
            videoEl.onloadedmetadata = () => resolve();
        });
        await videoEl.play();
        return stream;
    }
}

function createInitialCorners(w: number, h: number, marginRatio = 0.12): Corners {
    const mx = w * marginRatio;
    const my = h * marginRatio;
    return {
        TL: { x: mx, y: my },
        TR: { x: w - mx, y: my },
        BR: { x: w - mx, y: h - my },
        BL: { x: mx, y: h - my },
    };
}

function copyCorners(c: Corners): Corners {
    return {
        TL: { ...c.TL },
        TR: { ...c.TR },
        BR: { ...c.BR },
        BL: { ...c.BL },
    };
}

export default function FrameMeasure({
    initialMmPerPx = 1,
    warnThresholdMm = 10,
    showGuides = true,
    lockAfterConfirm = true,
    onConfirm,
}: Props) {
    const ios = useMemo(() => isIOSDevice(), []);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [xrSupported, setXrSupported] = useState(false);
    const [mode, setMode] = useState<"photo" | "xr">("photo"); // ✅ 기본 photo
    const [statusMsg, setStatusMsg] = useState("");

    // 카메라 스트림
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraOn, setCameraOn] = useState(false);

    // 로드된 이미지(dataURL)
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

    // 코너/드래그
    const [corners, setCorners] = useState<Corners | null>(null);
    const [dragKey, setDragKey] = useState<keyof Corners | null>(null);

    // mm/px & 잠금
    const [mmPerPx, setMmPerPx] = useState<number>(initialMmPerPx);
    const [locked, setLocked] = useState(false);

    // 표시용 계산
    const derived = useMemo(() => {
        if (!corners) return { widthPx: 0, heightPx: 0, widthMm: 0, heightMm: 0 };
        // 폭: 상단/하단 평균
        const top = dist(corners.TL, corners.TR);
        const bot = dist(corners.BL, corners.BR);
        const widthPx = (top + bot) / 2;

        // 높이: 좌/우 평균
        const left = dist(corners.TL, corners.BL);
        const right = dist(corners.TR, corners.BR);
        const heightPx = (left + right) / 2;

        const widthMm = Math.round(widthPx * mmPerPx);
        const heightMm = Math.round(heightPx * mmPerPx);
        return { widthPx, heightPx, widthMm, heightMm };
    }, [corners, mmPerPx]);

    // 초기: iOS면 xr 끄고 photo 고정, 아니면 지원 체크
    useEffect(() => {
        const run = async () => {
            if (ios) {
                setXrSupported(false);
                setMode("photo");
                setStatusMsg("iOS에서는 AR 실측(WebXR) 대신 사진 실측 모드로 진행합니다.");
                return;
            }
            const ok = await isWebXRImmersiveArSupported();
            setXrSupported(ok);
            if (!ok) {
                setMode("photo");
                setStatusMsg("이 기기는 AR 실측(WebXR)을 지원하지 않아 사진 실측으로 진행합니다.");
            } else {
                setMode("xr"); // 안드 지원이면 기본 xr 시작(원하면 photo로 바꿔도 됨)
                setStatusMsg("");
            }
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 언마운트/모드 전환 시 카메라 정리
    useEffect(() => {
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function startCamera() {
        if (locked) return;
        setStatusMsg("");
        try {
            if (!videoRef.current) throw new Error("videoRef missing");
            const s = await startCameraIOS(videoRef.current); // ✅ iOS/안드 공통으로 안정적으로 사용
            setStream(s);
            setCameraOn(true);
        } catch (e: any) {
            setCameraOn(false);
            setStream(null);
            setStatusMsg(`카메라 시작 실패 → 사진 업로드로 진행하세요. (${e?.name ?? ""})`);
            speak("카메라 시작이 실패했습니다. 사진 업로드로 진행하세요.");
        }
    }

    function stopCamera() {
        try {
            if (videoRef.current) {
                // @ts-ignore
                videoRef.current.srcObject = null;
            }
        } catch { }
        try {
            stream?.getTracks().forEach((t) => t.stop());
        } catch { }
        setStream(null);
        setCameraOn(false);
    }

    function resetAll() {
        stopCamera();
        setImageDataUrl(null);
        setImgSize(null);
        setCorners(null);
        setDragKey(null);
        setLocked(false);
        setStatusMsg("");
    }

    // video → 캡처 → dataURL로 전환(이후부터는 “사진 실측” 파이프라인)
    async function captureFromVideo() {
        if (locked) return;
        const v = videoRef.current;
        if (!v) return;

        const vw = v.videoWidth || 0;
        const vh = v.videoHeight || 0;
        if (vw <= 0 || vh <= 0) {
            setStatusMsg("카메라 준비가 완료되지 않았습니다. 잠시 후 다시 시도하세요.");
            return;
        }

        const cnv = document.createElement("canvas");
        cnv.width = vw;
        cnv.height = vh;
        const ctx = cnv.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(v, 0, 0, vw, vh);
        const url = cnv.toDataURL("image/jpeg", 0.92);

        stopCamera();
        await loadImage(url);
    }

    async function loadImage(dataUrl: string) {
        if (locked) return;
        setImageDataUrl(dataUrl);
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("image load failed"));
        });
        setImgSize({ w: img.width, h: img.height });
        setCorners(createInitialCorners(img.width, img.height, 0.12));
    }

    // 파일 업로드 → dataURL
    async function onPickFile(file: File) {
        if (locked) return;
        const reader = new FileReader();
        const p = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("file read failed"));
        });
        reader.readAsDataURL(file);
        const url = await p;
        await loadImage(url);
    }

    // canvas 렌더링(이미지 + 가이드 + 코너 핸들)
    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;

        if (!imageDataUrl || !imgSize || !corners) {
            // 빈 캔버스
            ctx.clearRect(0, 0, c.width, c.height);
            return;
        }

        // 캔버스는 이미지 원본 크기로 1:1 (px 계산 정확도)
        c.width = imgSize.w;
        c.height = imgSize.h;

        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            // 배경 이미지
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);

            // 가이드(사각형/대각선/수평/수직)
            if (showGuides) {
                ctx.save();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "rgba(0,255,0,0.9)";
                ctx.beginPath();
                ctx.moveTo(corners.TL.x, corners.TL.y);
                ctx.lineTo(corners.TR.x, corners.TR.y);
                ctx.lineTo(corners.BR.x, corners.BR.y);
                ctx.lineTo(corners.BL.x, corners.BL.y);
                ctx.closePath();
                ctx.stroke();

                // 대각선
                ctx.strokeStyle = "rgba(255,255,255,0.55)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(corners.TL.x, corners.TL.y);
                ctx.lineTo(corners.BR.x, corners.BR.y);
                ctx.moveTo(corners.TR.x, corners.TR.y);
                ctx.lineTo(corners.BL.x, corners.BL.y);
                ctx.stroke();

                // 수평/수직 중앙선
                const cx = (corners.TL.x + corners.TR.x + corners.BR.x + corners.BL.x) / 4;
                const cy = (corners.TL.y + corners.TR.y + corners.BR.y + corners.BL.y) / 4;

                ctx.strokeStyle = "rgba(0,160,255,0.55)";
                ctx.beginPath();
                ctx.moveTo(0, cy);
                ctx.lineTo(c.width, cy);
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx, c.height);
                ctx.stroke();
                ctx.restore();
            }

            // 핸들
            drawHandle(ctx, corners.TL, "TL", dragKey === "TL", locked);
            drawHandle(ctx, corners.TR, "TR", dragKey === "TR", locked);
            drawHandle(ctx, corners.BR, "BR", dragKey === "BR", locked);
            drawHandle(ctx, corners.BL, "BL", dragKey === "BL", locked);

            // 텍스트(가로/세로)
            ctx.save();
            ctx.font = "bold 26px system-ui";
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(14, 14, 520, 92);
            ctx.fillStyle = "white";
            ctx.fillText(`가로: ${derived.widthMm}mm`, 28, 52);
            ctx.fillText(`세로: ${derived.heightMm}mm`, 28, 88);
            ctx.restore();

            // 경고(10mm 이상 등)
            // 여기서는 "대각선 차이"로 왜곡 감지(가로/세로 자체는 mm 계산값이므로)
            const diag1 = dist(corners.TL, corners.BR) * mmPerPx;
            const diag2 = dist(corners.TR, corners.BL) * mmPerPx;
            const diagDiff = Math.abs(diag1 - diag2);

            if (diagDiff >= warnThresholdMm) {
                ctx.save();
                ctx.font = "bold 24px system-ui";
                ctx.fillStyle = "rgba(255,60,60,0.92)";
                ctx.fillText(`⚠ 왜곡/기울기 감지(대각선차 ${Math.round(diagDiff)}mm)`, 28, c.height - 28);
                ctx.restore();
            }
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageDataUrl, imgSize, corners, dragKey, mmPerPx, showGuides, locked, derived.widthMm, derived.heightMm]);

    function hitTest(pt: Pt, key: keyof Corners) {
        if (!corners) return false;
        const p = corners[key];
        const r = 22;
        return Math.abs(pt.x - p.x) <= r && Math.abs(pt.y - p.y) <= r;
    }

    function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Pt {
        const c = canvasRef.current!;
        const rect = c.getBoundingClientRect();

        // CSS 스케일을 고려해 실제 캔버스 좌표로 환산
        const sx = c.width / rect.width;
        const sy = c.height / rect.height;

        return {
            x: (e.clientX - rect.left) * sx,
            y: (e.clientY - rect.top) * sy,
        };
    }

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        if (locked) return;
        if (!corners) return;
        const p = toCanvasPoint(e);

        const order: (keyof Corners)[] = ["TL", "TR", "BR", "BL"];
        for (const k of order) {
            if (hitTest(p, k)) {
                setDragKey(k);
                (e.currentTarget as any).setPointerCapture?.(e.pointerId);
                return;
            }
        }
    }

    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (locked) return;
        if (!corners || !dragKey || !imgSize) return;

        const p = toCanvasPoint(e);
        const next = copyCorners(corners);

        next[dragKey] = {
            x: clamp(p.x, 0, imgSize.w),
            y: clamp(p.y, 0, imgSize.h),
        };

        setCorners(next);
    }

    function onPointerUp() {
        setDragKey(null);
    }

    function confirm() {
        if (!corners || !imageDataUrl) {
            setStatusMsg("이미지를 먼저 준비하세요(촬영/업로드).");
            speak("이미지를 먼저 준비하세요.");
            return;
        }

        // 대각선 차이로 왜곡 경고
        const diag1 = dist(corners.TL, corners.BR) * mmPerPx;
        const diag2 = dist(corners.TR, corners.BL) * mmPerPx;
        const diagDiff = Math.abs(diag1 - diag2);

        if (diagDiff >= warnThresholdMm) {
            speak("기울기 또는 왜곡이 감지되었습니다. 코너를 다시 맞춰주세요.");
        }

        const payload: FrameConfirmPayload = {
            widthMm: derived.widthMm,
            heightMm: derived.heightMm,
            mmPerPx,
            corners,
            source: cameraOn ? "camera" : "photo",
            imageDataUrl,
        };

        onConfirm(payload);

        if (lockAfterConfirm) {
            setLocked(true);
            setStatusMsg("실측 확정됨(잠금). 다시 하려면 재설정하세요.");
        }
    }

    // XR 버튼(실제 WebXR 실측을 붙이고 싶으면 여기서 startXR 로직을 연결)
    // ✅ iOS/미지원에서는 누르면 즉시 photo로 전환
    async function startXR() {
        if (ios || !xrSupported) {
            setMode("photo");
            setStatusMsg("AR 실측(WebXR)을 지원하지 않아 사진 실측으로 전환합니다.");
            speak("이 기기는 AR 실측을 지원하지 않아 사진 실측으로 전환합니다.");
            return;
        }

        // 여기부터는 "WebXR 실측" 구현 영역(현재 프로젝트는 사진 실측이 주력)
        // 현장 멈춤 방지 위해: 지금은 안내만 하고 photo로 돌립니다.
        setMode("photo");
        setStatusMsg("WebXR 실측은 기기/브라우저 편차가 큽니다. 사진 실측(권장)으로 진행합니다.");
        speak("사진 실측 모드로 진행합니다.");
    }

    return (
        <div style={wrap}>
            {/* 상단 컨트롤 */}
            <div style={toolbar}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                        type="button"
                        style={btn}
                        onClick={() => {
                            setMode("photo");
                            setStatusMsg(ios ? "iOS에서는 사진 실측 모드로 진행합니다." : "");
                        }}
                        disabled={locked}
                    >
                        사진 실측(권장)
                    </button>

                    {/* XR 지원 + iOS 아님 */}
                    {xrSupported && !ios && (
                        <button type="button" style={btn} onClick={startXR} disabled={locked}>
                            AR 실측(WebXR)
                        </button>
                    )}

                    <button type="button" style={btn} onClick={resetAll}>
                        재설정
                    </button>

                    <span style={{ opacity: 0.86, fontSize: 12 }}>
                        {statusMsg ? statusMsg : ""}
                    </span>
                </div>

                {/* mm/px */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>mm/px</span>
                    <input
                        type="number"
                        step="0.001"
                        value={mmPerPx}
                        onChange={(e) => setMmPerPx(Number(e.target.value || 1))}
                        style={num}
                        disabled={locked}
                    />
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                        (예: 1px=1mm 이면 1.0)
                    </span>
                </div>
            </div>

            {/* PHOTO 모드 UI */}
            {mode === "photo" && (
                <div style={panel}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {/* 카메라 */}
                        <button type="button" style={btnPrimary} onClick={startCamera} disabled={cameraOn || locked}>
                            카메라 시작
                        </button>

                        <button type="button" style={btn} onClick={stopCamera} disabled={!cameraOn}>
                            카메라 종료
                        </button>

                        <button type="button" style={btnPrimary} onClick={captureFromVideo} disabled={!cameraOn || locked}>
                            촬영(캡처)
                        </button>

                        {/* 업로드 */}
                        <label style={fileLabel}>
                            사진 업로드
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                disabled={locked}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    onPickFile(f);
                                    e.currentTarget.value = "";
                                }}
                            />
                        </label>

                        <button type="button" style={btnConfirm} onClick={confirm} disabled={!corners || !imageDataUrl}>
                            실측 확정(주입+잠금)
                        </button>

                        {locked && <span style={lockedBadge}>잠금됨</span>}
                    </div>

                    {/* 카메라 미리보기 */}
                    {!imageDataUrl && (
                        <div style={{ marginTop: 10 }}>
                            <video
                                ref={videoRef}
                                style={video}
                                playsInline
                                muted
                                autoPlay
                            />
                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                                * iOS는 반드시 Safari(https)에서, 그리고 <b>버튼을 눌러서</b> 카메라를 시작해야 안정적입니다.
                            </div>
                        </div>
                    )}

                    {/* 캔버스(코너 드래그) */}
                    {imageDataUrl && (
                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                                코너를 드래그로 맞춘 뒤 “실측 확정”을 누르세요.
                            </div>
                            <div style={canvasWrap}>
                                <canvas
                                    ref={canvasRef}
                                    id="frame-measure-canvas"
                                    style={canvas}
                                    onPointerDown={onPointerDown}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
                                    onPointerCancel={onPointerUp}
                                />
                            </div>

                            <div style={stats}>
                                <div>가로: <b>{derived.widthMm}mm</b></div>
                                <div>세로: <b>{derived.heightMm}mm</b></div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                <button
                                    type="button"
                                    style={btn}
                                    onClick={() => {
                                        if (!imgSize) return;
                                        setCorners(createInitialCorners(imgSize.w, imgSize.h, 0.10));
                                        setLocked(false);
                                        setStatusMsg("코너 초기화 완료.");
                                    }}
                                    disabled={!imgSize}
                                >
                                    코너 초기화
                                </button>

                                <button
                                    type="button"
                                    style={btn}
                                    onClick={() => {
                                        setLocked(false);
                                        setStatusMsg("잠금 해제(수정 가능).");
                                    }}
                                    disabled={!locked}
                                >
                                    잠금 해제
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* XR 모드 화면(현장 멈춤 방지 위해 현재는 photo로 유도) */}
            {mode === "xr" && (
                <div style={panel}>
                    <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
                        <b>AR 실측(WebXR)</b>은 기기/브라우저 편차가 커서 현장 안정성이 떨어집니다. <br />
                        지원 기기에서도 “실측 확정 파이프라인”은 <b>사진 실측(4코너)</b>을 추천합니다.
                    </div>
                    <div style={{ marginTop: 10 }}>
                        <button type="button" style={btnPrimary} onClick={() => setMode("photo")}>
                            사진 실측으로 전환
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function drawHandle(
    ctx: CanvasRenderingContext2D,
    p: Pt,
    label: string,
    active: boolean,
    locked: boolean
) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);

    ctx.fillStyle = locked
        ? "rgba(160,160,160,0.9)"
        : active
            ? "rgba(255,200,0,0.95)"
            : "rgba(0,255,0,0.9)";
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();

    ctx.font = "bold 14px system-ui";
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillText(label, p.x + 18, p.y - 12);
    ctx.restore();
}

/** ===== styles ===== */
const wrap: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
};

const toolbar: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
};

const panel: React.CSSProperties = {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
};

const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,160,255,0.55)",
    background: "rgba(0,160,255,0.18)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const btnConfirm: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,255,0,0.55)",
    background: "rgba(0,255,0,0.14)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const num: React.CSSProperties = {
    width: 110,
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
};

const fileLabel: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const lockedBadge: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 900,
};

const video: React.CSSProperties = {
    width: "100%",
    maxHeight: 360,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
};

const canvasWrap: React.CSSProperties = {
    width: "100%",
    overflow: "auto",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.14)",
};

const canvas: React.CSSProperties = {
    width: "100%", // CSS 스케일(실 좌표는 내부 계산에서 환산)
    height: "auto",
    display: "block",
    touchAction: "none", // ✅ 드래그 안정화
};

const stats: React.CSSProperties = {
    marginTop: 8,
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    fontSize: 13,
    opacity: 0.92,
};
