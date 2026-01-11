// app/lib/pricing.ts
export type DoorKind =
    | "3T_MANUAL"       // 수동 3연동
    | "1W_SLIDING"      // 원슬라이딩(1연동 슬라이딩)
    | "SWING_1"         // 스윙 1도어
    | "SWING_2"         // 스윙 2도어
    | "HOPE_1"          // 여닫이(호패) 1도어
    | "HOPE_2"          // 여닫이(호패) 2도어
    | "AUTO";           // 자동문

export type FrameFinish = "FLUORO" | "ANOD";
export type FrameColor =
    | "WHITE"
    | "MODERN_BLACK"
    | "DARK_SILVER"
    | "CHAMPAGNE_GOLD"
    | "METAL_BLACK"
    | "BLACK";

export type GlassBase = "CLEAR_TEMPERED"; // 일단 기준은 투명강화

export type GlassDesign = {
    // ✅ 간살
    muntinSet2LinesCount: number; // "기본형 2줄" 세트 수량 (세트당 30,000)
    muntinExtraBarCount: number;  // "추가 1줄" 단품 수량 (개당 20,000)

    // ✅ 디자인 옵션
    archBasic: boolean;           // 아치형
    archCorner: boolean;          // 모서리 아치(모든 도어)
    bottomPanel: boolean;         // 하부고시
    bigArchVertical: boolean;     // 원슬라이딩 세로 큰아치(1200*2400) 옵션
};

export type DiscountInput = {
    measurerDiscountWon: number;  // 실측자 할인
    promoDiscountWon: number;     // 행사 제품 할인
};

export type PricingInput = {
    door: DoorKind;
    widthMm: number;
    heightMm: number;

    // 옵션
    frameFinish?: FrameFinish;
    frameColor?: FrameColor;
    glassBase?: GlassBase;
    glassDesign?: GlassDesign;

    // ✅ 간살 (별도 수량)
    muntinQty?: number;

    // 시공비(고객에게는 별도 표기)
    installFeeWon?: number; // 기본 150,000

    discount?: DiscountInput;
};

export type PricingOutput = {
    ok: boolean;
    reason?: string;

    // ✅ 추가
    errors?: string[];
    warnings?: string[];

    // 계산 결과
    baseWon: number;
    sizeSurchargeWon: number;
    frameSurchargeWon: number;
    glassDesignWon: number;
    muntinCost: number; // ✅ Start of Muntin Cost
    discountWon: number;

    // ✅ 고객표시용
    materialWon: number;   // 자재비(확정) = 총액 - 시공비
    installWon: number;    // 시공비
    totalWon: number;      // 총액(자재+시공)

    // 내부 브레이크다운
    breakdown: Record<string, number>;
};

const clampInt = (n: any) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.floor(x));
};

const ceilStep = (mm: number, stepMm: number) => {
    if (mm <= 0) return 0;
    return Math.ceil(mm / stepMm);
};

// ✅ 제품별 기본 사이즈/기본가
function getBaseRule(door: DoorKind) {
    switch (door) {
        case "3T_MANUAL":
            return { baseW: 1300, baseH: 2300, basePrice: 690000 };
        case "AUTO":
            // ✅ 자동 3연동 확정가
            return { baseW: 1300, baseH: 2300, basePrice: 1300000 };
        case "1W_SLIDING":
            return { baseW: 1200, baseH: 2300, basePrice: 590000 };
        case "SWING_1":
            return { baseW: 850, baseH: 2300, basePrice: 640000 };
        case "SWING_2":
            return { baseW: 1200, baseH: 2300, basePrice: 980000 };
        case "HOPE_1":
            return { baseW: 850, baseH: 2300, basePrice: 600000 };
        case "HOPE_2":
            return { baseW: 1200, baseH: 2300, basePrice: 940000 };
        default:
            return null;
    }
}

// ✅ 사이즈 추가: 100mm당 70,000원 (가로/세로 중 초과분 큰 값 기준)
function calcSizeSurcharge(door: DoorKind, w: number, h: number) {
    const rule = getBaseRule(door);
    if (!rule) return 0;

    const overW = Math.max(0, w - rule.baseW);
    const overH = Math.max(0, h - rule.baseH);
    const over = Math.max(overW, overH);

    const steps = ceilStep(over, 100);
    return steps * 70000;
}

// ✅ 프레임 색상 규칙
// - 화이트 기본 0
// - 화이트 이외 "불소도장" = +70,000
// - "아노다이징" = +100,000
// - 호패(여닫이)는 "아노다이징 화이트"가 기본. (메탈블랙/샴페인골드 선택 시 +100,000)
function calcFrameSurcharge(door: DoorKind, finish?: FrameFinish, color?: FrameColor) {
    const c = color ?? "WHITE";

    // 기본: 화이트 0
    if (c === "WHITE") return 0;

    // 호패는 아노다이징 기반 규칙
    if (door === "HOPE_1" || door === "HOPE_2") {
        // 메탈블랙/샴페인골드 선택 시 10만
        if (c === "METAL_BLACK" || c === "CHAMPAGNE_GOLD" || c === "BLACK") return 100000;
        return 0;
    }

    // 일반 규칙
    const f = finish ?? "FLUORO";
    if (f === "ANOD") return 100000;     // 아노다이징 10만
    return 70000;                        // 불소도장(화이트 외) 7만
}

// ✅ 유리디자인 비용
function calcGlassDesignWon(door: DoorKind, g?: GlassDesign) {
    if (!g) return 0;

    const muntinSets = clampInt(g.muntinSet2LinesCount);
    const muntinExtra = clampInt(g.muntinExtraBarCount);

    const muntinSetWon = muntinSets * 30000;  // 2줄 세트당 3만원
    const muntinExtraWon = muntinExtra * 20000; // 1줄당 2만원

    let archWon = 0;
    if (g.archBasic) {
        if (door === "1W_SLIDING" || door === "HOPE_1" || door === "SWING_1") archWon += 220000;
        else if (door === "HOPE_2" || door === "SWING_2") archWon += 240000;
        else if (door === "3T_MANUAL" || door === "AUTO") archWon += 240000; // ✅ AUTO 추가
        else archWon += 0;
    }

    const bottomPanelWon = g.bottomPanel ? 280000 : 0; // 하부고시 28만
    const cornerArchWon = g.archCorner ? 90000 : 0;    // 모서리 아치 9만

    // 원슬라이딩 세로 큰아치(1200*2400) 40만 추가
    const bigArchWon = g.bigArchVertical ? 400000 : 0;

    return muntinSetWon + muntinExtraWon + archWon + bottomPanelWon + cornerArchWon + bigArchWon;
}

export function calcPricing(input: PricingInput): PricingOutput {
    const w = clampInt(input.widthMm);
    const h = clampInt(input.heightMm);
    const installWon = clampInt(input.installFeeWon ?? 150000);

    const errors: string[] = [];
    const warnings: string[] = [];

    // ✅ 제작 불가 규칙: 스윙 1도어 / 호패 1도어는 가로 1000mm 초과 불가
    if ((input.door === "SWING_1" || input.door === "HOPE_1") && w > 1000) {
        errors.push("스윙/여닫이 1도어는 가로 1000mm 초과 제작 불가입니다.");
    }

    if (w <= 0 || h <= 0) {
        return {
            ok: false,
            reason: "사이즈(mm)가 올바르지 않습니다.",
            errors,
            warnings,
            baseWon: 0,
            sizeSurchargeWon: 0,
            frameSurchargeWon: 0,
            glassDesignWon: 0,
            muntinCost: 0, // ✅
            discountWon: 0,
            materialWon: 0,
            installWon,
            totalWon: 0,
            breakdown: {},
        };
    }

    const rule = getBaseRule(input.door);
    if (!rule) {
        return {
            ok: false,
            reason: "선택한 도어(자동문)는 현재 가격표가 없어 ‘문의’ 처리입니다.",
            errors,
            warnings,
            baseWon: 0,
            sizeSurchargeWon: 0,
            frameSurchargeWon: 0,
            glassDesignWon: 0,
            muntinCost: 0, // ✅
            discountWon: 0,
            materialWon: 0,
            installWon,
            totalWon: 0,
            breakdown: {},
        };
    }

    const baseWon = rule.basePrice;
    const sizeSurchargeWon = calcSizeSurcharge(input.door, w, h);
    const frameSurchargeWon = calcFrameSurcharge(input.door, input.frameFinish, input.frameColor);
    const glassDesignWon = calcGlassDesignWon(input.door, input.glassDesign);

    // ✅ 간살 비용 추가
    const muntinCost = (input.muntinQty ?? 0) * 20000;

    const measurerDiscount = clampInt(input.discount?.measurerDiscountWon ?? 0);
    const promoDiscount = clampInt(input.discount?.promoDiscountWon ?? 0);

    // Total calculation including muntinCost
    const totalBeforeDiscount = baseWon + sizeSurchargeWon + frameSurchargeWon + glassDesignWon + muntinCost + installWon;
    const discountWon = Math.min(totalBeforeDiscount, measurerDiscount + promoDiscount);

    const totalWon = Math.max(0, totalBeforeDiscount - discountWon);

    // ✅ 고객에게는 시공비 15만 제외한 금액을 "자재비(확정)"으로 표시
    const materialWon = Math.max(0, totalWon - installWon);

    if (errors.length > 0) {
        return {
            ok: false,
            reason: errors[0],
            errors,
            warnings,
            baseWon,
            sizeSurchargeWon,
            frameSurchargeWon,
            glassDesignWon,
            muntinCost, // ✅ Added
            discountWon,
            materialWon: 0,
            installWon,
            totalWon: 0,
            breakdown: { baseWon, sizeSurchargeWon, frameSurchargeWon, glassDesignWon, muntinCost, installWon, discountWon, totalWon: 0, materialWon: 0 },
        };
    }

    return {
        ok: true,
        errors,
        warnings,
        baseWon,
        sizeSurchargeWon,
        frameSurchargeWon,
        glassDesignWon,
        muntinCost, // ✅ Added
        discountWon,
        materialWon,
        installWon,
        totalWon,
        breakdown: {
            baseWon,
            sizeSurchargeWon,
            frameSurchargeWon,
            glassDesignWon,
            muntinCost, // ✅ Added
            installWon,
            discountWon,
            totalWon,
            materialWon,
        },
    };
}
