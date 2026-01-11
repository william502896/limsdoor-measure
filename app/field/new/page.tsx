"use client";

import { useMemo, useState } from "react";
import type { DoorType, FrameColor, Coating, Measurement, Options } from "@/app/lib/pricing.shared";
import { calcQuote, computeWidthHeightMm } from "@/app/lib/pricing.shared";
import { buildCustomerMessage } from "@/app/lib/message.shared";

function cx(...a: (string | false | undefined)[]) {
    return a.filter(Boolean).join(" ");
}

const DOOR_CHOICES: { key: DoorType; label: string }[] = [
    { key: "THREE_PANEL", label: "3연동" },
    { key: "ONE_SLIDING", label: "원슬라이딩" },
    { key: "SWING", label: "스윙" },
    { key: "HOPE", label: "여닫이(호패)" },
];

function getFrameOptions(doorType: DoorType): { coating: Coating; colors: { key: FrameColor; label: string }[]; defaultColor: FrameColor }[] {
    // 요청 주신 색상 “도어별 필터”
    // 3연동: 불소-화이트/모던블랙, 아노-샴페인골드
    // 원슬: 불소-화이트/다크실버, 아노-샴페인골드
    // 호패: 아노-메탈블랙/화이트/샴페인골드 (화이트 기본)
    // 스윙: 불소-화이트, 아노-블랙(확장)
    if (doorType === "THREE_PANEL") {
        return [
            { coating: "FLUORO", defaultColor: "WHITE", colors: [{ key: "WHITE", label: "화이트(기본)" }, { key: "MODERN_BLACK", label: "모던블랙(+7만)" }] },
            { coating: "ANOD", defaultColor: "CHAMPAGNE_GOLD", colors: [{ key: "CHAMPAGNE_GOLD", label: "샴페인골드(+10만)" }] },
        ];
    }
    if (doorType === "ONE_SLIDING") {
        return [
            { coating: "FLUORO", defaultColor: "WHITE", colors: [{ key: "WHITE", label: "화이트(기본)" }, { key: "DARK_SILVER", label: "다크실버(+7만)" }] },
            { coating: "ANOD", defaultColor: "CHAMPAGNE_GOLD", colors: [{ key: "CHAMPAGNE_GOLD", label: "샴페인골드(+10만)" }] },
        ];
    }
    if (doorType === "HOPE") {
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

    // 고객(최소 필드만)
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    // 실측
    const [widthPoints, setWidthPoints] = useState<number[]>([0, 0, 0]);
    const [heightPoints, setHeightPoints] = useState<number[]>([0, 0, 0]);

    // 옵션
    const [doorType, setDoorType] = useState<DoorType>("THREE_PANEL");
    const [coating, setCoating] = useState<Coating>("FLUORO");
    const [frameColor, setFrameColor] = useState<FrameColor>("WHITE");

    // ✅ 간살 수량(단가 2만원)
    const [barsQty, setBarsQty] = useState(0);

    // 할인
    const [discountOpen, setDiscountOpen] = useState(false);
    const [discountType, setDiscountType] = useState<"MEASURER" | "EVENT" | "OTHER">("MEASURER");
    const [onsiteDiscount, setOnsiteDiscount] = useState(0);

    // 접힘 섹션
    const [optionsOpen, setOptionsOpen] = useState(true);

    const measurement: Measurement = useMemo(
        () => ({ widthPoints, heightPoints }),
        [widthPoints, heightPoints]
    );

    // 도어 변경 시: 코팅/색상 기본값 자동 세팅
    const frameGroups = useMemo(() => getFrameOptions(doorType), [doorType]);
    function applyDoorType(dt: DoorType) {
        setDoorType(dt);
        const groups = getFrameOptions(dt);
        const g0 = groups[0];
        setCoating(g0.coating);
        setFrameColor(g0.defaultColor);
    }

    const options: Options = useMemo(
        () => ({
            doorType,
            coating,
            frameColor,
            barsQty,
            onsiteDiscount,
            installFee: 150000,
            // @ts-ignore (legacy 필드 방지)
            现场Discount: 0,
        }),
        [doorType, coating, frameColor, barsQty, onsiteDiscount]
    );

    const quote = useMemo(() => calcQuote(measurement, options), [measurement, options]);
    const wh = useMemo(() => computeWidthHeightMm(measurement), [measurement]);

    const diffW = Math.max(...widthPoints) - Math.min(...widthPoints);
    const diffH = Math.max(...heightPoints) - Math.min(...heightPoints);
    const hasWarn = (Number.isFinite(diffW) && diffW >= 10) || (Number.isFinite(diffH) && diffH >= 10);

    const customerMessage = useMemo(() => {
        return buildCustomerMessage({
            customerName: customerName || "고객",
            customerPhone: customerPhone || "",
            options,
            measurement,
            quote,
        });
    }, [customerName, customerPhone, options, measurement, quote]);

    // ---- helpers
    function setPoint(arr: number[], idx: number, value: number) {
        const next = [...arr];
        next[idx] = Number.isFinite(value) ? value : 0;
        return next;
    }

    // UI
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
                        <div className="grid grid-cols-2 gap-3">
                            {DOOR_CHOICES.map((d) => (
                                <button
                                    key={d.key}
                                    className={cx(
                                        "rounded-2xl p-4 border text-left",
                                        doorType === d.key ? "border-white bg-white text-black" : "border-white/15 bg-black/20 text-white"
                                    )}
                                    onClick={() => applyDoorType(d.key)}
                                >
                                    <div className="font-semibold">{d.label}</div>
                                    <div className={cx("text-sm mt-1", doorType === d.key ? "text-black/70" : "text-white/60")}>
                                        선택하면 프레임 기본값 자동 적용
                                    </div>
                                </button>
                            ))}
                        </div>

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
                                <div className="text-xl font-bold mt-1">{wh.wMin} × {wh.hMin} mm</div>
                                <div className="text-sm text-white/60 mt-1">평균: {wh.wAvg} × {wh.hAvg} mm</div>
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
                                                            coating === g.coating ? "bg-white text-black border-white" : "border-white/15 text-white/80")}
                                                        onClick={() => {
                                                            setCoating(g.coating);
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
                                                                coating === g.coating && frameColor === c.key
                                                                    ? "bg-white text-black border-white"
                                                                    : "bg-black/30 text-white border-white/10"
                                                            )}
                                                            onClick={() => {
                                                                setCoating(g.coating);
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

                                {/* ✅ Bars Quantity */}
                                <div className="rounded-xl border border-white/10 p-3">
                                    <div className="font-semibold mb-2">간살 (단가 20,000원)</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="w-12 h-12 rounded-xl border border-white/15 bg-black/30 text-xl"
                                            onClick={() => setBarsQty((v) => Math.max(0, v - 1))}
                                        >
                                            −
                                        </button>

                                        <input
                                            inputMode="numeric"
                                            className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-center text-lg"
                                            value={barsQty}
                                            onChange={(e) => setBarsQty(Math.max(0, Math.min(99, Number(e.target.value || 0))))}
                                        />

                                        <button
                                            className="w-12 h-12 rounded-xl border border-white/15 bg-black/30 text-xl"
                                            onClick={() => setBarsQty((v) => Math.min(99, v + 1))}
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className="mt-2 text-sm text-white/70">
                                        간살 합계: <b>{(barsQty * 20000).toLocaleString()}원</b>
                                    </div>
                                </div>

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
                                    {onsiteDiscount > 0 && (
                                        <div className="mt-2 text-sm text-white/80">
                                            적용된 할인: <b className="text-white">{onsiteDiscount.toLocaleString()}원</b>
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
                                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 h-52"
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
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0b0f14]/92 backdrop-blur">
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <div className="text-sm text-white/70">총액</div>
                            <div className="text-2xl font-extrabold">{quote.total.toLocaleString()}원</div>
                            <div className="text-sm text-white/70 mt-1">
                                자재비(확정): <b className="text-white">{quote.material.toLocaleString()}원</b> · 시공비: {quote.installFee.toLocaleString()}원
                            </div>
                        </div>
                        <div className="text-right text-sm text-white/70">
                            <div>기본가 {quote.basePrice.toLocaleString()}</div>
                            <div>사이즈 {quote.sizeSurcharge.toLocaleString()}</div>
                            <div>색상 {quote.colorSurcharge.toLocaleString()}</div>
                            <div>간살 {quote.barsTotal.toLocaleString()}</div>
                            {quote.onsiteDiscount > 0 && <div className="text-orange-300">할인 -{quote.onsiteDiscount.toLocaleString()}</div>}
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
                                <div className="text-sm text-white/70 mb-2">할인 유형</div>
                                <select
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                >
                                    <option value="MEASURER">실측자 할인</option>
                                    <option value="EVENT">행사 제품</option>
                                    <option value="OTHER">기타</option>
                                </select>
                            </div>

                            <div className="rounded-xl border border-white/10 p-3">
                                <div className="text-sm text-white/70 mb-2">할인 금액(원)</div>
                                <input
                                    inputMode="numeric"
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                                    value={onsiteDiscount}
                                    onChange={(e) => setOnsiteDiscount(Math.max(0, Number(e.target.value || 0)))}
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
