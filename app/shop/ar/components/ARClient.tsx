"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type FitMode = "cover" | "contain";

/** =========================
 *  Utils: detect fit mode
 *  (요청하신 시그니처 포함)
 ========================= */
export function detectFitMode(
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    imgCSSObjectFit?: string | null
): FitMode {
    // 1) CSS object-fit이 명시되어 있으면 우선
    const css = (imgCSSObjectFit || "").toLowerCase();
    if (css === "cover" || css === "contain") return css as FitMode;

    // 2) 명시가 없으면 "채우는 화면(cover)"을 기본으로 하되,
    // 비율이 크게 차이나면 contain을 선택
    const previewAR = previewW / Math.max(1, previewH);
    const imageAR = imageW / Math.max(1, imageH);
    const diff = Math.abs(previewAR - imageAR);

    // diff가 크면 contain이 더 안전(잘림 방지)
    return diff > 0.35 ? "contain" : "cover";
}

/** =========================
 *  Utils: fit mapping
 *  preview 좌표 -> image 좌표 변환 (ROI, 사각형 변환)
 ========================= */
export function mapPreviewToImageRect(args: {
    // preview 영역(화면에 보이는 video 박스)
    previewW: number;
    previewH: number;
    // 실제 이미지(video frame) 크기
    imageW: number;
    imageH: number;
    // preview 상의 rect (x,y,w,h)
    rect: { x: number; y: number; w: number; h: number };
    fitMode: FitMode; // cover/contain
}) {
    const { previewW, previewH, imageW, imageH, rect, fitMode } = args;

    // 스케일 계산
    const scaleX = previewW / imageW;
    const scaleY = previewH / imageH;

    let scale: number;
    if (fitMode === "cover") scale = Math.max(scaleX, scaleY);
    else scale = Math.min(scaleX, scaleY);

    // 화면에서 이미지가 차지하는 실제 크기
    const drawnW = imageW * scale;
    const drawnH = imageH * scale;

    // 중앙 정렬 기준 오프셋
    const offsetX = (previewW - drawnW) / 2;
    const offsetY = (previewH - drawnH) / 2;

    // preview -> image 좌표 역변환
    const ix = (rect.x - offsetX) / scale;
    const iy = (rect.y - offsetY) / scale;
    const iw = rect.w / scale;
    const ih = rect.h / scale;

    // clamp
    const cx = Math.max(0, Math.min(imageW, ix));
    const cy = Math.max(0, Math.min(imageH, iy));
    const cw = Math.max(0, Math.min(imageW - cx, iw));
    const ch = Math.max(0, Math.min(imageH - cy, ih));

    return { x: cx, y: cy, w: cw, h: ch, scale, offsetX, offsetY, drawnW, drawnH };
}

/** =========================
 *  Utils: camera start/stop
 ========================= */
async function startCamera(video: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 카메라(getUserMedia)를 지원하지 않습니다.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    });

    // iOS/Samsung 계열에서 중요: video 속성 먼저 세팅
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.autoplay = true;

    video.srcObject = stream;

    await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
    });

    // 모바일 자동재생 정책 대응
    await video.play().catch(() => { });
    return stream;
}

function stopStream(stream?: MediaStream | null) {
    stream?.getTracks()?.forEach((t) => t.stop());
}

function isInAppBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    return (
        ua.includes("kakaotalk") ||
        ua.includes("naver") ||
        ua.includes("daum") ||
        ua.includes("instagram") ||
        ua.includes("fbav") ||
        ua.includes("fb_iab") ||
        ua.includes("line") ||
        ua.includes("wv") // 안드로이드 webview
    );
}

/** =========================
 *  Main Component
 ========================= */
export default function ARClient() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [err, setErr] = useState<string>("");
    const [ready, setReady] = useState(false);
    const [fitMode, setFitMode] = useState<FitMode>("cover");

    // 예시: “문 영역” ROI(미리보기 좌표 기준) — 테스트용
    const [roi, setRoi] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    // 디버그 정보
    const [debug, setDebug] = useState({
        previewW: 0,
        previewH: 0,
        imageW: 0,
        imageH: 0,
    });

    const inApp = useMemo(() => {
        if (typeof window === "undefined") return false;
        return isInAppBrowser();
    }, []);

    useEffect(() => {
        let stream: MediaStream | null = null;

        (async () => {
            try {
                setErr("");
                const v = videoRef.current;
                if (!v) return;

                stream = await startCamera(v);

                // 비디오 실제 프레임 크기
                const imageW = v.videoWidth || 1280;
                const imageH = v.videoHeight || 720;

                // preview(화면에 보이는 영역) 크기
                const previewW = v.clientWidth || window.innerWidth;
                const previewH = v.clientHeight || window.innerHeight;

                const computed = window.getComputedStyle(v);
                const detected = detectFitMode(previewW, previewH, imageW, imageH, computed.objectFit);

                setFitMode(detected);
                setDebug({ previewW, previewH, imageW, imageH });

                // 기본 ROI(중앙 사각형) — 테스트용
                const w = Math.round(previewW * 0.72);
                const h = Math.round(previewH * 0.45);
                const x = Math.round((previewW - w) / 2);
                const y = Math.round((previewH - h) / 2);
                setRoi({ x, y, w, h });

                setReady(true);
            } catch (e: any) {
                const msg = e?.name
                    ? `${e.name}: ${e.message || "카메라 시작 실패"}`
                    : e?.message || "카메라 시작 실패";
                setErr(msg);
            }
        })();

        return () => stopStream(stream);
    }, []);

    // 오버레이 그리기(ROI를 “선”이 아니라 “면”으로 표시)
    useEffect(() => {
        if (!ready) return;
        const c = overlayCanvasRef.current;
        const v = videoRef.current;
        if (!c || !v) return;

        const draw = () => {
            const w = v.clientWidth || window.innerWidth;
            const h = v.clientHeight || window.innerHeight;
            c.width = w;
            c.height = h;

            const ctx = c.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, w, h);

            // 배경 면(반투명)
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 0, w, h);

            if (roi) {
                // ROI 영역은 구멍처럼 뚫기
                ctx.clearRect(roi.x, roi.y, roi.w, roi.h);

                // ROI 테두리(녹색)
                ctx.strokeStyle = "rgba(0,255,120,1)";
                ctx.lineWidth = 3;
                ctx.strokeRect(roi.x, roi.y, roi.w, roi.h);

                // ROI 상단 라벨
                ctx.fillStyle = "rgba(0,255,120,1)";
                ctx.font = "bold 14px sans-serif";
                ctx.fillText("문 영역(ROI)", roi.x + 8, roi.y - 10 < 12 ? roi.y + 18 : roi.y - 10);
            }

            requestAnimationFrame(draw);
        };

        draw();
    }, [ready, roi]);

    // 합성 결과 버튼(예: 캡처/합성 미리보기)
    const onCapture = async () => {
        try {
            const v = videoRef.current;
            if (!v) return;

            const imageW = v.videoWidth || 1280;
            const imageH = v.videoHeight || 720;

            const previewW = v.clientWidth || window.innerWidth;
            const previewH = v.clientHeight || window.innerHeight;

            const rect = roi ?? { x: 0, y: 0, w: previewW, h: previewH };

            const mapped = mapPreviewToImageRect({
                previewW,
                previewH,
                imageW,
                imageH,
                rect,
                fitMode,
            });

            // 실제 프레임 캡처
            const canvas = document.createElement("canvas");
            canvas.width = imageW;
            canvas.height = imageH;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(v, 0, 0, imageW, imageH);

            // ROI만 잘라보기(테스트)
            const crop = document.createElement("canvas");
            crop.width = Math.max(1, Math.round(mapped.w));
            crop.height = Math.max(1, Math.round(mapped.h));
            const c2 = crop.getContext("2d");
            if (!c2) return;

            c2.drawImage(
                canvas,
                mapped.x,
                mapped.y,
                mapped.w,
                mapped.h,
                0,
                0,
                crop.width,
                crop.height
            );

            const url = crop.toDataURL("image/png");
            // 새 탭으로 결과 확인 (테스트용)
            window.open(url, "_blank");
        } catch (e: any) {
            alert(e?.message ?? "캡처 실패");
        }
    };

    const onRetry = async () => {
        // 간단 리로드(권한 다시 묻게)
        location.reload();
    };

    return (
        <div style={wrap}>
            {/* CAMERA LAYER (터치 막지 않도록 pointer-events: none) */}
            <div style={cameraLayer}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: fitMode,
                        background: "black",
                    }}
                />
                <canvas ref={overlayCanvasRef} style={overlayCanvas} />
            </div>

            {/* UI LAYER (터치 가능) */}
            <div style={uiLayer}>
                <div style={topBar}>
                    <div style={{ fontWeight: 900 }}>필드X AR</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>fit: {fitMode}</div>
                </div>

                {!ready && !err && (
                    <div style={centerCard}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>카메라 준비중...</div>
                        <div style={{ opacity: 0.75, fontSize: 13 }}>권한 요청이 뜨면 허용해주세요.</div>
                    </div>
                )}

                {err && (
                    <div style={errorCard}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>카메라를 시작할 수 없습니다</div>
                        <div style={{ fontSize: 13, opacity: 0.85, whiteSpace: "pre-wrap" }}>{err}</div>

                        {inApp && (
                            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.95 }}>
                                ⚠️ 카톡/네이버/인스타 “인앱브라우저”에서는 카메라가 막힐 수 있습니다.
                                <br />
                                ✅ “크롬에서 열기”로 다시 시도해주세요.
                            </div>
                        )}

                        <button style={btnPrimary} onClick={onRetry}>
                            다시 시도
                        </button>
                    </div>
                )}

                {/* 하단 버튼 */}
                <div style={bottomBar}>
                    <button
                        style={btnGhost}
                        onClick={() => {
                            // ROI 조절 테스트: 조금 더 크게
                            const v = videoRef.current;
                            if (!v) return;
                            const pw = v.clientWidth || window.innerWidth;
                            const ph = v.clientHeight || window.innerHeight;
                            const w = Math.round(pw * 0.82);
                            const h = Math.round(ph * 0.52);
                            const x = Math.round((pw - w) / 2);
                            const y = Math.round((ph - h) / 2);
                            setRoi({ x, y, w, h });
                        }}
                    >
                        면(ROI) 확대
                    </button>

                    <button style={btnPrimary} onClick={onCapture} disabled={!ready || !!err}>
                        합성/미리보기(캡처)
                    </button>
                </div>

                {/* 디버그(테스트 중만) */}
                <div style={debugBox}>
                    <div>preview: {debug.previewW}x{debug.previewH}</div>
                    <div>image: {debug.imageW}x{debug.imageH}</div>
                </div>
            </div>
        </div>
    );
}

/** =========================
 *  Styles (inline)
 ========================= */
const wrap: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    background: "#000",
};

const cameraLayer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none", // ✅ 카메라/오버레이가 터치 먹지 않게
};

const overlayCanvas: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
};

const uiLayer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
};

const topBar: React.CSSProperties = {
    margin: 12,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backdropFilter: "blur(8px)",
};

const bottomBar: React.CSSProperties = {
    display: "flex",
    gap: 10,
    padding: 12,
};

const centerCard: React.CSSProperties = {
    margin: "0 auto",
    marginTop: 120,
    width: "min(92vw, 420px)",
    padding: 14,
    borderRadius: 16,
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    textAlign: "center",
    backdropFilter: "blur(10px)",
};

const errorCard: React.CSSProperties = {
    margin: "0 auto",
    marginTop: 90,
    width: "min(92vw, 520px)",
    padding: 16,
    borderRadius: 16,
    background: "rgba(180,0,0,0.25)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.18)",
    backdropFilter: "blur(10px)",
};

const btnPrimary: React.CSSProperties = {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
};

const debugBox: React.CSSProperties = {
    margin: 12,
    padding: "8px 10px",
    borderRadius: 12,
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    lineHeight: 1.4,
    alignSelf: "flex-start",
};
