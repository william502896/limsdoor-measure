"use client";

import React, { useMemo, useState, useEffect } from "react";
import { MISOTECH_PURCHASE_TABLE_2024_04 as TABLE } from "@/app/lib/misoPurchasePriceTable"; // Keep for meta if needed, or remove?
import { MISOTECH_MATERIALS_2024_04, calculateMisoCost, DoorSpec, MaterialKey, MaterialSelection, MisoProductType, FixVariant, SemiSwingVariant, mapGlassToGroup } from "../../lib/miso_cost_data";
import { SaleDiscountRule, SaleColor } from "@/app/lib/salesPriceTypes";
import { Calculator, AlertTriangle, CheckCircle, Info } from "lucide-react";

// --- Types & Constants ---
// UI keeps extended types for easy selection
const PRODUCT_TYPES = [
    { value: "1S_MANUAL", label: "1S 수동도어" }, // Renamed
    { value: "FIX_1S1F", label: "FIX (기둥바)" },
    { value: "FIX_2S_H", label: "FIX (H바)" },
    { value: "1S_AUTO", label: "1S 자동문" },
    { value: "3T_MANUAL", label: "3연동 수동" },
    { value: "3T_AUTO", label: "3연동 자동" },
    { value: "SEMI_SWING", label: "반자동 스윙도어" },
    { value: "HOPE", label: "호페 여닫이도어" },
];

interface UiSpecState {
    type: string; // "FIX_1S1F" etc.
    width: number;
    height: number;
    options: {
        coating: "FLUORO" | "ANOD";
        glassGroup: string;
        isKnockdown: boolean;

        filmRequest?: boolean;
        verticalDivide?: boolean;

        // Auto
        sensorTop?: boolean;
        sensorWireless?: boolean;
        tdu1S?: boolean;
        tdu3T?: boolean;

        // Handles
        handleType?: any;
    }
}

const INITIAL_SPEC: UiSpecState = {
    type: "1S_MANUAL",
    width: 900,
    height: 2400,
    options: {
        coating: "FLUORO",
        glassGroup: "CLEAR",
        isKnockdown: false,
    }
};

export default function MisoCostPage() {
    const [spec, setSpec] = useState<UiSpecState>(INITIAL_SPEC);
    const [salesPrice, setSalesPrice] = useState<number>(0);
    const [useRecommendedMaterials, setUseRecommendedMaterials] = useState(true);
    const [materialsSelections, setMaterialsSelections] = useState<MaterialSelection[]>([]);
    const [isMaterialsOpen, setIsMaterialsOpen] = useState(false); // Collapsible state

    // ✅ Sales Price Management State
    const [dbSaleBase, setDbSaleBase] = useState<number>(0);
    const [dbMemo, setDbMemo] = useState("");
    const [priceId, setPriceId] = useState<string | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(false);

    // ✅ Advanced Sales Price Fields
    const [saleColor, setSaleColor] = useState<SaleColor>("WHITE");
    const [designId, setDesignId] = useState("");
    const [discountRules, setDiscountRules] = useState<SaleDiscountRule[]>([]);
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [priority, setPriority] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // --- Helpers ---
    const MATERIAL_GROUPS: { id: string; title: string; keys: MaterialKey[] }[] = [
        { id: "COMMON", title: "공통/마감", keys: ["FINISH_MAT_L", "FINISH_MAT_S"] },
        { id: "RAIL_COVER", title: "상부인방(커버)", keys: ["RAIL_COVER_UPTO_1400", "RAIL_COVER_UPTO_1700", "RAIL_COVER_UPTO_2000"] },
        { id: "FIX", title: "FIX 자재", keys: ["FIX_SET_128x49_SET", "FIX_SET_88x49_SET", "FIX_SET_50x47_SET", "FIX_35x20_EA"] },
        { id: "ONE_S", title: "1S 자재", keys: ["MIDBAR_22_PER_M", "ADHESIVEBAR_22_2P5M", "BAR_10x20_EA", "BAR_20x30_EA", "BAR_38x20_PER_M"] },
        { id: "THREE_T", title: "3연동 자재", keys: ["MIDBAR_18_PER_M", "ADHESIVEBAR_18_2P5M", "BAR_30x10_EA", "BAR_60x2P5_EA"] },
        { id: "HOPE_FIX", title: "호페/픽스 기둥바", keys: ["HOPE_FIX_PILLAR_50x47_SET"] },
    ];

    function upsertSelection(key: MaterialKey, patch: Partial<MaterialSelection>) {
        setMaterialsSelections((prev) => {
            const idx = prev.findIndex((x) => x.key === key);
            if (idx === -1) return [...prev, { key, enabled: true, ...patch }];
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    }

    function getSelection(key: MaterialKey): MaterialSelection | undefined {
        return materialsSelections.find((x) => x.key === key);
    }

    function toggleMaterial(key: MaterialKey, checked: boolean) {
        const item = MISOTECH_MATERIALS_2024_04[key];
        if (!item) return;
        // 기본값: EA/SET은 1, M은 1.0m
        if (checked) {
            upsertSelection(key, {
                enabled: true,
                qty: item.unit === "M" ? undefined : (getSelection(key)?.qty ?? 1),
                meters: item.unit === "M" ? (getSelection(key)?.meters ?? 1) : undefined,
            });
        } else {
            upsertSelection(key, { enabled: false });
        }
    }

    // --- Calculation Logic ---
    const result = useMemo(() => {
        // Map UI Spec to Backend DoorSpec
        const { type, width, height, options } = spec;

        let backendType: MisoProductType = "1S_MANUAL";
        let fixVariant: FixVariant | undefined;
        let semiSwingVariant: SemiSwingVariant = "ASYM_1H"; // Default

        // Mapping Logic
        if (type.startsWith("FIX")) {
            backendType = "FIX";
            fixVariant = type === "FIX_1S1F" ? "1S1F" : "2S_HBAR";
        } else if (type === "SEMI_SWING") {
            backendType = "SEMI_SWING";
        } else if (type === "HOPE") {
            backendType = "HOPE";
        } else {
            backendType = type as MisoProductType;
        }

        const doorSpec: DoorSpec = {
            type: backendType,
            width,
            height,
            glass: options.glassGroup, // "CLEAR", "SATIN", "WIRE"
            isKnockdown: options.isKnockdown,
            coating: options.coating,
            fixVariant,
            semiSwingVariant,

            // For now, map options specifically
            options: {
                filmRequest: options.filmRequest,
                verticalDivide: options.verticalDivide,
                tdu: options.tdu1S || options.tdu3T, // Map specific TDU to generic TDU flag? 
                handleType: options.handleType,
            },

            // Auto recommend
            useRecommendedMaterials,
            railCover: true, // Auto recommend covers for 3T
            materialsSelections, // Admin override
        };

        return calculateMisoCost(doorSpec);
    }, [spec, useRecommendedMaterials, materialsSelections]);

    // ✅ Real Effect
    useEffect(() => {
        if (!result.success || !result.appliedWidthKey) {
            setDbSaleBase(0);
            setPriceId(null);
            setDbMemo("");
            setIsPublished(false);
            return;
        }

        const abort = new AbortController();
        async function load() {
            setLoadingPrice(true);
            try {
                const gGroup = mapGlassToGroup(spec.options.glassGroup);
                const params = new URLSearchParams({
                    product_type: spec.type,
                    coating: spec.options.coating,
                    glass_group: gGroup,
                    is_knockdown: String(spec.options.isKnockdown),
                    width_key: String(result.appliedWidthKey),
                    variant: result.appliedVariant ?? "",
                });
                const res = await fetch(`/api/admin/miso-sale-prices?${params.toString()}`, { signal: abort.signal });
                const json = await res.json();
                if (json.ok && json.data && json.data.length > 0) {
                    const row = json.data[0];
                    setPriceId(row.id);
                    setDbSaleBase(row.sale_base ?? 0);
                    setDbMemo(row.memo ?? "");
                    setIsPublished(row.is_published ?? false);
                } else {
                    setPriceId(null);
                    setDbSaleBase(0);
                    setDbMemo("");
                    setIsPublished(false);
                }
            } catch (e) {
                // ignore abort
            } finally {
                setLoadingPrice(false);
            }
        }
        load();
        return () => abort.abort();
    }, [
        spec.type,
        spec.options.coating,
        spec.options.glassGroup,
        spec.options.isKnockdown,
        result.appliedWidthKey,
        result.appliedVariant
    ]);

    // ✅ Save / Publish Handler
    async function handleSavePrice(publish: boolean) {
        if (!result.appliedWidthKey) return;
        if (!confirm(publish ? "운영 단가로 확정 배포하시겠습니까?" : "초안으로 저장하시겠습니까? (운영 미반영)")) return;

        try {
            const gGroup = mapGlassToGroup(spec.options.glassGroup);
            const payload = {
                product_type: spec.type,
                coating: spec.options.coating,
                glass_group: gGroup,
                is_knockdown: spec.options.isKnockdown,
                width_key: result.appliedWidthKey,
                variant: result.appliedVariant ?? "",
                sale_base: dbSaleBase,
                memo: dbMemo,
                color: saleColor,
                design_id: designId || null,
                discount_rules: discountRules,
                starts_at: startsAt || null,
                ends_at: endsAt || null,
                priority,
            };

            // First Upsert
            const res = await fetch("/api/admin/miso-sale-prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            const newItem = json.data;
            setPriceId(newItem.id);

            // If publish, patch it
            if (publish) {
                const pubRes = await fetch("/api/admin/miso-sale-prices", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: newItem.id, is_published: true })
                });
                const pubJson = await pubRes.json();
                if (!pubJson.ok) throw new Error(pubJson.error);
                setIsPublished(true);
                alert("운영 단가로 확정되었습니다.");
            } else {
                setIsPublished(false); // If just save, we might want to keep it as strict draft? 
                // Wait, if I save draft, does it unpublish? Usually no, unless explicit.
                // But the POST creates/updates. If it was already published, upsert might keep it? 
                // The API POST implementation upserts. It implies fields not mentioned are kept?
                // Actually Supabase upsert replaces unless patched?
                // The POST implementation:
                /*
                  const payload = { ..., sale_base, ... };
                  upsert(payload)
                */
                // If I don't send `is_published` in payload, and the row exists, does it respect old val?
                // Yes if I assume standard behavior OR if I fetch first.
                // But generally safer to be explicit.
                // For now, I'll just upsert data. "Save Draft" usually means "Update Content".
                // If checks logic:
                alert("저장되었습니다.");
            }
        } catch (e) {
            alert("저장 실패: " + e);
        }
    }

    const margin = salesPrice - result.totalCost;
    const marginRate = salesPrice > 0 ? ((margin / salesPrice) * 100).toFixed(1) : "0.0";


    // --- Handlers ---
    const updateOption = (key: keyof UiSpecState['options'], val: any) => {
        setSpec(prev => ({ ...prev, options: { ...prev.options, [key]: val } }));
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="text-indigo-600" />
                미소테크 매입단가 계산기 (24.04 기준)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* === INPUT SECTION === */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
                    <h2 className="font-bold text-lg text-slate-700 border-b pb-2">규격 및 사양 선택</h2>

                    {/* 1. Basic Specs */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">제품 종류</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={spec.type}
                                onChange={(e) => setSpec({ ...spec, type: e.target.value as any })}
                            >
                                {PRODUCT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">가로 (Width)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border rounded-lg text-slate-900 font-mono font-bold"
                                        value={spec.width}
                                        onChange={(e) => setSpec({ ...spec, width: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">mm</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">세로 (Height)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border rounded-lg text-slate-900 font-mono font-bold"
                                        value={spec.height}
                                        onChange={(e) => setSpec({ ...spec, height: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">mm</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-center border p-3 rounded-lg bg-slate-50">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-slate-900">
                                    <input
                                        type="radio"
                                        checked={!spec.options.isKnockdown}
                                        onChange={() => updateOption("isKnockdown", false)}
                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    완제품 (Finished)
                                </label>
                                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-slate-500">
                                    <input
                                        type="radio"
                                        checked={spec.options.isKnockdown}
                                        onChange={() => updateOption("isKnockdown", true)}
                                        className="w-4 h-4 text-slate-500 focus:ring-slate-500"
                                    />
                                    넉다운 (Knockdown)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 2. Style Options (Row 2) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">도장(Coating)</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm font-bold text-slate-900"
                                value={spec.options.coating}
                                onChange={e => updateOption("coating", e.target.value)}
                            >
                                <option value="FLUORO">불소도장 (화이트/블랙)</option>
                                <option value="ANOD">아노다이징 (골드 등)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">유리 그룹</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm font-bold text-slate-900"
                                value={spec.options.glassGroup}
                                onChange={e => updateOption("glassGroup", e.target.value)}
                            >
                                <option value="CLEAR">투명/브론즈/아쿠아</option>
                                <option value="SATIN">샤틴 유리</option>
                                <option value="WIRE">망입 유리</option>
                            </select>
                        </div>
                    </div>

                    {/* 3. Conditional Options */}
                    {/* Auto Door specific */}
                    {spec.type.includes("AUTO") && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-2">
                            <div className="text-xs font-bold text-indigo-800 mb-1">자동문 옵션 (선택형)</div>
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={spec.options.sensorTop || false} onChange={e => updateOption("sensorTop", e.target.checked)} />
                                    <span>상부센서</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={spec.options.sensorWireless || false} onChange={e => updateOption("sensorWireless", e.target.checked)} />
                                    <span>무선스위치</span>
                                </label>
                                {spec.type === "1S_AUTO" && (
                                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={spec.options.tdu1S || false} onChange={e => updateOption("tdu1S", e.target.checked)} />
                                        <span>TDU 추가 (+26만)</span>
                                    </label>
                                )}
                                {spec.type === "3T_AUTO" && (
                                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={spec.options.tdu3T || false} onChange={e => updateOption("tdu3T", e.target.checked)} />
                                        <span>TDU 추가 (+29만)</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Handle Options for Swing/Hope */}
                    {(spec.type === "SEMI_SWING" || spec.type === "HOPE") && (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">손잡이 선택</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm text-slate-900 font-medium"
                                value={spec.options.handleType || ""}
                                onChange={e => updateOption("handleType", e.target.value || undefined)}
                            >
                                <option value="">(기본/미포함)</option>
                                {spec.type === "SEMI_SWING" && (
                                    <>
                                        <option value="OLD_450">구형 450 (+3.5만)</option>
                                        <option value="NEW_350">신형 350 (+2.5만)</option>
                                        <option value="NEW_600">신형 600 (+3.5만)</option>
                                        <option value="NEW_800">신형 800 (+4.5만)</option>
                                        <option value="HALF_ROUND">반달 원형 (+3.0만)</option>
                                    </>
                                )}
                                {spec.type === "HOPE" && (
                                    <>
                                        <option value="HOPE_GERMAN">독일산 (+6.0만)</option>
                                        <option value="HOPE_CHINESE">중국산 (+4.0만)</option>
                                    </>
                                )}
                            </select>
                        </div>
                    )}

                    {/* Common Extras */}
                    <div className="pt-3 border-t grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                            <input type="checkbox" checked={spec.options.filmRequest || false} onChange={e => updateOption("filmRequest", e.target.checked)} />
                            <span>별도 필름 (+1만)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                            <input type="checkbox" checked={spec.options.verticalDivide || false} onChange={e => updateOption("verticalDivide", e.target.checked)} />
                            <span>세로 분할 (+1만)</span>
                        </label>
                    </div>

                    {/* --- MATERIAL SELECTION UI (COLLAPSIBLE CARD) --- */}
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsMaterialsOpen(!isMaterialsOpen)}
                                    className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1"
                                >
                                    {isMaterialsOpen ? "▼ 자재 목록 접기" : "▶ 자재 추가/변경"}
                                </button>
                            </div>

                            <label className={`flex gap-1.5 items-center text-xs font-bold cursor-pointer select-none ${useRecommendedMaterials ? 'text-indigo-600' : 'text-slate-400'}`}>
                                <input
                                    type="checkbox"
                                    checked={useRecommendedMaterials}
                                    onChange={(e) => setUseRecommendedMaterials(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                자동 추천 켜기
                            </label>
                        </div>

                        {/* Collapsible Content */}
                        {isMaterialsOpen && (
                            <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

                                {!useRecommendedMaterials && (
                                    <div className="p-2.5 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100 mb-3">
                                        ✨ 자동 추천이 꺼져있습니다. 아래에서 체크한 자재만 원가에 포함됩니다.
                                    </div>
                                )}

                                {MATERIAL_GROUPS.map((g) => (
                                    <div key={g.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 border-b border-slate-200">
                                            {g.title}
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {g.keys.map((k) => {
                                                const item = MISOTECH_MATERIALS_2024_04[k];
                                                if (!item) return null;

                                                const sel = getSelection(k);
                                                const enabled = (sel?.enabled ?? false);

                                                return (
                                                    <div key={k} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${enabled ? 'bg-white border border-indigo-100 shadow-sm' : 'hover:bg-slate-100'}`}>
                                                        {/* Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={enabled}
                                                            onChange={(e) => toggleMaterial(k, e.target.checked)}
                                                            className="w-4 h-4 bg-white border-slate-300 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                        />

                                                        {/* Label info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm font-bold truncate ${enabled ? 'text-slate-900' : 'text-slate-500'}`}>
                                                                {item.label}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {item.unit} {item.note && `· ${item.note}`}
                                                            </div>
                                                        </div>

                                                        {/* Qty Input (Only visible/enabled if checked) */}
                                                        {enabled && (
                                                            <div className="w-20 shrink-0">
                                                                {item.unit === "M" ? (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            min={0}
                                                                            value={sel?.meters ?? 1}
                                                                            onChange={(e) => upsertSelection(k, { meters: Number(e.target.value) })}
                                                                            className="w-full py-1 pl-2 pr-6 text-right text-xs font-bold border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                        />
                                                                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">m</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="1"
                                                                            min={0}
                                                                            value={sel?.qty ?? 1}
                                                                            onChange={(e) => upsertSelection(k, { qty: Number(e.target.value) })}
                                                                            className="w-full py-1 pl-2 pr-6 text-right text-xs font-bold border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                        />
                                                                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">개</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* === OUTPUT SECTION === */}
                <div className="space-y-6">

                    {/* Cost Card */}
                    <div className={`rounded-xl shadow-lg border-2 p-6 flex flex-col justify-between h-[320px]
                        ${result.success ? "bg-white border-indigo-100" : "bg-red-50 border-red-200"}`}>

                        <div>
                            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2 border-b pb-3 mb-4">
                                {result.success ? <CheckCircle className="text-green-500" size={20} /> : <AlertTriangle className="text-red-500" size={20} />}
                                {result.success ? "계산 완료 (매입 원가)" : "확인 필요"}
                            </h2>

                            {!result.success && (
                                <div className="p-3 bg-red-100/50 text-red-700 text-sm font-bold rounded-lg mb-4">
                                    {result.messages[0]}
                                    {result.messages.length > 1 && <span className="text-[10px] block mt-1">+ 그 외 {result.messages.length - 1}건</span>}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500">기본 매입단가</span>
                                    <span className="text-base font-bold text-slate-700">{result.baseCost.toLocaleString()} 원</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500">옵션 합계</span>
                                    <span className="text-base font-bold text-slate-700">+ {result.optionCost.toLocaleString()} 원</span>
                                </div>

                                {/* Active Options List (Chips) */}
                                {result.messages.length > 0 && result.success && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {result.messages.map((m, i) => (
                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-dashed border-slate-300">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-slate-400 mb-1">최종 매입원가 (VAT 별도)</span>
                                <span className="text-xs text-slate-400">관리자용</span>
                            </div>
                            <div className="text-4xl font-black text-indigo-900 text-right mt-1">
                                {result.totalCost.toLocaleString()}
                                <span className="text-2xl font-bold text-slate-400 ml-1">원</span>
                            </div>
                        </div>
                    </div>

                    {/* Profit Card */}
                    <div className="bg-slate-800 rounded-xl p-6 text-white shadow-xl">
                        <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                            💰 마진 시뮬레이터 (매입원가 상세)
                        </h3>

                        {/* Cost Breakdown List */}
                        <div className="space-y-2 mb-6 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">기본 매입단가</span>
                                <span>{result.baseCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">옵션 합계(자재 제외)</span>
                                <span>{result.optionCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-yellow-300 font-bold">
                                <span className="text-yellow-300/80">자재비 합계</span>
                                <span>{result.materialCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-600 font-bold">
                                <span className="text-slate-300">총 매입원가</span>
                                <span>{result.totalCost.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-600">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">희망 소비자 판매가 (직접 입력)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500"
                                        placeholder="0"
                                        value={salesPrice || ''}
                                        onChange={e => setSalesPrice(Number(e.target.value))}
                                    />
                                    <span className="absolute right-4 top-4 text-sm text-slate-400 font-bold">원</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-slate-400 mb-1">예상 마진</div>
                                    <div className={`text-2xl font-black ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {margin.toLocaleString()}원
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 mb-1">마진율</div>
                                    <div className={`text-2xl font-black ${Number(marginRate) >= 30 ? 'text-emerald-400' : Number(marginRate) >= 15 ? 'text-blue-400' : Number(marginRate) > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {marginRate}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Sales Price Management Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-4 relative overflow-hidden">
                        {loadingPrice && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-sm">
                                <div className="text-sm font-bold text-slate-500 animate-pulse">단가 로딩중...</div>
                            </div>
                        )}

                        <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                            🏢 판매단가 관리 (공식)
                            {isPublished ?
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">운영중</span> :
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">대기중</span>
                            }
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">기준 판매가 (Sale Base)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0"
                                        value={dbSaleBase}
                                        onChange={(e) => setDbSaleBase(Number(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">원</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    * 옵션/자재비 별도 (자동 가산됨)
                                </p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">기준 판매가</span>
                                    <span className="font-bold">{dbSaleBase.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">옵션/자재</span>
                                    <span className="font-bold text-indigo-600">+ {(result.optionCost + result.materialCost).toLocaleString()}</span>
                                </div>
                                <div className="border-t border-slate-200 my-1"></div>
                                <div className="flex justify-between text-base font-black text-slate-800">
                                    <span>최종 판매가</span>
                                    <span>{(dbSaleBase + result.optionCost + result.materialCost).toLocaleString()} 원</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">관리 메모</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                    placeholder="단가 책정 사유 등"
                                    value={dbMemo}
                                    onChange={(e) => setDbMemo(e.target.value)}
                                />
                            </div>

                            {/* Advanced Options Toggle */}
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-700 transition-colors flex items-center justify-between"
                            >
                                <span>⚙️ 고급 옵션 {showAdvanced ? "접기" : "펼치기"}</span>
                                <span className="text-xs">{showAdvanced ? "▲" : "▼"}</span>
                            </button>

                            {/* Advanced Options Section */}
                            {showAdvanced && (
                                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    {/* Color */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-800 mb-1">색상</label>
                                        <select
                                            value={saleColor}
                                            onChange={(e) => setSaleColor(e.target.value as SaleColor)}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900"
                                        >
                                            <option value="WHITE">화이트</option>
                                            <option value="BLACK">블랙</option>
                                            <option value="OTHER">기타</option>
                                        </select>
                                    </div>

                                    {/* Design ID */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-800 mb-1">디자인 ID</label>
                                        <input
                                            type="text"
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900"
                                            placeholder="선택사항"
                                            value={designId}
                                            onChange={(e) => setDesignId(e.target.value)}
                                        />
                                    </div>

                                    {/* Date Range */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-800 mb-1">시작일</label>
                                            <input
                                                type="date"
                                                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900"
                                                value={startsAt}
                                                onChange={(e) => setStartsAt(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-800 mb-1">종료일</label>
                                            <input
                                                type="date"
                                                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900"
                                                value={endsAt}
                                                onChange={(e) => setEndsAt(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-800 mb-1">우선순위 (낮을수록 우선)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900"
                                            value={priority}
                                            onChange={(e) => setPriority(Number(e.target.value))}
                                        />
                                    </div>

                                    {/* Discount Rules */}
                                    <div className="border-t border-slate-300 pt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-800">할인/이벤트 규칙</label>
                                            <button
                                                onClick={() => setDiscountRules([...discountRules, {
                                                    name: "",
                                                    type: "AMOUNT",
                                                    value: 0,
                                                    target: "BASE_ONLY",
                                                    stackable: false
                                                }])}
                                                className="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600"
                                            >
                                                + 규칙 추가
                                            </button>
                                        </div>

                                        {discountRules.length === 0 && (
                                            <div className="text-xs text-slate-400 text-center py-2">규칙 없음</div>
                                        )}

                                        {discountRules.map((rule, idx) => (
                                            <div key={idx} className="p-2 bg-white rounded border border-slate-200 mb-2 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <input
                                                        type="text"
                                                        placeholder="규칙 이름"
                                                        className="flex-1 border border-slate-300 rounded p-1 text-xs mr-2 text-slate-900"
                                                        value={rule.name}
                                                        onChange={(e) => {
                                                            const updated = [...discountRules];
                                                            updated[idx].name = e.target.value;
                                                            setDiscountRules(updated);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setDiscountRules(discountRules.filter((_, i) => i !== idx))}
                                                        className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        className="border border-slate-300 rounded p-1 text-xs text-slate-900"
                                                        value={rule.type}
                                                        onChange={(e) => {
                                                            const updated = [...discountRules];
                                                            updated[idx].type = e.target.value as any;
                                                            setDiscountRules(updated);
                                                        }}
                                                    >
                                                        <option value="AMOUNT">정액 할인</option>
                                                        <option value="PERCENT">정률 할인</option>
                                                        <option value="COUPON_CODE">쿠폰 코드</option>
                                                    </select>

                                                    <input
                                                        type="number"
                                                        placeholder={rule.type === "PERCENT" ? "%" : "원"}
                                                        className="border border-slate-300 rounded p-1 text-xs text-slate-900"
                                                        value={rule.value}
                                                        onChange={(e) => {
                                                            const updated = [...discountRules];
                                                            updated[idx].value = Number(e.target.value);
                                                            setDiscountRules(updated);
                                                        }}
                                                    />
                                                </div>

                                                <select
                                                    className="w-full border border-slate-300 rounded p-1 text-xs text-slate-900"
                                                    value={rule.target}
                                                    onChange={(e) => {
                                                        const updated = [...discountRules];
                                                        updated[idx].target = e.target.value as any;
                                                        setDiscountRules(updated);
                                                    }}
                                                >
                                                    <option value="BASE_ONLY">기준가만</option>
                                                    <option value="BASE_PLUS_OPTIONS">기준+옵션</option>
                                                    <option value="FINAL_TOTAL">최종가</option>
                                                </select>

                                                <label className="flex items-center text-xs">
                                                    <input
                                                        type="checkbox"
                                                        className="mr-1"
                                                        checked={rule.stackable}
                                                        onChange={(e) => {
                                                            const updated = [...discountRules];
                                                            updated[idx].stackable = e.target.checked;
                                                            setDiscountRules(updated);
                                                        }}
                                                    />
                                                    중복 허용
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => handleSavePrice(false)}
                                    className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    임시 저장
                                </button>
                                <button
                                    onClick={() => handleSavePrice(true)}
                                    className="px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors"
                                >
                                    확정 (운영반영)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
