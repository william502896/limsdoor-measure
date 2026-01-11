"use client";

import { useMemo, useState } from "react";
import GlassDesignOptions from "@/app/components/GlassDesignOptions";
import { calcPricing, type DoorKind, type GlassDesign, type FrameFinish, type FrameColor } from "@/app/lib/pricing";

function cx(...a: (string | false | undefined)[]) {
    return a.filter(Boolean).join(" ");
}

const SAMPLE_URL = "https://sites.google.com/view/limsdoor/%ED%99%88";
const BANK_LINE = "케이뱅크 700100061232 주식회사 림스";
const INSTALL_FEE = 150000;

// Default Glass Design
const DEFAULT_GLASS_DESIGN: GlassDesign = {
    muntinSet2LinesCount: 0,
    muntinExtraBarCount: 0,
    archBasic: false,
    archCorner: false,
    bottomPanel: false,
    bigArchVertical: false,
};

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

    // Discount
    const [discountOpen, setDiscountOpen] = useState(false);
    const [measurerDiscountWon, setMeasurerDiscountWon] = useState<number>(0);
    const [promoDiscountWon, setPromoDiscountWon] = useState<number>(0);

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

    // Message Generation
    const customerMessage = useMemo(() => {
        if (!pricing.ok) {
            return `[림스도어 실측/견적 안내]
고객: ${customerName} (${customerPhone})
제품: ${doorLabel(door)}
실측: ${widthMm} × ${heightMm} (mm)

현재 선택 옵션은 가격표가 없어 '문의'가 필요합니다.
담당자에게 연락 주세요.`;
        }

        return `[림스도어 실측/견적 안내]
고객: ${customerName} (${customerPhone})
제품: ${doorLabel(door)}
실측(최소기준): ${widthMm} × ${heightMm} (mm)

자재비(확정): ${formatWon(pricing.materialWon)}
시공비(별도): ${formatWon(pricing.installWon)}
총액: ${formatWon(pricing.totalWon)}

※ 자재비는 시공비(15만원) 제외 금액입니다.
※ 자재비 입금이 되어야 해당 제품이 제작이 됩니다.
※ 시공비는 시공 후 결제됩니다.

입금 계좌:
${BANK_LINE}`;
    }, [customerName, customerPhone, door, widthMm, heightMm, pricing]);

    // Warning for measurement deviation
    const diffW = Math.max(...widthPoints) - Math.min(...widthPoints);
    const diffH = Math.max(...heightPoints) - Math.min(...heightPoints);
    const hasWarn = (widthMm > 0 && Number.isFinite(diffW) && diffW >= 10) || (heightMm > 0 && Number.isFinite(diffH) && diffH >= 10);

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

                        {hasWarn && (
                            <div className="mb-4 rounded-xl border border-orange-400/40 bg-orange-400/10 p-3 text-sm">
                                ⚠️ 실측 오차가 10mm 이상입니다. (가로 Δ{diffW}mm / 세로 Δ{diffH}mm) — 재확인 권장
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
                                {/* Frame */}
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

                                {/* Glass Designs (Moved to Component) */}
                                <GlassDesignOptions
                                    value={glassDesign}
                                    onChange={setGlassDesign}
                                    isSliding={door === "1W_SLIDING"}
                                />

                                {/* Discount button */}
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
                                <div className="mt-2 flex gap-2">
                                    <button
                                        className="px-4 py-3 rounded-xl bg-white text-black font-semibold w-full"
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(customerMessage);
                                            alert("메시지가 복사되었습니다.");
                                        }}
                                    >
                                        메시지 복사
                                    </button>
                                </div>
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
