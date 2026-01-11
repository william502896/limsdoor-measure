"use client";

import { useMemo, useState, useEffect } from "react";
import GlassDesignOptions from "@/app/components/GlassDesignOptions";
import { calcPricing, type DoorKind, type GlassDesign, type FrameFinish, type FrameColor } from "@/app/lib/pricing";

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

type OpenDirection = "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT";

function formatWon(n: number) {
    return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}

function doorLabel(d: DoorKind) {
    switch (d) {
        case "3T_MANUAL": return "3연동(수동)";
        case "1W_SLIDING": return "원슬라이딩";
        case "SWING_1": return "스윙 1도어";
        case "SWING_2": return "스윙 2도어";
        case "HOPE_1": return "여닫이(호패) 1도어";
        case "HOPE_2": return "여닫이(호패) 2도어";
        case "AUTO": return "자동 3연동";
        default: return String(d);
    }
}

function getFrameOptions(door: DoorKind): { coating: FrameFinish; colors: { key: FrameColor; label: string }[]; defaultColor: FrameColor }[] {
    // 3연동/자동: 불소(화이트, 모던블랙), 아노(샴페인골드)
    if (door === "3T_MANUAL" || door === "AUTO") {
        return [
            { coating: "FLUORO", defaultColor: "WHITE", colors: [{ key: "WHITE", label: "화이트(기본)" }, { key: "MODERN_BLACK", label: "모던블랙(+7만)" }] },
            { coating: "ANOD", defaultColor: "CHAMPAGNE_GOLD", colors: [{ key: "CHAMPAGNE_GOLD", label: "샴페인골드(+10만)" }] },
        ];
    }
    if (door === "1W_SLIDING") {
        return [
            { coating: "FLUORO", defaultColor: "WHITE", colors: [{ key: "WHITE", label: "화이트(기본)" }, { key: "DARK_SILVER", label: "다크실버(+7만)" }] },
            { coating: "ANOD", defaultColor: "CHAMPAGNE_GOLD", colors: [{ key: "CHAMPAGNE_GOLD", label: "샴페인골드(+10만)" }] },
        ];
    }
    if (door === "HOPE_1" || door === "HOPE_2") {
        return [
            { coating: "ANOD", defaultColor: "WHITE", colors: [{ key: "WHITE", label: "아노다이징 화이트(기본)" }, { key: "METAL_BLACK", label: "메탈블랙(+10만)" }, { key: "CHAMPAGNE_GOLD", label: "샴페인골드(+10만)" }] },
        ];
    }
    // SWING
    return [
        { coating: "FLUORO", defaultColor: "WHITE", colors: [{ key: "WHITE", label: "화이트(기본)" }] },
        { coating: "ANOD", defaultColor: "BLACK", colors: [{ key: "BLACK", label: "블랙(+10만)" }] },
    ];
}

function StepPill({ n, current, label }: { n: number; current: number; label: string }) {
    const active = n === current;
    const done = n < current;
    return (
        <div className={cx("px-3 py-1 rounded-full text-sm border", active && "bg-white text-black", !active && "text-white/80", done && "border-white/40")}>
            {n}. {label}
        </div>
    );
}

// 🔊 TTS Helper
function speakKo(text: string) {
    try {
        if (typeof window === "undefined") return;
        window.speechSynthesis?.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ko-KR";
        u.rate = 1.0;
        u.pitch = 1.0;
        window.speechSynthesis?.speak(u);
    } catch { }
}

// 📏 Deviation Helper
function maxDiff(arr: number[]) {
    const nums = (arr ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length < 2) return 0;
    return Math.max(...nums) - Math.min(...nums);
}

// ✅ Validation & Swap Rules
type RangeRule = {
    // 정상 범위(대략) - 오기 탐지용
    minW: number; maxW: number;
    minH: number; maxH: number;

    // 기준값(참고) - 안내/스왑 판단에 도움
    refW: number; refH: number;

    // 메시지용 라벨
    label: string;
};

function getDoorRangeRule(door: DoorKind): RangeRule {
    switch (door) {
        case "3T_MANUAL":
            return { label: "수동 3연동", minW: 900, maxW: 2000, minH: 2000, maxH: 2600, refW: 1300, refH: 2300 };
        case "AUTO":
            return { label: "자동 3연동", minW: 900, maxW: 2000, minH: 2000, maxH: 2600, refW: 1300, refH: 2300 };
        case "1W_SLIDING":
            return { label: "원슬라이딩", minW: 800, maxW: 1800, minH: 2000, maxH: 2600, refW: 1200, refH: 2300 };
        case "SWING_1":
            return { label: "스윙 1도어", minW: 600, maxW: 1000, minH: 2000, maxH: 2600, refW: 850, refH: 2300 };
        case "SWING_2":
            return { label: "스윙 2도어", minW: 900, maxW: 1600, minH: 2000, maxH: 2600, refW: 1200, refH: 2300 };
        case "HOPE_1":
            return { label: "여닫이(호패) 1도어", minW: 600, maxW: 1000, minH: 2000, maxH: 2600, refW: 850, refH: 2300 };
        case "HOPE_2":
            return { label: "여닫이(호패) 2도어", minW: 900, maxW: 1600, minH: 2000, maxH: 2600, refW: 1200, refH: 2300 };
        default:
            return { label: "도어", minW: 600, maxW: 2500, minH: 1800, maxH: 2800, refW: 1200, refH: 2300 };
    }
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
    // swap 했을 때 정상 범위에 더 가까워지는지
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

    // 1) 일반적 상식 체크: 높이가 너무 낮으면 오기 가능성 큼
    if (h < 1800) warnings.push("세로가 1800mm 미만입니다. 가로/세로를 뒤집어 입력했을 가능성이 큽니다.");

    // 2) 가로가 세로보다 크면 거의 오기
    const suggestSwap = w > h;
    if (suggestSwap) warnings.push("가로가 세로보다 큽니다. 가로/세로가 뒤바뀐 것 같습니다.");

    // 3) 제품별 정상 범위 체크
    const wOk = w >= rule.minW && w <= rule.maxW;
    const hOk = h >= rule.minH && h <= rule.maxH;

    if (!wOk) warnings.push(`${rule.label} 기준으로 가로(${w}mm)가 일반 범위를 벗어났습니다. (${rule.minW}~${rule.maxW}mm)`);
    if (!hOk) warnings.push(`${rule.label} 기준으로 세로(${h}mm)가 일반 범위를 벗어났습니다. (${rule.minH}~${rule.maxH}mm)`);

    // 4) swap이 실제로 더 "정상"에 가까운지 판단 (범위 + 기준값 거리)
    const w2 = h;
    const h2 = w;

    // 기준값 거리 비교(작을수록 정상)
    const score = (xw: number, xh: number) => dist(xw, rule.refW) + dist(xh, rule.refH) + (xw >= rule.minW && xw <= rule.maxW ? 0 : 5000) + (xh >= rule.minH && xh <= rule.maxH ? 0 : 5000);
    const swapImproves = score(w2, h2) < score(w, h);

    return { errors, warnings, suggestSwap, swapImproves };
}

export default function FieldNewPage() {
    const [step, setStep] = useState(1);

    // 고객 정보
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    // 실측 (Wizard uses points, but Pricing uses single width/height)
    const [widthPoints, setWidthPoints] = useState<number[]>([0, 0, 0]);
    const [heightPoints, setHeightPoints] = useState<number[]>([0, 0, 0]);

    // Pricing State
    const [door, setDoor] = useState<DoorKind>("3T_MANUAL");
    const [frameFinish, setFrameFinish] = useState<FrameFinish>("FLUORO");
    const [frameColor, setFrameColor] = useState<FrameColor>("WHITE");
    const [glassDesign, setGlassDesign] = useState<GlassDesign>(DEFAULT_GLASS_DESIGN);

    // ✅ Open Direction
    const [openDirection, setOpenDirection] = useState<OpenDirection>("LEFT_TO_RIGHT");

    // TTS Debounce
    const [lastSpokenKey, setLastSpokenKey] = useState<string>("");

    // Discount
    const [discountOpen, setDiscountOpen] = useState(false);
    const [measurerDiscountWon, setMeasurerDiscountWon] = useState<number>(0);
    const [promoDiscountWon, setPromoDiscountWon] = useState<number>(0);

    // ✅ Extra Work (Demolition, Carpentry, Moving)
    const [extraDemolition, setExtraDemolition] = useState(false);
    const [extraCarpentry, setExtraCarpentry] = useState(false);
    const [extraMoving, setExtraMoving] = useState(false);
    const [movingFloor, setMovingFloor] = useState<number>(0);

    // ✅ Site Type (New vs Existing)
    const [isNewApartment, setIsNewApartment] = useState<boolean>(false);

    // Auto-toggle demolition based on site type
    useEffect(() => {
        if (!isNewApartment) {
            setExtraDemolition(true);
        } else {
            setExtraDemolition(false);
        }
    }, [isNewApartment]);

    // UI State
    const [optionsOpen, setOptionsOpen] = useState(true);

    // Derived: Measurements for Pricing (Min logic from previous wizard)
    const widthMm = useMemo(() => {
        const valid = widthPoints.filter(p => p > 0);
        return valid.length ? Math.min(...valid) : 0;
    }, [widthPoints]);
    const heightMm = useMemo(() => {
        const valid = heightPoints.filter(p => p > 0);
        return valid.length ? Math.min(...valid) : 0;
    }, [heightPoints]);

    const widthAvg = useMemo(() => {
        const valid = widthPoints.filter(p => p > 0);
        return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    }, [widthPoints]);
    const heightAvg = useMemo(() => {
        const valid = heightPoints.filter(p => p > 0);
        return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    }, [heightPoints]);

    // Helper: Apply Door and Default Frame
    function applyDoorType(dt: DoorKind) {
        setDoor(dt);
        const groups = getFrameOptions(dt);
        if (groups.length > 0) {
            setFrameFinish(groups[0].coating);
            setFrameColor(groups[0].defaultColor);
        }
    }

    // Calculate Pricing
    const pricing = useMemo(() => {
        return calcPricing({
            door,
            widthMm,
            heightMm,
            frameFinish,
            frameColor,
            glassDesign,
            installFeeWon: INSTALL_FEE,
            discount: {
                measurerDiscountWon,
                promoDiscountWon,
            },
        });
    }, [door, widthMm, heightMm, frameFinish, frameColor, glassDesign, measurerDiscountWon, promoDiscountWon]);

    // 🔊 TTS & Alert for Measurement Deviation
    const wDiff = useMemo(() => maxDiff(widthPoints), [widthPoints]);
    const hDiff = useMemo(() => maxDiff(heightPoints), [heightPoints]);
    const hasDiffWarn = wDiff >= 10 || hDiff >= 10;

    // ✅ 오차 시 추가자재(마감재) 추천 + (3연동/원슬라이딩은 5만원 가능)
    const needExtraMaterialRecommend = hasDiffWarn && (door === "3T_MANUAL" || door === "AUTO" || door === "1W_SLIDING");
    const extraMaterialPossibleFee = needExtraMaterialRecommend ? 50000 : 0;

    const extraMaterialMessage = needExtraMaterialRecommend
        ? `실측 오차가 10mm 이상입니다. 마감재(추가자재) 사용이 필요할 수 있으며, 현장 상황에 따라 추가비용 ${extraMaterialPossibleFee.toLocaleString()}원이 발생할 수 있습니다.`
        : `실측 오차가 10mm 이상입니다. 현장 상태에 따라 마감재(추가자재) 사용이 필요할 수 있습니다.`;

    useEffect(() => {
        if (!hasDiffWarn) return;

        const key = `${door}-${wDiff}-${hDiff}-${needExtraMaterialRecommend ? "EXTRA50" : "EXTRA"}`;
        if (key === lastSpokenKey) return;

        const msg = `주의. 실측 오차가 발생했습니다. 가로 오차 ${wDiff} 밀리미터, 세로 오차 ${hDiff} 밀리미터. ${extraMaterialMessage}`;
        speakKo(msg);
        setLastSpokenKey(key);
    }, [hasDiffWarn, wDiff, hDiff, door, needExtraMaterialRecommend, extraMaterialMessage, lastSpokenKey]);

    // 🔊 TTS & Block for Invalid Pricing
    useEffect(() => {
        if (!pricing) return;
        if (pricing.ok === false && pricing.reason) {
            speakKo(pricing.reason);
        }
    }, [pricing?.ok, pricing?.reason]);

    // ✅ Advanced Validation Guard
    const whGuard = useMemo(() => guardWidthHeight(door, widthMm, heightMm), [door, widthMm, heightMm]);

    // ✅ “강한 경고” 기준(여기 걸리면 전송/저장 잠금)
    const strongWarn =
        // swap이 더 좋아 보이는데 아직 스왑 안 한 경우
        (whGuard.swapImproves && (whGuard.suggestSwap || heightMm < 1800)) ||
        // 제품별 정상범위에서 둘 중 하나라도 크게 벗어남(경고 문구 1개 이상이면 잠금)
        whGuard.warnings.length > 0;

    const [whSpokenKey, setWhSpokenKey] = useState<string>("");

    // ✅ 경고가 새로 생기면 음성 안내(너무 반복되는 것 방지)
    useEffect(() => {
        if (whGuard.warnings.length === 0) return;

        const key = `${door}-${widthMm}-${heightMm}-${whGuard.swapImproves ? "swapYes" : "swapNo"}-${whGuard.warnings.join("|")}`;
        if (key === whSpokenKey) return;

        // 핵심만 말하기
        const rule = getDoorRangeRule(door);
        const msg = `입력 확인 필요. ${rule.label} 기준으로 가로 ${widthMm}, 세로 ${heightMm} 입니다. ${whGuard.swapImproves ? "가로와 세로가 뒤바뀐 것으로 보입니다." : "치수를 다시 확인해 주세요."}`;
        speakKo(msg);
        setWhSpokenKey(key);
    }, [whGuard.warnings, whGuard.swapImproves, door, widthMm, heightMm, whSpokenKey]);

    // 🔊 TTS for Extras
    useEffect(() => {
        const msgs: string[] = [];
        if (extraDemolition) msgs.push("기존 중문 철거가 추가되었습니다.");
        if (extraCarpentry) msgs.push("목공 작업이 추가되었습니다. 자재비는 별도입니다.");
        if (extraMoving) msgs.push("짐이전 옵션이 추가되었습니다.");
        if (msgs.length) speakKo(msgs.join(" "));
    }, [extraDemolition, extraCarpentry, extraMoving]);

    // Helper: Build Extra Work Lines
    function buildExtraWorkLines() {
        const lines: string[] = [];
        // Explicit site type line
        const siteTypeLine = isNewApartment ? "- 현장 유형: 신규 아파트 (철거 없음 / 기본 OFF)" : "- 현장 유형: 기존 주택/구축 (철거 기본포함 / ON)";

        if (extraDemolition) lines.push("- 기존 중문 철거: +150,000원");
        if (extraCarpentry) lines.push("- 목공 작업: 시공비 +50,000원 (자재비 별도)");
        if (extraMoving) {
            const f = Math.max(0, Math.floor(Number(movingFloor || 0)));
            if (f >= 2) lines.push(`- 짐이전(엘베 없음): ${f}층 → +${(f - 1) * 10000}원`);
            else lines.push("- 짐이전(엘베 없음): 층수 미입력(2층부터 비용)");
        }
        return `\n[추가 작업 / 현장]\n${siteTypeLine}\n${lines.join("\n")}\n`;
    }

    // Message Generation
    const customerMessage = useMemo(() => {
        if (!pricing.ok) {
            return `[림스도어 실측/견적 안내]
고객: ${customerName} (${customerPhone})
제품: ${doorLabel(door)}
실측: ${widthMm} × ${heightMm} (mm)
열림방향: ${openDirection === "LEFT_TO_RIGHT" ? "좌→우" : "우→좌"}
${hasDiffWarn ? `\n[실측 오차 안내]\n가로Δ ${wDiff}mm / 세로Δ ${hDiff}mm\n${extraMaterialMessage}\n` : ""}
❌ ${pricing.reason || "견적 불가: 담당자에게 문의하세요."}
`;
        }

        return `[림스도어 실측/견적 안내]
고객: ${customerName} (${customerPhone})
제품: ${doorLabel(door)}
실측(최소기준): ${widthMm} × ${heightMm} (mm)
열림방향: ${openDirection === "LEFT_TO_RIGHT" ? "좌→우" : "우→좌"}${hasDiffWarn ? `\n\n[실측 오차 안내]\n가로Δ ${wDiff}mm / 세로Δ ${hDiff}mm\n${extraMaterialMessage}` : ""}

자재비(확정): ${formatWon(pricing.materialWon)}
시공비(별도): ${formatWon(pricing.installWon)}
총액: ${formatWon(pricing.totalWon)}

※ 자재비는 시공비(15만원) 제외 금액입니다.
※ 자재비 입금이 되어야 해당 제품이 제작이 됩니다.
※ 시공비는 시공 후 결제됩니다.

입금 계좌:
${BANK_LINE}`;
    }, [customerName, customerPhone, door, widthMm, heightMm, pricing, openDirection, hasDiffWarn, wDiff, hDiff, extraMaterialMessage, extraDemolition, extraCarpentry, extraMoving, movingFloor, isNewApartment]);

    function setPoint(arr: number[], idx: number, value: number) {
        const next = [...arr];
        next[idx] = Number.isFinite(value) ? value : 0;
        return next;
    }

    const frameGroups = useMemo(() => getFrameOptions(door), [door]);

    return (
        <div className="min-h-screen bg-[#0b0f14] text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#0b0f14]/90 backdrop-blur border-b border-white/10">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="font-semibold">FieldX · 현장 실측</div>
                    <div className="flex gap-2">
                        <StepPill n={1} current={step} label="도어" />
                        <StepPill n={2} current={step} label="실측" />
                        <StepPill n={3} current={step} label="옵션" />
                        <StepPill n={4} current={step} label="전송" />
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-4 pb-28 space-y-4">
                {/* STEP 1: Door */}
                {step === 1 && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-lg font-semibold mb-3">1) 도어 선택</div>

                        <select
                            value={door}
                            onChange={(e) => applyDoorType(e.target.value as DoorKind)}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 text-zinc-100 mb-4"
                        >
                            <option value="3T_MANUAL">수동 3연동</option>
                            <option value="1W_SLIDING">원슬라이딩</option>
                            <option value="SWING_1">스윙 1도어</option>
                            <option value="SWING_2">스윙 2도어</option>
                            <option value="HOPE_1">여닫이(호패) 1도어</option>
                            <option value="HOPE_2">여닫이(호패) 2도어</option>
                            <option value="AUTO">자동문(자동 3연동)</option>
                        </select>

                        <div className="mt-4 flex gap-2">
                            <button
                                className="px-4 py-3 rounded-xl bg-white text-black font-semibold w-full"
                                onClick={() => setStep(2)}
                            >
                                다음: 실측 입력 →
                            </button>
                        </div>
                    </section>
                )}

                {/* STEP 2: Measurement */}
                {step === 2 && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-lg font-semibold mb-1">2) 실측 입력 (mm)</div>
                        <div className="text-sm text-white/70 mb-4">
                            가로 3점 / 세로 3점을 입력하면 최소값 기준으로 자동 계산됩니다.
                        </div>

                        {hasDiffWarn && (
                            <div className="mb-4 rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 text-amber-200">
                                <div className="font-semibold">실측 오차 경고</div>
                                <div className="text-sm mt-1">가로 오차: {wDiff}mm / 세로 오차: {hDiff}mm</div>
                                <div className="text-sm mt-2">{extraMaterialMessage}</div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            <div className="rounded-xl border border-white/10 p-3">
                                <div className="font-semibold mb-2">가로(mm) · 3점</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {widthPoints.map((v, i) => (
                                        <input
                                            key={i}
                                            inputMode="numeric"
                                            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                                            value={v || ""}
                                            placeholder={`${i + 1}`}
                                            onChange={(e) => setWidthPoints(setPoint(widthPoints, i, Number(e.target.value)))}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 p-3">
                                <div className="font-semibold mb-2">세로(mm) · 3점</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {heightPoints.map((v, i) => (
                                        <input
                                            key={i}
                                            inputMode="numeric"
                                            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                                            value={v || ""}
                                            placeholder={`${i + 1}`}
                                            onChange={(e) => setHeightPoints(setPoint(heightPoints, i, Number(e.target.value)))}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* ✅ Validation Warning & Swap UI */}
                            {whGuard.warnings.length > 0 ? (
                                <div className="rounded-2xl border border-amber-600/40 bg-amber-950/30 p-4 text-amber-100">
                                    <div className="font-semibold">가로/세로 입력 확인</div>
                                    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                                        {whGuard.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>

                                    {(whGuard.suggestSwap || whGuard.swapImproves) ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const oldW = widthPoints;
                                                // Note: Since we use points, we should ideally swap the points.
                                                // But the prompt code uses widthMm/heightMm.
                                                // We must swap the underlying point state to be correct.
                                                setWidthPoints(heightPoints);
                                                setHeightPoints(oldW);
                                                speakKo("가로와 세로를 바꿨습니다. 값이 맞는지 다시 확인해 주세요.");
                                            }}
                                            className="mt-3 w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-600/40 py-3 font-semibold"
                                        >
                                            가로/세로 바꾸기
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            speakKo(`확인 안내. 현재 입력은 가로 ${widthMm} 밀리미터, 세로 ${heightMm} 밀리미터 입니다.`);
                                        }}
                                        className="mt-2 w-full rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-700 py-3 font-semibold text-zinc-100"
                                    >
                                        음성으로 다시 읽기
                                    </button>
                                </div>
                            ) : null}

                            <div className="rounded-xl border border-white/10 p-3 bg-black/20">
                                <div className="text-sm text-white/70">자동 계산(최소기준)</div>
                                <div className="text-xl font-bold mt-1">{widthMm} × {heightMm} mm</div>
                                <div className="text-sm text-white/60 mt-1">평균: {widthAvg} × {heightAvg} mm</div>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button className="px-4 py-3 rounded-xl border border-white/15 w-full" onClick={() => setStep(1)}>
                                ← 이전
                            </button>
                            <button className="px-4 py-3 rounded-xl bg-white text-black font-semibold w-full" onClick={() => setStep(3)}>
                                다음: 옵션 →
                            </button>
                        </div>
                    </section>
                )}

                {/* STEP 3: Options */}
                {step === 3 && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-lg font-semibold">3) 옵션</div>
                                <div className="text-sm text-white/60">필요한 것만 선택하세요. 선택 즉시 가격 반영됩니다.</div>
                            </div>
                            <button className="px-3 py-2 rounded-xl border border-white/15" onClick={() => setOptionsOpen(v => !v)}>
                                {optionsOpen ? "접기" : "펼치기"}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.open(SAMPLE_URL, "_blank", "noopener,noreferrer")}
                            className="mt-4 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white py-3 font-semibold text-sm"
                        >
                            샘플 사진 보기 (구글 사진첩)
                        </button>

                        {optionsOpen && (
                            <div className="mt-4 space-y-4">
                                {/* ✅ 0. Site Type (New vs Existing) */}
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                                    <div className="text-sm font-semibold text-zinc-200">현장 유형</div>

                                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={isNewApartment}
                                            onChange={(e) => setIsNewApartment(e.target.checked)}
                                        />
                                        신규 아파트
                                    </label>
                                    <div className="text-xs text-zinc-500">
                                        신규 아파트를 선택하면 기존 중문 철거 작업이 필요하지 않습니다. (기본 철거 OFF)
                                    </div>
                                </div>

                                {/* 1. Open Direction */}
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
                                    <div className="text-sm font-semibold text-zinc-200">도어 열림 방향 (거실에서 현관을 바라보는 기준)</div>
                                    <select
                                        value={openDirection}
                                        onChange={(e) => setOpenDirection(e.target.value as any)}
                                        className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 text-zinc-100"
                                    >
                                        <option value="LEFT_TO_RIGHT">좌 → 우 열림</option>
                                        <option value="RIGHT_TO_LEFT">우 → 좌 열림</option>
                                    </select>
                                </div>

                                {/* 2. Frame */}
                                <div className="rounded-xl border border-white/10 p-3">
                                    <div className="font-semibold mb-2">프레임 색상</div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {frameGroups.map((g, idx) => (
                                            <div key={idx} className="rounded-xl border border-white/10 p-3 bg-black/20">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-semibold">
                                                        {g.coating === "FLUORO" ? "불소도장" : "아노다이징"}
                                                    </div>
                                                    <button
                                                        className={cx("px-3 py-1 rounded-lg text-sm border",
                                                            frameFinish === g.coating ? "bg-white text-black border-white" : "border-white/15 text-white/80")}
                                                        onClick={() => {
                                                            setFrameFinish(g.coating);
                                                            // 코팅 바꾸면 기본색으로 스냅
                                                            setFrameColor(g.defaultColor);
                                                        }}
                                                    >
                                                        선택
                                                    </button>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    {g.colors.map((c) => (
                                                        <button
                                                            key={c.key}
                                                            className={cx(
                                                                "px-3 py-3 rounded-xl border text-left",
                                                                frameFinish === g.coating && frameColor === c.key
                                                                    ? "bg-white text-black border-white"
                                                                    : "bg-black/30 text-white border-white/10"
                                                            )}
                                                            onClick={() => {
                                                                setFrameFinish(g.coating);
                                                                setFrameColor(c.key);
                                                            }}
                                                        >
                                                            <div className="font-semibold">{c.label}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Glass Designs (Moved to Component) */}
                                <GlassDesignOptions
                                    value={glassDesign}
                                    onChange={setGlassDesign}
                                    isSliding={door === "1W_SLIDING"}
                                />

                                {/* 4. Extra Work Options */}
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                                    <div className="text-sm font-semibold text-zinc-200">추가 작업</div>

                                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={extraDemolition}
                                            onChange={(e) => setExtraDemolition(e.target.checked)}
                                        />
                                        기존 중문 철거 (+150,000원)
                                    </label>

                                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={extraCarpentry}
                                            onChange={(e) => setExtraCarpentry(e.target.checked)}
                                        />
                                        목공 작업 (시공비 +50,000원 / 자재비 별도)
                                    </label>

                                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={extraMoving}
                                            onChange={(e) => setExtraMoving(e.target.checked)}
                                        />
                                        짐이전 (엘리베이터 없는 주택)
                                    </label>

                                    {extraMoving ? (
                                        <div className="pl-6">
                                            <div className="text-xs text-zinc-400 mb-1">2층부터 각층당 10,000원 (예: 5층 → 40,000원)</div>
                                            <input
                                                type="number"
                                                min={0}
                                                value={movingFloor}
                                                onChange={(e) => setMovingFloor(Math.max(0, Math.floor(Number(e.target.value || 0))))}
                                                className="w-40 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-100"
                                                placeholder="층수 입력"
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                {/* 5. Discount button */}
                                <div className="rounded-xl border border-white/10 p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold">현장 할인</div>
                                            <div className="text-sm text-white/60">필요할 때만 적용하세요.</div>
                                        </div>
                                        <button className="px-4 py-3 rounded-xl bg-white text-black font-semibold" onClick={() => setDiscountOpen(true)}>
                                            할인 적용
                                        </button>
                                    </div>
                                    {(measurerDiscountWon > 0 || promoDiscountWon > 0) && (
                                        <div className="mt-2 text-sm text-white/80">
                                            적용된 할인: <b className="text-white">{(measurerDiscountWon + promoDiscountWon).toLocaleString()}원</b>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex gap-2">
                            <button className="px-4 py-3 rounded-xl border border-white/15 w-full" onClick={() => setStep(2)}>
                                ← 이전
                            </button>
                            <button className="px-4 py-3 rounded-xl bg-white text-black font-semibold w-full" onClick={() => setStep(4)}>
                                다음: 전송 →
                            </button>
                        </div>
                    </section>
                )}

                {/* STEP 4: Send */}
                {step === 4 && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-lg font-semibold">4) 고객 전송</div>
                        <div className="text-sm text-white/60 mb-4">메시지는 자동 생성됩니다. 복사 후 전송하세요.</div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-xl border border-white/10 p-3">
                                <div className="font-semibold mb-2">고객 정보</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input
                                        className="rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                                        value={customerName}
                                        placeholder="고객명"
                                        onChange={(e) => setCustomerName(e.target.value)}
                                    />
                                    <input
                                        className="rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                                        value={customerPhone}
                                        placeholder="전화번호"
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 p-3 bg-black/20">
                                <div className="text-sm text-white/70">메시지 미리보기</div>
                                <textarea
                                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 h-52 text-sm"
                                    value={customerMessage}
                                    readOnly
                                />

                                {/* Send Button: Disabled if pricing invalid */}
                                <div className="mt-2 flex gap-2">
                                    <button
                                        disabled={strongWarn || !pricing.ok}
                                        className={`w-full rounded-xl py-3 font-semibold ${(strongWarn || !pricing.ok)
                                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                            : "bg-white text-black"
                                            }`}
                                        onClick={async () => {
                                            // ✅ 마지막 확정 음성(실수 방지)
                                            speakKo(`최종 확인. ${getDoorRangeRule(door).label} 가로 ${widthMm} 세로 ${heightMm}. 맞으면 진행합니다.`);

                                            await navigator.clipboard.writeText(customerMessage);
                                            alert("메시지가 복사되었습니다.");
                                        }}
                                    >
                                        {!pricing.ok ? "전송 불가 (견적 오류)" : "메시지 복사"}
                                    </button>
                                </div>
                                {strongWarn ? (
                                    <div className="mt-2 text-xs text-amber-300">
                                        ⚠️ 가로/세로 입력 확인이 필요합니다. (오류 가능성 높음) 확인 후 진행하세요.
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button className="px-4 py-3 rounded-xl border border-white/15 w-full" onClick={() => setStep(3)}>
                                ← 이전
                            </button>
                            <button className="px-4 py-3 rounded-xl bg-white text-black font-semibold w-full" onClick={() => alert("전송 연동(카톡/문자)은 기존 로직에 연결하세요.")}>
                                고객에게 보내기(연동)
                            </button>
                        </div>
                    </section>
                )}
            </div>

            {/* Sticky Footer: price always visible */}
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0b0f14]/92 backdrop-blur safe-bottom">
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <div className="text-sm text-white/70">총액</div>
                            <div className="text-2xl font-extrabold">{pricing.totalWon.toLocaleString()}원</div>
                            <div className="text-sm text-white/70 mt-1">
                                자재비(확정): <b className="text-white">{pricing.materialWon.toLocaleString()}원</b> · 시공비: {pricing.installWon.toLocaleString()}원
                            </div>
                        </div>
                        <div className="text-right text-xs text-white/70">
                            <div>기본 {pricing.baseWon.toLocaleString()}</div>
                            <div>사이즈 {pricing.sizeSurchargeWon.toLocaleString()}</div>
                            <div>프레임 {pricing.frameSurchargeWon.toLocaleString()}</div>
                            <div>유리/디자인 {pricing.glassDesignWon.toLocaleString()}</div>
                            {pricing.discountWon > 0 && <div className="text-orange-300">할인 -{pricing.discountWon.toLocaleString()}</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Discount Modal */}
            {discountOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center">
                    <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl bg-[#0b0f14] border border-white/10 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold">현장 할인 적용</div>
                            <button className="px-3 py-2 rounded-xl border border-white/15" onClick={() => setDiscountOpen(false)}>
                                닫기
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-white/10 p-3">
                                <div className="text-sm text-white/70 mb-2">실측자 할인(원)</div>
                                <input
                                    inputMode="numeric"
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                                    value={measurerDiscountWon}
                                    onChange={(e) => setMeasurerDiscountWon(Math.max(0, Number(e.target.value || 0)))}
                                />
                            </div>

                            <div className="rounded-xl border border-white/10 p-3">
                                <div className="text-sm text-white/70 mb-2">행사/프로모션 할인(원)</div>
                                <input
                                    inputMode="numeric"
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                                    value={promoDiscountWon}
                                    onChange={(e) => setPromoDiscountWon(Math.max(0, Number(e.target.value || 0)))}
                                />
                            </div>

                            <button
                                className="w-full px-4 py-3 rounded-xl bg-white text-black font-semibold"
                                onClick={() => setDiscountOpen(false)}
                            >
                                적용 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
