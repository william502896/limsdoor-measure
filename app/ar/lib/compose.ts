/**
 * AR Compositing Utility
 * Warps an image into a quadrilateral area using triangular affine transforms.
 */

type Point = { x: number; y: number };

// Helper: Solve Affine Transform for 3 points
// Source triangle (s0, s1, s2) -> Destination triangle (d0, d1, d2)
// Returns [a, b, c, d, e, f] where x' = ax + cy + e, y' = bx + dy + f
function getAffineTransform(s0: Point, s1: Point, s2: Point, d0: Point, d1: Point, d2: Point) {
    const den = s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y;

    if (Math.abs(den) < 0.0001) return null; // Parallel / Degenerate

    const a = (d0.x * (s2.y - s1.y) - d1.x * s2.y + d2.x * s1.y + (d1.x - d2.x) * s0.y) / den;
    const b = (d0.y * (s2.y - s1.y) - d1.y * s2.y + d2.y * s1.y + (d1.y - d2.y) * s0.y) / den;
    const c = (d1.x * s2.x - d0.x * s2.x + d0.x * s1.x - d2.x * s1.x + (d2.x - d1.x) * s0.x) / den;
    const d = (d1.y * s2.x - d0.y * s2.x + d0.y * s1.y - d2.y * s1.y + (d2.y - d1.y) * s0.x) / den;
    const e = (d0.x * (s2.y * s1.x - s1.y * s2.x) + s0.x * (d1.x * s2.y - d2.x * s1.y) + s0.y * (d2.x * s1.x - d1.x * s2.x)) / den;
    const f = (d0.y * (s2.y * s1.x - s1.y * s2.x) + s0.x * (d1.y * s2.y - d2.y * s1.y) + s0.y * (d2.y * s1.x - d1.y * s2.x)) / den;

    return { a, b, c, d, e, f };
}

/**
 * Warp Image Logic
 * @param ctx Target canvas context
 * @param img Source Image
 * @param quad 4 corner points [TL, TR, BR, BL] (Screen Coordinates in px)
 */
export function warpImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, quad: Point[]) {
    if (quad.length !== 4) return;

    const w = img.width;
    const h = img.height;

    // Source Points (Rect)
    const sTL = { x: 0, y: 0 };
    const sTR = { x: w, y: 0 };
    const sBR = { x: w, y: h };
    const sBL = { x: 0, y: h };

    // Dest Points (Quad)
    const dTL = quad[0];
    const dTR = quad[1];
    const dBR = quad[2];
    const dBL = quad[3];

    // Split into 2 Triangles:
    // T1: TL-TR-BL (Top-Left Triangle)
    // T2: BL-TR-BR (Bottom-Right Triangle)

    // Render T1
    renderTriangle(ctx, img, [sTL, sTR, sBL], [dTL, dTR, dBL]);

    // Render T2
    renderTriangle(ctx, img, [sBL, sTR, sBR], [dBL, dTR, dBR]);
}

function renderTriangle(ctx: CanvasRenderingContext2D, img: HTMLImageElement, src: Point[], dst: Point[]) {
    const t = getAffineTransform(src[0], src[1], src[2], dst[0], dst[1], dst[2]);
    if (!t) return;

    ctx.save();

    // Clip to destination triangle
    ctx.beginPath();
    ctx.moveTo(dst[0].x, dst[0].y);
    ctx.lineTo(dst[1].x, dst[1].y);
    ctx.lineTo(dst[2].x, dst[2].y);
    ctx.closePath();
    ctx.clip();

    // Apply Transform: matrix(a, b, c, d, e, f)
    ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);

    // Draw Image
    // Note: The transform maps source coords to destination coords.
    // So we draw the image at (0,0) of source.
    ctx.drawImage(img, 0, 0);

    ctx.restore();
}
