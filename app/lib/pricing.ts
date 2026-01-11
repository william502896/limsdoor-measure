// app/lib/pricing.ts
export type DoorType =
    | "3T_MANUAL"        // 수동 3연동
    | "1S_SLIDING"       // 원슬라이딩
    | "SWING_1"          // 스윙 1도어
    | "SWING_2"          // 스윙 2도어
    | "HOPE_1"           // 여닫이(호패) 1도어
    | "HOPE_2";          // 여닫이(호패) 2도어

export type FrameCoating = "FLUORO" | "ANOD";
export type FrameColor =
    // 불소도장 색상
    | "WHITE"
    | "MODERN_BLACK"
    | "DARK_SILVER"
    // 아노다이징 색상
    | "CHAMPAGNE_GOLD"
    | "METAL_BLACK"
    | "BLACK";

export type GlassDesign =
    | "BASIC"                // 기본(간살 2줄 기본)
    | "MUNTIN_ADD_2LINES"    // 간살 2줄 추가(=2줄당 3만원)
    | "ARCH"                 // 아치형디자인
    | "BOTTOM_PANEL"         // 하부고시
    | "CORNER_ARCH"          // 모서리 아치(모든 도어)
    | "SLIDING_BIG_ARCH_V";  // 원슬라이딩 세로 큰아치 1200*2400 (추가)

export type DiscountMeta = {
    measurerOption: "NONE" | "REPEAT" | "CONDITIONAL" | "OTHER";
    eventOption: "NONE" | "EVENT_PRODUCT" | "CLEARANCE" | "OTHER";
    discountAmount: number; // 원
};

export type QuoteInput = {
    doorType: DoorType;
    widthMm: number;
    heightMm: number;

    frameCoating: FrameCoating;
    frameColor: FrameColor;

    // 유리 기본: 투명강화 기준(요청사항)
    glassBase: "CLEAR_TEMPERED";

    // 유리 디자인 옵션
    glassDesigns: GlassDesign[]; // 여러 개 선택 가능

    discount: DiscountMeta;

    // 시공비(표시용): 기본 15만원
    installFee: number; // 150000
};

const WON = (n: number) => Math.max(0, Math.round(n));

/**
 * ✅ 기준 사이즈 + 기준가(요청 그대로)
 */
const BASE_PRICE: Record<DoorType, { maxW: number; maxH: number; price: number }> = {
    "3T_MANUAL": { maxW: 1300, maxH: 2300, price: 690000 },
    "1S_SLIDING": { maxW: 1200, maxH: 2300, price: 590000 },
    "SWING_1": { maxW: 850, maxH: 2300, price: 640000 },
    "SWING_2": { maxW: 1200, maxH: 2300, price: 980000 },
    "HOPE_1": { maxW: 850, maxH: 2300, price: 600000 },
    "HOPE_2": { maxW: 1200, maxH: 2300, price: 940000 },
};

/**
 * ✅ 사이즈 추가금 규칙
 * - 기준 사이즈를 초과하면, 초과분을 100mm 단위로 올림 처리
 * - 가로/세로 중 더 큰 초과 단위를 적용(현장 적용에 가장 보수적이고 단순)
 *   (원하시면 가로+세로 합산 방식으로도 바꿀 수 있습니다)
 */
const SIZE_STEP_MM = 100;
const SIZE_STEP_PRICE = 70000;

function sizeSurcharge(doorType: DoorType, w: number, h: number) {
    const base = BASE_PRICE[doorType];
    const overW = Math.max(0, w - base.maxW);
    const overH = Math.max(0, h - base.maxH);
    const steps = Math.ceil(Math.max(overW, overH) / SIZE_STEP_MM);
    return WON(steps * SIZE_STEP_PRICE);
}

/**
 * ✅ 도어별 선택 가능한 프레임(코팅/색상)
 * 요청 사항 그대로 매핑
 */
export function getFrameOptions(doorType: DoorType) {
    if (doorType === "3T_MANUAL") {
        // 3연동: 불소(화이트, 모던블랙) / 아노(샴페인골드)
        return [
            { coating: "FLUORO" as const, color: "WHITE" as const, label: "불소도장 / 화이트(기본)" },
            { coating: "FLUORO" as const, color: "MODERN_BLACK" as const, label: "불소도장 / 모던블랙(+7만)" },
            { coating: "ANOD" as const, color: "CHAMPAGNE_GOLD" as const, label: "아노다이징 / 샴페인골드(+10만)" },
        ];
    }

    if (doorType === "1S_SLIDING") {
        // 원슬라이딩: 불소(화이트, 다크실버) / 아노(샴페인골드)
        return [
            { coating: "FLUORO" as const, color: "WHITE" as const, label: "불소도장 / 화이트(기본)" },
            { coating: "FLUORO" as const, color: "DARK_SILVER" as const, label: "불소도장 / 다크실버(+7만)" },
            { coating: "ANOD" as const, color: "CHAMPAGNE_GOLD" as const, label: "아노다이징 / 샴페인골드(+10만)" },
        ];
    }

    if (doorType === "HOPE_1" || doorType === "HOPE_2") {
        // 여닫이(호패): 아노(메탈블랙/화이트/샴페인골드)
        // 기본: 아노 화이트 / 추가: 메탈블랙, 샴페인골드(+10만)
        return [
            { coating: "ANOD" as const, color: "WHITE" as const, label: "아노다이징 / 화이트(기본)" },
            { coating: "ANOD" as const, color: "METAL_BLACK" as const, label: "아노다이징 / 메탈블랙(+10만)" },
            { coating: "ANOD" as const, color: "CHAMPAGNE_GOLD" as const, label: "아노다이징 / 샴페인골드(+10만)" },
        ];
    }

    // 스윙: 불소(화이트) / 아노(블랙, 아노다이징 색상 선택)
    // 요청 문장에 "아노다이징 -블랙, 아노다이징 색상"이 있어
    // 여기서는 아노 블랙/샴페인골드 2개로 기본 제공(필요시 더 늘리면 됨)
    return [
        { coating: "FLUORO" as const, color: "WHITE" as const, label: "불소도장 / 화이트(기본)" },
        { coating: "ANOD" as const, color: "BLACK" as const, label: "아노다이징 / 블랙(+10만)" },
        { coating: "ANOD" as const, color: "CHAMPAGNE_GOLD" as const, label: "아노다이징 / 샴페인골드(+10만)" },
    ];
}

/**
 * ✅ 프레임 추가금 규칙
 * - 화이트: 기본(추가금 0)
 * - 화이트 이외 불소: +7만
 * - 아노다이징: +10만
 * - 호패는 아노화이트 기본, 나머지(메탈블랙/샴페인골드) +10만
 */
function frameUpcharge(doorType: DoorType, coating: FrameCoating, color: FrameColor) {
    // 화이트는 항상 0(단, 코팅이 아노여도 “화이트 기본”으로 취급하길 원하셨음)
    if (color === "WHITE") return 0;

    // 호패는 아노 기반: 메탈블랙/샴페인골드만 +10만
    if (doorType === "HOPE_1" || doorType === "HOPE_2") {
        return 100000;
    }

    if (coating === "FLUORO") return 70000;
    return 100000; // ANOD
}

/**
 * ✅ 유리 디자인 추가금(요청 그대로)
 */
function glassDesignExtra(doorType: DoorType, designs: GlassDesign[], w: number, h: number) {
    let extra = 0;

    const isSwing = doorType === "SWING_1" || doorType === "SWING_2";
    const isHope = doorType === "HOPE_1" || doorType === "HOPE_2";
    const isSliding = doorType === "1S_SLIDING";
    const is3T = doorType === "3T_MANUAL";

    // 간살 기본형 2줄은 BASIC에 포함(추가금 없음)
    // "간살 추가시 2줄당 3만원"
    const muntinAddCount = designs.filter(d => d === "MUNTIN_ADD_2LINES").length;
    extra += muntinAddCount * 30000;

    // 아치형 디자인 가격
    if (designs.includes("ARCH")) {
        // 아치형: 원슬/여닫/스윙 1도어 22만, 여닫/스윙 2도어 24만, 3연동 24만
        if (is3T) extra += 240000;
        else if (doorType === "SWING_2" || doorType === "HOPE_2") extra += 240000;
        else extra += 220000;
    }

    // 하부고시 28만
    if (designs.includes("BOTTOM_PANEL")) extra += 280000;

    // 모서리 아치(모든 도어) 9만
    if (designs.includes("CORNER_ARCH")) extra += 90000;

    // 원슬라이딩 세로 큰아치 1200*2400 40만 추가
    // (선택만 하면 추가되게 했고, 필요하면 사이즈 검증으로 제한 가능)
    if (designs.includes("SLIDING_BIG_ARCH_V")) {
        if (isSliding) extra += 400000;
        else extra += 400000; // 요청: "원슬라이딩 세로 큰아치"지만 실수 방지하고 싶으면 여기서 슬라이딩만 허용 처리 가능
    }

    return WON(extra);
}

export type QuoteResult = {
    basePrice: number;
    sizeExtra: number;
    frameExtra: number;
    glassExtra: number;
    subtotal: number;
    discount: number;
    total: number;

    // 고객 안내용
    installFee: number;
    materialPrice: number; // total - installFee (최소 0)
};

export function calcQuote(input: QuoteInput): QuoteResult {
    const base = BASE_PRICE[input.doorType];
    const basePrice = base?.price ?? 0;

    const sizeExtra = sizeSurcharge(input.doorType, input.widthMm, input.heightMm);
    const frameExtra = frameUpcharge(input.doorType, input.frameCoating, input.frameColor);
    const glassExtra = glassDesignExtra(input.doorType, input.glassDesigns, input.widthMm, input.heightMm);

    const subtotal = WON(basePrice + sizeExtra + frameExtra + glassExtra);

    const discount = WON(input.discount?.discountAmount ?? 0);
    const total = WON(subtotal - discount);

    const installFee = WON(input.installFee ?? 150000);
    const materialPrice = WON(Math.max(0, total - installFee));

    return {
        basePrice,
        sizeExtra,
        frameExtra,
        glassExtra,
        subtotal,
        discount,
        total,
        installFee,
        materialPrice,
    };
}

/**
 * ✅ 고객 문자 템플릿 생성 (요청 멘트/계좌 포함)
 */
export function buildCustomerMessage(params: {
    customerName?: string;
    customerPhone?: string;
    doorLabel: string;
    widthMm: number;
    heightMm: number;
    frameLabel: string;
    glassLabel: string; // 투명강화/옵션 등
    glassDesignSummary: string;
    quote: QuoteResult;
}) {
    const bankLine = "입금계좌: 케이뱅크 700100061232 주식회사 림스";
    const ruleLine = "안내: 시공비는 시공 후 결제 / 자재비는 입금이 되어야 해당 제품 제작이 진행됩니다.";

    return [
        `[림스도어 견적 안내]`,
        params.customerName ? `고객: ${params.customerName}` : undefined,
        `제품: ${params.doorLabel}`,
        `사이즈: ${params.widthMm} x ${params.heightMm} (mm)`,
        `프레임: ${params.frameLabel}`,
        `유리: ${params.glassLabel}`,
        params.glassDesignSummary ? `유리디자인: ${params.glassDesignSummary}` : undefined,
        `--------------------------------`,
        `총액: ${params.quote.total.toLocaleString()}원 (시공비 포함)`,
        `자재비 확정: ${params.quote.materialPrice.toLocaleString()}원 (시공비 150,000원 제외)`,
        `시공비: 150,000원 (시공 후 결제)`,
        `--------------------------------`,
        bankLine,
        ruleLine,
    ].filter(Boolean).join("\n");
}
