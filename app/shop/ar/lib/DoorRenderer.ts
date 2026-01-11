
export type LayerConfig = {
    doorId: string;
    frameColor: string; // Hex or filter name
    glassType: "clear" | "satin" | "flute" | "bronze" | "dark";
    opacity: number;
};

export type Quad = [{ x: number, y: number }, { x: number, y: number }, { x: number, y: number }, { x: number, y: number }];

export class DoorRenderer {
    // 1. 3D Projection Logic
    static calculateQuad(
        yawDeg: number,
        pitchDeg: number,
        rollDeg: number,
        scale: number,
        baseW: number,
        baseH: number,
        canvasW: number,
        canvasH: number
    ): Quad {
        // Convert to radians
        const yaw = (yawDeg * Math.PI) / 180;
        const pitch = (pitchDeg * Math.PI) / 180;
        const roll = (rollDeg * Math.PI) / 180;

        // Base rectangle centered at 0,0,0
        // Aspect ratio of the door is preserved
        const hw = (baseW / 2) * scale;
        const hh = (baseH / 2) * scale;

        // 3D Points (Local)
        // BL, BR, TR, TL (CCW or whatever order matches the Quad expectation 0,1,2,3)
        // Quad expected: TL, TR, BR, BL (based on typical 0,0 to w,h order)
        // Let's check existing code usage of "quad".
        // page.tsx: {0,0}, {w,0}, {w,h}, {0,h} -> TL, TR, BR, BL order
        const localPts = [
            { x: -hw, y: -hh, z: 0 }, // TL (in 3D usually Y is up, let's say -y is up for screen coords? No, let's use standard 3D)
            // Screen Coorde: +Y is down.
            // Let's use standard 3D: X right, Y up, Z towards viewer.
            // TL: -X, +Y. TR: +X, +Y. BR: +X, -Y. BL: -X, -Y
            { x: -hw, y: hh, z: 0 },  // TL
            { x: hw, y: hh, z: 0 },   // TR
            { x: hw, y: -hh, z: 0 },  // BR
            { x: -hw, y: -hh, z: 0 }, // BL
        ];

        // Rotation Matrices
        const cy = Math.cos(yaw); const sy = Math.sin(yaw);
        const cp = Math.cos(pitch); const sp = Math.sin(pitch);
        const cr = Math.cos(roll); const sr = Math.sin(roll);

        // Projected Points
        const projected = localPts.map(p => {
            // Include basic rotation math
            // Order: Yaw -> Pitch -> Roll (Intrinsic?) or Extrinsic? 
            // Standard: Rz * Ry * Rx

            // 1. Pitch (X-axis)
            let y1 = p.y * cp - p.z * sp;
            let z1 = p.y * sp + p.z * cp;
            let x1 = p.x;

            // 2. Yaw (Y-axis)
            let x2 = x1 * cy + z1 * sy;
            let z2 = -x1 * sy + z1 * cy;
            let y2 = y1;

            // 3. Roll (Z-axis)
            let x3 = x2 * cr - y2 * sr;
            let y3 = x2 * sr + y2 * cr;
            let z3 = z2;

            // 4. Perspective Projection
            // Simple camera at z = focalLength
            const focalLength = 1000;
            // If z3 is close to focalLength, boom.
            // We assume object is at z=0, camera at +focalLength? Or Object moved back?
            // Let's move object back so it's visible.
            const dist = 1000;
            const zFinal = dist - z3; // Camera is at +1000, looking at 0.

            const persp = focalLength / Math.max(zFinal, 1);

            return {
                x: x3 * persp,
                y: -y3 * persp // Flip Y back for Screen Coords (+Y down)
            };
        });

        // Center on Canvas
        const cx = canvasW / 2;
        const canvasCy = canvasH / 2;

        return [
            { x: cx + projected[0].x, y: canvasCy + projected[0].y },
            { x: cx + projected[1].x, y: canvasCy + projected[1].y },
            { x: cx + projected[2].x, y: canvasCy + projected[2].y },
            { x: cx + projected[3].x, y: canvasCy + projected[3].y },
        ];
    }

    // 2. Layer Composition Logic
    static async compose(
        baseImg: HTMLImageElement, // The main door image (or frame)
        glassImg: HTMLImageElement | null,
        frameColor: string,
        glassType: LayerConfig['glassType']
    ): Promise<HTMLCanvasElement> {
        const w = baseImg.naturalWidth;
        const h = baseImg.naturalHeight;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return canvas;

        // -- Step 1: Draw Glass (Behind Frame) --
        // Use full rect for glass if no specific mask, or use existing image alpha?
        // Assuming baseImg is the FRAME with transparency for glass area.

        // 1. Draw Glass placeholder color/style
        ctx.save();
        if (glassType === 'satin') {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // Hazy
        } else if (glassType === 'dark') {
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        } else if (glassType === 'bronze') {
            ctx.fillStyle = "rgba(100, 50, 0, 0.2)";
        } else if (glassType === 'flute') {
            // Basic stripe pattern
            // (Advanced: load actual flute texture)
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        } else {
            // Clear
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        }
        ctx.fillRect(0, 0, w, h);

        // Fluted Lines effect
        if (glassType === 'flute') {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 10) {
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            }
            ctx.stroke();
        }
        ctx.restore();

        // -- Step 2: Draw Frame --
        // We need to tint the frame.
        // Method: Draw frame -> SourceIn color -> Draw original (Composite)
        // If baseImg is just the Frame (cutout), we can composite.

        // Buffer for frame tinting
        const fCan = document.createElement("canvas");
        fCan.width = w; fCan.height = h;
        const fCtx = fCan.getContext("2d");
        if (fCtx) {
            fCtx.drawImage(baseImg, 0, 0);

            // Tinting
            if (frameColor !== 'default' && frameColor !== '화이트' && frameColor !== 'white') {
                fCtx.globalCompositeOperation = "source-in";
                fCtx.fillStyle = DoorRenderer.parseColor(frameColor);
                fCtx.fillRect(0, 0, w, h);

                // Blend mode to keep texture details?
                // "multiply" or "overlay" is better than pure source-in flat color.
                // Let's retry: Draw Image -> Draw Color (Multiply) -> Mask with Image Alpha

                // Reset
                fCtx.globalCompositeOperation = "source-over";
                fCtx.clearRect(0, 0, w, h);
                fCtx.drawImage(baseImg, 0, 0);

                fCtx.globalCompositeOperation = "multiply";
                fCtx.fillStyle = DoorRenderer.parseColor(frameColor);
                fCtx.fillRect(0, 0, w, h);

                // Restore Alpha
                fCtx.globalCompositeOperation = "destination-in";
                fCtx.drawImage(baseImg, 0, 0);
            }

            // Draw Tinted Frame onto Main Canvas
            ctx.drawImage(fCan, 0, 0);
        } else {
            ctx.drawImage(baseImg, 0, 0);
        }

        return canvas;
    }

    static parseColor(c: string) {
        if (c === '블랙' || c === 'black') return "#333333";
        if (c === '브론즈' || c === 'bronze') return "#8B4513";
        if (c === '실버' || c === 'silver') return "#CCCCCC";
        if (c === '골드' || c === 'gold') return "#DAA520";
        return c; // Hex or otherwise
    }
}
