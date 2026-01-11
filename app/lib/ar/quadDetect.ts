export type Pt = { x: number; y: number };
export type Quad = { tl: Pt; tr: Pt; br: Pt; bl: Pt };
export type RectWH = { wPx: number; hPx: number };

declare global {
    interface Window { cv: any; }
}

export function orderQuad(pts: Pt[]): Quad | null {
    if (!pts || pts.length !== 4) return null;

    // sum(x+y): tl smallest, br largest
    // diff(x-y): tr smallest, bl largest
    const sum = pts.map((p) => p.x + p.y);
    const diff = pts.map((p) => p.x - p.y);

    // Find indices
    const tlIdx = sum.indexOf(Math.min(...sum));
    const brIdx = sum.indexOf(Math.max(...sum));
    const trIdx = diff.indexOf(Math.max(...diff));
    const blIdx = diff.indexOf(Math.min(...diff));

    return {
        tl: pts[tlIdx],
        tr: pts[trIdx],
        br: pts[brIdx],
        bl: pts[blIdx]
    };
}

export function quadWH(quad: Quad): RectWH {
    const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
    const top = dist(quad.tl, quad.tr);
    const bottom = dist(quad.bl, quad.br);
    const left = dist(quad.tl, quad.bl);
    const right = dist(quad.tr, quad.br);
    return { wPx: (top + bottom) / 2, hPx: (left + right) / 2 };
}

export function emaPt(prev: Pt, next: Pt, alpha = 0.22): Pt {
    return {
        x: prev.x + (next.x - prev.x) * alpha,
        y: prev.y + (next.y - prev.y) * alpha,
    };
}

export function emaQuad(prev: Quad, next: Quad, alpha = 0.22): Quad {
    return {
        tl: emaPt(prev.tl, next.tl, alpha),
        tr: emaPt(prev.tr, next.tr, alpha),
        br: emaPt(prev.br, next.br, alpha),
        bl: emaPt(prev.bl, next.bl, alpha),
    };
}

/**
 * 다운샘플 캔버스에서 "문틀 4코너" 찾기
 * - 가장 큰 4점 다각형(사각형/근사 사각형)을 찾는다
 * - 실패 시 null
 */
export function detectDoorQuadFromCanvas(cv: any, canvas: HTMLCanvasElement): Quad | null {
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    const blur = new cv.Mat();
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        cv.Canny(blur, edges, 70, 180);

        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let bestPts: Pt[] | null = null;
        let bestArea = 0;

        for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

            if (approx.rows === 4 && cv.isContourConvex(approx)) {
                // approx.data32S: [x1,y1,x2,y2,x3,y3,x4,y4]
                const data = approx.data32S;
                const pts: Pt[] = [
                    { x: data[0], y: data[1] },
                    { x: data[2], y: data[3] },
                    { x: data[4], y: data[5] },
                    { x: data[6], y: data[7] },
                ];

                const r = cv.boundingRect(approx);
                const area = r.width * r.height;

                const minArea = canvas.width * canvas.height * 0.12; // 최소 12%
                const maxArea = canvas.width * canvas.height * 0.94; // 최대 94%

                // Filter by Area & Aspect Ratio
                if (area >= minArea && area <= maxArea) {
                    const ar = r.width / Math.max(1, r.height);
                    if (ar >= 0.35 && ar <= 2.9) {
                        if (area > bestArea) {
                            bestArea = area;
                            bestPts = pts;
                        }
                    }
                }
            }
            approx.delete();
        }

        if (!bestPts) return null;
        return orderQuad(bestPts);

    } catch (e) {
        console.error(e);
        return null;
    } finally {
        src.delete();
        gray.delete();
        blur.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
    }
}
