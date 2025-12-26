export type CoatingType = "FLUORO" | "ANOD";
export type GlassGroup = "CLEAR" | "SATIN" | "WIRE" | "_ALL";
export type DoorType =
    | "1S_MANUAL"
    | "FIX_1S1F"
    | "FIX_2S_H"
    | "1S_AUTO"
    | "3T_MANUAL"
    | "3T_AUTO"
    | "SEMI_SWING"
    | "HOPE";

export type Measurement = {
    w: number;
    h: number;
};

// Price Row Structure
export interface PriceRow {
    wMax: number;
    hMax?: number; // Optional, default 2400
    glass: GlassGroup;
    knockdown: number;
    finished: number;
    install: number;
    note?: string;
}

// Option Interface
export interface MisoOptions {
    coating: CoatingType;
    glassGroup: GlassGroup;
    isKnockdown: boolean;

    // Common Options
    filmRequest?: boolean; // +10000 set
    overHeight2400?: boolean; // +10000 (calculated automatically now based on h)
    verticalDivide?: boolean; // +10000

    // Auto Door Options
    sensorTop?: boolean; // +30000
    sensorWireless?: boolean; // +22000
    tdu1S?: boolean; // +260000
    tdu3T?: boolean; // +290000

    // Hardware
    damperCount?: number; // +20000 each
    pivotCount?: number; // +600 each

    // Swing / Hope Handles
    handleType?: "OLD_450" | "NEW_350" | "NEW_600" | "NEW_800" | "HALF_ROUND" | "HOPE_GERMAN" | "HOPE_CHINESE";

    // Semi-Swing / Hope Type details
    subType?: "ASYMMETRIC" | "SYMMETRIC" | "SINGLE_DOOR";

    // ✅ 추가 (없어도 계산 0원으로 동작)
    materialsSelections?: MaterialSelection[];

    // ✅ 추천/선택 자재 옵션
    railCover?: boolean; // 3연동이면 기본 true 추천
    useRecommendedMaterials?: boolean; // 기본 true
}

// --- Materials Definitions ---
export type MaterialUnit = "EA" | "M" | "SET";
export type MaterialCoatingMode = "BOTH" | "FLUORO_ONLY" | "ANOD_ONLY";

export type MaterialCategory =
    | "COMMON"
    | "ONE_S"
    | "FIX"
    | "THREE_T"
    | "AUTO"
    | "RAIL_COVER"
    | "HOPE_FIX";

export type MaterialKey =
    // 공통/기본 옵션자재
    | "FINISH_MAT_L"
    | "FINISH_MAT_S"
    // 1S/일반
    | "MIDBAR_22_PER_M"
    | "ADHESIVEBAR_22_2P5M"
    | "BAR_10x20_EA"
    | "BAR_20x30_EA"
    | "BAR_38x20_PER_M"
    // FIX
    | "FIX_SET_128x49_SET"
    | "FIX_SET_50x47_SET"
    | "FIX_35x20_EA"
    | "FIX_SET_88x49_SET"
    // 3연동/자동(18)
    | "MIDBAR_18_PER_M"
    | "ADHESIVEBAR_18_2P5M"
    | "BAR_30x10_EA"
    | "BAR_60x2P5_EA"
    // 레일/커버 길이 추가
    | "RAIL_COVER_UPTO_1400"
    | "RAIL_COVER_UPTO_1700"
    | "RAIL_COVER_UPTO_2000"
    // 호페+픽스 기둥바 세트(표에 명시)
    | "HOPE_FIX_PILLAR_50x47_SET";

export type MaterialItem = {
    key: MaterialKey;
    label: string;
    category: MaterialCategory;

    unit: MaterialUnit;            // EA/M/SET
    baseQtyStep?: number;          // UI에서 증가단위(옵션)
    note?: string;

    coatingMode: MaterialCoatingMode;  // BOTH/FLUORO_ONLY/ANOD_ONLY
    price: {
        FLUORO?: number;
        ANOD?: number;
    };
};

export type MaterialSelection = {
    key: MaterialKey;
    qty?: number;      // EA/SET 용
    meters?: number;   // M 용
};

export const MISOTECH_MATERIALS_2024_04: Record<MaterialKey, MaterialItem> = {
    // ✅ 마감재/옵션자재 (표: 大 4000 / 小 3000)
    FINISH_MAT_L: {
        key: "FINISH_MAT_L",
        label: "마감재/옵션자재 (大)",
        category: "COMMON",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 4000, ANOD: 4000 },
    },
    FINISH_MAT_S: {
        key: "FINISH_MAT_S",
        label: "마감재/옵션자재 (小)",
        category: "COMMON",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 3000, ANOD: 3000 },
    },

    // ✅ 1S/일반 옵션자재
    MIDBAR_22_PER_M: {
        key: "MIDBAR_22_PER_M",
        label: "중간바 22 (m당)",
        category: "ONE_S",
        unit: "M",
        coatingMode: "BOTH",
        price: { FLUORO: 6700, ANOD: 7100 },
    },
    ADHESIVEBAR_22_2P5M: {
        key: "ADHESIVEBAR_22_2P5M",
        label: "접착바 22 (2.5m)",
        category: "ONE_S",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 6500, ANOD: 7000 },
        note: "2.5m 1본 단위",
    },
    BAR_10x20_EA: {
        key: "BAR_10x20_EA",
        label: "10×20 (EA)",
        category: "ONE_S",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 5000, ANOD: 5500 },
    },
    BAR_20x30_EA: {
        key: "BAR_20x30_EA",
        label: "20×30 (EA)",
        category: "ONE_S",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 9000, ANOD: 9500 },
    },
    BAR_38x20_PER_M: {
        key: "BAR_38x20_PER_M",
        label: "38×20 (m당)",
        category: "ONE_S",
        unit: "M",
        coatingMode: "BOTH",
        price: { FLUORO: 5000, ANOD: 5500 },
    },

    // ✅ FIX 옵션자재
    FIX_SET_128x49_SET: {
        key: "FIX_SET_128x49_SET",
        label: "FIX 128×49 (세트)",
        category: "FIX",
        unit: "SET",
        coatingMode: "BOTH",
        price: { FLUORO: 65800, ANOD: 70000 },
    },
    FIX_SET_50x47_SET: {
        key: "FIX_SET_50x47_SET",
        label: "FIX 50×47 (세트)",
        category: "FIX",
        unit: "SET",
        coatingMode: "BOTH",
        price: { FLUORO: 40800, ANOD: 43400 },
    },
    FIX_35x20_EA: {
        key: "FIX_35x20_EA",
        label: "FIX 35×20 (EA)",
        category: "FIX",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 10000, ANOD: 10500 },
    },
    FIX_SET_88x49_SET: {
        key: "FIX_SET_88x49_SET",
        label: "FIX 88×49 (세트)",
        category: "FIX",
        unit: "SET",
        coatingMode: "BOTH",
        price: { FLUORO: 59200, ANOD: 61800 },
    },

    // ✅ 3연동/자동 옵션자재(18)
    MIDBAR_18_PER_M: {
        key: "MIDBAR_18_PER_M",
        label: "중간바 18 (m당)",
        category: "THREE_T",
        unit: "M",
        coatingMode: "BOTH",
        price: { FLUORO: 5000, ANOD: 5500 },
    },
    ADHESIVEBAR_18_2P5M: {
        key: "ADHESIVEBAR_18_2P5M",
        label: "접착바 18 (2.5m)",
        category: "THREE_T",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 5000, ANOD: 5500 },
        note: "2.5m 1본 단위",
    },
    BAR_30x10_EA: {
        key: "BAR_30x10_EA",
        label: "30×10 (EA)",
        category: "THREE_T",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 3500, ANOD: 4500 },
    },
    BAR_60x2P5_EA: {
        key: "BAR_60x2P5_EA",
        label: "60×2.5 (EA)",
        category: "THREE_T",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 12000, ANOD: 13000 },
    },

    // ✅ 레일/커버 길이 추가(상부인방 커버)
    RAIL_COVER_UPTO_1400: {
        key: "RAIL_COVER_UPTO_1400",
        label: "상부인방 길아추가 ~1400",
        category: "RAIL_COVER",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 25000, ANOD: 25000 },
    },
    RAIL_COVER_UPTO_1700: {
        key: "RAIL_COVER_UPTO_1700",
        label: "상부인방 길이추가 ~1700",
        category: "RAIL_COVER",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 30000, ANOD: 30000 },
    },
    RAIL_COVER_UPTO_2000: {
        key: "RAIL_COVER_UPTO_2000",
        label: "상부인방 길이추가 ~2000",
        category: "RAIL_COVER",
        unit: "EA",
        coatingMode: "BOTH",
        price: { FLUORO: 35000, ANOD: 35000 },
    },

    // ✅ 호페+픽스 기둥바 세트 (표 명시)
    HOPE_FIX_PILLAR_50x47_SET: {
        key: "HOPE_FIX_PILLAR_50x47_SET",
        label: "호페+픽스 기둥바 50×47 (세트)",
        category: "HOPE_FIX",
        unit: "SET",
        coatingMode: "BOTH",
        price: { FLUORO: 40800, ANOD: 43400 },
    },
};

function roundMoney(n: number) {
    return Math.round(n);
}

function getMaterialUnitPrice(item: MaterialItem, coating: "FLUORO" | "ANOD"): number {
    const p = item.price[coating];
    // coating별 가격이 없으면(특수 케이스) FLUORO 우선
    if (typeof p === "number") return p;
    const fallback = item.price.FLUORO ?? item.price.ANOD ?? 0;
    return fallback;
}

export function calculateMaterialCost(params: {
    coating: "FLUORO" | "ANOD";
    selections?: MaterialSelection[];
}): { materialCost: number; messages: string[] } {
    const messages: string[] = [];
    let materialCost = 0;

    const selections = params.selections ?? [];
    for (const sel of selections) {
        const item = MISOTECH_MATERIALS_2024_04[sel.key as MaterialKey];
        if (!item) {
            messages.push(`알 수 없는 자재키: ${sel.key}`);
            continue;
        }

        const unitPrice = getMaterialUnitPrice(item, params.coating);

        if (item.unit === "M") {
            const meters = Number(sel.meters ?? 0);
            if (!Number.isFinite(meters) || meters <= 0) continue;
            const cost = roundMoney(unitPrice * meters);
            materialCost += cost;
            messages.push(`${item.label} ${meters}m (+${cost.toLocaleString()}원)`);
            continue;
        }

        // EA / SET
        const qty = Number(sel.qty ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;

        const cost = roundMoney(unitPrice * qty);
        materialCost += cost;
        messages.push(`${item.label} ${qty}${item.unit === "EA" ? "EA" : "세트"} (+${cost.toLocaleString()}원)`);
    }

    return { materialCost, messages };
}

export const MISOTECH_PURCHASE_TABLE_2024_04 = {
    meta: {
        vatIncluded: false,
        applyDate: "2024-04-01",
        filmRed: 10000,
        overHeight: 10000,
        verticalDivide: 10000,
        sensorTop: 30000,
        sensorWireless: 22000,
        tdu1S: 260000,
        tdu3T: 290000,
        damper: 20000,
        pivot: 600,
    },

    handles: {
        OLD_450: 35000,
        NEW_350: 25000,
        NEW_600: 35000,
        NEW_800: 45000,
        HALF_ROUND: 30000,
        HOPE_GERMAN: 60000,
        HOPE_CHINESE: 40000
    },

    // 1S MANUAL
    "1S_MANUAL": {
        specs: { minW: 700, maxW: 1450, baseH: 2400 },
        FLUORO: [
            { wMax: 1100, glass: "CLEAR", knockdown: 150000, finished: 270000, install: 400000 },
            { wMax: 1300, glass: "SATIN", knockdown: 160000, finished: 290000, install: 420000 },
            { wMax: 1450, glass: "WIRE", knockdown: 170000, finished: 380000, install: 510000 },
        ],
        ANOD: [
            { wMax: 1100, glass: "CLEAR", knockdown: 160000, finished: 280000, install: 410000 },
            { wMax: 1300, glass: "SATIN", knockdown: 170000, finished: 300000, install: 430000 },
            { wMax: 1450, glass: "WIRE", knockdown: 180000, finished: 390000, install: 520000 },
        ]
    },

    // FIX DOOR (2 types)
    "FIX_1S1F": { // 기둥바
        specs: { minW: 100, maxW: 3000, baseH: 2400 }, // Assumed
        // Note: FIX types in prompt example don't have separate coating prices list, but usually they differ. 
        // Assuming prompt example applies to FLUORO or Common? 
        // Wait, prompt just lists the table under FIX. Let's assume standard pricing for now based on prompt.
        // Actually prompt lists prices but doesn't explicitly split FLUORO/ANOD for FIX, but later in option materials it splits.
        // Let's assume the provided FIX table is for FLUORO and maybe ANOD is +alpha? 
        // Rule: "Use the data exactly".
        // I will use same data for both unless specified. Or wait, standard rule is ANOD is slightly more expensive.
        // Checking prompt again: "FIX (800x2400...) - Knockdown 90,000". No coating specified.
        // But later "Hope+Fix Pillar Bar... Fluoro 40800 / Anod 43400".
        // I will treat the main table as valid for both for now to be safe, or add a warning.
        // Actually, looking at 1S, 1S Auto, prices differ. The FIX block didn't specify. I'll use the supplied numbers for both for now.
        FLUORO: [
            { wMax: 800, glass: "CLEAR", knockdown: 90000, finished: 190000, install: 270000 },
            { wMax: 1100, glass: "SATIN", knockdown: 100000, finished: 210000, install: 290000 },
            { wMax: 1300, glass: "WIRE", knockdown: 110000, finished: 280000, install: 360000 },
        ],
        ANOD: [
            // Using same as above as no specific data
            { wMax: 800, glass: "CLEAR", knockdown: 90000, finished: 190000, install: 270000 },
            { wMax: 1100, glass: "SATIN", knockdown: 100000, finished: 210000, install: 290000 },
            { wMax: 1300, glass: "WIRE", knockdown: 110000, finished: 280000, install: 360000 },
        ]
    },
    "FIX_2S_H": { // H바
        specs: { minW: 100, maxW: 3000, baseH: 2400 },
        FLUORO: [
            { wMax: 800, glass: "CLEAR", knockdown: 100000, finished: 200000, install: 280000 },
            { wMax: 1100, glass: "SATIN", knockdown: 110000, finished: 220000, install: 300000 },
            { wMax: 1300, glass: "WIRE", knockdown: 120000, finished: 290000, install: 370000 },
        ],
        ANOD: [
            { wMax: 800, glass: "CLEAR", knockdown: 100000, finished: 200000, install: 280000 },
            { wMax: 1100, glass: "SATIN", knockdown: 110000, finished: 220000, install: 300000 },
            { wMax: 1300, glass: "WIRE", knockdown: 120000, finished: 290000, install: 370000 },
        ]
    },

    // 1S AUTO
    "1S_AUTO": {
        specs: { minW: 700, maxW: 1350, baseH: 2400 },
        FLUORO: [
            { wMax: 1100, glass: "CLEAR", knockdown: 550000, finished: 670000, install: 870000 },
            { wMax: 1250, glass: "SATIN", knockdown: 570000, finished: 700000, install: 900000 },
            { wMax: 1350, glass: "WIRE", knockdown: 590000, finished: 780000, install: 980000 },
        ],
        ANOD: [
            { wMax: 1100, glass: "CLEAR", knockdown: 570000, finished: 690000, install: 890000 },
            { wMax: 1250, glass: "SATIN", knockdown: 590000, finished: 720000, install: 920000 },
            { wMax: 1350, glass: "WIRE", knockdown: 610000, finished: 800000, install: 1000000 },
        ]
    },

    // 3T MANUAL
    "3T_MANUAL": {
        specs: { minW: 1100, maxW: 2500, baseH: 2400 },
        FLUORO: [
            { wMax: 1300, glass: "CLEAR", knockdown: 260000, finished: 400000, install: 530000 },
            { wMax: 1500, glass: "SATIN", knockdown: 270000, finished: 430000, install: 560000 },
            { wMax: 1700, glass: "WIRE", knockdown: 280000, finished: 530000, install: 660000 },
            // Note: Table stops at 1700 but maxW is 2500. This implies custom past 1700 or missing data.
            // Prompt says "If spec missing -> Manual Quote".
        ],
        ANOD: [
            { wMax: 1300, glass: "CLEAR", knockdown: 280000, finished: 420000, install: 550000 },
            { wMax: 1500, glass: "SATIN", knockdown: 290000, finished: 450000, install: 580000 },
            { wMax: 1700, glass: "WIRE", knockdown: 300000, finished: 540000, install: 670000 },
        ]
    },

    // 3T AUTO
    "3T_AUTO": {
        specs: { minW: 1100, maxW: 1700, baseH: 2400 },
        FLUORO: [
            { wMax: 1300, glass: "CLEAR", knockdown: 700000, finished: 850000, install: 1050000 },
            { wMax: 1500, glass: "SATIN", knockdown: 720000, finished: 880000, install: 1080000 },
            { wMax: 1700, glass: "WIRE", knockdown: 740000, finished: 970000, install: 1170000 },
        ],
        ANOD: [
            { wMax: 1300, glass: "CLEAR", knockdown: 730000, finished: 880000, install: 1080000 },
            { wMax: 1500, glass: "SATIN", knockdown: 750000, finished: 910000, install: 1110000 },
            { wMax: 1700, glass: "WIRE", knockdown: 770000, finished: 1000000, install: 1200000 },
        ]
    },

    // SEMI SWING
    "SEMI_SWING": {
        specs: { minW: 250, maxW: 1500, baseH: 2400 }, // MaxW adjusted to 1500 based on table rows
        FLUORO: [
            { wMax: 1000, glass: "_ALL", knockdown: 270000, finished: 360000, install: 480000, note: "SINGLE: 1000x2400" },
            { wMax: 1200, glass: "_ALL", knockdown: 380000, finished: 490000, install: 640000 },
            { wMax: 1400, glass: "_ALL", knockdown: 400000, finished: 520000, install: 670000 },
            { wMax: 1500, glass: "_ALL", knockdown: 430000, finished: 550000, install: 700000 },
        ],
        ANOD: [
            { wMax: 1000, glass: "_ALL", knockdown: 290000, finished: 380000, install: 500000, note: "SINGLE" },
            { wMax: 1200, glass: "_ALL", knockdown: 410000, finished: 520000, install: 670000 },
            { wMax: 1400, glass: "_ALL", knockdown: 430000, finished: 550000, install: 700000 },
            { wMax: 1500, glass: "_ALL", knockdown: 460000, finished: 580000, install: 730000 },
        ]
    },

    // HOPE
    "HOPE": {
        specs: { minW: 250, maxW: 1300, baseH: 2400 }, // MaxW adjusted
        FLUORO: [
            { wMax: 1000, glass: "_ALL", knockdown: 280000, finished: 390000, install: 510000, note: "SINGLE" },
            { wMax: 1100, glass: "_ALL", knockdown: 360000, finished: 470000, install: 620000 },
            { wMax: 1300, glass: "_ALL", knockdown: 380000, finished: 500000, install: 650000 },
        ],
        ANOD: [
            { wMax: 1000, glass: "_ALL", knockdown: 310000, finished: 420000, install: 540000, note: "SINGLE" },
            { wMax: 1100, glass: "_ALL", knockdown: 390000, finished: 500000, install: 650000 },
            { wMax: 1300, glass: "_ALL", knockdown: 410000, finished: 530000, install: 680000 },
        ]
    }


} as const;

export type MisoCostResult = {
    success: boolean;
    baseCost: number;
    optionCost: number;
    totalCost: number;
    isCustom: boolean;
    messages: string[];
};

function getBaseH(door: DoorType) {
    return (MISOTECH_PURCHASE_TABLE_2024_04 as any)[door]?.specs?.baseH ?? 2400;
}

function getSpecs(door: DoorType) {
    return (MISOTECH_PURCHASE_TABLE_2024_04 as any)[door]?.specs as
        | { minW: number; maxW: number; baseH: number }
        | undefined;
}

function rowsFor(door: DoorType, coating: CoatingType): PriceRow[] {
    const node = (MISOTECH_PURCHASE_TABLE_2024_04 as any)[door];
    return (node?.[coating] ?? []) as PriceRow[];
}

function mapGlassToGroup(glassName: string): GlassGroup {
    const s = glassName ?? "";
    if (s.includes("샤틴")) return "SATIN";
    if (s.includes("망입")) return "WIRE";
    return "CLEAR"; // 투명/브론즈/아쿠아는 CLEAR 그룹으로
}

// ✅ 핵심: “정확 규격(wMax) 일치” + 유리 매칭(또는 _ALL)
function findExactRow(
    door: DoorType,
    coating: CoatingType,
    width: number,
    glassGroup: GlassGroup
): PriceRow | null {
    const rows = rowsFor(door, coating);

    // 1) width 정확히 일치하는 후보만
    const widthMatches = rows.filter(r => r.wMax === width);

    if (widthMatches.length === 0) return null;

    // 2) 유리 정확 매칭 우선, 없으면 _ALL 허용
    const exactGlass = widthMatches.find(r => r.glass === glassGroup);
    if (exactGlass) return exactGlass;

    const allGlass = widthMatches.find(r => r.glass === "_ALL");
    if (allGlass) return allGlass;

    return null;
}

export function calculateMisoPurchaseCost(
    door: DoorType,
    measure: Measurement,
    options: MisoOptions
): MisoCostResult {
    const messages: string[] = [];
    let baseCost = 0;
    let optionCost = 0;
    let isCustom = false;

    const specs = getSpecs(door);
    const baseH = specs?.baseH ?? 2400;

    // (1) 제작범위 체크
    if (specs) {
        if (measure.w < specs.minW || measure.w > specs.maxW) {
            isCustom = true;
            messages.push(`규격 외 사이즈: 가로 ${measure.w} (허용 ${specs.minW}~${specs.maxW})`);
        }
    }

    // (2) 높이 옵션(2400 초과)
    if (measure.h > baseH) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.overHeight;
        messages.push(`높이 ${baseH} 초과 (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.overHeight.toLocaleString()}원)`);
    } else if (measure.h < baseH) {
        messages.push(`주의: 단가표는 높이 ${baseH} 기준입니다. (입력 ${measure.h})`);
    }

    // (3) 유리그룹 결정 (옵션값이 있으면 그걸 우선, 없으면 문자열 매핑)
    const glassGroup: GlassGroup =
        options.glassGroup ?? mapGlassToGroup(options.glassGroup as any);

    // (4) 베이스 단가 정확 매칭
    const row = findExactRow(door, options.coating, measure.w, glassGroup);
    if (!row) {
        isCustom = true;
        messages.push("단가표에 없는 규격/유리 조합입니다.");
        messages.push("관리자 수기 견적 필요 (자동 계산 불가)");
        return {
            success: false,
            baseCost: 0,
            optionCost,
            totalCost: optionCost,
            isCustom,
            messages,
        };
    }

    baseCost = options.isKnockdown ? row.knockdown : row.finished;

    // (5) 공통 옵션
    if (options.filmRequest) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.filmRed;
        messages.push(`별도 필름 요청 (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.filmRed.toLocaleString()}원)`);
    }
    if (options.verticalDivide) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.verticalDivide;
        messages.push(`세로 분할 (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.verticalDivide.toLocaleString()}원)`);
    }

    // (6) 센서/무선(자동문 계열에서만 보통 쓰지만, 체크하면 가산)
    if (options.sensorTop) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.sensorTop;
        messages.push(`상부센서 (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.sensorTop.toLocaleString()}원)`);
    }
    if (options.sensorWireless) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.sensorWireless;
        messages.push(`무선스위치 (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.sensorWireless.toLocaleString()}원)`);
    }

    // (7) TDU (타입별)
    if (door === "1S_AUTO" && options.tdu1S) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.tdu1S;
        messages.push(`1S 자동 TDU (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.tdu1S.toLocaleString()}원)`);
    }
    if (door === "3T_AUTO" && options.tdu3T) {
        optionCost += MISOTECH_PURCHASE_TABLE_2024_04.meta.tdu3T;
        messages.push(`3연동 자동 TDU (+${MISOTECH_PURCHASE_TABLE_2024_04.meta.tdu3T.toLocaleString()}원)`);
    }

    // (8) 하드웨어
    const damperCount = Math.max(0, options.damperCount ?? 0);
    const pivotCount = Math.max(0, options.pivotCount ?? 0);

    if (damperCount > 0) {
        optionCost += damperCount * MISOTECH_PURCHASE_TABLE_2024_04.meta.damper;
        messages.push(`댐퍼 ${damperCount}EA (+${(damperCount * MISOTECH_PURCHASE_TABLE_2024_04.meta.damper).toLocaleString()}원)`);
    }
    if (pivotCount > 0) {
        optionCost += pivotCount * MISOTECH_PURCHASE_TABLE_2024_04.meta.pivot;
        messages.push(`피봇 ${pivotCount}EA (+${(pivotCount * MISOTECH_PURCHASE_TABLE_2024_04.meta.pivot).toLocaleString()}원)`);
    }

    // (9) 손잡이(일반/호페)
    if (options.handleType) {
        const hCost = (MISOTECH_PURCHASE_TABLE_2024_04.handles as any)[options.handleType] as number | undefined;
        if (typeof hCost === "number") {
            optionCost += hCost;
            messages.push(`손잡이(${options.handleType}) (+${hCost.toLocaleString()}원)`);
        }
    }

    // (10) 추가 자재(Materials) 합산 -- ✅ (추천 포함)
    const { finalSelections, recommendNotes } = resolveMaterialSelections({
        doorType: door,
        w: measure.w,
        h: measure.h,
        options: options,
    });

    // 추천노트/메시지 추가
    messages.push(...recommendNotes);

    const { materialCost, messages: matMsgs } = calculateMaterialCost({
        coating: options.coating,
        selections: finalSelections,
    });
    optionCost += materialCost;
    messages.push(...matMsgs);

    const totalCost = baseCost + optionCost;

    // 폭 범위 안이어도 “표에 없으면” 실패로 처리했으므로 여기서는 성공
    return {
        success: !isCustom,
        baseCost,
        optionCost,
        totalCost,
        isCustom,
        messages,
    };
}

// --- Recommendation Engine & Rules ---

export type AutoRecommendContext = {
    doorType: DoorType;
    coating: CoatingType;
    w: number;
    h: number;

    verticalDivide?: boolean;
    overHeight2400?: boolean;
    railCover?: boolean;
};

export type RecommendRule = {
    key: MaterialKey;
    when: (ctx: AutoRecommendContext) => boolean;
    build: (ctx: AutoRecommendContext) => MaterialSelection | null;
    reason: (ctx: AutoRecommendContext) => string;
};

// ✅ “추천 규칙”
export const MISOTECH_AUTO_RECOMMEND_RULES: RecommendRule[] = [
    // (1) 공통: 마감재는 거의 항상 소량 발생 → 기본 小 1EA 추천
    {
        key: "FINISH_MAT_S",
        when: () => true,
        build: () => ({ key: "FINISH_MAT_S", qty: 1 }),
        reason: () => "기본 마감 보정 자재(소) 1EA 추천",
    },

    // (2) 3연동/3연동자동: 커버 길이 추가
    {
        key: "RAIL_COVER_UPTO_1400",
        when: (ctx) => (ctx.doorType === "3T_MANUAL" || ctx.doorType === "3T_AUTO") && (ctx.railCover ?? true) && ctx.w <= 1400,
        build: () => ({ key: "RAIL_COVER_UPTO_1400", qty: 1 }),
        reason: () => "3연동 레일/커버 길이(폭 구간) 자동 추천",
    },
    {
        key: "RAIL_COVER_UPTO_1700",
        when: (ctx) => (ctx.doorType === "3T_MANUAL" || ctx.doorType === "3T_AUTO") && (ctx.railCover ?? true) && ctx.w > 1400 && ctx.w <= 1700,
        build: () => ({ key: "RAIL_COVER_UPTO_1700", qty: 1 }),
        reason: () => "3연동 레일/커버 길이(폭 구간) 자동 추천",
    },
    {
        key: "RAIL_COVER_UPTO_2000",
        when: (ctx) => (ctx.doorType === "3T_MANUAL" || ctx.doorType === "3T_AUTO") && (ctx.railCover ?? true) && ctx.w > 1700 && ctx.w <= 2000,
        build: () => ({ key: "RAIL_COVER_UPTO_2000", qty: 1 }),
        reason: () => "3연동 레일/커버 길이(폭 구간) 자동 추천",
    },

    // (3) FIX 계열: 보강 세트
    {
        key: "FIX_SET_50x47_SET",
        when: (ctx) => ctx.doorType === "FIX_1S1F" || ctx.doorType === "FIX_2S_H",
        build: () => ({ key: "FIX_SET_50x47_SET", qty: 1 }),
        reason: () => "FIX 기본 보강 세트(50×47) 1세트 추천",
    },

    // (4) 호페: 호페+픽스 기둥바 세트
    {
        key: "HOPE_FIX_PILLAR_50x47_SET",
        when: (ctx) => ctx.doorType === "HOPE",
        build: () => ({ key: "HOPE_FIX_PILLAR_50x47_SET", qty: 1 }),
        reason: () => "호페+픽스 기둥바 세트(표 명시) 1세트 추천",
    },

    // (5) 세로 분할 시: 마감재 추가
    {
        key: "FINISH_MAT_S",
        when: (ctx) => !!ctx.verticalDivide,
        build: () => ({ key: "FINISH_MAT_S", qty: 1 }),
        reason: () => "세로 분할 시 마감자재 추가 가능 → (소) 1EA 추가 추천",
    },
];

export type RecommendedMaterial = {
    key: MaterialKey;
    defaultSelection: MaterialSelection;
    label: string;
    unit: "EA" | "M" | "SET";
    reason: string;
};

function mergeSelections(sum: Map<string, MaterialSelection>, sel: MaterialSelection) {
    const prev = sum.get(sel.key);
    if (!prev) {
        sum.set(sel.key, { ...sel });
        return;
    }
    const next: MaterialSelection = { key: sel.key };
    if (typeof sel.qty === "number" || typeof prev.qty === "number") {
        next.qty = (prev.qty ?? 0) + (sel.qty ?? 0);
    }
    if (typeof sel.meters === "number" || typeof prev.meters === "number") {
        next.meters = (prev.meters ?? 0) + (sel.meters ?? 0);
    }
    sum.set(sel.key, next);
}

export function getRecommendedMaterials(ctx: AutoRecommendContext): RecommendedMaterial[] {
    const merged = new Map<string, MaterialSelection>();
    const reasons = new Map<string, string[]>();

    for (const rule of MISOTECH_AUTO_RECOMMEND_RULES) {
        if (!rule.when(ctx)) continue;
        const sel = rule.build(ctx);
        if (!sel) continue;

        mergeSelections(merged, sel);
        const r = reasons.get(rule.key) ?? [];
        r.push(rule.reason(ctx));
        reasons.set(rule.key, r);
    }

    const out: RecommendedMaterial[] = [];
    for (const [key, defaultSelection] of merged.entries()) {
        const item = MISOTECH_MATERIALS_2024_04[key as MaterialKey];
        if (!item) continue;

        out.push({
            key: key as MaterialKey,
            defaultSelection,
            label: item.label,
            unit: item.unit,
            reason: (reasons.get(key)?.join(" / ")) ?? "",
        });
    }
    out.sort((a, b) => a.label.localeCompare(b.label, "ko"));
    return out;
}

export function resolveMaterialSelections(params: {
    doorType: DoorType;
    w: number;
    h: number;
    options: MisoOptions;
}): { finalSelections: MaterialSelection[]; recommendNotes: string[] } {
    const { doorType, w, h, options } = params;
    const useRec = options.useRecommendedMaterials ?? true;

    // 1) 추천 목록 생성
    const recList = getRecommendedMaterials({
        doorType,
        coating: options.coating,
        w,
        h,
        verticalDivide: options.verticalDivide,
        overHeight2400: options.overHeight2400,
        railCover: options.railCover,
    });

    const recommendNotes = recList.map(r => `[추천] ${r.label} (${r.reason})`);

    // 2) 관리자가 이미 selections를 입력했다면 그걸 최종값으로 사용
    if (options.materialsSelections && options.materialsSelections.length > 0) {
        return { finalSelections: options.materialsSelections, recommendNotes };
    }

    // 3) 없으면 추천값 사용
    if (!useRec) return { finalSelections: [], recommendNotes: [] };

    return {
        finalSelections: recList.map(r => r.defaultSelection),
        recommendNotes,
    };
}
