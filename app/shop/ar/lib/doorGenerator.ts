import { DoorConfig, DoorStructure, FrameColor, GlassType, DesignType } from "../types";

/* =========================
   2) PNG 자동 전환 규칙 (Placeholder)
========================= */
const DESIGN_PNG_MAP: Partial<Record<DesignType, string>> = {
    // "유럽형 통유리": "/door-png/europe_fullglass.png",
};

function getDesignPngPath(designType: DesignType): string | null {
    const p = DESIGN_PNG_MAP[designType];
    return p ?? null;
}

/* =========================
   3) 프레임/유리 렌더링 파라미터
========================= */
function framePaint(frameColor: FrameColor) {
    switch (frameColor) {
        case "화이트": return { base: "#e9edf2", edge: "#b8c0cb", shadow: "rgba(0,0,0,0.18)" };
        case "블랙": return { base: "#1b1b1d", edge: "#4b4b50", shadow: "rgba(0,0,0,0.35)" };
        case "그레이": return { base: "#9aa3ad", edge: "#6f7782", shadow: "rgba(0,0,0,0.24)" };
        case "골드": return { base: "#caa35a", edge: "#8f6a2b", shadow: "rgba(0,0,0,0.22)" };
    }
}

function glassPaint(glassType: GlassType) {
    const common = { highlight: "rgba(255,255,255,0.10)", reflection: "rgba(255,255,255,0.08)" };
    switch (glassType) {
        case "투명": return { ...common, fill: "rgba(255,255,255,0.04)", tint: null, blur: 0 };
        case "샤틴": return { ...common, fill: "rgba(255,255,255,0.22)", tint: null, blur: 0 };
        case "투명샤틴": return { ...common, fill: "rgba(255,255,255,0.14)", tint: null, blur: 0 };
        case "미스트": return { ...common, fill: "rgba(255,255,255,0.26)", tint: null, blur: 0 };
        case "브론즈": return { ...common, fill: "rgba(160,110,60,0.22)", tint: "rgba(160,110,60,0.12)", blur: 0 };
        case "브론즈샤틴": return { ...common, fill: "rgba(160,110,60,0.28)", tint: "rgba(160,110,60,0.14)", blur: 0 };
        case "다크그레이": return { ...common, fill: "rgba(40,45,55,0.26)", tint: "rgba(40,45,55,0.14)", blur: 0 };
        case "다크샤틴": return { ...common, fill: "rgba(40,45,55,0.32)", tint: "rgba(40,45,55,0.16)", blur: 0 };
        case "아쿠아": return { ...common, fill: "rgba(80,180,200,0.18)", tint: "rgba(80,180,200,0.10)", blur: 0 };
        case "플루트": return { ...common, fill: "rgba(255,255,255,0.16)", tint: null, blur: 0, pattern: "FLUTE" as const };
        case "머루": return { ...common, fill: "rgba(255,255,255,0.18)", tint: null, blur: 0, pattern: "MERU" as const };
        case "망입유리": return { ...common, fill: "rgba(255,255,255,0.14)", tint: null, blur: 0, pattern: "WIRE" as const };
        case "필름유리": return { ...common, fill: "rgba(255,255,255,0.10)", tint: "rgba(0,0,0,0.08)", blur: 0, pattern: "FILM" as const };
    }
}

/* =========================
   4) Canvas 도어 생성
========================= */
export async function generateDoorPngDataUrl(config: DoorConfig, outW: number, outH: number): Promise<string> {
    const designPngPath = getDesignPngPath(config.designType);
    if (designPngPath) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = designPngPath;
        await new Promise((r) => (img.onload = r)); // Simple await

        const c = document.createElement("canvas");
        c.width = outW;
        c.height = outH;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, outW, outH);
        return c.toDataURL("image/png");
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, outW, outH);

    const frame = framePaint(config.frameColor);
    const glass = glassPaint(config.glassType);

    const pad = Math.max(8, Math.floor(Math.min(outW, outH) * 0.04));
    const frameTh = Math.max(10, Math.floor(Math.min(outW, outH) * 0.06));
    const r = Math.max(10, Math.floor(Math.min(outW, outH) * 0.06));

    const outer = { x: pad, y: pad, w: outW - pad * 2, h: outH - pad * 2 };
    const isArch = config.designType === "아치";

    drawFrame(ctx, outer.x, outer.y, outer.w, outer.h, frameTh, r, frame, isArch);
    const panels = computePanels(config.structure, outer, frameTh);

    for (const p of panels) {
        drawGlass(ctx, p, frameTh, r, glass, isArch);
        if (config.designType === "격자디자인") drawGrid(ctx, p, frameTh);
        else if (config.designType === "간살") drawVerticalBars(ctx, p, frameTh);
        else if (config.designType === "분할") drawSplitPanels(ctx, p, frameTh);
        else if (config.designType === "아치") drawArchAccent(ctx, p, frameTh);
    }

    if (config.structure === "스윙도어" || config.structure === "호패도어") {
        drawHandleAndHinges(ctx, outer, frameTh, config.structure);
    }

    drawReflection(ctx, outer);

    return canvas.toDataURL("image/png");
}

/* Helpers */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, th: number, r: number, frame: any, archTop: boolean) {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, frame.edge);
    grad.addColorStop(0.5, frame.base);
    grad.addColorStop(1, frame.edge);

    ctx.save();
    ctx.shadowColor = frame.shadow;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const innerR = Math.max(6, r - Math.floor(th * 0.4));
    roundRectPath(ctx, x + th, y + th, w - th * 2, h - th * 2, innerR);
    ctx.fill();
    ctx.restore();
}

function computePanels(structure: DoorStructure, outer: { x: number; y: number; w: number; h: number }, th: number) {
    const gap = Math.max(4, Math.floor(th * 0.35));
    const x0 = outer.x + th;
    const y0 = outer.y + th;
    const w0 = outer.w - th * 2;
    const h0 = outer.h - th * 2;
    const mk = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

    let count = 1;
    if (structure === "2슬라이딩") count = 2;
    else if (structure === "3슬라이딩" || structure === "3연동") count = 3;
    else if (structure === "4슬라이딩") count = 4;

    const panels = [];
    if (count === 1) {
        panels.push(mk(x0, y0, w0, h0));
    } else {
        const eachW = Math.floor((w0 - gap * (count - 1)) / count);
        for (let i = 0; i < count; i++) {
            panels.push(mk(x0 + i * (eachW + gap), y0, eachW, h0));
        }
    }
    return panels;
}

function drawGlass(ctx: CanvasRenderingContext2D, p: any, th: number, r: number, glass: any, archTop: boolean) {
    const inset = Math.max(6, Math.floor(th * 0.55));
    const gx = p.x + inset;
    const gy = p.y + inset;
    const gw = p.w - inset * 2;
    const gh = p.h - inset * 2;
    const gr = Math.max(8, Math.floor(r * 0.55));

    ctx.save();
    roundRectPath(ctx, gx, gy, gw, gh, gr);
    ctx.fillStyle = glass.fill;
    ctx.fill();

    if (glass.tint) {
        roundRectPath(ctx, gx, gy, gw, gh, gr);
        ctx.fillStyle = glass.tint;
        ctx.fill();
    }
    if (glass.pattern === "FLUTE") drawFlute(ctx, gx, gy, gw, gh);
    if (glass.pattern === "MERU") drawMeru(ctx, gx, gy, gw, gh);
    if (glass.pattern === "WIRE") drawWire(ctx, gx, gy, gw, gh);
    if (glass.pattern === "FILM") drawFilm(ctx, gx, gy, gw, gh);

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = Math.max(1, Math.floor(th * 0.12));
    ctx.beginPath();
    ctx.moveTo(gx + gw * 0.18, gy + gh * 0.12);
    ctx.lineTo(gx + gw * 0.52, gy + gh * 0.12);
    ctx.stroke();
    ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: any, th: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = Math.max(1, Math.floor(th * 0.10));
    const cols = 3, rows = 4;
    for (let i = 1; i < cols; i++) {
        const x = p.x + (p.w * i) / cols;
        ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.h); ctx.stroke();
    }
    for (let j = 1; j < rows; j++) {
        const y = p.y + (p.h * j) / rows;
        ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.w, y); ctx.stroke();
    }
    ctx.restore();
}

function drawVerticalBars(ctx: CanvasRenderingContext2D, p: any, th: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = Math.max(1, Math.floor(th * 0.14));
    const bars = 6;
    for (let i = 1; i < bars; i++) {
        const x = p.x + (p.w * i) / bars;
        ctx.beginPath(); ctx.moveTo(x, p.y + p.h * 0.08); ctx.lineTo(x, p.y + p.h * 0.92); ctx.stroke();
    }
    ctx.restore();
}

function drawSplitPanels(ctx: CanvasRenderingContext2D, p: any, th: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = Math.max(1, Math.floor(th * 0.12));
    const cuts = [0.33, 0.66];
    for (const c of cuts) {
        const y = p.y + p.h * c;
        ctx.beginPath(); ctx.moveTo(p.x + p.w * 0.08, y); ctx.lineTo(p.x + p.w * 0.92, y); ctx.stroke();
    }
    ctx.restore();
}

function drawArchAccent(ctx: CanvasRenderingContext2D, p: any, th: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = Math.max(1, Math.floor(th * 0.10));
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h * 0.18, p.w * 0.36, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawHandleAndHinges(ctx: CanvasRenderingContext2D, outer: any, th: number, structure: DoorStructure) {
    ctx.save();
    const hx = outer.x + outer.w - th * 1.7;
    const hy = outer.y + outer.h * 0.5;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(hx, hy - th * 0.6, th * 0.25, th * 1.2);
    const hx2 = outer.x + th * 0.55;
    const ys = [0.28, 0.5, 0.72].map(t => outer.y + outer.h * t);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ys.forEach(y => ctx.fillRect(hx2, y - th * 0.22, th * 0.35, th * 0.44));

    if (structure === "호패도어") {
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = Math.max(1, Math.floor(th * 0.12));
        ctx.beginPath();
        ctx.moveTo(outer.x + outer.w * 0.5, outer.y + th);
        ctx.lineTo(outer.x + outer.w * 0.5, outer.y + outer.h - th);
        ctx.stroke();
    }
    ctx.restore();
}

function drawReflection(ctx: CanvasRenderingContext2D, outer: any) {
    ctx.save();
    const gx = outer.x + outer.w * 0.08;
    const gy = outer.y + outer.h * 0.10;
    const gw = outer.w * 0.22;
    const gh = outer.h * 0.78;
    const grad = ctx.createLinearGradient(gx, gy, gx + gw, gy);
    grad.addColorStop(0, "rgba(255,255,255,0.00)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.10)");
    grad.addColorStop(1, "rgba(255,255,255,0.00)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy + gh * 0.06); ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx, gy + gh * 0.94); ctx.closePath(); ctx.fill();
    ctx.restore();
}

/* Texture Helpers */
function drawFlute(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1;
    for (let i = 1; i < 18; i++) { const xx = x + (w * i) / 18; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    ctx.restore();
}
function drawMeru(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const yy = y + (h * i) / 10; ctx.beginPath();
        for (let t = 0; t <= 20; t++) {
            const xx = x + (w * t) / 20; const off = Math.sin((t / 20) * Math.PI * 2) * 2;
            if (t === 0) ctx.moveTo(xx, yy + off); else ctx.lineTo(xx, yy + off);
        }
        ctx.stroke();
    }
    ctx.restore();
}
function drawWire(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1; const step = 28;
    for (let xx = x; xx <= x + w; xx += step) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    for (let yy = y; yy <= y + h; yy += step) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    ctx.restore();
}
function drawFilm(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save(); const grad = ctx.createLinearGradient(x, y, x + w, y + h); grad.addColorStop(0, "rgba(0,0,0,0.04)"); grad.addColorStop(0.5, "rgba(0,0,0,0.10)"); grad.addColorStop(1, "rgba(0,0,0,0.04)"); ctx.fillStyle = grad; ctx.fillRect(x, y, w, h); ctx.restore();
}
