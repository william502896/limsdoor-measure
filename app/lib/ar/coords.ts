import { FitMode, getRenderedImageRect } from "./fit";

export type Pt = { x: number; y: number };

export function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

/** preview 좌표 → 원본 이미지 좌표 */
export function toImageCoord(
    p: Pt,
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    fit: FitMode
): Pt {
    const { scale, offsetX, offsetY } = getRenderedImageRect(previewW, previewH, imageW, imageH, fit);

    const x = (p.x - offsetX) / scale;
    const y = (p.y - offsetY) / scale;

    return { x: clamp(x, 0, imageW), y: clamp(y, 0, imageH) };
}

/** 원본 이미지 좌표 → preview 좌표 */
export function toViewCoord(
    p: Pt,
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    fit: FitMode
): Pt {
    const { scale, offsetX, offsetY } = getRenderedImageRect(previewW, previewH, imageW, imageH, fit);
    return { x: p.x * scale + offsetX, y: p.y * scale + offsetY };
}
