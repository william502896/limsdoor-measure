export type Point = { x: number; y: number };

// Settings
const EDGE_THRESHOLD = 20; // Gradient magnitude threshold
const SEARCH_RANGE = 0.15; // Range to search around the guide (normalized 0-1)

/**
 * Lightweight Process Frame
 * Downscale video frame to small offscreen canvas, detect edges, find best quad.
 * 
 * @param video Source video element
 * @param offCanvas Offscreen canvas for processing (should be small, e.g. 320x180)
 * @returns Detected Quad (0-1 normalized) or null if not found
 */
export function findDoorQuad(
    video: HTMLVideoElement,
    offCanvas: HTMLCanvasElement
): { quad: Point[], confidence: "LOW" | "MED" | "HIGH" } | null {

    const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const w = offCanvas.width;
    const h = offCanvas.height;

    // 1. Validate Video
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    // 2. Draw frame
    try {
        ctx.drawImage(video, 0, 0, w, h);
    } catch (e) {
        return null;
    }

    // 2. Get Data
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 3. Score Map (Gradient Magnitude)
    // We only scan areas near the center guide to save perf.
    // Center Guide is approx x: 0.2~0.8, y: 0.2~0.8
    // We search for "Left Vertical", "Right Vertical", "Top Horizontal", "Bottom Horizontal"

    // Config: Center frame is around 20% margin
    const margin = 0.20;
    const lX = Math.floor(w * margin);
    const rX = Math.floor(w * (1 - margin));
    const tY = Math.floor(h * margin);
    const bY = Math.floor(h * (1 - margin));

    // Find Best Lines (Simplified Hough / Slab Scan)
    // Vertical Left
    let bestL = lX;
    let maxGradL = 0;
    // Scan range: +/- 15% width around guide
    const scanW = Math.floor(w * 0.15);

    // Helper: Contrast at (x,y) horizontal
    // Simple [-1, 0, 1] kernel
    function getGradX(x: number, y: number) {
        if (x <= 0 || x >= w - 1) return 0;
        const i = (y * w + x) * 4;
        const i_prev = (y * w + (x - 1)) * 4;
        const i_next = (y * w + (x + 1)) * 4;
        // Grey = 0.299r + 0.587g + 0.114b
        const g = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]);
        const g_prev = (0.3 * data[i_prev] + 0.59 * data[i_prev + 1] + 0.11 * data[i_prev + 2]);
        const g_next = (0.3 * data[i_next] + 0.59 * data[i_next + 1] + 0.11 * data[i_next + 2]);
        return Math.abs(g_next - g_prev);
    }

    function getGradY(x: number, y: number) {
        if (y <= 0 || y >= h - 1) return 0;
        const i = (y * w + x) * 4;
        const i_prev = ((y - 1) * w + x) * 4;
        const i_next = ((y + 1) * w + x) * 4;
        const g = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]);
        const g_prev = (0.3 * data[i_prev] + 0.59 * data[i_prev + 1] + 0.11 * data[i_prev + 2]);
        const g_next = (0.3 * data[i_next] + 0.59 * data[i_next + 1] + 0.11 * data[i_next + 2]);
        return Math.abs(g_next - g_prev);
    }

    // 1. Scan Left Vertical Line
    let sumGradsL = new Float32Array(scanW * 2 + 1);
    for (let y = tY; y < bY; y += 4) { // Skip rows for speed
        for (let offset = -scanW; offset <= scanW; offset++) {
            const x = lX + offset;
            if (x < 0 || x >= w) continue;
            sumGradsL[offset + scanW] += getGradX(x, y);
        }
    }
    // Find peak
    let peakValL = 0, peakOffL = 0;
    for (let i = 0; i < sumGradsL.length; i++) {
        if (sumGradsL[i] > peakValL) { peakValL = sumGradsL[i]; peakOffL = i - scanW; }
    }
    bestL = lX + peakOffL;

    // 2. Scan Right Vertical Line
    let sumGradsR = new Float32Array(scanW * 2 + 1);
    for (let y = tY; y < bY; y += 4) {
        for (let offset = -scanW; offset <= scanW; offset++) {
            const x = rX + offset;
            if (x < 0 || x >= w) continue;
            sumGradsR[offset + scanW] += getGradX(x, y);
        }
    }
    let peakValR = 0, peakOffR = 0;
    for (let i = 0; i < sumGradsR.length; i++) {
        if (sumGradsR[i] > peakValR) { peakValR = sumGradsR[i]; peakOffR = i - scanW; }
    }
    let bestR = rX + peakOffR;

    // 3. Scan Top Horizontal Line
    // Scan range for Y
    const scanH = Math.floor(h * 0.15);
    let sumGradsT = new Float32Array(scanH * 2 + 1);
    for (let x = bestL; x < bestR; x += 4) {
        for (let offset = -scanH; offset <= scanH; offset++) {
            const y = tY + offset;
            if (y < 0 || y >= h) continue;
            sumGradsT[offset + scanH] += getGradY(x, y);
        }
    }
    let peakValT = 0, peakOffT = 0;
    for (let i = 0; i < sumGradsT.length; i++) {
        if (sumGradsT[i] > peakValT) { peakValT = sumGradsT[i]; peakOffT = i - scanH; }
    }
    let bestT = tY + peakOffT;

    // 4. Scan Bottom Horizontal Line
    let sumGradsB = new Float32Array(scanH * 2 + 1);
    for (let x = bestL; x < bestR; x += 4) {
        for (let offset = -scanH; offset <= scanH; offset++) {
            const y = bY + offset;
            if (y < 0 || y >= h) continue;
            sumGradsB[offset + scanH] += getGradY(x, y);
        }
    }
    let peakValB = 0, peakOffB = 0;
    for (let i = 0; i < sumGradsB.length; i++) {
        if (sumGradsB[i] > peakValB) { peakValB = sumGradsB[i]; peakOffB = i - scanH; }
    }
    let bestB = bY + peakOffB;

    // Confidence Calculation
    // Normalize total gradient by length scanned
    const intensityL = peakValL / ((bY - tY) / 4);
    const intensityR = peakValR / ((bY - tY) / 4);
    const intensityT = peakValT / ((bestR - bestL) / 4);
    const intensityB = peakValB / ((bestR - bestL) / 4);

    const avgIntensity = (intensityL + intensityR + intensityT + intensityB) / 4;

    let confidence: "LOW" | "MED" | "HIGH" = "LOW";
    if (avgIntensity > 30) confidence = "HIGH";
    else if (avgIntensity > 15) confidence = "MED";

    // Normalize to 0-1
    return {
        quad: [
            { x: bestL / w, y: bestT / h }, // TL
            { x: bestR / w, y: bestT / h }, // TR
            { x: bestR / w, y: bestB / h }, // BR
            { x: bestL / w, y: bestB / h }  // BL
        ],
        confidence
    };
}

// Helper: Linear Interpolation for Points
export function lerpQuad(current: Point[], target: Point[], t: number): Point[] {
    return current.map((p, i) => ({
        x: p.x + (target[i].x - p.x) * t,
        y: p.y + (target[i].y - p.y) * t
    }));
}
