// Force rebuild
import pricingData from './misotech-pricing.json';

// --- Mappings & Constants ---

export const PRODUCT_TYPE_MAP: Record<string, string> = {
    "원슬라이딩": "1S_MANUAL", "1S": "1S_MANUAL", "여닫이1S": "1S_MANUAL", "1S_MANUAL": "1S_MANUAL",
    "픽스": "FIX", "FIX": "FIX",
    "원슬라이딩자동": "1S_AUTO", "1S자동": "1S_AUTO", "1S_AUTO": "1S_AUTO",
    "3연동": "3T_MANUAL", "3연동수동": "3T_MANUAL", "JT_MANUAL": "3T_MANUAL", "3T_MANUAL": "3T_MANUAL", "3T": "3T_MANUAL",
    "3연동자동": "3T_AUTO", "3T_AUTO": "3T_AUTO",
    "반자동스윙": "SEMI_SWING", "스윙도어(반자동)": "SEMI_SWING", "SWING": "SEMI_SWING", "SEMI_SWING": "SEMI_SWING", "AH": "SEMI_SWING",
    "호페": "HOPE_SWING", "호패": "HOPE_SWING", "호페여닫이": "HOPE_SWING", "HOPE_SWING": "HOPE_SWING", "H": "HOPE_SWING"
};

export const COATING_MAP: Record<string, string> = {
    "불소": "FLUORO", "불소도장": "FLUORO", "화이트(불소)": "FLUORO", "블랙(불소)": "FLUORO", "FLUORO": "FLUORO",
    "아노": "ANOD", "아노다이징": "ANOD", "샴페인골드(아노)": "ANOD", "딥그레이(아노)": "ANOD", "블랙(아노)": "ANOD", "화이트(아노)": "ANOD", "ANOD": "ANOD", "ANODIZING": "ANOD"
};

export const GLASS_CODE_MAP: Record<string, string> = {
    "투명": "CLEAR", "CLEAR": "CLEAR",
    "브론즈": "BRONZE", "BRONZE": "BRONZE",
    "아쿠아": "AQUA", "AQUA": "AQUA",
    "샤틴": "SATIN", "SATIN": "SATIN",
    "망입": "WIRE_MESH", "WIRE_MESH": "WIRE_MESH", "MIST": "SATIN" // Mist fallback
};

export const GLASS_GROUP_RULE: Record<string, string> = {
    "CLEAR": "CLEAR_BRONZE_AQUA",
    "BRONZE": "CLEAR_BRONZE_AQUA",
    "AQUA": "CLEAR_BRONZE_AQUA",
    "SATIN": "SATIN",
    "WIRE_MESH": "WIRE_MESH"
};

export const DIRECTION_MAP: Record<string, string> = {
    "좌에서우": "L2R", "좌->우": "L2R", "좌측열림": "L2R", "LEFT_TO_RIGHT": "L2R", "LEFT_TO": "L2R",
    "우에서좌": "R2L", "우->좌": "R2L", "우측열림": "R2L", "RIGHT_TO_LEFT": "R2L", "RIGHT_TO": "R2L"
};

// --- Interfaces ---

export interface PricingInput {
    productType: string; // Code
    coating: string; // Code
    widthMm: number;
    heightMm: number;
    glassCode: string; // Code
    openDirection: string; // Code
    colorSpec?: string; // "BLACK", "WHITE", "CHAMPAGNE_GOLD" etc for rules

    // Options
    heightOver2400: boolean;
    verticalDivision: boolean;

    includeSlidingHardware: boolean;
    pivotQty: number;
    extraOver1900Mm: number;

    tduAdd: boolean;
    topSensorAddQty: number;
    wirelessSwitchAddQty: number;

    materialsSelected: string[];
    handlesSelected: string[];
    pomaxSelected: string[];

    // Context for Messages
    customerName?: string;
    customerPhone?: string;
    address?: string;
    measureDate?: string;
    installRequestDate?: string;
    memo?: string;

    // Added by Sync Request
    discounts?: {
        event?: number;
        measurer?: number;
        resale?: number;
    };
    demolition?: boolean;
    carpentry?: boolean;
    carpentryMaterialWon?: number;
    moving?: boolean;
    movingFloor?: number;
}

export interface PricingResult {
    basePrice: number;
    addons: { label: string; price: number; qty?: number; unit?: string }[];
    included: { label: string; qty: number }[];
    totalPrice: number;

    // Debug info
    finalWidth: number;
    finalHeight: number;
    sizeFixWarning: boolean;

    messages: {
        customer: string;
        office: string;
    };
    breakdown: any;
    error?: string;
}

// --- Helpers ---

export function mapToPricingInput(rawData: any): PricingInput {
    // Prioritize door_type (specific) over category (generic like 'DOOR')
    const rawType = (rawData.door_type || rawData.category || "").replace(/\s/g, "").toUpperCase();
    // Fuzzy match for product type if strict map fails? 
    // We try strictly first.
    let productType = PRODUCT_TYPE_MAP[rawType];
    if (!productType) {
        // Fallback or fuzzy
        Object.keys(PRODUCT_TYPE_MAP).forEach(k => {
            if (rawType.includes(k)) productType = PRODUCT_TYPE_MAP[k];
        });
    }
    productType = productType || "1S_MANUAL"; // Default

    const rawCoating = (rawData.coating || rawData.color || "").replace(/\s/g, "");
    let coating = COATING_MAP[rawCoating];
    if (!coating) coating = rawCoating.includes("아노") || rawCoating.includes("골드") ? "ANOD" : "FLUORO";

    const rawGlass = (rawData.glass || rawData.glassCode || "").replace(/\s/g, "");
    let glassCode = GLASS_CODE_MAP[rawGlass] || "CLEAR";

    const rawDir = (rawData.openDirection || "").replace(/\s/g, "");
    let openDirection = DIRECTION_MAP[rawDir] || "L2R";

    const h = Number(rawData.heightMm || rawData.height || 2100);
    const w = Number(rawData.widthMm || rawData.width || 1000);

    const rawColor = (rawData.coating || rawData.color || rawData.frameColor || "").toUpperCase();

    // Mapping Extras & Pricing from Measurement Payload Structure
    // Usually rawData is the whole 'measData' object from DB or payload
    const extras = rawData.extras_json || rawData.extras || {};
    const pricing = rawData.pricing_json || rawData.pricing || {};
    const discounts = {
        event: pricing.discounts?.event || pricing.promoDiscountWon || 0,
        measurer: pricing.discounts?.measurer || pricing.measurerDiscountWon || 0,
        resale: pricing.discounts?.resale || pricing.resaleDiscountWon || 0
    };

    return {
        productType,
        coating,
        widthMm: w,
        heightMm: h,
        glassCode,
        openDirection,
        colorSpec: rawColor,

        heightOver2400: rawData.heightOver2400 || (h > 2400),
        verticalDivision: rawData.verticalDivision || false,

        includeSlidingHardware: rawData.includeSlidingHardware || false,
        pivotQty: Number(rawData.pivotQty || 0),
        extraOver1900Mm: Number(rawData.extraOver1900Mm || 0),

        tduAdd: rawData.tduAdd || false,
        topSensorAddQty: Number(rawData.topSensorAddQty || 0),
        wirelessSwitchAddQty: Number(rawData.wirelessSwitchAddQty || 0),

        materialsSelected: rawData.materialsSelected || [],
        handlesSelected: rawData.handlesSelected || [],
        pomaxSelected: rawData.pomaxSelected || [],

        customerName: rawData.customerName,
        customerPhone: rawData.customerPhone,
        address: rawData.address,
        measureDate: rawData.measureDate,
        installRequestDate: rawData.installRequestDate,
        memo: rawData.memo,

        // New Fields
        discounts,
        demolition: extras.demolition || false,
        carpentry: extras.carpentry || false,
        carpentryMaterialWon: extras.carpentryMaterialWon || 0,
        moving: extras.moving || false,
        movingFloor: extras.movingFloor || 0,
    };
}

// --- Engine ---

export function calculateMisotechPrice(input: PricingInput): PricingResult {
    const {
        productType, coating, widthMm, heightMm, glassCode, openDirection,
        heightOver2400, verticalDivision,
        tduAdd, topSensorAddQty, wirelessSwitchAddQty,
        includeSlidingHardware, pivotQty, extraOver1900Mm,
        materialsSelected, handlesSelected, pomaxSelected,

        // New Fields
        discounts,
        demolition,
        carpentry, carpentryMaterialWon,
        moving, movingFloor
    } = input;

    // --- Dynamic Product Resolution for Generic Codes ---
    let finalProductType = productType;

    // 1. SEMI_SWING (AH) Resolution
    if (productType === "SEMI_SWING") {
        if (widthMm <= 1000) finalProductType = "SEMI_SWING_OUTER";
        else if (widthMm <= 1400) finalProductType = "SEMI_SWING_ASYM";
        else finalProductType = "SEMI_SWING_SYM";
    }
    // 2. HOPE_SWING (H) Resolution
    else if (productType === "HOPE_SWING") {
        if (widthMm <= 1000) finalProductType = "HOPE_OUTER";
        else finalProductType = "HOPE_ASYM"; // All others are Asym? Or check max width? 
    }

    const inputProductType = finalProductType; // Use resolved type below

    const glassGroup = GLASS_GROUP_RULE[glassCode] || "CLEAR_BRONZE_AQUA";

    // POLICY A: Size Correction
    let finalHeight = heightMm;
    let finalWidth = widthMm;
    let sizeFixWarning = false;

    // Height fix
    if (heightMm <= 2400) {
        // Base is 2400 usually
        finalHeight = 2400; // Force to base for lookup
        // No warning if it's just under 2400, strictly speaking, pricing users know 2400 is base.
        // But prompt says "if input matches table... or rounding". table has 2400.
        // If input 2300, we match 2400.
    } else {
        // Over 2400
        finalHeight = 2400; // Base lookup
        // heightOver2400 should be true (mapped in input or forced here?)
        // Input `heightOver2400` handles the price add-on.
        // We just ensure `finalHeight` for lookup is 2400.
    }
    if (finalHeight !== heightMm && heightMm > 2400) sizeFixWarning = true; // Only warn if over? Or distinct mismatch?
    // Prompt says "Warning if corrected". 2390 -> 2400 is correction.
    if (finalHeight !== heightMm) sizeFixWarning = true;

    // Lookup Product
    const product = pricingData.products.find((p: any) => p.product_type === inputProductType);
    if (!product) return errorResult(`제품코드 미확인: ${inputProductType} (Original: ${productType})`);

    const variant = product.variants.find((v: any) => v.coating === coating);
    if (!variant) return errorResult(`도장옵션 미확인: ${coating}`);

    // Width Correction (Rounding Up)
    const sortedSizes = [...variant.size_prices]
        .filter((s: any) => s.glass_group === glassGroup)
        .sort((a: any, b: any) => a.width_mm - b.width_mm);

    if (sortedSizes.length === 0) return errorResult(`유리옵션 불가: ${glassGroup}`);

    let matchedSize = sortedSizes.find((s: any) => s.width_mm >= widthMm);
    if (!matchedSize) {
        // Input wider than max table width?
        // Prompt Check: "If not in table... stop". Policy A: "round up".
        // If wider than largest, it's technically "not in table" or "Star Pricing".
        // I will return Error/Separate Quote Needed.
        return errorResult(`규격 초과(별도견적): W${widthMm} (최대 ${sortedSizes[sortedSizes.length - 1].max_width_mm})`);
    }

    finalWidth = matchedSize.width_mm;
    if (finalWidth !== widthMm) sizeFixWarning = true;

    const basePrice = matchedSize.price;


    // --- Addons Calculation ---
    const addons: { label: string; price: number; qty?: number; unit?: string }[] = [];
    const included: { label: string; qty: number }[] = [];

    // 1. Height Over
    if (heightOver2400) addons.push({ label: "높이 2400 이상", price: 10000, qty: 1, unit: "식" }); // Unit logic? Prompt doesn't strictly say unit.

    // 2. Vertical Division
    if (verticalDivision) addons.push({ label: "세로분할", price: 10000, qty: 1, unit: "식" });

    // 3. Auto Inclusions & Addons
    const inclusionRule = (pricingData as any).inclusion_rules?.find((r: any) => r.product_type === inputProductType);
    if (inclusionRule) {
        inclusionRule.included.forEach((inc: any) => included.push({ label: inc.label, qty: inc.qty }));

        if (tduAdd) {
            const tdu = inclusionRule.paid_addons.find((a: any) => a.code.includes('TDU'));
            if (tdu) addons.push({ label: tdu.label, price: tdu.price, qty: 1, unit: "ea" });
        }
    }

    if (topSensorAddQty > 0) addons.push({ label: "상부센서 추가", price: 30000, qty: topSensorAddQty, unit: "ea" });
    if (wirelessSwitchAddQty > 0) addons.push({ label: "무선스위치 추가", price: 22000, qty: wirelessSwitchAddQty, unit: "ea" });

    // 4. Sliding Hardware
    if (includeSlidingHardware) {
        const slidingSet = (pricingData as any).sliding_hardware_set;
        if (slidingSet) {
            const ranges = slidingSet.price_by_width.sort((a: any, b: any) => a.max_width_mm - b.max_width_mm);
            // Logic for width match? Using `widthMm` (input) or `finalWidth`?
            // Usually hardware matches the actual door width (input or final).
            // I'll use `widthMm` (input logic) or better `finalWidth` to match door spec?
            // Prompt doesn't specify. I'll use `finalWidth` for consistency with base price.
            const range = ranges.find((r: any) => finalWidth <= r.max_width_mm) || ranges[ranges.length - 1];
            addons.push({ label: `연동철물 (${range.max_width_mm}이하)`, price: range.price, qty: 1, unit: "set" });

            if (pivotQty > 0) addons.push({ label: "피봇", price: 600, qty: pivotQty, unit: "ea" });

            if (extraOver1900Mm > 0) {
                const units = Math.ceil(extraOver1900Mm / 200);
                addons.push({ label: `1900초과 (${units}구간)`, price: 2000, qty: units, unit: "구간" });
            }
        }
    }

    // 5. Materials & Handles (Simple summation)
    // Assume codes passed in mock price lookup or we map them.
    // For now I'll use a placeholder lookup if code not found.
    const findItemPrice = (code: string, listName: string): { label: string, price: number } => {
        // Search in all material lists
        const cats = ["bars_and_adhesives", "small_parts", "gap_fillers", "frame_profiles", "fix_and_pillar_sets", "semi_swing_bottom_frame"];
        const mp = (pricingData as any).materials_and_parts;
        for (const c of cats) {
            const found = mp[c]?.find((i: any) => i.code === code || i.label === code);
            if (found) return found;
        }
        const handle = (pricingData as any).handles?.find((i: any) => i.code === code || i.label === code);
        if (handle) return handle;

        return { label: code, price: 0 };
    };

    materialsSelected.forEach(code => {
        const item = findItemPrice(code, "materials");
        if (item.price > 0) addons.push({ label: item.label, price: item.price, qty: 1, unit: "ea" });
    });
    handlesSelected.forEach(code => {
        const item = findItemPrice(code, "handles");
        if (item.price > 0) addons.push({ label: item.label, price: item.price, qty: 1, unit: "ea" });
    });

    // 6. Site Extras (Demolition, Carpentry, Moving)
    if (demolition) {
        addons.push({ label: "철거비", price: 150000, qty: 1, unit: "식" });
    }
    if (carpentry) {
        addons.push({ label: "목공 마감", price: 50000, qty: 1, unit: "식" });
        if (carpentryMaterialWon && carpentryMaterialWon > 0) {
            addons.push({ label: "목공 자재비", price: carpentryMaterialWon, qty: 1, unit: "실비" });
        }
    }
    if (moving && movingFloor && movingFloor > 1) {
        // Assumption: 20k per floor (Safe default if input logic unknown, usually handled in Field App)
        const movingCost = (movingFloor - 1) * 20000;
        if (movingCost > 0) addons.push({ label: `양중비 (${movingFloor}층)`, price: movingCost, qty: 1, unit: "식" });
    }

    // 7. Discounts (Negative Addons)
    if (discounts) {
        if (discounts.event && discounts.event > 0) {
            addons.push({ label: "이벤트 할인", price: -discounts.event, qty: 1, unit: "식" });
        }
        if (discounts.measurer && discounts.measurer > 0) {
            addons.push({ label: "실측가 할인", price: -discounts.measurer, qty: 1, unit: "식" });
        }
        if (discounts.resale && discounts.resale > 0) {
            addons.push({ label: "재판매 할인", price: -discounts.resale, qty: 1, unit: "식" });
        }
    }

    // 8. Color Rules (Placeholder)
    // if (coating === "FLUORO") { ... }

    const addonsTotal = addons.reduce((sum, a) => sum + (a.price * (a.qty || 1)), 0);

    const totalPrice = basePrice + addonsTotal;

    // --- Message Generation ---

    const formatPrice = (n: number) => n.toLocaleString();
    const addonsLines = addons.map(a => `- ${a.label} × ${a.qty}${a.unit || 'ea'} = ${formatPrice(a.price * (a.qty || 1))}원`).join('\n');
    const includedLines = included.map(i => `- ${i.label} × ${i.qty} (포함)`).join('\n') || "(없음)";
    const sizeWarningStr = sizeFixWarning ? "⚠ 표 규격 매칭을 위해 보정되었습니다." : "";

    const customerMsg = `[림스도어 발주 확인]
- 문종: ${product.title}
- 규격: W ${finalWidth} × H ${finalHeight} (mm)
- 방향(거실→현관 기준): ${openDirection === 'L2R' ? '좌→우(좌측열림)' : '우→좌(우측열림)'}
- 도장/색상: ${input.coating} / ${input.coating === 'FLUORO' ? '불소' : '아노다이징'}
- 유리: ${input.glassCode}

[선택 옵션/부자재]
${addonsLines || '(선택 없음)'}
[옵션 소계] ${formatPrice(addonsTotal)}원

[포함 구성(0원 표기)]
${includedLines}

[금액]
- 제품+옵션 합계(VAT별도): ${formatPrice(totalPrice)}원
※ 시공비/넉다운 제외

[확인]
위 내용 기준으로 제작/발주가 진행됩니다.`;

    const officeMsg = `[사무실 확인용 발주 데이터]
- 고객: ${input.customerName || "-"} / ${input.customerPhone || "-"}
- 주소: ${input.address || "-"}
- 실측일: ${input.measureDate || "-"} / 요청시공일: ${input.installRequestDate || "-"}

[제품]
- 문종: ${product.title} (코드: ${productType})
- 입력규격: W ${widthMm} × H ${heightMm}
- 적용규격: W ${finalWidth} × H ${finalHeight} ${sizeWarningStr}
- 방향: ${openDirection === 'L2R' ? '좌→우' : '우→좌'} (${openDirection})
- 도장: ${codingLabel(coating)} (${coating})
- 유리: ${input.glassCode} (그룹: ${glassGroup})

[포함 구성(0원)]
${includedLines}

[유상 옵션/자재/철물 상세]
${addonsLines || '(없음)'}
[옵션 소계] ${formatPrice(addonsTotal)}원

[합계]
- base(완제품): ${formatPrice(basePrice)}원
- 옵션/자재/철물: ${formatPrice(addonsTotal)}원
- 총합(VAT별도, 시공/넉다운 제외): ${formatPrice(totalPrice)}원

[메모]
${input.memo || "-"}`;

    return {
        basePrice,
        addons,
        included,
        totalPrice,
        finalWidth,
        finalHeight,
        sizeFixWarning,
        messages: {
            customer: customerMsg,
            office: officeMsg
        },
        breakdown: { basePrice, addonsTotal, totalPrice },
    };
}

function codingLabel(c: string) {
    return c === 'FLUORO' ? '불소도장' : '아노다이징';
}

function errorResult(msg: string): PricingResult {
    return {
        basePrice: 0, addons: [], included: [], totalPrice: 0,
        finalWidth: 0, finalHeight: 0, sizeFixWarning: false,
        messages: { customer: msg, office: msg },
        breakdown: {},
        error: msg
    };
}
