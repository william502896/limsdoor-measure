export type CalibrationPreset =
    | { id: "CARD"; label: "신용카드(가로)"; mm: 85.6 }
    | { id: "A4_SHORT"; label: "A4(가로)"; mm: 210 }
    | { id: "A4_LONG"; label: "A4(세로)"; mm: 297 }
    | { id: "RULER_100"; label: "기준자 100mm"; mm: 100 };

export const CAL_PRESETS: CalibrationPreset[] = [
    { id: "CARD", label: "신용카드(가로)", mm: 85.6 },
    { id: "A4_SHORT", label: "A4(가로)", mm: 210 },
    { id: "A4_LONG", label: "A4(세로)", mm: 297 },
    { id: "RULER_100", label: "기준자 100mm", mm: 100 },
];

/** px 길이와 실제 mm 길이로 mmPerPx 산출 */
export function computeMmPerPx(realMm: number, pxLen: number) {
    if (!isFinite(realMm) || realMm <= 0) return null;
    if (!isFinite(pxLen) || pxLen <= 1) return null;
    return realMm / pxLen; // mm per pixel
}

/** 소수 1자리 */
export function round1(n: number) {
    return Math.round(n * 10) / 10;
}

/** 오차 경고(10mm 이상이면 true) */
export function shouldWarnDeltaMm(deltaMm: number, thresholdMm = 10) {
    return Math.abs(deltaMm) >= thresholdMm;
}
