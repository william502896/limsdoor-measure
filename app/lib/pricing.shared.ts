// app/lib/pricing.shared.ts
export type DoorType = "THREE_PANEL" | "ONE_SLIDING" | "SWING" | "HOPE";

export type Coating = "FLUORO" | "ANOD";
export type FrameColor =
    | "WHITE"
    | "MODERN_BLACK"
    | "DARK_SILVER"
    | "CHAMPAGNE_GOLD"
    | "METAL_BLACK"
    | "BLACK"; // 스윙 등에서 쓰게 확장

export type Measurement = {
    widthPoints: number[];  // [w1,w2,w3]
    heightPoints: number[]; // [h1,h2,h3]
};

export type Options = {
    doorType: DoorType;
    coating: Coating;
    frameColor: FrameColor;

    // ✅ 간살: 단가 20,000원 * 수량
    barsQty: number;

    // 현장 할인(원)
    onsiteDiscount: number;

    // 시공비(고객에게는 “자재비 = 총액 - 시공비”로 보여주기)
    installFee: number; // 기본 150,000
};

export type QuoteBreakdown = {
    basePrice: number;
    sizeSurcharge: number;
    colorSurcharge: number;
    barsTotal: number;
    onsiteDiscount: number;
    installFee: number;

    total: number;       // 총액(자재+시공)
    material: number;    // 자재비(= total - installFee)
};

function clampInt(n: number, min: number, max: number) {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function computeWidthHeightMm(m: Measurement) {
    const w = (m.widthPoints ?? []).filter(Number.isFinite);
    const h = (m.heightPoints ?? []).filter(Number.isFinite);

    const wMin = w.length ? Math.min(...w) : 0;
    const hMin = h.length ? Math.min(...h) : 0;

    const wAvg = w.length ? Math.round(w.reduce((a, b) => a + b, 0) / w.length) : 0;
    const hAvg = h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : 0;

    return { wMin, hMin, wAvg, hAvg };
}

// ✅ 기본가(요청 주신 기준가 반영)
function getBasePrice(doorType: DoorType, wMin: number, hMin: number) {
    // 기준 사이즈(이하)
    // 3연동(수동) 1300*2300 69만
    // 원슬라이딩 1200*2300 59만
    // 스윙 1도어 850*2300 64만, 2도어 1200*2300 98만  -> 여기서는 SWING을 1도어로 가정(확장 포인트)
    // 호패 1도어 850*2300 60만, 2도어 1200*2300 94만 -> 여기서는 HOPE를 1도어로 가정(확장 포인트)
    // 사이즈 추가: 100mm 당 7만 추가

    if (doorType === "THREE_PANEL") return 690_000;
    if (doorType === "ONE_SLIDING") return 590_000;
    if (doorType === "SWING") return 640_000;
    if (doorType === "HOPE") return 600_000;

    return 0;
}

function getBaseLimit(doorType: DoorType) {
    if (doorType === "THREE_PANEL") return { w: 1300, h: 2300 };
    if (doorType === "ONE_SLIDING") return { w: 1200, h: 2300 };
    if (doorType === "SWING") return { w: 850, h: 2300 };
    if (doorType === "HOPE") return { w: 850, h: 2300 };
    return { w: 0, h: 0 };
}

// 사이즈 추가: 100mm당 70,000원
function calcSizeSurcharge(doorType: DoorType, wMin: number, hMin: number) {
    const lim = getBaseLimit(doorType);

    const overW = Math.max(0, wMin - lim.w);
    const overH = Math.max(0, hMin - lim.h);
    const over = Math.max(overW, overH); // 가장 큰 초과치 기준(현장 단순화)

    // 1~100mm => 1단위, 101~200mm => 2단위…
    const units = Math.ceil(over / 100);
    return units * 70_000;
}

function calcColorSurcharge(doorType: DoorType, coating: Coating, frameColor: FrameColor) {
    // 기본: WHITE는 0원
    // WHITE 외 불소도장: +70,000
    // 아노다이징: +100,000
    // 호패: 아노다이징 WHITE가 기본, METAL_BLACK/CHAMPAGNE_GOLD 선택시 +100,000
    if (frameColor === "WHITE") return 0;

    if (doorType === "HOPE") {
        // HOPE는 ANOD WHITE 기본
        // WHITE는 0원, 나머지(메탈블랙/샴페인골드 등)는 +100,000
        return 100_000;
    }

    if (coating === "FLUORO") return 70_000;
    if (coating === "ANOD") return 100_000;

    return 0;
}

export function calcQuote(measurement: Measurement, options: Options): QuoteBreakdown {
    const { wMin, hMin } = computeWidthHeightMm(measurement);

    const basePrice = getBasePrice(options.doorType, wMin, hMin);
    const sizeSurcharge = calcSizeSurcharge(options.doorType, wMin, hMin);
    const colorSurcharge = calcColorSurcharge(options.doorType, options.coating, options.frameColor);

    const barsQty = clampInt(options.barsQty ?? 0, 0, 99);
    const barsTotal = barsQty * 20_000;

    const onsiteDiscount = clampInt(options.onsiteDiscount ?? 0, 0, 9_999_999);
    const installFee = clampInt(options.installFee ?? 150_000, 0, 9_999_999);

    const totalBeforeDiscount = basePrice + sizeSurcharge + colorSurcharge + barsTotal;
    const total = Math.max(0, totalBeforeDiscount - onsiteDiscount);
    const material = Math.max(0, total - installFee);

    return {
        basePrice,
        sizeSurcharge,
        colorSurcharge,
        barsTotal,
        onsiteDiscount,
        installFee,
        total,
        material,
    };
}
