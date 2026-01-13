"use client";

import { useMemo, useState, useEffect } from "react";
import GlassDesignOptions from "@/app/components/GlassDesignOptions";
import { calcPricing, type DoorKind, type GlassDesign } from "@/app/lib/pricing";

// Frame Logic Definitions
type FrameFinish = "FLUORO" | "ANOD"; // 불소 / 아노다이징
type FrameColor = "WHITE" | "BLACK" | "DEEP_GRAY" | "CHAMPAGNE_GOLD";

const COLOR_LABEL: Record<FrameColor, string> = {
    WHITE: "화이트",
    BLACK: "블랙",
    DEEP_GRAY: "딥그레이",
    CHAMPAGNE_GOLD: "샴페인골드",
};

function getFramePolicy(doorKind: DoorKind, finish: FrameFinish) {
    // ✅ 스윙/호폐는 아노다이징 강제 + 기본 블랙
    const isSwingOrHope = doorKind === "SWING_1" || doorKind === "SWING_2" || doorKind === "HOPE_1" || doorKind === "HOPE_2";

    if (isSwingOrHope) {
        return {
            forcedFinish: "ANOD" as FrameFinish,
            allowedColors: ["BLACK", "WHITE", "DEEP_GRAY", "CHAMPAGNE_GOLD"] as FrameColor[],
            baseColor: "BLACK" as FrameColor,
            extraByColor: (color: FrameColor) => (color === "BLACK" ? 0 : 80000),
            note: "스윙/호폐 도어는 아노다이징 기본 + 블랙 기본입니다. 색상 변경 시 8만원 추가됩니다.",
        };
    }

    // ✅ 불소도장: 화이트/블랙만, 블랙은 7만원 추가
    if (finish === "FLUORO") {
        return {
            forcedFinish: null as FrameFinish | null,
            allowedColors: ["WHITE", "BLACK"] as FrameColor[],
            baseColor: "WHITE" as FrameColor,
            extraByColor: (color: FrameColor) => (color === "BLACK" ? 70000 : 0),
            note: "불소도장은 화이트/블랙만 가능하며, 블랙 변경 시 7만원 추가됩니다.",
        };
    }

    // ✅ 아노다이징: 4색 가능, (기본색=화이트 추천) 변경 시 8만원 추가
    return {
        forcedFinish: null as FrameFinish | null,
        allowedColors: ["DEEP_GRAY", "WHITE", "CHAMPAGNE_GOLD", "BLACK"] as FrameColor[],
        baseColor: "WHITE" as FrameColor,
        extraByColor: (color: FrameColor) => (color === "WHITE" ? 0 : 80000),
        note: "아노다이징은 딥그레이/화이트/샴페인골드/블랙 가능하며, 색상 변경 시 8만원 추가됩니다.",
    };
}

function cx(...a: (string | false | undefined)[]) {
    return a.filter(Boolean).join(" ");
}

const SAMPLE_URL = "https://sites.google.com/view/limsdoor/%ED%99%88";
const BANK_LINE = "케이뱅크 700100061232 주식회사 림스";
const INSTALL_FEE = 150000;
const EXTRA_MATERIAL_GUIDE = "실측 오차가 커서 마감재(추가자재) 사용이 필요할 수 있습니다. 현장 상태를 확인하고 추가 비용 가능성을 안내해 주세요.";

// Default Glass Design
const DEFAULT_GLASS_DESIGN: GlassDesign = {
    muntinSet2LinesCount: 0,
    muntinExtraBarCount: 0,
    archBasic: false,
    archCorner: false,
    bottomPanel: false,
    bigArchVertical: false,
};

type GlassKey =
    | "CLEAR"                 // 기본 투명
    | "BRONZE_CLEAR"          // 투명(브론즈)
    | "DARKGRAY_CLEAR"        // 투명(다크그레이)
    | "BRONZE_SATIN"          // 불투명(브론즈샤틴)
    | "DARK_SATIN"            // 불투명(다크샤틴)
    | "CLEAR_SATIN"           // 불투명(투명샤틴)
    | "AQUA"                  // 디자인(아쿠아)
    | "MIST"                  // 디자인(미스트)
    | "FLUTED"                // 디자인(플루트)
    | "MORU"                  // 디자인(모루)
    | "WIRE"                  // 특수(망입)
    | "FILM";                 // 특수(필름)

const GLASS_OPTIONS: { key: GlassKey; label: string; addPrice: number; group: string }[] = [
    // 기본
    { key: "CLEAR", label: "기본 투명", addPrice: 0, group: "기본" },
    // 투명(색상)
    { key: "BRONZE_CLEAR", label: "브론즈(투명)", addPrice: 70000, group: "투명(색상)" },
    { key: "DARKGRAY_CLEAR", label: "다크그레이(투명)", addPrice: 70000, group: "투명(색상)" },
    // 불투명(샤틴)
    { key: "BRONZE_SATIN", label: "브론즈 샤틴(불투명)", addPrice: 80000, group: "불투명(샤틴)" },
    { key: "DARK_SATIN", label: "다크 샤틴(불투명)", addPrice: 80000, group: "불투명(샤틴)" },
    { key: "CLEAR_SATIN", label: "투명 샤틴(불투명)", addPrice: 80000, group: "불투명(샤틴)" },
    // 디자인 유리
    { key: "AQUA", label: "아쿠아(디자인)", addPrice: 100000, group: "디자인 유리" },
    { key: "MIST", label: "미스트(디자인)", addPrice: 100000, group: "디자인 유리" },
    { key: "FLUTED", label: "플루트(디자인)", addPrice: 100000, group: "디자인 유리" },
    { key: "MORU", label: "모루(디자인)", addPrice: 100000, group: "디자인 유리" },
    // 특수 유리
    { key: "WIRE", label: "망입 유리(특수)", addPrice: 120000, group: "특수 유리" },
    { key: "FILM", label: "필름 유리(특수)", addPrice: 120000, group: "특수 유리" },
];

function getGlassOption(glassType: GlassKey) {
    return GLASS_OPTIONS.find((g) => g.key === glassType) ?? GLASS_OPTIONS[0];
}
function getGlassAddPrice(glassType: GlassKey) {
    return getGlassOption(glassType).addPrice ?? 0;
}

// ✅ Trust Check
type TrustCheck = {
    equipment: {
        laser: boolean;      // 레이저 측정기
        photos: boolean;     // 현장사진 촬영
        samples: boolean;    // 샘플 지참
        punctual: boolean;   // 약속 준수
    };
    explanation: {
        noiseDust: boolean;        // 소음/먼지 고지
        moldingRemove: boolean;    // 상하부 몰딩 제거 고지
        finishing: boolean;        // 마감 고지
        extraMaterial: boolean;    // 추가자재 가능성 고지
        doorDirection: boolean;    // 도어 방향 고지
        scheduleConfirmed: boolean;// 시공일정 확정 고지
    };
};

const DEFAULT_TRUST: TrustCheck = {
    equipment: { laser: false, photos: false, samples: false, punctual: false },
    explanation: {
        noiseDust: false,
        moldingRemove: false,
        finishing: false,
        extraMaterial: false,
        doorDirection: false,
        scheduleConfirmed: false,
    },
};

function formatTrustSummary(trust: any) {
    const eq = trust?.equipment ?? {};
    const ex = trust?.explanation ?? {};

    const yesNo = (v: boolean) => (v ? "✅" : "❌");

    return [
        "✅ [현장 고지/신뢰 확인 완료]",
        "",
        "🔧 시공 장비/방문",
        `- 레이저 측정기 사용: ${yesNo(!!eq.laser)}`,
        `- 현장사진 촬영: ${yesNo(!!eq.photos)}`,
        `- 샘플(유리/프레임) 지참: ${yesNo(!!eq.samples)}`,
        `- 방문 약속 준수: ${yesNo(!!eq.punctual)}`,
        "",
        "🛠 시공 방식/고지 사항",
        `- 소음·먼지 고지: ${yesNo(!!ex.noiseDust)}`,
        `- 상/하부 몰딩 제거 고지: ${yesNo(!!ex.moldingRemove)}`,
        `- 마감 방식 상세 설명: ${yesNo(!!ex.finishing)}`,
        `- 추가 자재 가능성 고지: ${yesNo(!!ex.extraMaterial)}`,
        `- 도어 방향 고지: ${yesNo(!!ex.doorDirection)}`,
        `- 시공 일정 확정 고지: ${yesNo(!!ex.scheduleConfirmed)}`,
    ].join("\n");
}

type OpenDirection = "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT";

// Steps
type StepKey = "customer" | "door" | "measure" | "options" | "trust" | "send";
const STEPS: { key: StepKey; label: string }[] = [
    { key: "customer", label: "1.고객" },
    { key: "door", label: "2.도어" },
    { key: "measure", label: "3.실측" },
    { key: "options", label: "4.옵션" },
    { key: "trust", label: "5.검증" },
    { key: "send", label: "6.전송" },
];


function fmt(n: any) {
    const num = typeof n === "number" ? n : Number(n);
    return Number.isFinite(num) ? `${num}` : "-";
}


const INSTALL_PHOTOS_URL = "https://sites.google.com/view/limsdoor/%ED%99%88";

function normalizeHttps(url: string) {
    const u = (url || "").trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `https://${u}`;
}

function isSafeUrl(url: string) {
    try {
        const u = new URL(url);
        return u.protocol === "https:"; // https만 허용
    } catch {
        return false;
    }
}

function InstallPhotosSection() {
    const url = normalizeHttps(INSTALL_PHOTOS_URL);

    return (
        <button
            type="button"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            className="w-full mt-4 p-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 transition-colors text-left flex items-center justify-between group"
        >
            <div className="flex flex-col gap-1">
                <div className="font-bold flex items-center gap-2">
                    <span>📸 시공 사진 보기 (갤러리)</span>
                </div>
                <div className="text-xs text-zinc-400 font-normal">
                    현장에서 고객에게 시공 사례를 바로 보여주세요.
                </div>
            </div>
            <div className="text-zinc-500 group-hover:text-white transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </div>
        </button>
    );
}

function joinPoints(arr: any[]) {
    if (!Array.isArray(arr)) return "-";
    const cleaned = arr.map((v) => (v === null || v === undefined || v === "" ? "-" : String(v)));
    return cleaned.join(", ");
}

function safeText(v: any, fallback = "-") {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length ? s : fallback;
}

/**
 * ✅ 고객 전송용 "분쟁 방지형" 메시지 생성
 */
export function buildCustomerMessage(args: {
    customer: { name: string; phone: string; address?: string };
    doorKindLabel: string;            // 예: "원슬라이딩", "3연동(수동)"
    openDirectionLabel: string;       // 예: "좌→우", "우→좌"
    frameColorLabel: string;          // 예: "블랙", "화이트", ...
    glassLabel: string;               // 예: "투명(기본)", "브론즈샤틴", ...
    widthPoints: (number | null)[];
    heightPoints: (number | null)[];
    confirmedW: number | null;
    confirmedH: number | null;
    oneSlideMountLabel?: string | null; // 예: "벽부형" | "오픈형" | null
    autoParts?: { uVerticalBar?: number; cornerBar?: number } | null;
    totalPrice: number;              // 총 금액
    materialPrice: number;           // 자재비
    installPrice: number;            // 시공비
    requestDate?: string;            // 시공요청일
    requestTime?: string;            // 시공시간
    memo?: string;
    discounts?: { event: number; measurer: number; resale: number }; // ✅ Added
    extras?: { demolition: boolean; carpentry: boolean; carpentryMaterialWon: number; movingFloor: number }; // ✅ Added
}) {
    const c = args.customer;

    const partsText = args.autoParts
        ? `- 자동 포함 자재: ㄷ형 세로바 ${args.autoParts.uVerticalBar ?? 0}개, 각바 ${args.autoParts.cornerBar ?? 0}개`
        : "- 자동 포함 자재: -";

    const mountText = args.oneSlideMountLabel ? `- 원슬라이딩 분류: ${args.oneSlideMountLabel}` : null;

    const scheduleText = (args.requestDate || args.requestTime)
        ? `- 시공 일정: ${safeText(args.requestDate)} ${safeText(args.requestTime, "")}`.trim()
        : "- 시공 일정: 추후 확정";

    const memoText = args.memo?.trim() ? `- 현장 메모: ${args.memo.trim()}` : "";

    // ✅ Discount Calculation
    const dEvent = args.discounts?.event ?? 0;
    const dMeasurer = args.discounts?.measurer ?? 0;
    const dResale = args.discounts?.resale ?? 0;
    const totalDiscount = dEvent + dMeasurer + dResale;
    // 역산: 보여지는 자재비는 이미 할인이 빠진 금액이므로, 정상가는 합산해야 함
    const rawMaterialPrice = args.materialPrice + totalDiscount;

    return [
        "[림스도어 현장실측/견적 안내]",
        `고객: ${safeText(c.name)} (${safeText(c.phone)})`,
        c.address ? `현장: ${safeText(c.address)}` : "",
        "",
        "✅ 주문(확정) 정보",
        `- 제품: ${safeText(args.doorKindLabel)}`,
        `- 확정 사이즈: W ${fmt(args.confirmedW)} x H ${fmt(args.confirmedH)} (mm)`,
        `- 문 방향(거실→현관 기준): ${safeText(args.openDirectionLabel)}`,
        `- 프레임 색상: ${safeText(args.frameColorLabel)}`,
        `- 유리 종류: ${safeText(args.glassLabel)}`,
        mountText ?? "",
        args.oneSlideMountLabel ? partsText : "",
        "",
        "📏 실측 원본(증빙)",
        `- 가로 포인트: ${joinPoints(args.widthPoints)} (mm)`,
        `- 세로 포인트: ${joinPoints(args.heightPoints)} (mm)`,
        "",
        "💰 금액",
        `- 자재비(정상가): ${Number(rawMaterialPrice).toLocaleString()}원`,
        dEvent > 0 ? `- 이벤트 할인: -${Number(dEvent).toLocaleString()}원` : "",
        dMeasurer > 0 ? `- 실측자 할인: -${Number(dMeasurer).toLocaleString()}원` : "",
        dResale > 0 ? `- 재판매 할인: -${Number(dResale).toLocaleString()}원` : "",
        `- 시공비: ${Number(args.installPrice).toLocaleString()}원`,
        `- 총 합계: ${Number(args.totalPrice).toLocaleString()}원`,
        "",
        // ✅ Extras Section
        ...(args.extras?.demolition || args.extras?.carpentry || (args.extras?.movingFloor ?? 0) >= 2
            ? [
                "🔧 추가 작업",
                args.extras?.demolition ? "- 기존 중문 철거: 150,000원" : "",
                args.extras?.carpentry
                    ? `- 목공 마감 작업: ${(50000 + (args.extras?.carpentryMaterialWon ?? 0)).toLocaleString()}원 (시공 5만 + 자재비 ${(args.extras?.carpentryMaterialWon ?? 0).toLocaleString()}원)`
                    : "",
                (args.extras?.movingFloor ?? 0) >= 2
                    ? `- 짐 양중비(계단): ${(((args.extras?.movingFloor ?? 1) - 1) * 10000).toLocaleString()}원 (${args.extras?.movingFloor}층)`
                    : "",
                ""
            ].filter(line => line !== "")
            : []
        ),
        scheduleText,
        memoText,
        memoText ? "" : "",
        "※ 위 정보(사이즈/방향/유리/색상)는 확정 기준이며, 변경 시 금액/납기 변동이 있을 수 있습니다.",
    ]
        .filter((line) => line !== "")
        .join("\n");
}

function formatWon(n: number) {
    return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}

function doorLabel(d: DoorKind) {
    switch (d) {
        case "3T_MANUAL": return "수동 3연동";
        case "1W_SLIDING": return "원슬라이딩";
        case "SWING_1": return "스윙 (1도어)";
        case "SWING_2": return "스윙 (2도어)";
        case "HOPE_1": return "여닫이 호패 (1도어)";
        case "HOPE_2": return "여닫이 정대칭/비대칭 (2도어)";
        case "AUTO": return "자동문 (3연동)";
        default: return d;
    }
}

type OneSlideMountType = "WALL" | "OPEN"; // 벽부형/오픈형

function getMeasureConfig(door: DoorKind) {
    if (door === "1W_SLIDING") return { widthPoints: 3, heightPoints: 5 };
    return { widthPoints: 3, heightPoints: 3 }; // Default 3x3 for others (per current UI, but code was initializing 3 originally)
}

function cleanNums(arr: (number | null | undefined)[]) {
    return arr
        .map((v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null))
        .filter((v): v is number => v !== null);
}

function computeConfirmedSize(door: DoorKind, widthArr: number[], heightArr: number[]) {
    const w = cleanNums(widthArr);
    const h = cleanNums(heightArr);

    if (w.length === 0 || h.length === 0) return { confirmedW: 0, confirmedH: 0 };

    // ✅ One-Slide: Width=Max, Height=Min
    if (door === "1W_SLIDING") {
        return {
            confirmedW: Math.max(...w),
            confirmedH: Math.min(...h),
        };
    }

    // Default: Min for both (SAFE)
    return {
        confirmedW: Math.min(...w),
        confirmedH: Math.min(...h),
    };
}


function setPoint(arr: number[], index: number, val: number) {
    const next = [...arr];
    next[index] = val;
    return next;
}

function isFinitePos(n: any) {
    const x = Number(n);
    return Number.isFinite(x) && x > 0;
}

function dist(a: number, b: number) {
    return Math.abs(a - b);
}

type WHGuardResult = {
    errors: string[];
    warnings: string[];
    suggestSwap: boolean;
    swapImproves: boolean;
};

function guardWidthHeight(door: DoorKind, widthMm: number, heightMm: number): WHGuardResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isFinitePos(widthMm) || !isFinitePos(heightMm)) {
        errors.push("가로/세로(mm)를 올바르게 입력해 주세요.");
        return { errors, warnings, suggestSwap: false, swapImproves: false };
    }

    const w = Number(widthMm);
    const h = Number(heightMm);
    const rule = getDoorRangeRule(door);

    if (h < 1800) warnings.push("세로가 1800mm 미만입니다. 가로/세로를 뒤집어 입력했을 가능성이 큽니다.");
    const suggestSwap = w > h;
    if (suggestSwap) warnings.push("가로가 세로보다 큽니다. 가로/세로가 뒤바뀐 것 같습니다.");

    const wOk = w >= rule.minW && w <= rule.maxW;
    const hOk = h >= rule.minH && h <= rule.maxH;
    if (!wOk) warnings.push(`${rule.label} 기준으로 가로(${w}mm)가 일반 범위를 벗어났습니다. (${rule.minW}~${rule.maxW}mm)`);
    if (!hOk) warnings.push(`${rule.label} 기준으로 세로(${h}mm)가 일반 범위를 벗어났습니다. (${rule.minH}~${rule.maxH}mm)`);

    const w2 = h;
    const h2 = w;
    const score = (xw: number, xh: number) => dist(xw, rule.refW) + dist(xh, rule.refH) + (xw >= rule.minW && xw <= rule.maxW ? 0 : 5000) + (xh >= rule.minH && xh <= rule.maxH ? 0 : 5000);
    const swapImproves = score(w2, h2) < score(w, h);
    return { errors, warnings, suggestSwap, swapImproves };
}


// Restore getDoorRangeRule
function getDoorRangeRule(door: DoorKind) {
    const defaultRule = {
        label: "일반", minW: 0, maxW: 9999, minH: 0, maxH: 9999,
        refW: 1200, refH: 2100
    };

    switch (door) {
        case "3T_MANUAL": return { label: "3연동", minW: 1000, maxW: 3000, minH: 1500, maxH: 2400, refW: 1500, refH: 2300 };
        case "1W_SLIDING": return { label: "원슬라이딩", minW: 700, maxW: 1500, minH: 1500, maxH: 2700, refW: 1200, refH: 2400 };
        case "SWING_1": return { label: "스윙(1도어)", minW: 400, maxW: 1000, minH: 1500, maxH: 2400, refW: 900, refH: 2100 };
        default: return defaultRule;
    }
}


export default function FieldNewPage() {
    // Stage Management
    const [step, setStep] = useState<StepKey>("customer");

    // Customer
    const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });

    // Schedule & Memo
    const [installDate, setInstallDate] = useState("");
    const [installTime, setInstallTime] = useState("");
    const [memo, setMemo] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);

    // Door & Options
    const [door, setDoor] = useState<DoorKind>("3T_MANUAL");
    // ✅ One-Slide Mount
    const [oneSlideMount, setOneSlideMount] = useState<OneSlideMountType>("WALL");

    // Measurements (Dynamic Size)
    // Initialize with 5 just in case, but effect will trim
    const [widthPoints, setWidthPoints] = useState<number[]>([]);
    const [heightPoints, setHeightPoints] = useState<number[]>([]);

    const [frameFinish, setFrameFinish] = useState<FrameFinish>("FLUORO");
    const [frameColor, setFrameColor] = useState<FrameColor>("WHITE");
    const [glassType, setGlassType] = useState<GlassKey>("CLEAR");
    const [glassDesign, setGlassDesign] = useState<GlassDesign>(DEFAULT_GLASS_DESIGN);
    const [openDirection, setOpenDirection] = useState<OpenDirection>("LEFT_TO_RIGHT");
    const [muntinQty, setMuntinQty] = useState<number>(0);

    // Extras
    const [measurerDiscountWon, setMeasurerDiscountWon] = useState<number>(0);
    const [promoDiscountWon, setPromoDiscountWon] = useState<number>(0);
    const [resaleDiscountWon, setResaleDiscountWon] = useState<number>(0);
    const [extraDemolition, setExtraDemolition] = useState(false);
    const [extraCarpentry, setExtraCarpentry] = useState(false);
    const [carpentryMaterialWon, setCarpentryMaterialWon] = useState(0); // ✅ 목공 자재비
    const [extraMoving, setExtraMoving] = useState(false);
    const [movingFloor, setMovingFloor] = useState(1); // ✅ 1층(없음) ~ 6층
    const [isNewApartment, setIsNewApartment] = useState(false);

    // Trust
    const [trust, setTrust] = useState<TrustCheck>(DEFAULT_TRUST);

    // -------------------------------------------------------------
    // Derived Logic (Pricing & Validation)
    // -------------------------------------------------------------
    // Auto-toggle demo
    useEffect(() => {
        if (isNewApartment) setExtraDemolition(false);
    }, [isNewApartment]);

    // ✅ Dynamic Measurement Points Rule
    const measureConfig = useMemo(() => getMeasureConfig(door), [door]);

    useEffect(() => {
        const { widthPoints: wN, heightPoints: hN } = measureConfig;

        setWidthPoints(prev => {
            if (prev.length === wN) return prev;
            return wN > prev.length
                ? [...prev, ...Array(wN - prev.length).fill(0)]
                : prev.slice(0, wN);
        });
        setHeightPoints(prev => {
            if (prev.length === hN) return prev;
            return hN > prev.length
                ? [...prev, ...Array(hN - prev.length).fill(0)]
                : prev.slice(0, hN);
        });
    }, [measureConfig]);

    // ✅ Confirmed Size Logic
    const { confirmedW, confirmedH } = useMemo(() =>
        computeConfirmedSize(door, widthPoints, heightPoints),
        [door, widthPoints, heightPoints]);

    // Use confirmed size for pricing (or min, depending on policy? Usually pricing uses confirmed)
    // BUT legacy pricing used MIN. 
    // Let's stick to using `confirmedW` and `confirmedH` for pricing inputs IF they are valid (>0).
    // Fallback to min if 0.
    const widthMm = confirmedW > 0 ? confirmedW : 0;
    const heightMm = confirmedH > 0 ? confirmedH : 0;

    // ✅ Auto Parts for One-Slide
    const autoParts = useMemo(() => {
        if (door !== "1W_SLIDING") return null;
        // Wall: U-Bar 1, Corner 1
        // Open: Corner 2
        if (oneSlideMount === "WALL") return { uVerticalBar: 1, cornerBar: 1 };
        return { uVerticalBar: 0, cornerBar: 2 };
    }, [door, oneSlideMount]);

    // ✅ Frame Policy Logic
    const policy = useMemo(() => getFramePolicy(door, frameFinish), [door, frameFinish]);

    // Enforce Policy
    useEffect(() => {
        if (policy.forcedFinish && frameFinish !== policy.forcedFinish) {
            setFrameFinish(policy.forcedFinish);
        }
        if (!policy.allowedColors.includes(frameColor)) {
            setFrameColor(policy.baseColor);
        }
    }, [policy, frameFinish, frameColor]);

    const frameColorExtra = useMemo(() => policy.extraByColor(frameColor), [policy, frameColor]);

    // Pricing
    const pricing = useMemo(() => {
        return calcPricing({
            widthMm, heightMm,
            door, frameFinish, frameColor, // ✅ Passed frameColor
            glassDesign,
            // discount Input
            discount: {
                measurerDiscountWon,
                promoDiscountWon,
                resaleDiscountWon,
            },
            // extras Input
            extras: {
                demolition: extraDemolition,
                carpentry: extraCarpentry,
                carpentryMaterialWon,
                moving: extraMoving,
                movingFloor,
            },
            muntinQty,
            glassAddWon: getGlassAddPrice(glassType),
            frameAddWon: frameColorExtra, // ✅ Added
        });
    }, [widthMm, heightMm, door, frameFinish, frameColor, glassDesign,
        measurerDiscountWon, promoDiscountWon, resaleDiscountWon,
        extraDemolition, extraCarpentry, carpentryMaterialWon, extraMoving, movingFloor,
        muntinQty, glassType, frameColorExtra
    ]);

    // Validation
    const { errors: whErrors, warnings: whWarnings } = guardWidthHeight(door, widthMm, heightMm);

    // Extra Material Warning
    const wDiff = useMemo(() => {
        const sorted = [...widthPoints].filter(v => v > 0).sort((a, b) => a - b);
        if (sorted.length < 2) return 0;
        return sorted[sorted.length - 1] - sorted[0];
    }, [widthPoints]);
    const hDiff = useMemo(() => {
        const sorted = [...heightPoints].filter(v => v > 0).sort((a, b) => a - b);
        if (sorted.length < 2) return 0;
        return sorted[sorted.length - 1] - sorted[0];
    }, [heightPoints]);

    const hasDiffWarn = wDiff >= 10 || hDiff >= 15;
    const extraMaterialMessage = hasDiffWarn ? EXTRA_MATERIAL_GUIDE : "";

    // TTS Helper
    const [lastSpoken, setLastSpoken] = useState("");

    function speakKo(text: string) {
        if (!window.speechSynthesis) return;
        if (lastSpoken === text) return; // Debounce same message

        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ko-KR";
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
        setLastSpoken(text);
    }

    // TTS Effects
    useEffect(() => {
        if (step !== "measure") return;

        // ✅ TTS Noise Reduction: Only speak when ALL points are filled with REALISTIC values
        // This prevents "Too small" warnings while user is typing "2", "23", "230" for "2300"
        // 500mm is a safe minimum threshold (even small doors are usually > 500mm width)
        const isWidthFilled = widthPoints.every(v => v >= 500);
        const isHeightFilled = heightPoints.every(v => v >= 500);
        const isFullyFilled = isWidthFilled && isHeightFilled;

        if (!isFullyFilled) return;

        // Measurement Warnings
        if (whWarnings.length > 0) {
            speakKo(`주의. ${whWarnings[0]}`);
        } else if (hasDiffWarn) {
            speakKo("실측 편차가 큽니다. 추가 자재 비용 가능성을 안내해 주세요.");
        }
    }, [whWarnings, hasDiffWarn, step, widthPoints, heightPoints]);

    useEffect(() => {
        // Pricing Errors (Global check)
        if (!pricing.ok && pricing.reason) {
            if (step === "options" || step === "send") {
                speakKo(`견적 불가. ${pricing.reason}`);
            }
        }
    }, [pricing.ok, pricing.reason, step]);


    // -------------------------------------------------------------
    // Step Navigation Logic
    // -------------------------------------------------------------
    const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === step), [step]);

    const isCustomerValid = useMemo(() => {
        const nameOk = customer.name.trim().length >= 1;
        const phoneOk = customer.phone.replace(/\D/g, "").length >= 9;
        return nameOk && phoneOk;
    }, [customer]);

    const isTrustAllChecked = useMemo(() => {
        const eq = Object.values(trust.equipment).every(Boolean);
        const ex = Object.values(trust.explanation).every(Boolean);
        return eq && ex;
    }, [trust]);

    function canGoNext(from: StepKey) {
        if (from === "customer") return isCustomerValid;
        if (from === "trust") return isTrustAllChecked;
        if (from === "measure" && whErrors.length > 0) return false; // Block if critical measure error
        if (from === "options" && !pricing.ok) return false; // Block if pricing invalid
        return true;
    }

    function goNext() {
        const idx = stepIndex;
        if (idx < 0 || idx >= STEPS.length - 1) return;

        if (!canGoNext(step)) {
            if (step === "customer") alert("고객 정보를 먼저 입력해주세요. (이름/연락처 필수)");
            else if (step === "trust") alert("고객 신뢰를 위해 모든 고지 확인 항목을 체크해주세요.");
            else if (step === "measure" && whErrors.length > 0) alert(whErrors[0]);
            else if (step === "options" && !pricing.ok) alert(`견적 불가: ${pricing.reason}`);
            return;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        setStep(STEPS[idx + 1].key);
    }

    function goPrev() {
        const idx = stepIndex;
        if (idx <= 0) return;
        window.scrollTo({ top: 0, behavior: "smooth" });
        setStep(STEPS[idx - 1].key);
    }

    // Reset Function
    function resetAll() {
        if (!confirm("모든 입력 내용을 초기화하고 새 고객으로 시작할까요?")) return;

        setStep("customer");
        setCustomer({ name: "", phone: "", address: "" });
        setTrust(DEFAULT_TRUST);

        // Reset Logic
        setDoor("3T_MANUAL");
        setFrameFinish("FLUORO"); setFrameColor("WHITE");
        setGlassType("CLEAR"); setGlassDesign(DEFAULT_GLASS_DESIGN);
        setMuntinQty(0);
        setOpenDirection("LEFT_TO_RIGHT");
        setInstallDate(""); setInstallTime(""); setMemo(""); setPhotos([]);
        setWidthPoints([0, 0, 0]); setHeightPoints([0, 0, 0]);
        setIsNewApartment(false);
        setExtraDemolition(false); setExtraCarpentry(false); setExtraMoving(false); setMovingFloor(0);
        setMeasurerDiscountWon(0); setPromoDiscountWon(0);

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Save Logic
    async function saveToDb() {
        if (!isCustomerValid) return alert("고객 정보(이름/연락처)를 먼저 입력해주세요.");
        if (!isTrustAllChecked) return alert("고지 확인 설문을 모두 체크해야 저장/전송할 수 있습니다.");

        // ✅ Dispute Prevention: Confirmed Size Validation
        if (!confirmedW || !confirmedH) {
            alert("확정 사이즈가 없습니다. 실측값 입력 후 확정 사이즈를 확인해주세요.");
            setStep("measure");
            return;
        }

        const doorInfo = { type: door, detail: doorLabel(door) };
        const optionInfo = {
            frameFinish, frameColor, glassType, glassDesign, muntinQty,
            openDirection
        };
        const measurementPayload = {
            widthMm, heightMm, widthPoints, heightPoints, memo,
            confirmedWidthMm: confirmedW,
            confirmedHeightMm: confirmedH
        };
        const extrasPayload = {
            demolition: extraDemolition, carpentry: extraCarpentry, moving: extraMoving, movingFloor, isNewApartment
        };

        const payload = {
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,

            // Legacy Structure for API compatibility
            options: {
                doorType: door,
                doorDetail: doorLabel(door),
                ...optionInfo
            },

            // New Structures
            door: doorInfo,
            measure: measurementPayload,

            door_detail: {
                ...doorInfo,
                ...optionInfo,
                // ✅ One-Slide Specifics
                oneSlideMount: door === "1W_SLIDING" ? oneSlideMount : null,
                autoParts: door === "1W_SLIDING" ? autoParts : null,

                // ✅ Frame Logic
                frameFinish,
                frameColor,
                frameColorExtra,
            },
            trust_check: trust,

            // ✅ Confirmed Size & Points (Top Level for easier access if API supports, or just rely on measure payload)
            // The API route handles "width_mm" and "height_mm". We should send the CONFIRMED size as the main size.
            width_mm: widthMm,
            height_mm: heightMm,
            width_points: widthPoints, // API might need update to accept arrays if not already
            height_points: heightPoints,

            pricing: pricing,
            extras: extrasPayload,
            memo: memo,
            customer_message: customerMessage,
            status: "SAVED",
            install_date: installDate,
            install_time: installTime,
        };

        try {
            const res = await fetch("/api/measurements/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "저장 실패");

            alert("✅ 저장되었습니다!");
        } catch (err: any) {
            alert(`❌ 저장 실패: ${err.message}`);
        }
    }

    // Customer Message Builder (Enhanced)
    const customerMessage = useMemo(() => {
        const doorKindLabel = door === "1W_SLIDING" ? "원슬라이딩" : door === "3T_MANUAL" ? "3연동" : doorLabel(door);
        const oneSlideMountLabel = door === "1W_SLIDING" ? (oneSlideMount === "WALL" ? "벽부형" : "오픈형") : null;

        const openDirLabel = openDirection === "LEFT_TO_RIGHT" ? "좌→우" : "우→좌";
        const glassInfo = getGlassOption(glassType);

        // Frame Label Generation
        const finishLabel = frameFinish === "ANOD" ? "아노다이징" : "불소도장";
        const colorLabel = COLOR_LABEL[frameColor] ?? frameColor;
        const frameExtraTxt = frameColorExtra > 0 ? `(+${formatWon(frameColorExtra)})` : "(기본)";
        const detailedFrameLabel = `${finishLabel} / ${colorLabel} ${frameExtraTxt}`;

        return buildCustomerMessage({
            customer,
            doorKindLabel,
            openDirectionLabel: openDirLabel,
            frameColorLabel: detailedFrameLabel, // ✅ Updated
            glassLabel: glassInfo.label,
            widthPoints: widthPoints,
            heightPoints: heightPoints,
            confirmedW: confirmedW > 0 ? confirmedW : null,
            confirmedH: confirmedH > 0 ? confirmedH : null,
            oneSlideMountLabel,
            autoParts: door === "1W_SLIDING" ? autoParts : null,
            totalPrice: pricing.totalWon,
            materialPrice: pricing.materialWon,
            installPrice: pricing.installWon,
            requestDate: installDate,
            requestTime: installTime,
            memo,
            discounts: {
                event: promoDiscountWon,
                measurer: measurerDiscountWon,
                resale: resaleDiscountWon
            },
            extras: {
                demolition: extraDemolition,
                carpentry: extraCarpentry,
                carpentryMaterialWon,
                movingFloor
            }
        });
    }, [
        customer, door, oneSlideMount, openDirection, frameColor, glassType,
        widthPoints, heightPoints, confirmedW, confirmedH, autoParts, pricing,
        installDate, installTime, memo,
        promoDiscountWon, measurerDiscountWon, resaleDiscountWon,
        extraDemolition, extraCarpentry, carpentryMaterialWon, movingFloor,
        frameFinish, frameColorExtra
    ]);

    // Copy Message
    async function copyMessage() {
        try {
            await navigator.clipboard.writeText(customerMessage);
            alert("✅ 견적 메시지가 복사되었습니다.");
        } catch (e) {
            alert("복사 실패 (HTTPS 환경 필요)");
        }
    }

    // -------------------------------------------------------------
    // Render Steps
    // -------------------------------------------------------------
    function renderStep() {
        switch (step) {
            case "customer":
                return (
                    <div className="grid gap-4">
                        <h3 className="text-xl font-bold">1. 고객 정보 (필수)</h3>
                        <div className="text-sm texn-white/60">현장 정보의 기준이 되는 고객 정보를 입력해 주세요.</div>
                        <input
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 text-white"
                            placeholder="고객명 (예: 홍길동)"
                            value={customer.name}
                            onChange={(e) => setCustomer(p => ({ ...p, name: e.target.value }))}
                        />
                        <input
                            type="tel"
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 text-white"
                            placeholder="연락처 (숫자만 입력)"
                            value={customer.phone}
                            onChange={(e) => setCustomer(p => ({ ...p, phone: e.target.value }))}
                        />
                        <input
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 text-white"
                            placeholder="주소/현장명 (선택)"
                            value={customer.address}
                            onChange={(e) => setCustomer(p => ({ ...p, address: e.target.value }))}
                        />
                    </div>
                );

            case "door":
                return (
                    <div className="grid gap-4">
                        <h3 className="text-xl font-bold">2. 도어 선택</h3>
                        <select
                            value={door}
                            onChange={(e) => setDoor(e.target.value as DoorKind)}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 text-white"
                        >
                            <option value="3T_MANUAL">수동 3연동</option>
                            <option value="1W_SLIDING">원슬라이딩</option>
                            <option value="SWING_1">스윙 1도어</option>
                            <option value="SWING_2">스윙 2도어</option>
                            <option value="HOPE_1">여닫이(호패) 1도어</option>
                            <option value="HOPE_2">여닫이(호패) 2도어</option>
                            <option value="AUTO">자동문(자동 3연동)</option>
                        </select>

                        <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/50">
                            <label className="block text-sm text-zinc-400 mb-2">현장 유형</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsNewApartment(true)}
                                    className={`flex-1 py-3 rounded-lg border ${isNewApartment ? "bg-blue-600 border-blue-500 text-white" : "border-white/20 text-zinc-400"}`}
                                >
                                    신축 아파트 (입주예정)
                                </button>
                                <button
                                    onClick={() => setIsNewApartment(false)}
                                    className={`flex-1 py-3 rounded-lg border ${!isNewApartment ? "bg-zinc-700 border-white/30 text-white" : "border-white/20 text-zinc-400"}`}
                                >
                                    구축 / 거주중
                                </button>
                            </div>
                        </div>

                        {/* One-Slide Specific Options */}
                        {door === "1W_SLIDING" && (
                            <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/50 mt-2">
                                <label className="block text-sm text-zinc-400 mb-2 font-bold text-blue-400">원슬라이딩 설치 타입</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setOneSlideMount("WALL")}
                                        className={`flex-1 py-3 rounded-lg border ${oneSlideMount === "WALL" ? "bg-blue-600 border-blue-500 text-white" : "border-white/20 text-zinc-400"}`}
                                    >
                                        벽부형
                                    </button>
                                    <button
                                        onClick={() => setOneSlideMount("OPEN")}
                                        className={`flex-1 py-3 rounded-lg border ${oneSlideMount === "OPEN" ? "bg-zinc-700 border-white/30 text-white" : "border-white/20 text-zinc-400"}`}
                                    >
                                        오픈형
                                    </button>
                                </div>
                                <div className="mt-3 text-xs text-zinc-400 bg-black/20 p-2 rounded">
                                    <div className="font-semibold mb-1">✅ 자동 자재 포함:</div>
                                    <div>- ㄷ형 세로바: {autoParts?.uVerticalBar ?? 0}개</div>
                                    <div>- 각바: {autoParts?.cornerBar ?? 0}개</div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "measure":
                return (
                    <div className="grid gap-4">
                        <h3 className="text-xl font-bold">3. 실측 입력</h3>

                        {/* Warnings */}
                        {(whErrors.length > 0 || whWarnings.length > 0) && (
                            <div className="p-4 rounded-xl bg-amber-900/30 border border-amber-600/50 text-amber-200 text-sm">
                                {whErrors.map((e, i) => <div key={i}>⛔ {e}</div>)}
                                {whWarnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                            </div>
                        )}
                        {hasDiffWarn && (
                            <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
                                {extraMaterialMessage}
                            </div>
                        )}

                        {/* Width */}
                        <div className="space-y-2">
                            <div className="text-sm text-zinc-400">가로 (mm) - 포인트 {widthPoints.length}개</div>
                            <div className={`grid gap-2 ${widthPoints.length > 3 ? "grid-cols-5" : "grid-cols-3"}`}>
                                {widthPoints.map((v, i) => (
                                    <input key={`w-${i}`} type="number"
                                        className="bg-black/40 border border-white/10 rounded-lg p-3 text-center text-white"
                                        value={v || ""}
                                        placeholder={`W${i + 1}`}
                                        onChange={(e) => setWidthPoints(setPoint(widthPoints, i, Number(e.target.value)))}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Height */}
                        <div className="space-y-2">
                            <div className="text-sm text-zinc-400">세로 (mm) - 포인트 {heightPoints.length}개</div>
                            <div className={`grid gap-2 ${heightPoints.length > 3 ? "grid-cols-5" : "grid-cols-3"}`}>
                                {heightPoints.map((v, i) => (
                                    <input key={`h-${i}`} type="number"
                                        className="bg-black/40 border border-white/10 rounded-lg p-3 text-center text-white"
                                        value={v || ""}
                                        placeholder={`H${i + 1}`}
                                        onChange={(e) => setHeightPoints(setPoint(heightPoints, i, Number(e.target.value)))}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Confirmed Size Display */}
                        <div className="p-4 border border-white/10 rounded-xl bg-blue-900/10 mt-2">
                            <div className="font-bold text-blue-200 mb-1">📏 확정 사이즈</div>
                            <div className="text-lg text-white">
                                가로: <span className="font-mono font-bold text-yellow-400">{confirmedW || "-"}</span> /
                                세로: <span className="font-mono font-bold text-yellow-400">{confirmedH || "-"}</span>
                            </div>
                            {door === "1W_SLIDING" && (
                                <div className="mt-2 text-xs text-blue-300/70">
                                    ※ 원슬라이딩 규칙: 가로=최대값 / 세로=최소값
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "options":
                return (
                    <div className="grid gap-4">
                        <h3 className="text-xl font-bold">4. 옵션 선택</h3>

                        {/* Installation Schedule */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">시공 예정일 (실측일로 부터 7일 이후)</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    required
                                    min={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                                    value={installDate}
                                    onChange={(e) => setInstallDate(e.target.value)}
                                    className="flex-1 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl [color-scheme:dark]"
                                />
                                <input
                                    type="time"
                                    value={installTime}
                                    onChange={(e) => setInstallTime(e.target.value)}
                                    className="w-32 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Open Direction */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">열림 방향</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setOpenDirection("LEFT_TO_RIGHT")}
                                    className={`flex-1 py-3 rounded-lg border ${openDirection === "LEFT_TO_RIGHT" ? "bg-green-600 border-green-500 text-white" : "border-white/20 text-zinc-400"}`}
                                >
                                    좌 → 우 (밀기)
                                </button>
                                <button
                                    onClick={() => setOpenDirection("RIGHT_TO_LEFT")}
                                    className={`flex-1 py-3 rounded-lg border ${openDirection === "RIGHT_TO_LEFT" ? "bg-green-600 border-green-500 text-white" : "border-white/20 text-zinc-400"}`}
                                >
                                    우 → 좌 (밀기)
                                </button>
                            </div>
                        </div>

                        {/* Frame Finish */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">프레임 종류</label>
                            <select
                                value={frameFinish}
                                onChange={(e) => setFrameFinish(e.target.value as FrameFinish)}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl disabled:opacity-50"
                                disabled={!!policy.forcedFinish}
                            >
                                <option value="FLUORO">불소도장</option>
                                <option value="ANOD">아노다이징</option>
                            </select>
                            {policy.forcedFinish && (
                                <div className="text-xs text-amber-500 mt-1">※ 이 도어는 {policy.forcedFinish === "ANOD" ? "아노다이징" : "불소도장"} 기본입니다.</div>
                            )}
                        </div>

                        {/* Frame Color */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">프레임 색상</label>
                            <select
                                value={frameColor}
                                onChange={(e) => setFrameColor(e.target.value as FrameColor)}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl"
                            >
                                {policy.allowedColors.map((c) => {
                                    const extra = policy.extraByColor(c);
                                    return (
                                        <option key={c} value={c}>
                                            {COLOR_LABEL[c]}
                                            {extra > 0 ? ` (+${extra.toLocaleString()}원)` : " (기본)"}
                                        </option>
                                    );
                                })}
                            </select>
                            <div className="text-xs text-zinc-400 mt-2 opacity-80">
                                {policy.note}
                            </div>
                        </div>

                        {/* Glass Type */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">유리 종류</label>
                            <select
                                value={glassType}
                                onChange={(e) => setGlassType(e.target.value as any)}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl"
                            >
                                {GLASS_OPTIONS.map(g => (
                                    <option key={g.key} value={g.key}>{g.group} - {g.label} ({g.addPrice > 0 ? `+${g.addPrice.toLocaleString()}` : "기본"})</option>
                                ))}
                            </select>
                        </div>

                        {/* Glass Design */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">유리 디자인 옵션</label>
                            <GlassDesignOptions
                                value={glassDesign}
                                onChange={setGlassDesign}
                                isSliding={door === "1W_SLIDING"}
                            />
                        </div>

                        {/* Muntin Qty */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <label className="block text-sm mb-2 text-zinc-400">추가 간살 (개당 2.5만)</label>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMuntinQty(Math.max(0, muntinQty - 1))} className="w-10 h-10 bg-zinc-800 rounded-full">-</button>
                                <span className="text-xl font-bold">{muntinQty}개</span>
                                <button onClick={() => setMuntinQty(muntinQty + 1)} className="w-10 h-10 bg-zinc-800 rounded-full">+</button>
                            </div>
                        </div>

                        <InstallPhotosSection />

                        {/* Extras */}
                        {/* Extras */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3">
                            <label className="block text-sm text-zinc-400">추가 시공</label>

                            {/* 철거: 15만 */}
                            <label className="flex items-center gap-2 p-2 rounded bg-black/20">
                                <input type="checkbox" checked={extraDemolition} onChange={(e) => setExtraDemolition(e.target.checked)} className="w-5 h-5" />
                                <span>기존 중문 철거 (+15만)</span>
                            </label>

                            {/* 목공: 시공 5만 + 자재비 */}
                            <div className="p-2 rounded bg-black/20 space-y-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={extraCarpentry} onChange={(e) => setExtraCarpentry(e.target.checked)} className="w-5 h-5" />
                                    <span>목공 마감 작업 (시공 5만)</span>
                                </label>
                                {extraCarpentry && (
                                    <div className="pl-7 flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">자재비(실비)</span>
                                        <input
                                            type="number"
                                            value={carpentryMaterialWon || ""}
                                            onChange={(e) => setCarpentryMaterialWon(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-24 bg-black/30 text-white border border-white/10 rounded px-2 py-1 text-sm"
                                        />
                                        <span className="text-xs">원</span>
                                    </div>
                                )}
                            </div>

                            {/* 양중비: 층수 선택 */}
                            <div className="p-2 rounded bg-black/20 flex items-center justify-between">
                                <span className="text-sm">짐 양중비 (계단)</span>
                                <select
                                    value={movingFloor}
                                    onChange={(e) => setMovingFloor(Number(e.target.value))}
                                    className="bg-black/30 text-white border border-white/10 rounded px-2 py-1 text-sm"
                                >
                                    <option value={1}>1층 / 해당없음</option>
                                    <option value={2}>2층 (+1만)</option>
                                    <option value={3}>3층 (+2만)</option>
                                    <option value={4}>4층 (+3만)</option>
                                    <option value={5}>5층 (+4만)</option>
                                    <option value={6}>6층 (+5만)</option>
                                </select>
                            </div>
                        </div>

                        {/* ✅ 현장 할인 섹션 (Moved to Step 4) */}
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                            <h4 className="font-bold text-sm text-zinc-300">📉 현장 할인 적용</h4>

                            {/* 이벤트 할인 */}
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">이벤트 할인</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-white"
                                        placeholder="0"
                                        value={promoDiscountWon || ""}
                                        onChange={(e) => setPromoDiscountWon(Number(e.target.value))}
                                    />
                                    <button
                                        onClick={() => setPromoDiscountWon(150000)}
                                        className="bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 px-3 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-yellow-600/30 transition-colors"
                                    >
                                        추천 15만
                                    </button>
                                </div>
                            </div>

                            {/* 실측자 할인 */}
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">실측자 할인</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white"
                                    placeholder="0"
                                    value={measurerDiscountWon || ""}
                                    onChange={(e) => setMeasurerDiscountWon(Number(e.target.value))}
                                />
                            </div>

                            {/* 재판매 할인 */}
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">재판매 할인</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white"
                                    placeholder="0"
                                    value={resaleDiscountWon || ""}
                                    onChange={(e) => setResaleDiscountWon(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                );

            case "trust":
                return (
                    <div className="grid gap-4">
                        <h3 className="text-xl font-bold text-blue-400">5. 고객 신뢰/고지 확인</h3>

                        <section className="border border-white/10 rounded-xl p-4 bg-white/5">
                            <h4 className="font-semibold mb-3">시공 장비/방문 신뢰</h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.equipment.laser} onChange={(e) => setTrust(p => ({ ...p, equipment: { ...p.equipment, laser: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 레이저 측정기 사용</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.equipment.photos} onChange={(e) => setTrust(p => ({ ...p, equipment: { ...p.equipment, photos: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 현장 사진 촬영 완료</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.equipment.samples} onChange={(e) => setTrust(p => ({ ...p, equipment: { ...p.equipment, samples: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 샘플(유리/프레임) 지참 확인</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.equipment.punctual} onChange={(e) => setTrust(p => ({ ...p, equipment: { ...p.equipment, punctual: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 방문 약속 시간 준수</label>
                            </div>
                        </section>

                        <section className="border border-white/10 rounded-xl p-4 bg-white/5">
                            <h4 className="font-semibold mb-3">시공 방식/고지 사항</h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.explanation.noiseDust} onChange={(e) => setTrust(p => ({ ...p, explanation: { ...p.explanation, noiseDust: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 소음/먼지 발생 고지</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.explanation.moldingRemove} onChange={(e) => setTrust(p => ({ ...p, explanation: { ...p.explanation, moldingRemove: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 상하부 몰딩 제거 고지</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.explanation.finishing} onChange={(e) => setTrust(p => ({ ...p, explanation: { ...p.explanation, finishing: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 마감 방식 상세 설명</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.explanation.extraMaterial} onChange={(e) => setTrust(p => ({ ...p, explanation: { ...p.explanation, extraMaterial: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 추가 자재 비용 가능성 설명</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.explanation.doorDirection} onChange={(e) => setTrust(p => ({ ...p, explanation: { ...p.explanation, doorDirection: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 도어 열림 방향 확인</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={trust.explanation.scheduleConfirmed} onChange={(e) => setTrust(p => ({ ...p, explanation: { ...p.explanation, scheduleConfirmed: e.target.checked } }))} className="w-6 h-6 rounded border-zinc-600" /> 시공 일정 확정</label>
                            </div>
                        </section>

                        <div className="text-sm opacity-80 text-center">
                            {isTrustAllChecked ? "✅ 모든 고지가 완료되었습니다." : "⚠️ 전송하려면 모든 항목을 체크해주세요."}
                        </div>
                    </div>
                );

            case "send":
                return (
                    <div className="grid gap-4">
                        <h3 className="text-xl font-bold">6. 전송 및 저장 (최종확인)</h3>



                        <div className="p-4 bg-zinc-900 rounded-xl space-y-3 text-sm border border-zinc-700">
                            <div className="flex justify-between"><span>자재비(확정)</span> <span className="text-white font-bold">{formatWon(pricing.materialWon)}</span></div>
                            <div className="flex justify-between"><span>시공비</span> <span>{formatWon(pricing.installWon)}</span></div>
                            <div className="border-t border-zinc-700 my-2"></div>
                            <div className="flex justify-between text-lg text-blue-400 font-bold"><span>총 합계</span> <span>{formatWon(pricing.totalWon)}</span></div>
                        </div>

                        <textarea
                            className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white mb-2"
                            placeholder="현장 메모 (특이사항 등)"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />

                        <div className="text-sm text-zinc-400 mb-1">고객 전송용 메시지 미리보기</div>
                        <textarea
                            value={customerMessage}
                            readOnly
                            className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-300 font-mono"
                        />

                        <div className="grid gap-3">
                            <button onClick={saveToDb} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-lg hover:bg-blue-500">
                                💾 DB 저장하기 (본사전송)
                            </button>
                            <button onClick={copyMessage} className="w-full py-3 bg-zinc-700 text-white font-semibold rounded-xl">
                                📋 고객 문자 복사하기
                            </button>
                            <button onClick={resetAll} className="w-full py-3 bg-red-900/40 text-red-200 font-semibold rounded-xl border border-red-900">
                                🔄 초기화 (새 고객)
                            </button>
                        </div>
                        <p className="text-xs text-center text-zinc-500">초기화 시 현재 입력된 모든 데이터가 삭제됩니다.</p>
                    </div>
                );

            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-[#0b0f14] text-white p-4 pb-32">
            <div className="max-w-2xl mx-auto">
                <header className="mb-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {STEPS.map((s) => {
                            const active = s.key === step;
                            const idx = STEPS.findIndex(x => x.key === s.key);
                            const currentIdx = stepIndex;
                            const passed = currentIdx > idx;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => {
                                        // Validation Jumps
                                        if (s.key !== "customer" && !isCustomerValid) {
                                            alert("고객 정보를 먼저 입력해주세요.");
                                            setStep("customer");
                                            return;
                                        }
                                        if (s.key === "send" && !isTrustAllChecked) {
                                            alert("신뢰 체크를 완료해야 합니다.");
                                            setStep("trust");
                                            return;
                                        }
                                        setStep(s.key);
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${active ? "bg-white text-black border-white" : passed ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-transparent border-zinc-800 text-zinc-600"}`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </header>

                <main className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {renderStep()}
                </main>

                {/* Footer Nav */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0b0f14]/80 backdrop-blur border-t border-white/10 z-20">
                    <div className="max-w-2xl mx-auto flex justify-between items-center">
                        <button
                            onClick={goPrev} disabled={stepIndex <= 0}
                            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-30"
                        >
                            이전
                        </button>

                        <div className="text-sm font-bold">
                            {step === "send" ? "최종 확인" : `${pricing.totalWon.toLocaleString()}원`}
                        </div>

                        <button
                            onClick={goNext} disabled={stepIndex >= STEPS.length - 1 || !canGoNext(step)}
                            className="px-4 py-2 rounded-lg bg-white text-black font-bold disabled:opacity-30 disabled:bg-zinc-700 disabled:text-zinc-500"
                        >
                            다음
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
