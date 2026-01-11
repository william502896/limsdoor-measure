"use client";

// ==========================================
// Types
// ==========================================
export type FitMode = "cover" | "contain";

export type ImageRectMap = {
    x: number;
    y: number;
    w: number;
    h: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    drawnW: number;
    drawnH: number;
};

// ==========================================
// 1. Detect Fit Mode
// cover/contain 자동 결정 (비율 차이가 크면 contain)
// ==========================================
export function detectFitMode(
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    imgCSSObjectFit?: string | null
): FitMode {
    const css = (imgCSSObjectFit || "").toLowerCase();
    if (css === "cover" || css === "contain") return css as FitMode;

    const previewAR = previewW / Math.max(1, previewH);
    const imageAR = imageW / Math.max(1, imageH);
    const diff = Math.abs(previewAR - imageAR);

    // 0.35 threshold (ex: 16:9 vs 4:3 is ok, but wider diff -> contain)
    return diff > 0.35 ? "contain" : "cover";
}

// ==========================================
// 2. Map Preview Rect -> Image Rect
// 화면상 ROI/좌표를 실제 이미지(비디오 프레임) 좌표로 변환
// ==========================================
export function mapPreviewToImageRect(args: {
    previewW: number;
    previewH: number;
    imageW: number;
    imageH: number;
    rect: { x: number; y: number; w: number; h: number };
    fitMode: FitMode;
}): ImageRectMap {
    const { previewW, previewH, imageW, imageH, rect, fitMode } = args;

    const scaleX = previewW / imageW;
    const scaleY = previewH / imageH;

    let scale: number;
    if (fitMode === "cover") scale = Math.max(scaleX, scaleY);
    else scale = Math.min(scaleX, scaleY);

    const drawnW = imageW * scale;
    const drawnH = imageH * scale;

    const offsetX = (previewW - drawnW) / 2;
    const offsetY = (previewH - drawnH) / 2;

    // Inverse Map
    const ix = (rect.x - offsetX) / scale;
    const iy = (rect.y - offsetY) / scale;
    const iw = rect.w / scale;
    const ih = rect.h / scale;

    // Clamp
    const cx = Math.max(0, Math.min(imageW, ix));
    const cy = Math.max(0, Math.min(imageH, iy));
    const cw = Math.max(0, Math.min(imageW - cx, iw));
    const ch = Math.max(0, Math.min(imageH - cy, ih));

    return { x: cx, y: cy, w: cw, h: ch, scale, offsetX, offsetY, drawnW, drawnH };
}

// ==========================================
// 3. Camera Controls (Robust Mobile Support)
// ==========================================
export async function startCamera(video: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 카메라를 지원하지 않습니다 (WebRTC Not Supported).");
    }

    // iOS/Samsung Mandatory Attributes
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.autoplay = true;

    // Prefer 720p for balance of performance/quality on mobile
    const constraints = {
        video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    // Wait for metadata
    await new Promise<void>((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.onloadedmetadata = () => resolve();
    });

    // Force Play (Mobile)
    await video.play().catch((e) => console.warn("Auto-play blocked, waiting for user gesture", e));

    return stream;
}

export function stopStream(stream?: MediaStream | null) {
    stream?.getTracks()?.forEach((t) => t.stop());
}

// ==========================================
// 4. In-App Browser Check
// ==========================================
export function isInAppBrowser() {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    return (
        ua.includes("kakaotalk") ||
        ua.includes("naver") ||
        ua.includes("daum") ||
        ua.includes("instagram") ||
        ua.includes("fbav") ||
        ua.includes("fb_iab") ||
        ua.includes("line") ||
        ua.includes("wv")
    );
}
