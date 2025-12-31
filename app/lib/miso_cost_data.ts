export type MisoProductType =
    | "1S_MANUAL"
    | "FIX"
    | "1S_AUTO"
    | "3T_MANUAL"
    | "3T_AUTO"
    | "SEMI_SWING"
    | "HOPE";

export type MisoGlassGroup = "CLEAR_BRONZE_AQUA" | "SATIN" | "WIRE";

// ✅ 추가(기본값 제공) — UI가 아직 없으면 기본값으로 계산됨
export type MisoCoating = "FLUORO" | "ANOD"; // 불소 / 아노다이징
export type FixVariant = "1S1F" | "2S_HBAR";
export type SemiSwingVariant = "ASYM_1H" | "SYM_2H" | "OUTER"; // 비대칭/정대칭/외도어
export type HopeVariant = "NORMAL" | "OUTER"; // (표에 외도어 별도)

export interface MisoCostResult {
    success: boolean;

    baseCost: number;          // 기본 매입단가
    optionCost: number;        // 옵션 가산(자재 제외)
    materialCost: number;      // ✅ 자재비(별도)
    totalCost: number;         // base + option + material

    isCustom: boolean;
    messages: string[];

    // (선택) 디버깅/표시용
    optionLines?: { label: string; amount: number }[];
    materialLines?: { label: string; amount: number }[];

    appliedWidthKey?: number;
    appliedVariant?: string;
}



/** =========================
 *  제조 규칙(폭 범위) — PDF 기준
 *  ========================= */
const RULES: Record<MisoProductType, { minW: number; maxW: number; baseH: number }> = {
    "1S_MANUAL": { minW: 100, maxW: 1450, baseH: 2400 },
    "1S_AUTO": { minW: 100, maxW: 1350, baseH: 2400 },
    "3T_MANUAL": { minW: 100, maxW: 2500, baseH: 2400 },
    "3T_AUTO": { minW: 100, maxW: 1700, baseH: 2400 },
    "SEMI_SWING": { minW: 250, maxW: 1000, baseH: 2400 },
    "HOPE": { minW: 250, maxW: 950, baseH: 2400 },
    "FIX": { minW: 100, maxW: 3000, baseH: 2400 },
};

/** =========================
 *  옵션 단가 — PDF 근거
 *  ========================= */
const COST_FILM = 10000;
const COST_DIVIDER = 10000;
const COST_OVER_HEIGHT = 10000; // 2400 초과
const COST_TDU_1S = 260000;
const COST_TDU_3T = 290000;

const HANDLE_COSTS = {
    "OLD_450": 35000,
    "NEW_350": 25000,
    "NEW_600": 35000,
    "NEW_800": 45000,
    "HALF_ROUND": 30000,
} as const;

const HOPE_HANDLE_COSTS = {
    "GERMAN": 60000,
    "CHINESE": 40000,
} as const;

/** =========================
 *  유리명 -> 그룹 매핑
 *  ========================= */
export function mapGlassToGroup(glassName: string): MisoGlassGroup {
    const s = glassName ?? "";
    if (s.includes("샤틴")) return "SATIN";
    if (s.includes("망입")) return "WIRE";
    return "CLEAR_BRONZE_AQUA"; // 투명/브론즈/아쿠아는 그룹으로 묶음
}

/** =========================
 *  단가 테이블(핵심 행 전부 반영)
 *  - 키: type/coating/(variant)/width/glassGroup
 *  - 값: knockdown/finished/install(수도권)
 *  ========================= */
type PriceRow = { knockdown: number; finished: number; install: number };

// 공통 헬퍼: width->(glassGroup->PriceRow)
type WidthGlassTable = Record<number, Partial<Record<MisoGlassGroup, PriceRow>>>;

// 1S 수동
export const T_1S_MANUAL: Record<MisoCoating, WidthGlassTable> = {
    FLUORO: {
        1100: { CLEAR_BRONZE_AQUA: { knockdown: 150000, finished: 270000, install: 400000 }, SATIN: { knockdown: 160000, finished: 290000, install: 420000 }, WIRE: { knockdown: 170000, finished: 380000, install: 510000 } },
        1300: { CLEAR_BRONZE_AQUA: { knockdown: 160000, finished: 290000, install: 420000 }, SATIN: { knockdown: 160000, finished: 290000, install: 420000 }, WIRE: { knockdown: 170000, finished: 380000, install: 510000 } },
        1450: { CLEAR_BRONZE_AQUA: { knockdown: 170000, finished: 380000, install: 510000 }, SATIN: { knockdown: 170000, finished: 380000, install: 510000 }, WIRE: { knockdown: 170000, finished: 380000, install: 510000 } },
    },
    ANOD: {
        1100: { CLEAR_BRONZE_AQUA: { knockdown: 160000, finished: 280000, install: 410000 }, SATIN: { knockdown: 170000, finished: 300000, install: 430000 }, WIRE: { knockdown: 180000, finished: 390000, install: 520000 } },
        1300: { CLEAR_BRONZE_AQUA: { knockdown: 170000, finished: 300000, install: 430000 }, SATIN: { knockdown: 170000, finished: 300000, install: 430000 }, WIRE: { knockdown: 180000, finished: 390000, install: 520000 } },
        1450: { CLEAR_BRONZE_AQUA: { knockdown: 180000, finished: 390000, install: 520000 }, SATIN: { knockdown: 180000, finished: 390000, install: 520000 }, WIRE: { knockdown: 180000, finished: 390000, install: 520000 } },
    },
};

// FIX (1S+1F / 2S(H바))
export const T_FIX: Record<FixVariant, Record<MisoCoating, WidthGlassTable>> = {
    "1S1F": {
        FLUORO: {
            800: { CLEAR_BRONZE_AQUA: { knockdown: 90000, finished: 190000, install: 270000 } },
            1100: { SATIN: { knockdown: 100000, finished: 210000, install: 290000 } },
            1300: { WIRE: { knockdown: 110000, finished: 280000, install: 360000 } },
        },
        // PDF에는 1S+1F의 도장별 분리표가 명확히 전부 나오진 않지만,
        // 상단 1S 수동처럼 FLUORO/ANOD 행이 분리되어 있으므로 FIX도 동일 구조로 확장 가능.
        // 우선 표에 확실히 있는 값 기준으로 FLUORO=기준, ANOD는 동일값으로 시작(필요시 업데이트).
        ANOD: {
            800: { CLEAR_BRONZE_AQUA: { knockdown: 90000, finished: 190000, install: 270000 } },
            1100: { SATIN: { knockdown: 100000, finished: 210000, install: 290000 } },
            1300: { WIRE: { knockdown: 110000, finished: 280000, install: 360000 } },
        },
    },
    "2S_HBAR": {
        FLUORO: {
            800: { CLEAR_BRONZE_AQUA: { knockdown: 100000, finished: 200000, install: 280000 } },
            1100: { SATIN: { knockdown: 110000, finished: 220000, install: 300000 } },
            1300: { WIRE: { knockdown: 120000, finished: 290000, install: 370000 } },
        },
        ANOD: {
            800: { CLEAR_BRONZE_AQUA: { knockdown: 100000, finished: 200000, install: 280000 } },
            1100: { SATIN: { knockdown: 110000, finished: 220000, install: 300000 } },
            1300: { WIRE: { knockdown: 120000, finished: 290000, install: 370000 } },
        },
    },
};

// 1S 자동
export const T_1S_AUTO: Record<MisoCoating, WidthGlassTable> = {
    FLUORO: {
        1100: { CLEAR_BRONZE_AQUA: { knockdown: 550000, finished: 670000, install: 870000 }, SATIN: { knockdown: 570000, finished: 700000, install: 900000 }, WIRE: { knockdown: 590000, finished: 780000, install: 980000 } },
        1250: { CLEAR_BRONZE_AQUA: { knockdown: 570000, finished: 700000, install: 900000 }, SATIN: { knockdown: 570000, finished: 700000, install: 900000 }, WIRE: { knockdown: 590000, finished: 780000, install: 980000 } },
        1350: { CLEAR_BRONZE_AQUA: { knockdown: 590000, finished: 780000, install: 980000 }, SATIN: { knockdown: 590000, finished: 780000, install: 980000 }, WIRE: { knockdown: 590000, finished: 780000, install: 980000 } },
    },
    ANOD: {
        1100: { CLEAR_BRONZE_AQUA: { knockdown: 570000, finished: 690000, install: 890000 }, SATIN: { knockdown: 590000, finished: 720000, install: 920000 }, WIRE: { knockdown: 610000, finished: 800000, install: 1000000 } },
        1250: { CLEAR_BRONZE_AQUA: { knockdown: 590000, finished: 720000, install: 920000 }, SATIN: { knockdown: 590000, finished: 720000, install: 920000 }, WIRE: { knockdown: 610000, finished: 800000, install: 1000000 } },
        1350: { CLEAR_BRONZE_AQUA: { knockdown: 610000, finished: 800000, install: 1000000 }, SATIN: { knockdown: 610000, finished: 800000, install: 1000000 }, WIRE: { knockdown: 610000, finished: 800000, install: 1000000 } },
    },
};

// 3연동 수동
export const T_3T_MANUAL: Record<MisoCoating, WidthGlassTable> = {
    FLUORO: {
        1300: { CLEAR_BRONZE_AQUA: { knockdown: 260000, finished: 400000, install: 530000 }, SATIN: { knockdown: 270000, finished: 430000, install: 560000 }, WIRE: { knockdown: 280000, finished: 530000, install: 660000 } },
        1500: { CLEAR_BRONZE_AQUA: { knockdown: 270000, finished: 430000, install: 560000 }, SATIN: { knockdown: 270000, finished: 430000, install: 560000 }, WIRE: { knockdown: 280000, finished: 530000, install: 660000 } },
        1700: { CLEAR_BRONZE_AQUA: { knockdown: 280000, finished: 530000, install: 660000 }, SATIN: { knockdown: 280000, finished: 530000, install: 660000 }, WIRE: { knockdown: 280000, finished: 530000, install: 660000 } },
    },
    ANOD: {
        1300: { CLEAR_BRONZE_AQUA: { knockdown: 280000, finished: 420000, install: 550000 }, SATIN: { knockdown: 290000, finished: 450000, install: 580000 }, WIRE: { knockdown: 300000, finished: 540000, install: 670000 } },
        1500: { CLEAR_BRONZE_AQUA: { knockdown: 290000, finished: 450000, install: 580000 }, SATIN: { knockdown: 290000, finished: 450000, install: 580000 }, WIRE: { knockdown: 300000, finished: 540000, install: 670000 } },
        1700: { CLEAR_BRONZE_AQUA: { knockdown: 300000, finished: 540000, install: 670000 }, SATIN: { knockdown: 300000, finished: 540000, install: 670000 }, WIRE: { knockdown: 300000, finished: 540000, install: 670000 } },
    },
};

// 3연동 자동
export const T_3T_AUTO: Record<MisoCoating, WidthGlassTable> = {
    FLUORO: {
        1300: { CLEAR_BRONZE_AQUA: { knockdown: 700000, finished: 850000, install: 1050000 }, SATIN: { knockdown: 720000, finished: 880000, install: 1080000 }, WIRE: { knockdown: 740000, finished: 970000, install: 1170000 } },
        1500: { CLEAR_BRONZE_AQUA: { knockdown: 720000, finished: 880000, install: 1080000 }, SATIN: { knockdown: 720000, finished: 880000, install: 1080000 }, WIRE: { knockdown: 740000, finished: 970000, install: 1170000 } },
        1700: { CLEAR_BRONZE_AQUA: { knockdown: 740000, finished: 970000, install: 1170000 }, SATIN: { knockdown: 740000, finished: 970000, install: 1170000 }, WIRE: { knockdown: 740000, finished: 970000, install: 1170000 } },
    },
    ANOD: {
        1300: { CLEAR_BRONZE_AQUA: { knockdown: 730000, finished: 880000, install: 1080000 }, SATIN: { knockdown: 750000, finished: 910000, install: 1110000 }, WIRE: { knockdown: 770000, finished: 1000000, install: 1200000 } },
        1500: { CLEAR_BRONZE_AQUA: { knockdown: 750000, finished: 910000, install: 1110000 }, SATIN: { knockdown: 750000, finished: 910000, install: 1110000 }, WIRE: { knockdown: 770000, finished: 1000000, install: 1200000 } },
        1700: { CLEAR_BRONZE_AQUA: { knockdown: 770000, finished: 1000000, install: 1200000 }, SATIN: { knockdown: 770000, finished: 1000000, install: 1200000 }, WIRE: { knockdown: 770000, finished: 1000000, install: 1200000 } },
    },
};

// 반자동 스윙
const T_SEMI_SWING: Record<MisoCoating, Record<SemiSwingVariant, Record<number, PriceRow>>> = {
    FLUORO: {
        ASYM_1H: {
            1200: { knockdown: 380000, finished: 490000, install: 640000 },
            1400: { knockdown: 400000, finished: 520000, install: 670000 },
            1500: { knockdown: 430000, finished: 550000, install: 700000 },
        },
        SYM_2H: {
            1200: { knockdown: 380000, finished: 490000, install: 640000 },
            1400: { knockdown: 400000, finished: 520000, install: 670000 },
            1500: { knockdown: 430000, finished: 550000, install: 700000 },
        },
        OUTER: {
            1000: { knockdown: 270000, finished: 360000, install: 480000 },
        },
    },
    ANOD: {
        ASYM_1H: {
            1200: { knockdown: 410000, finished: 520000, install: 670000 },
            1400: { knockdown: 430000, finished: 550000, install: 700000 },
            1500: { knockdown: 460000, finished: 580000, install: 730000 },
        },
        SYM_2H: {
            1200: { knockdown: 410000, finished: 520000, install: 670000 },
            1400: { knockdown: 430000, finished: 550000, install: 700000 },
            1500: { knockdown: 460000, finished: 580000, install: 730000 },
        },
        OUTER: {
            1000: { knockdown: 290000, finished: 380000, install: 500000 },
        },
    },
};

// 호페
const T_HOPE: Record<MisoCoating, Record<HopeVariant, Record<number, PriceRow>>> = {
    FLUORO: {
        NORMAL: {
            1100: { knockdown: 360000, finished: 470000, install: 620000 },
            1300: { knockdown: 380000, finished: 500000, install: 650000 },
        },
        OUTER: {
            1000: { knockdown: 280000, finished: 390000, install: 510000 },
        },
    },
    ANOD: {
        NORMAL: {
            1100: { knockdown: 390000, finished: 500000, install: 650000 },
            1300: { knockdown: 410000, finished: 530000, install: 680000 },
        },
        OUTER: {
            1000: { knockdown: 310000, finished: 420000, install: 540000 },
        },
    },
};

/** =========================
 *  베이스 단가 조회(표에 없으면 수기견적 처리)
 *  ========================= */
// Helper: Find applicable row by width (Range Lookup: Up to X)
function pickWidthKey(table: Record<number, any>, width: number): number | null {
    const keys = Object.keys(table)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

    for (const k of keys) {
        if (width <= k) return k; // ✅ width가 이 구간 상한 이하이면 이 행 선택
    }
    return null; // 표 구간 밖(너무 큼)
}

// Helper return type
type LookupResult = {
    row?: PriceRow;
    msg?: string;
    widthKey?: number;
    variant?: string;
};

/** =========================
 *  베이스 단가 조회(표에 없으면 수기견적 처리)
 *  ========================= */
function lookupBasePrice(spec: DoorSpec): LookupResult {
    const coating: MisoCoating = spec.coating ?? "FLUORO";
    const glassGroup = mapGlassToGroup(spec.glass);

    switch (spec.type) {
        case "1S_MANUAL": {
            const table = T_1S_MANUAL[coating];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = (wk ? table[wk] : undefined)?.[glassGroup];
            if (!r) return { msg: "단가표에 없는 규격/유리 조합입니다. (1S 수동)" };
            return { row: r, widthKey: wk ?? undefined, variant: "" };
        }

        case "FIX": {
            const v: FixVariant = spec.fixVariant ?? "1S1F";
            const table = T_FIX[v]?.[coating];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = (wk ? table[wk] : undefined)?.[glassGroup];
            if (!r) return { msg: `단가표에 없는 규격/유리 조합입니다. (FIX ${v})` };
            return { row: r, widthKey: wk ?? undefined, variant: v };
        }

        case "1S_AUTO": {
            const table = T_1S_AUTO[coating];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = (wk ? table[wk] : undefined)?.[glassGroup];
            if (!r) return { msg: "단가표에 없는 규격/유리 조합입니다. (1S 자동)" };
            return { row: r, widthKey: wk ?? undefined, variant: "" };
        }

        case "3T_MANUAL": {
            const table = T_3T_MANUAL[coating];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = (wk ? table[wk] : undefined)?.[glassGroup];
            if (!r) return { msg: "단가표에 없는 규격/유리 조합입니다. (3연동 수동)" };
            return { row: r, widthKey: wk ?? undefined, variant: "" };
        }

        case "3T_AUTO": {
            const table = T_3T_AUTO[coating];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = (wk ? table[wk] : undefined)?.[glassGroup];
            if (!r) return { msg: "단가표에 없는 규격/유리 조합입니다. (3연동 자동)" };
            return { row: r, widthKey: wk ?? undefined, variant: "" };
        }

        case "SEMI_SWING": {
            const v: SemiSwingVariant = spec.semiSwingVariant ?? "ASYM_1H";
            const table = T_SEMI_SWING[coating]?.[v];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = wk ? table[wk] : undefined;
            if (!r) return { msg: `단가표에 없는 규격입니다. (반자동 ${v})` };
            return { row: r, widthKey: wk ?? undefined, variant: v };
        }

        case "HOPE": {
            const v: HopeVariant = spec.hopeVariant ?? "NORMAL";
            const table = T_HOPE[coating]?.[v];
            const wk = table ? pickWidthKey(table, spec.width) : null;
            const r = wk ? table[wk] : undefined;
            if (!r) return { msg: `단가표에 없는 규격입니다. (호페 ${v})` };
            return { row: r, widthKey: wk ?? undefined, variant: v };
        }

        default:
            return { msg: "지원하지 않는 제품 타입입니다." };
    }
}


/* =========================================================
   [A] MATERIALS 타입/테이블(JSON)
   - PDF 자재/옵션 단가를 JSON화
   - coating(FLUORO/ANOD)별 단가 지원
========================================================= */

export type MaterialUnit = "EA" | "M" | "SET";
export type MaterialCategory = "COMMON" | "ONE_S" | "FIX" | "THREE_T" | "RAIL_COVER" | "HOPE_FIX";

export type MaterialKey =
    | "FINISH_MAT_L"
    | "FINISH_MAT_S"
    | "MIDBAR_22_PER_M"
    | "ADHESIVEBAR_22_2P5M"
    | "BAR_10x20_EA"
    | "BAR_20x30_EA"
    | "BAR_38x20_PER_M"
    | "FIX_SET_128x49_SET"
    | "FIX_SET_50x47_SET"
    | "FIX_35x20_EA"
    | "FIX_SET_88x49_SET"
    | "MIDBAR_18_PER_M"
    | "ADHESIVEBAR_18_2P5M"
    | "BAR_30x10_EA"
    | "BAR_60x2P5_EA"
    | "RAIL_COVER_UPTO_1400"
    | "RAIL_COVER_UPTO_1700"
    | "RAIL_COVER_UPTO_2000"
    | "HOPE_FIX_PILLAR_50x47_SET";

export type MaterialItem = {
    key: MaterialKey;
    label: string;
    category: MaterialCategory;
    unit: MaterialUnit;
    note?: string;
    // coating별 단가 (없으면 FLUORO를 fallback)
    price: Partial<Record<MisoCoating, number>>;
};

export type MaterialSelection = {
    key: MaterialKey;
    enabled?: boolean; // UI 체크박스용(없으면 true 취급)
    qty?: number;      // EA/SET 용
    meters?: number;   // M 용
};

export const MISOTECH_MATERIALS_2024_04: Record<MaterialKey, MaterialItem> = {
    FINISH_MAT_L: {
        key: "FINISH_MAT_L",
        label: "마감재/옵션자재 (大)",
        category: "COMMON",
        unit: "EA",
        price: { FLUORO: 4000, ANOD: 4000 },
    },
    FINISH_MAT_S: {
        key: "FINISH_MAT_S",
        label: "마감재/옵션자재 (小)",
        category: "COMMON",
        unit: "EA",
        price: { FLUORO: 3000, ANOD: 3000 },
    },

    MIDBAR_22_PER_M: {
        key: "MIDBAR_22_PER_M",
        label: "중간바 22 (m당)",
        category: "ONE_S",
        unit: "M",
        price: { FLUORO: 6700, ANOD: 7100 },
    },
    ADHESIVEBAR_22_2P5M: {
        key: "ADHESIVEBAR_22_2P5M",
        label: "접착바 22 (2.5m)",
        category: "ONE_S",
        unit: "EA",
        note: "2.5m 1본 단위",
        price: { FLUORO: 6500, ANOD: 7000 },
    },
    BAR_10x20_EA: {
        key: "BAR_10x20_EA",
        label: "10×20 (EA)",
        category: "ONE_S",
        unit: "EA",
        price: { FLUORO: 5000, ANOD: 5500 },
    },
    BAR_20x30_EA: {
        key: "BAR_20x30_EA",
        label: "20×30 (EA)",
        category: "ONE_S",
        unit: "EA",
        price: { FLUORO: 9000, ANOD: 9500 },
    },
    BAR_38x20_PER_M: {
        key: "BAR_38x20_PER_M",
        label: "38×20 (m당)",
        category: "ONE_S",
        unit: "M",
        price: { FLUORO: 5000, ANOD: 5500 },
    },

    FIX_SET_128x49_SET: {
        key: "FIX_SET_128x49_SET",
        label: "FIX 128×49 (세트)",
        category: "FIX",
        unit: "SET",
        price: { FLUORO: 65800, ANOD: 70000 },
    },
    FIX_SET_50x47_SET: {
        key: "FIX_SET_50x47_SET",
        label: "FIX 50×47 (세트)",
        category: "FIX",
        unit: "SET",
        price: { FLUORO: 40800, ANOD: 43400 },
    },
    FIX_35x20_EA: {
        key: "FIX_35x20_EA",
        label: "FIX 35×20 (EA)",
        category: "FIX",
        unit: "EA",
        price: { FLUORO: 10000, ANOD: 10500 },
    },
    FIX_SET_88x49_SET: {
        key: "FIX_SET_88x49_SET",
        label: "FIX 88×49 (세트)",
        category: "FIX",
        unit: "SET",
        price: { FLUORO: 59200, ANOD: 61800 },
    },

    MIDBAR_18_PER_M: {
        key: "MIDBAR_18_PER_M",
        label: "중간바 18 (m당)",
        category: "THREE_T",
        unit: "M",
        price: { FLUORO: 5000, ANOD: 5500 },
    },
    ADHESIVEBAR_18_2P5M: {
        key: "ADHESIVEBAR_18_2P5M",
        label: "접착바 18 (2.5m)",
        category: "THREE_T",
        unit: "EA",
        note: "2.5m 1본 단위",
        price: { FLUORO: 5000, ANOD: 5500 },
    },
    BAR_30x10_EA: {
        key: "BAR_30x10_EA",
        label: "30×10 (EA)",
        category: "THREE_T",
        unit: "EA",
        price: { FLUORO: 3500, ANOD: 4500 },
    },
    BAR_60x2P5_EA: {
        key: "BAR_60x2P5_EA",
        label: "60×2.5 (EA)",
        category: "THREE_T",
        unit: "EA",
        price: { FLUORO: 12000, ANOD: 13000 },
    },

    RAIL_COVER_UPTO_1400: {
        key: "RAIL_COVER_UPTO_1400",
        label: "상부인방(커버) 길이 추가 ~1400",
        category: "RAIL_COVER",
        unit: "EA",
        price: { FLUORO: 25000, ANOD: 25000 },
    },
    RAIL_COVER_UPTO_1700: {
        key: "RAIL_COVER_UPTO_1700",
        label: "상부인방(커버) 길이 추가 ~1700",
        category: "RAIL_COVER",
        unit: "EA",
        price: { FLUORO: 30000, ANOD: 30000 },
    },
    RAIL_COVER_UPTO_2000: {
        key: "RAIL_COVER_UPTO_2000",
        label: "상부인방(커버) 길이 추가 ~2000",
        category: "RAIL_COVER",
        unit: "EA",
        price: { FLUORO: 35000, ANOD: 35000 },
    },

    HOPE_FIX_PILLAR_50x47_SET: {
        key: "HOPE_FIX_PILLAR_50x47_SET",
        label: "호페+픽스 기둥바 50×47 (세트)",
        category: "HOPE_FIX",
        unit: "SET",
        price: { FLUORO: 40800, ANOD: 43400 },
    },
};

/* =========================================================
   [B] DoorSpec 확장 (UI 없어도 기본값 자동추천)
========================================================= */

export interface DoorSpec {
    type: MisoProductType;
    width: number;
    height: number;
    glass: string;
    isKnockdown: boolean;
    coating?: MisoCoating;
    fixVariant?: FixVariant;
    semiSwingVariant?: SemiSwingVariant;
    hopeVariant?: HopeVariant;

    // ✅ 추가: 자재 자동추천/수정
    useRecommendedMaterials?: boolean; // 기본 true
    railCover?: boolean;              // 3연동일 때 커버 추천 여부(기본 true)
    materialsSelections?: MaterialSelection[]; // 관리자가 수정한 최종값(있으면 추천값을 덮어씀)

    options: {
        filmRequest?: boolean;
        verticalDivide?: boolean;
        handleType?: "OLD_450" | "NEW_350" | "NEW_600" | "NEW_800" | "HALF_ROUND";
        hopeHandle?: "GERMAN" | "CHINESE";
        tdu?: boolean;
    };
}

/* =========================================================
   [C] 추천 엔진 (B 방식)
   - 자동 추천 → (관리자가 수정하면) 그 값으로 대체
========================================================= */

type RecommendContext = {
    type: MisoProductType;
    coating: MisoCoating;
    w: number;
    h: number;
    fixVariant: FixVariant;
    hopeVariant: HopeVariant;
    verticalDivide?: boolean;
    railCover: boolean;
};

function pickCoverKey(w: number): MaterialKey | null {
    if (w <= 1400) return "RAIL_COVER_UPTO_1400";
    if (w <= 1700) return "RAIL_COVER_UPTO_1700";
    if (w <= 2000) return "RAIL_COVER_UPTO_2000";
    return null;
}

function mergeMaterialSelections(items: MaterialSelection[]): MaterialSelection[] {
    const map = new Map<MaterialKey, MaterialSelection>();

    for (const it of items) {
        if (!it || !it.key) continue;
        const enabled = it.enabled ?? true;
        if (!enabled) continue;

        const prev = map.get(it.key);
        if (!prev) {
            map.set(it.key, { key: it.key, enabled: true, qty: it.qty, meters: it.meters });
            continue;
        }
        // EA/SET
        if (typeof it.qty === "number") prev.qty = (prev.qty ?? 0) + it.qty;
        // M
        if (typeof it.meters === "number") prev.meters = (prev.meters ?? 0) + it.meters;
    }

    return Array.from(map.values());
}

function getRecommendedMaterials(ctx: RecommendContext): { selections: MaterialSelection[]; notes: string[] } {
    const rec: MaterialSelection[] = [];
    const notes: string[] = [];

    // ✅ 공통: 마감재(소) 1EA 추천
    rec.push({ key: "FINISH_MAT_S", qty: 1 });
    notes.push("추천자재: 마감재(소) 1EA(기본)");

    // ✅ 세로분할이면 마감재(소) 추가 추천
    if (ctx.verticalDivide) {
        rec.push({ key: "FINISH_MAT_S", qty: 1 });
        notes.push("추천자재: 세로분할 → 마감재(소) 1EA 추가");
    }

    // ✅ FIX: 기본 보강 세트 1세트(관리자 조정 전제)
    if (ctx.type === "FIX") {
        rec.push({ key: "FIX_SET_50x47_SET", qty: 1 });
        notes.push(`추천자재: FIX(${ctx.fixVariant}) → FIX 50×47 세트 1`);
    }

    // ✅ HOPE: 표에 있는 호페+픽스 기둥바 세트 1세트
    if (ctx.type === "HOPE") {
        rec.push({ key: "HOPE_FIX_PILLAR_50x47_SET", qty: 1 });
        notes.push(`추천자재: HOPE(${ctx.hopeVariant}) → 호페+픽스 기둥바 세트 1`);
    }

    // ✅ 3연동(수동/자동): 레일/커버 길이 추천(폭 구간)
    if ((ctx.type === "3T_MANUAL" || ctx.type === "3T_AUTO") && ctx.railCover) {
        const k = pickCoverKey(ctx.w);
        if (k) {
            rec.push({ key: k, qty: 1 });
            notes.push(`추천자재: 3연동 → 상부인방(커버) ${k.replace("RAIL_COVER_", "")} 1`);
        } else {
            notes.push("주의: 커버 길이(폭)가 2000 초과 → 수기 확인 필요");
        }
    }

    return { selections: mergeMaterialSelections(rec), notes };
}

/* =========================================================
   [D] 자재비 합산 계산
========================================================= */

function getMaterialUnitPrice(item: MaterialItem, coating: MisoCoating): number {
    return item.price[coating] ?? item.price.FLUORO ?? 0;
}

function safeNum(n: any, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
}

export function calculateMaterialCost(params: {
    coating: MisoCoating;
    selections: MaterialSelection[];
    customMaterials?: Record<MaterialKey, MaterialItem>; // ✅ Added Override
}): { cost: number; messages: string[]; lines: { label: string; amount: number }[] } {
    let cost = 0;
    const messages: string[] = [];
    const lines: { label: string; amount: number }[] = [];

    for (const sel of params.selections ?? []) {
        const enabled = sel.enabled ?? true;
        if (!enabled) continue;

        // ✅ Use custom or default
        const item = params.customMaterials?.[sel.key] ?? MISOTECH_MATERIALS_2024_04[sel.key];
        if (!item) continue;

        const unitPrice = getMaterialUnitPrice(item, params.coating);
        let amount = 0;
        let label = "";

        if (item.unit === "M") {
            const meters = Math.max(0, safeNum(sel.meters, 0));
            if (meters <= 0) continue;
            amount = Math.round(unitPrice * meters);
            label = `${item.label} ${meters}m`;
        } else {
            const qty = Math.max(0, safeNum(sel.qty, 0));
            if (qty <= 0) continue;
            amount = Math.round(unitPrice * qty);
            label = `${item.label} ${qty}${item.unit === "SET" ? "세트" : "EA"}`;
        }

        cost += amount;
        messages.push(`${label} (+${amount.toLocaleString()})`);
        lines.push({ label, amount });
    }

    return { cost, messages, lines };
}

/* =========================================================
   [E] ✅ calculateMisoCost에 MATERIALS 자동추천+수정 합산 추가
   - 아래 함수는 “너가 올린 calculateMisoCost”에서
     ‘결과 계산 끝나기 전에’ 이 블록만 넣으면 됨.
========================================================= */

// ✅ 이 함수는 기존 calculateMisoCost 내부에서 호출용
function resolveMaterialSelections(spec: DoorSpec): { selections: MaterialSelection[]; notes: string[] } {
    const coating: MisoCoating = spec.coating ?? "FLUORO";
    const useRec = spec.useRecommendedMaterials ?? true;

    const fixVariant: FixVariant = spec.fixVariant ?? "1S1F";
    const hopeVariant: HopeVariant = spec.hopeVariant ?? "NORMAL";

    const ctx: RecommendContext = {
        type: spec.type,
        coating,
        w: spec.width,
        h: spec.height,
        fixVariant,
        hopeVariant,
        verticalDivide: spec.options?.verticalDivide,
        railCover: spec.railCover ?? true,
    };

    const { selections: recommended, notes } = getRecommendedMaterials(ctx);

    // 관리자가 직접 selections를 넣었으면 그것이 최종
    if (spec.materialsSelections && spec.materialsSelections.length > 0) {
        return { selections: mergeMaterialSelections(spec.materialsSelections), notes: ["(관리자 수정 자재 적용)", ...notes] };
    }

    if (!useRec) return { selections: [], notes: ["(자재 자동추천 OFF)"] };

    return { selections: recommended, notes };
}

/* =========================================================
   [F] 아래는 “기존 calculateMisoCost”에
       ✅ MATERIALS 합산 블록을 추가한 버전(복붙 교체용)
========================================================= */

export function calculateMisoCost(spec: DoorSpec, customMaterials?: Record<MaterialKey, MaterialItem>): MisoCostResult {
    const result: MisoCostResult = {
        success: true,
        baseCost: 0,
        optionCost: 0,
        materialCost: 0,
        totalCost: 0,
        isCustom: false,
        messages: [],
        optionLines: [],
        materialLines: [],
    };

    const rule = RULES[spec.type];

    // 1) 폭 범위 체크
    if (spec.width < rule.minW || spec.width > rule.maxW) {
        result.isCustom = true;
        result.messages.push(`규격 외 사이즈: 가로 ${spec.width} (허용: ${rule.minW}~${rule.maxW})`);
    }

    // 2) 높이(2400 기준)
    if (spec.height > rule.baseH) {
        result.optionCost += COST_OVER_HEIGHT;
        result.messages.push(`높이 2400 초과 (+10,000)`);
        result.optionLines?.push({ label: "높이 2400 초과", amount: COST_OVER_HEIGHT });
    } else if (spec.height < rule.baseH) {
        result.messages.push(`주의: 단가표는 높이 2400 기준입니다. (입력 높이 ${spec.height})`);
    }

    // 3) 베이스 단가(표 매칭)
    const { row, msg, widthKey, variant } = lookupBasePrice(spec);
    if (!row) {
        result.isCustom = true;
        result.success = false;
        result.messages.push(msg ?? "단가표 매칭 실패");
        result.messages.push("관리자 수기 견적 필요 (자동 계산 불가)");
        result.totalCost = result.baseCost + result.optionCost;
        return result;
    }

    result.baseCost = spec.isKnockdown ? row.knockdown : row.finished;

    // 메타데이터 저장
    result.appliedWidthKey = widthKey;
    result.appliedVariant = variant;

    // 4) 자동문 TDU 옵션
    if (spec.type === "1S_AUTO" && spec.options.tdu) {
        result.optionCost += COST_TDU_1S;
        result.messages.push("TDU 추가 (+260,000)");
        result.optionLines?.push({ label: "TDU(1S)", amount: COST_TDU_1S });
    }
    if (spec.type === "3T_AUTO" && spec.options.tdu) {
        result.optionCost += COST_TDU_3T;
        result.messages.push("TDU 추가 (+290,000)");
        result.optionLines?.push({ label: "TDU(3T)", amount: COST_TDU_3T });
    }

    // 5) 공통 옵션
    if (spec.options.filmRequest) {
        result.optionCost += COST_FILM;
        result.messages.push("별도 필름 적용 (+10,000)");
        result.optionLines?.push({ label: "별도 필름", amount: COST_FILM });
    }
    if (spec.options.verticalDivide) {
        result.optionCost += COST_DIVIDER;
        result.messages.push("세로 분할 (+10,000)");
        result.optionLines?.push({ label: "세로 분할", amount: COST_DIVIDER });
    }

    // 6) 손잡이(반자동)
    if (spec.options.handleType && HANDLE_COSTS[spec.options.handleType]) {
        const cost = HANDLE_COSTS[spec.options.handleType];
        result.optionCost += cost;
        result.messages.push(
            `손잡이(${spec.options.handleType}) 추가 (+${cost.toLocaleString()})`
        );
        result.optionLines?.push({ label: `손잡이(${spec.options.handleType})`, amount: cost });
    }

    // 7) 호페 손잡이
    if (spec.options.hopeHandle && HOPE_HANDLE_COSTS[spec.options.hopeHandle]) {
        const cost = HOPE_HANDLE_COSTS[spec.options.hopeHandle];
        result.optionCost += cost;
        result.messages.push(
            `호페 손잡이(${spec.options.hopeHandle}) (+${cost.toLocaleString()})`
        );
        result.optionLines?.push({ label: `호페 손잡이(${spec.options.hopeHandle})`, amount: cost });
    }

    /* =========================
       ✅ MATERIALS 자동추천 + 관리자수정 합산 (B 방식)
       ========================= */
    const coating: MisoCoating = spec.coating ?? "FLUORO";
    const { selections: matSelections, notes: recNotes } = resolveMaterialSelections(spec);

    // 추천 설명(관리자 화면에선 보여주고, 고객용에선 숨겨도 됨)
    result.messages.push(...recNotes);

    const { cost: materialCost, messages: matMsgs, lines: matLines } = calculateMaterialCost({
        coating,
        selections: matSelections,
    });

    result.materialCost = materialCost;
    result.materialLines = matLines;

    // 메시지 합치기
    if (materialCost > 0) {
        result.messages.push(...matMsgs);
        result.messages.push(`자재 합계 (+${materialCost.toLocaleString()})`);
    }

    // 합계 (Total = Base + Option + Material)
    result.totalCost = result.baseCost + result.optionCost + result.materialCost;

    if (result.isCustom) {
        result.success = false;
        result.messages.push("관리자 수기 견적 필요 (자동 계산 불가)");
    }

    return result;
}
