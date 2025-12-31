"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calculator, Camera, Check, ChevronDown, Eraser, Info, Mic, RotateCcw, Send, Settings, X, ImageIcon, Search, Phone, User, MapPin, Eye, CloudUpload, MessageCircle, Globe, ShoppingBag, Youtube, Instagram, Facebook, Smartphone, Languages, AlertTriangle, Volume2, MicOff } from "lucide-react";
import VoiceInput from "@/app/components/VoiceInput";
import NaverMapPicker from "@/app/components/NaverMapPicker";
import AddressSearchModal from "@/app/components/AddressSearchModal";
import { ParsedMeasurement } from "@/app/lib/voiceMeasurement";

// TikTok Icon Component
function TikTokIcon({ size = 20, className = "" }: { size?: number, className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.394 6.394 0 0 0-5.394 5.394 6.395 6.395 0 0 0 6.394 6.394 6.395 6.395 0 0 0 6.394-6.394v-6.165a8.32 8.32 0 0 0 4.847 1.428V6.687h-.008a4.792 4.792 0 0 1 .008-.001z" />
        </svg>
    );
}
import { useGlobalStore } from "@/app/lib/store-context";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient"; // NEW
import DoorModel, { DoorType, FrameColor, GlassType } from "@/app/components/Shop/AR/DoorModel";
import { usePriceSystem } from "@/app/hooks/usePriceSystem";
import { useFieldAI, AnalysisResult } from "@/app/hooks/useFieldAI"; // NEW
import AIValidationModal from "@/app/components/Field/AIValidationModal"; // NEW
import { useTheme } from "@/app/components/providers/ThemeProvider";
import PayhereLinkPaymentBox from "@/app/components/PayhereLinkPaymentBox"; // NEW Payment
import TranslatePanel from "@/app/components/TranslatePanel"; // NEW Translation
import { calculateMisoCost, mapGlassToGroup, MisoProductType, DoorSpec } from "@/app/lib/miso_cost_data"; // Miso Logic
import DemoGuard from "@/app/components/DemoGuard"; // Demo Limit
import { useDemoLimit } from "@/app/hooks/useDemoLimit"; // Demo Limit Hook

// --- Miso Helper ---
function mapToMisoType(category: string, detail: string): MisoProductType | null {
    if (category === "자동문") {
        if (detail.includes("3연동")) return "3T_AUTO";
        if (detail.includes("원슬라이딩")) return "1S_AUTO";
    }
    if (category === "수동문") {
        if (detail.includes("3연동")) return "3T_MANUAL";
        if (detail.includes("원슬라이딩")) return "1S_MANUAL";
        if (detail.includes("스윙")) return "SEMI_SWING"; // Assuming Semi-Swing for now
        // if (detail.includes("여닫이")) return "HOPE"; // Need specific logic if Hope
    }
    if (category === "파티션") return "FIX";
    return null;
}

// WALKIETALKIE HELPER
function makeRoomId(prefix: string) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    // @ts-ignore
    const rand = (crypto?.randomUUID?.() || Math.random().toString(16).slice(2)).slice(0, 8);
    return `${prefix}-${y}${m}${day}-${rand}`;
}

// --- Types ---

type DoorCategory = "자동문" | "수동문" | "파티션";
type SendTarget = "office" | "customer" | "both";
type SlidingMode = "벽부형" | "오픈형";
type OpenDirection = "좌→우 열림" | "우→좌 열림";

const DOOR_OPTIONS: Record<DoorCategory, string[]> = {
    자동문: ["3연동 도어", "원슬라이딩 도어"],
    수동문: ["3연동 중문", "원슬라이딩 도어", "2슬라이딩도어", "3슬라이딩 도어", "4슬라이딩도어", "회폐도어", "스윙도어"],
    파티션: ["1창", "2창"],
};

const GLASS_HIERARCHY = {
    "투명 유리": ["화이트 투명", "브론즈 투명", "다크그레이 투명"],
    "샤틴 유리": ["투명 샤틴", "브론즈 샤틴", "다크그레이 샤틴"],
    "불투명 유리": ["미스트 유리", "아쿠아 유리", "무늬 유리"],
    "특수 유리": ["망입 유리", "반사경 유리"],
} as const;

// Flatten for fallback
const ALL_GLASS_OPTIONS = Object.values(GLASS_HIERARCHY).flat();

const DESIGN_OPTIONS = [
    { id: "design-01", name: "슬림 블랙 프레임", color: "블랙" },
    { id: "design-02", name: "화이트 프레임", color: "화이트" },
    { id: "design-03", name: "브론즈 톤 프레임", color: "브론즈" },
    { id: "design-04", name: "모던 그레이 프레임", color: "그레이" },
] as const;

const DESIGN_PLACEHOLDER = "https://placehold.co/100x150?text=Design";

type Preview = { file: File; url: string };

// --- Logic Generators ---
// Updated per user request: One Sliding (W3/H5), Others (W3/H3)
function getRecommendedPoints(detail: string) {
    if (detail.includes("원슬라이딩")) return { w: 3, h: 5 };
    if (detail.includes("3연동") || detail.includes("회폐도어") || detail.includes("스윙도어")) return { w: 3, h: 3 };
    // Default fallback
    return { w: 3, h: 3 };
}

function parsePositiveInt(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    return Math.trunc(n);
}

const getValidNumbers = (values: string[]) => values.map(parsePositiveInt).filter((n): n is number => typeof n === "number" && n > 0);

function getConfirmedValue(values: string[], mode: "min" | "max") {
    const nums = getValidNumbers(values);
    if (nums.length === 0) return null;
    return mode === "max" ? Math.max(...nums) : Math.min(...nums);
}

function getRange(values: string[]) {
    const nums = getValidNumbers(values);
    if (nums.length < 2) return 0;
    return Math.max(...nums) - Math.min(...nums);
}

function normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, "");
}

async function openShareSheet(text: string) {
    try {
        if (typeof navigator !== "undefined" && navigator.share) {
            await navigator.share({ text });
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function openSmsComposer(toPhone: string, body: string) {
    const to = normalizePhone(toPhone);
    const encoded = encodeURIComponent(body);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const url = isIOS ? `sms:${to}&body=${encoded}` : `sms:${to}?body=${encoded}`;
    window.location.href = url;
}

function FieldCorrectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { recordAction } = useDemoLimit(); // Demo Action Limit
    const leadId = searchParams.get("leadId"); // NEW: Lead ID from URL
    const { orders, updateOrder } = useGlobalStore();
    const { theme } = useTheme(); // Hook for Design System Overrides

    // Price Sync
    const { syncPrices, version, isSyncing, prices } = usePriceSystem();

    // AI System
    const { analyze } = useFieldAI(); // NEW
    const [aiResult, setAiResult] = useState<AnalysisResult | null>(null); // NEW

    useEffect(() => {
        syncPrices();
    }, []);

    // --- System Loading ---
    const [targetOrder, setTargetOrder] = useState<any>(null);
    const [showComparisonModal, setShowComparisonModal] = useState(false);

    // --- Field State ---
    const [widthPoints, setWidthPoints] = useState<string[]>(Array(5).fill(""));
    const [heightPoints, setHeightPoints] = useState<string[]>(Array(8).fill(""));

    const [category, setCategory] = useState<DoorCategory>("자동문");
    const [detail, setDetail] = useState<string>(DOOR_OPTIONS["자동문"][0]);
    // Default glass
    const [glass, setGlass] = useState<string>("화이트 투명");
    const [viewGlassCategory, setViewGlassCategory] = useState<keyof typeof GLASS_HIERARCHY>("투명 유리");
    const [doorColor, setDoorColor] = useState(""); // Fix: Add missing state
    const [addMaterials, setAddMaterials] = useState(""); // Fix: Add missing state

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    const [siteMemo, setSiteMemo] = useState("");
    const [openDirection, setOpenDirection] = useState<OpenDirection>("좌→우 열림");

    const [designId, setDesignId] = useState<string>(DESIGN_OPTIONS[0].id);
    const [slidingMode, setSlidingMode] = useState<SlidingMode>("벽부형");

    // NEW: Construction Request Date
    const [requestDate, setRequestDate] = useState("");
    const [requestTime, setRequestTime] = useState<"오전" | "오후">("오전");

    const [previews, setPreviews] = useState<Preview[]>([]);
    const [pendingTarget, setPendingTarget] = useState<SendTarget | null>(null); // NEW for AI Flow
    const [estimateId] = useState(() => `EST-${Date.now()}`); // Simple ID for payment

    // Walkie Talkie State
    const ROOM_KEY = "limsdoor_walkie_room_v1";
    const NAME_KEY = "limsdoor_walkie_name_v1";
    const [walkieRoomId, setWalkieRoomId] = useState<string>("");
    const [walkieName, setWalkieName] = useState<string>("");

    // Map Picker State
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [addressLat, setAddressLat] = useState<number | null>(null);
    const [addressLng, setAddressLng] = useState<number | null>(null);
    const [loadingGPS, setLoadingGPS] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false); // NEW

    // --- Effects ---
    // Walkie Talkie Init
    useEffect(() => {
        const savedRoom = localStorage.getItem(ROOM_KEY);
        if (savedRoom) {
            setWalkieRoomId(savedRoom);
        } else {
            const newRoom = makeRoomId("field");
            localStorage.setItem(ROOM_KEY, newRoom);
            setWalkieRoomId(newRoom);
        }

        // 이름(실측자) 자동 채움
        const savedName = localStorage.getItem(NAME_KEY);
        setWalkieName(savedName || "실측자");
    }, []);

    const saveWalkieName = (name: string) => {
        setWalkieName(name);
        localStorage.setItem(NAME_KEY, name);
    };

    // 0. Handle AR Return Data
    useEffect(() => {
        if (!searchParams) return;
        const w = searchParams.get("width");
        const h = searchParams.get("height");

        if (w && w !== "0") {
            setWidthPoints(prev => { const n = [...prev]; n[0] = w; return n; });
        }
        if (h && h !== "0") {
            setHeightPoints(prev => { const n = [...prev]; n[0] = h; return n; });
        }

        const risk = searchParams.get("riskLevel");
        const extra = searchParams.get("extraMaterial");
        if (risk || extra) {
            const riskTxt = risk ? `[AR진단: ${risk}]` : "";
            const extraTxt = extra === "true" ? " *추가자재 필요 감지됨" : "";
            setSiteMemo(prev => {
                if (prev.includes(riskTxt)) return prev;
                return (prev + `\n${riskTxt}${extraTxt}`).trim();
            });
        }
    }, [searchParams]);

    // 1. Load System Data
    useEffect(() => {
        const arOrder = [...orders].reverse().find(o => o.status === "AR_SELECTED");
        const activeOrder = arOrder || {
            id: "demo-order",
            arData: { consumer: { doorType: "3연동", width: 1250, height: 2100 } },
            items: [{ detail: "3연동" }]
        };
        setTargetOrder(activeOrder);
    }, [orders]);

    // 1.5. Link Lead & Estimate (NEW)
    useEffect(() => {
        if (leadId && estimateId) {
            fetch("/api/marketing/hooks/link-estimate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadId, estimateId }),
            }).catch(e => console.error("Link Estimate Error:", e));
        }
    }, [leadId, estimateId]);

    // 2. Logic Effects
    useEffect(() => {
        if (DOOR_OPTIONS[category] && !DOOR_OPTIONS[category].includes(detail)) {
            setDetail(DOOR_OPTIONS[category][0]);
        }
    }, [category]);

    useEffect(() => {
        if (detail.includes("원슬라이딩")) setSlidingMode("벽부형");
    }, [detail]);

    useEffect(() => {
        return () => { previews.forEach((p) => URL.revokeObjectURL(p.url)); };
    }, []);

    // --- Computed ---
    const selectedDesign = useMemo(() => DESIGN_OPTIONS.find((d) => d.id === designId), [designId]);

    // NEW: Distinct Min Points for Width and Height
    const recPoints = useMemo(() => getRecommendedPoints(detail), [detail]);

    // One Sliding Logic
    const isOneSliding = detail.includes("원슬라이딩");
    const confirmedWidth = useMemo(() => getConfirmedValue(widthPoints, isOneSliding ? "max" : "min"), [widthPoints, isOneSliding]);
    const confirmedHeight = useMemo(() => getConfirmedValue(heightPoints, "min"), [heightPoints]);

    // Deviation Logic
    const widthRange = useMemo(() => getRange(widthPoints), [widthPoints]);

    // Warning
    const warning = useMemo(() => {
        if (!confirmedWidth) return null;
        if (widthRange >= 10) {
            return {
                level: "critical",
                msg: `🚨 오차 ${widthRange}mm: 추가 마감재 사용 적극 권장 (추가 비용 발생)`,
                tts: "오차가 10밀리미터 이상입니다. 추가 마감재 사용을 적극 권장하며, 추가 비용이 발생할 수 있습니다."
            };
        }
        if (widthRange >= 5) {
            return {
                level: "warning",
                msg: `⚠️ 오차 ${widthRange}mm: 실리콘 및 추가 자재 필요 (추가 비용 발생 가능)`,
                tts: "오차가 5밀리미터 이상입니다. 실리콘 및 추가 자재가 필요하며, 추가 비용이 발생할 수 있습니다."
            };
        }
        return {
            level: "safe",
            msg: `✅ 오차 ${widthRange}mm: 실리콘 마감 처리 가능`,
            tts: "" // Safe condition - no voice warning needed
        };
    }, [widthRange, isOneSliding, confirmedWidth]);

    // --- NEW: Miso Sales Price Integration ---
    const [misoPriceData, setMisoPriceData] = useState<{ base: number, total: number, options: number, isMiso: boolean }>({ base: 0, total: 0, options: 0, isMiso: false });

    // Effect: Fetch Miso Price whenever specs change
    useEffect(() => {
        const misoType = mapToMisoType(category, detail);
        if (!misoType || !confirmedWidth || !confirmedHeight) {
            setMisoPriceData({ base: 0, total: 0, options: 0, isMiso: false });
            return;
        }

        const abort = new AbortController();
        async function fetchMiso() {
            try {
                // 1. Client-Side Option Calculation (to get Option Cost & Keys)
                // We need to construct a Spec to get the width key & option cost
                const spec: DoorSpec = {
                    type: misoType!,
                    width: confirmedWidth!,
                    height: confirmedHeight!,
                    glass: glass,
                    isKnockdown: false, // Field defaults to Finished? Or Install? usually finished logic here
                    coating: "FLUORO", // Defaulting to Fluoro for now logic? Or add UI?
                    // options...
                    options: {
                        verticalDivide: false, // Default
                    }
                };

                // We use calculateMisoCost to get the 'appliedWidthKey' and 'optionCost'
                const calc = calculateMisoCost(spec);

                if (!calc.appliedWidthKey) {
                    setMisoPriceData({ base: 0, total: 0, options: 0, isMiso: false });
                    return;
                }

                // 2. Fetch Published Price from API
                const params = new URLSearchParams({
                    product_type: misoType!,
                    coating: "FLUORO", // Default
                    glass_group: mapGlassToGroup(glass),
                    is_knockdown: "false",
                    width_key: String(calc.appliedWidthKey),
                    variant: calc.appliedVariant ?? "",
                    published: "true" // CRITICAL: Only confirmed prices
                });

                const res = await fetch(`/api/admin/miso-sale-prices?${params.toString()}`, { signal: abort.signal });
                const json = await res.json();

                if (json.ok && json.data && json.data.length > 0) {
                    const row = json.data[0];
                    const saleBase = row.sale_base ?? 0;
                    // Formula: SaleBase + OptionCost (from calc)
                    // Note: calc.optionCost includes materials etc.
                    // If user set a specific policy, we might handle it. For "Option A", it is Base + Options.
                    const total = saleBase + calc.optionCost;
                    setMisoPriceData({ base: saleBase, total: total, options: calc.optionCost, isMiso: true });
                } else {
                    setMisoPriceData({ base: 0, total: 0, options: 0, isMiso: false });
                }
            } catch (e) {
                // ignore
            }
        }
        fetchMiso();
        return () => abort.abort();
    }, [category, detail, confirmedWidth, confirmedHeight, glass]);


    // NEW: Estimate Price & Fees
    const INSTALLATION_FEES: Record<string, number> = {
        "3연동": 130000,
        "원슬라이딩": 160000,
        "회폐도어": 120000,
        "스윙도어": 120000,
        "파티션": 100000, // 1조 기준 (기본)
    };

    const { estimatedPrice, installFee, materialCost } = useMemo(() => {
        let price = 0;

        // Priority 1: Miso Published Price
        if (misoPriceData.isMiso) {
            price = misoPriceData.total;
        }
        // Priority 2: Generic Price System
        else if (prices && prices.length > 0) {
            const matched = prices.find(p => p.item_name === detail);
            if (matched) price = Number(matched.sales_price);
        }

        // Calculate Fee based on Detail or Category
        let fee = 0;
        // Check partial match for installation fee keys
        const feeKey = Object.keys(INSTALLATION_FEES).find(k => detail.includes(k)) ||
            Object.keys(INSTALLATION_FEES).find(k => category.includes(k));

        if (feeKey) {
            fee = INSTALLATION_FEES[feeKey];
            // Special case logic for Partition 2 sets? 
            // Currently no clear UI for "sets", user just said "partition 1 set 100k, 2 sets 200k". 
            // We'll stick to 100k base for now unless detail has specific text like "2조".
        }

        // Material = Total - Fee. If Total < Fee, clamp to 0? Or allow negative?
        // Let's clam Material to 0 if price is missing.
        const material = Math.max(0, price - fee);

        return { estimatedPrice: price, installFee: fee, materialCost: material };
    }, [prices, detail, category, misoPriceData]);

    // Voice Effect
    useEffect(() => {
        if (!warning || !warning.tts) return;
        const timer = setTimeout(() => {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const ut = new SpeechSynthesisUtterance(warning.tts);
                ut.lang = "ko-KR";
                ut.rate = 1.0;
                window.speechSynthesis.speak(ut);
            }
        }, 1500); // Debounce
        return () => clearTimeout(timer);
    }, [warning]);

    // --- Voice Input Handler ---
    const handleApplyVoiceData = (data: ParsedMeasurement) => {
        // Get current filled counts
        const currentWidthCount = widthPoints.filter(p => p.trim() !== "").length;
        const currentHeightCount = heightPoints.filter(p => p.trim() !== "").length;

        // Apply width - find next empty slot
        if (data.widthMm) {
            setWidthPoints(prev => {
                const next = [...prev];
                const emptyIndex = next.findIndex(p => p.trim() === "");
                if (emptyIndex !== -1) {
                    next[emptyIndex] = String(data.widthMm);
                } else {
                    // Fallback to first slot if all filled
                    next[0] = String(data.widthMm);
                }
                return next;
            });
        }

        // Apply height - find next empty slot
        if (data.heightMm) {
            setHeightPoints(prev => {
                const next = [...prev];
                const emptyIndex = next.findIndex(p => p.trim() === "");
                if (emptyIndex !== -1) {
                    next[emptyIndex] = String(data.heightMm);
                } else {
                    // Fallback to first slot if all filled
                    next[0] = String(data.heightMm);
                }
                return next;
            });
        }

        // Apply door category
        if (data.doorCategory) {
            setCategory(data.doorCategory);
            // Set default door type for category if not specified
            if (!data.doorType) {
                setDetail(DOOR_OPTIONS[data.doorCategory][0]);
            }
        }

        // Apply door type (match with existing options)
        if (data.doorType) {
            const matchedType = DOOR_OPTIONS[category].find(
                opt => opt.includes(data.doorType!) || data.doorType!.includes(opt)
            );
            if (matchedType) {
                setDetail(matchedType);
            }
        }

        // Apply glass type
        if (data.glassType) {
            setGlass(data.glassType);
        }

        // Apply open direction
        if (data.openDirection) {
            setOpenDirection(data.openDirection);
        }

        // Apply install location to memo
        if (data.installLocation) {
            setSiteMemo(prev => {
                const locationText = `[시공위치: ${data.installLocation}]`;
                return prev ? `${prev}\n${locationText}` : locationText;
            });
        }

        // Add additional memo
        if (data.memoAdd) {
            setSiteMemo(prev => prev ? `${prev}\n${data.memoAdd}` : data.memoAdd!);
        }
    };

    // --- Map Handler ---
    const handleMapConfirm = (data: { address: string; lat: number; lng: number }) => {
        setCustomerAddress(data.address);
        setAddressLat(data.lat);
        setAddressLng(data.lng);
        setShowMapPicker(false);
    };

    // --- GPS Auto Address Handler ---
    const handleAutoFillAddress = async () => {
        if (!navigator.geolocation) {
            alert("이 기기에서 위치 기능을 사용할 수 없습니다.");
            return;
        }

        setLoadingGPS(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    // Reverse geocoding to get address
                    const res = await fetch(`/api/naver/reverse-geocoding?lat=${lat}&lng=${lng}`);
                    const data = await res.json();

                    if (data.ok && data.address) {
                        setCustomerAddress(data.address);
                        setAddressLat(lat);
                        setAddressLng(lng);
                        alert(`✅ 현재 위치 주소가 자동으로 입력되었습니다.`);
                    } else {
                        alert("주소를 찾을 수 없습니다. 수동으로 입력하거나 지도에서 선택해주세요.");
                    }
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                    alert("주소 조회 중 오류가 발생했습니다.");
                } finally {
                    setLoadingGPS(false);
                }
            },
            (error) => {
                setLoadingGPS(false);
                let message = "위치 정보를 가져올 수 없습니다.";
                if (error.code === 1) {
                    message = "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
                }
                alert(message);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    };

    // --- Handlers ---
    const onPickFiles = (files: FileList | null) => {
        if (!files) return;
        const next: Preview[] = [];
        for (const f of Array.from(files)) {
            if (!f.type.startsWith("image/")) continue;
            next.push({ file: f, url: URL.createObjectURL(f) });
        }
        setPreviews((prev) => [...prev, ...next]);
    };

    const removePreview = (idx: number) => {
        setPreviews((prev) => {
            const target = prev[idx];
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const setPoint = (kind: "w" | "h", index: number, value: string) => {
        if (kind === "w") {
            setWidthPoints((prev) => { const next = [...prev]; next[index] = value; return next; });
        } else {
            setHeightPoints((prev) => { const next = [...prev]; next[index] = value; return next; });
        }
    };

    // --- Actions ---
    const buildPayload = () => {
        const warnMsg = warning && warning.level !== "safe" ? `\n[주의] ${warning.msg}` : "";
        return {
            widthMm: confirmedWidth,
            heightMm: confirmedHeight,
            widthPoints: widthPoints.map((v) => parsePositiveInt(v)),
            heightPoints: heightPoints.map((v) => parsePositiveInt(v)),
            minPointsW: recPoints.w,
            minPointsH: recPoints.h,
            category,
            detail,
            glass,
            color: doorColor,
            addMaterials,
            openDirection,
            slidingMode: detail.includes("원슬라이딩") ? slidingMode : null,
            design: selectedDesign ? { id: selectedDesign.id, name: selectedDesign.name } : null,
            customer: { name: customerName.trim(), phone: customerPhone.trim(), address: customerAddress.trim() },
            memo: (siteMemo + warnMsg).trim(),
            photos: previews.map((p) => ({ name: p.file.name, type: p.file.type, size: p.file.size })),
            requestDate,
            requestTime,
            createdAt: new Date().toISOString(),
        };
    };

    const buildSummaryText = (payload: any) => {
        const slidingText = payload.slidingMode ? `\n- 원슬라이딩 형태: ${payload.slidingMode}` : "";
        return (
            `✅ 실측 정보\n` +
            `- 고객: ${payload.customer.name}\n` +
            `- 연락처: ${payload.customer.phone}\n` +
            `- 주소: ${payload.customer.address}\n` +
            `- 확정 가로: ${payload.widthMm}mm\n` +
            `- 확정 세로: ${payload.heightMm}mm\n` +
            `- 문종류: ${payload.category} / ${payload.detail}\n` +
            `- 유리: ${payload.glass}\n` +
            `- 색상: ${payload.color || "-"}\n` +
            `- 열림 방향: ${payload.openDirection}\n` +
            (payload.addMaterials ? `- 추가부자재: ${payload.addMaterials}\n` : "") +
            `- 문종류: ${payload.category} / ${payload.detail}\n` +
            `- 유리: ${payload.glass}\n` +
            `- 열림 방향: ${payload.openDirection}\n` +
            `- 디자인: ${payload.design?.name ?? "-"}${slidingText}\n` +
            `- 시공요청일: ${payload.requestDate ? `${payload.requestDate} (${payload.requestTime})` : "미지정"}\n` +
            (payload.memo ? `- 비고: ${payload.memo}\n` : "") +
            `- 현장사진: ${payload.photos.length}장`
        );
    };

    const sendOfficeToKakaoShareOrClipboard = async (text: string) => {
        const officeText = `📌[림스도어 사무실 전송]\n\n${text}`;
        const shared = await openShareSheet(officeText);
        if (shared) return;
        try {
            await navigator.clipboard.writeText(officeText);
            alert("사무실 전송: 내용이 클립보드에 복사되었습니다.\n카카오톡(사무실)에 붙여넣기 후 전송하세요.");
        } catch {
            alert("사무실 전송: 공유/복사가 실패했습니다.");
        }
    };

    const send = async (target: SendTarget, mode: "full" | "db_only" | "share_only" = "full") => {
        const missing: string[] = [];
        if (!customerName.trim()) missing.push("고객명");
        if (!customerPhone.trim()) missing.push("연락처");
        if (!customerAddress.trim()) missing.push("주소");

        const requiredW = widthPoints.slice(0, recPoints.w);
        const requiredH = heightPoints.slice(0, recPoints.h);

        if (!requiredW.every((v) => parsePositiveInt(v) !== null)) missing.push(`가로 포인트(최소 ${recPoints.w}개)`);
        if (!requiredH.every((v) => parsePositiveInt(v) !== null)) missing.push(`세로 포인트(최소 ${recPoints.h}개)`);

        if (typeof confirmedWidth !== "number" || confirmedWidth <= 0) missing.push("확정 가로값");
        if (typeof confirmedHeight !== "number" || confirmedHeight <= 0) missing.push("확정 세로값");
        if (detail.includes("원슬라이딩") && !slidingMode) missing.push("원슬라이딩 형태");

        if (missing.length > 0) {
            alert(`입력이 부족합니다:\n- ${missing.join("\n- ")}`);
            return;
        }

        // --- Validation ---
        if (!confirmedWidth || !confirmedHeight) {
            alert("가로/세로 확정 사이즈가 없습니다. (계산기 아이콘 클릭)");
            return;
        }

        // --- Demo Limit Check ---
        if (!recordAction()) {
            alert("일일 데모 사용 한도(5회)를 초과했습니다.\n내일 다시 이용하거나 관리자 모드에서 개발자 모드를 켜주세요.");
            return;
        }

        // --- AI Validation ---
        if (!aiResult) {
            // ... (existing AI logic)
            // Recalculate analysis
            const analysis = analyze({
                category,
                detail: detail || category,
                widthPoints: getValidNumbers(widthPoints),
                heightPoints: getValidNumbers(heightPoints),
                minPointsW: recPoints.w,
                minPointsH: recPoints.h
            });

            if (analysis.status !== "ok") {
                setAiResult(analysis);
                setPendingTarget(target);
                return;
            }
        }

        // 0. Upload Photos (if any)
        const photoUrls: { name: string, url: string }[] = [];
        if (previews.length > 0 && mode !== 'share_only') {
            try {
                // Dynamic import to avoid server-side issues
                const { createClient } = await import("@supabase/supabase-js");
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
                const supabase = createClient(supabaseUrl, supabaseKey);

                for (const p of previews) {
                    const ext = p.file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const filePath = `field_uploads/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('images') // Use 'images' bucket (common) or 'field_photos'
                        .upload(filePath, p.file);

                    if (uploadError) {
                        console.error("Photo upload failed:", uploadError);
                        continue;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('images')
                        .getPublicUrl(filePath);

                    photoUrls.push({ name: p.file.name, url: publicUrl });
                }
            } catch (e) {
                console.error("Photo upload process error:", e);
                // Continue without photos if upload fails (don't block quote)
            }
        }

        const payload = buildPayload();
        // Override photos with actual URLs
        if (photoUrls.length > 0) {
            payload.photos = photoUrls as any;
        }

        if (aiResult) {
            payload.memo += `\n[AI 기록] ${aiResult.message}`;
        }

        const summary = buildSummaryText(payload);

        // [SYSTEM Integration] Update Database & Save Quote
        // 1. Existing Demo/Mock Update (Always update local AR state)
        if (targetOrder && targetOrder.id !== "demo-order") {
            // ... existing mock update logic ...
            const fieldData = {
                width: payload.widthMm || 0,
                height: payload.heightMm || 0,
                diffW: 0,
                diffH: 0,
                memo: `[실측포인트] W:${payload.widthPoints.filter(Boolean).join('/')} | H:${payload.heightPoints.filter(Boolean).join('/')}\n${payload.memo}`,
                measurerName: "담당자",
                measuredAt: new Date().toISOString()
            };
            updateOrder(targetOrder.id, {
                arData: {
                    consumer: targetOrder.arData?.consumer || targetOrder.items[0]?.arScene,
                    field: fieldData,
                    status: "APPROVED"
                } as any,
                status: "MEASURED"
            });
        }

        // 2. [Real Database Save] (Run if mode is full or db_only)
        if (mode !== 'share_only') {
            try {
                const res = await fetch("/api/field/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    // Error handling
                    console.error(`DB Save Failed: ${res.status}`);
                    const errData = await res.json().catch(() => ({}));
                    alert(`프로그램 전송 실패\n서버 오류: ${res.status}\n${errData.error?.message || ''}`);
                } else {
                    console.log("Quote saved to DB");
                    if (mode === 'db_only' || target === 'office') {
                        // Force alert for office share
                        alert("✅ 프로그램(관리자) 전송이 완료되었습니다.");
                    }
                }
            } catch (e: any) {
                console.error("DB Save Network Error:", e);
                alert(`전송 실패 (네트워크 오류)\n${e.message}`);
            }
        }

        // 3. [Share / Send Logic] (Run if mode is full or share_only)
        if (mode !== 'db_only') {
            if (target === "office" || target === "both") {
                await sendOfficeToKakaoShareOrClipboard(summary);
                // Hook
                fetch("/api/marketing/hooks/measurement-done", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estimateId, payload: { by: "field/new", target } }),
                }).catch(console.error);
            }

            if (target === "customer" || target === "both") {
                openSmsComposer(payload.customer.phone, summary);
                // Hook
                fetch("/api/marketing/hooks/estimate-sent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estimateId, payload: { sentTo: "customer" } }),
                }).catch(console.error);
            }
        }

        setAiResult(null); // Reset
    };

    // ...

    {/* Actions */ }
    <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t flex gap-2 z-10 safe-bottom">
        <button onClick={() => setShowShareModal(true)}
            className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl active:scale-95 transition flex justify-center items-center gap-2">
            사무실 공유
        </button>
        <button onClick={() => send("both", "full")}
            className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition flex justify-center items-center gap-2">
            <Send size={18} className="-ml-1" />
            고객 전송 (+완료처리)
        </button>
    </div>

    {/* Office Share Selection Modal */ }
    {
        showShareModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-center mb-6">사무실 공유 방식 선택</h3>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                send("office", "db_only");
                                setShowShareModal(false);
                            }}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition"
                        >
                            <CloudUpload size={24} />
                            <div>
                                <div className="text-base">프로그램 전송</div>
                                <div className="text-[10px] font-normal opacity-70">관리자 페이지 저장 (DB)</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                send("office", "share_only");
                                setShowShareModal(false);
                            }}
                            className="w-full py-4 bg-yellow-400 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-yellow-500 transition"
                        >
                            <MessageCircle size={24} />
                            <div>
                                <div className="text-base">문자/카톡 공유</div>
                                <div className="text-[10px] font-normal opacity-70">텍스트 복사 및 공유창</div>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowShareModal(false)}
                        className="w-full mt-4 py-3 text-slate-400 font-medium hover:text-slate-600"
                    >
                        취소
                    </button>
                </div>
            </div>
        )
    }

    {/* === COMPARISON MODAL === */ }

    const handleConfirmAI = () => {
        if (aiResult && pendingTarget) {
            // Proceed with save
            send(pendingTarget);
        }
    };


    // --- Render Helpers ---
    const consumerW = targetOrder?.arData?.consumer?.width || 0;
    const consumerH = targetOrder?.arData?.consumer?.height || 0;
    const arDoorType = (targetOrder?.arData?.consumer?.doorType || "3연동") as DoorType;
    const fW = confirmedWidth || 0;
    const fH = confirmedHeight || 0;

    // --- LANDING PAGE STATE ---
    const [step, setStep] = useState<"LANDING" | "FORM">("LANDING");

    // Company Info State for Landing
    const [companyLinks, setCompanyLinks] = useState<{
        home?: string;
        mall?: string;
        youtube?: string;
        tiktok?: string;
        instagram?: string;
        facebook?: string;
    } | null>(null);
    const supabase = useMemo(() => createSupabaseBrowser(), []); // Ensure client exists

    // Auto-skip landing if returning from AR
    useEffect(() => {
        if (searchParams?.has("width") || searchParams?.has("height")) {
            setStep("FORM");
        }
    }, [searchParams]);

    // Fetch Company Links for Landing
    useEffect(() => {
        if (step !== "LANDING") return;

        async function fetchLinks() {
            try {
                // 1. User/Cookie Check
                const { data: { user } } = await supabase.auth.getUser();
                let companyId = null;

                if (user) {
                    const { data: profile } = await supabase.from("프로필").select("company_id").eq("id", user.id).single();
                    companyId = profile?.company_id;
                }

                if (!companyId) {
                    const cookie = document.cookie.split('; ').find(row => row.startsWith('company_id='));
                    if (cookie) companyId = cookie.split('=')[1];
                }

                if (companyId === 'demo') {
                    setCompanyLinks({
                        home: "https://example.com",
                        mall: "https://smartstore.naver.com",
                        youtube: "https://youtube.com",
                        instagram: "https://instagram.com",
                        tiktok: "https://tiktok.com",
                        facebook: "https://facebook.com"
                    });
                    return;
                }

                if (companyId) {
                    const { data } = await supabase
                        .from('회사들')
                        .select('"홈페이지", "쇼핑몰", "유튜브", "틱톡", "인스타그램", "페이스북"')
                        .eq('id', companyId)
                        .single();

                    if (data) {
                        const row = data as any;
                        const h = row['홈페이지']?.[0];
                        const m = row['쇼핑몰']?.[0];
                        setCompanyLinks({
                            home: h,
                            mall: m,
                            youtube: row['유튜브'],
                            tiktok: row['틱톡'],
                            instagram: row['인스타그램'],
                            facebook: row['페이스북']
                        });
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        fetchLinks();
    }, [step]);

    if (step === "LANDING") {
        const defaultBg = "url('https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=2574&auto=format&fit=crop')";
        const activeBg = theme?.background?.appBgImageUrl ? `url('${theme.background.appBgImageUrl}')` : defaultBg;

        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
                {/* Background Image: Dynamic or Default */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70 transition-all duration-500"
                    style={{ backgroundImage: activeBg }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>

                <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
                    {/* Icon uses Primary Color */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/30 animate-in zoom-in duration-500 bg-[var(--ui-primary)] text-white">
                        <span className="text-3xl">📐</span>
                    </div>

                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">현장 실측</h1>
                    <p className="text-slate-300 mb-10 font-medium">정확한 측정이 완벽한 시공을 만듭니다.</p>

                    <div className="w-full space-y-3 mb-8">
                        {/* Button uses White BG + Primary Text (Original Look) */}
                        <button
                            onClick={() => setStep("FORM")}
                            className="w-full py-4 bg-white rounded-btn-custom font-bold text-lg shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                            style={{
                                borderRadius: 'var(--ui-btn-radius)',
                                color: 'var(--ui-primary)'
                            }}
                        >
                            <span>실측 입력 시작하기</span>
                            <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={20} />
                        </button>

                        <button
                            onClick={() => alert("🚧 [서비스 준비중] 🚧\n\n블루투스 레이저 거리측정기 연동 기능이 곧 제공됩니다.\n버튼 한 번으로 치수가 자동 입력되는 놀라운 경험을 기대해주세요!")}
                            className="w-full py-3 bg-slate-800/50 backdrop-blur border border-slate-700 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-800/80 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="text-blue-400">⚡</span>
                            <span>블루투스 기기 연결</span>
                            <span className="bg-blue-900/50 text-blue-200 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30">New</span>
                        </button>
                    </div>

                    {/* Quick Access Links */}
                    <div className="grid grid-cols-4 gap-2 w-full">
                        {/* Invite Consumer (New Feature) */}
                        <button
                            onClick={() => openSmsComposer("", `[LimsDoor] 우리집 현관문 미리보기 & 견적내기: ${window.location.origin}/shop`)}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 backdrop-blur hover:bg-blue-600/30 transition text-blue-100"
                        >
                            <Send size={22} />
                            <span className="text-[10px] font-bold">소비자 초대</span>
                        </button>
                        {/* Portfolio (Internal) */}
                        <button
                            onClick={() => window.open("/portfolio", "_blank")}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur hover:bg-slate-700/60 transition"
                        >
                            <ImageIcon size={22} className="text-indigo-300" />
                            <span className="text-[10px] text-slate-300 font-bold">포트폴리오</span>
                        </button>

                        {/* Homepage */}
                        <button
                            onClick={() => companyLinks?.home ? window.open(companyLinks.home, "_blank") : null}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border backdrop-blur transition ${companyLinks?.home ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/60' : 'border-transparent opacity-30 grayscale cursor-default'}`}
                        >
                            <Globe size={22} className="text-emerald-300" />
                            <span className="text-[10px] text-slate-300 font-bold">홈페이지</span>
                        </button>

                        {/* Mall */}
                        <button
                            onClick={() => companyLinks?.mall ? window.open(companyLinks.mall, "_blank") : null}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border backdrop-blur transition ${companyLinks?.mall ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/60' : 'border-transparent opacity-30 grayscale cursor-default'}`}
                        >
                            <ShoppingBag size={22} className="text-orange-300" />
                            <span className="text-[10px] text-slate-300 font-bold">쇼핑몰</span>
                        </button>

                        {/* YouTube */}
                        {companyLinks?.youtube && (
                            <button
                                onClick={() => window.open(companyLinks.youtube, "_blank")}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-red-600/20 border border-red-500/30 backdrop-blur hover:bg-red-600/30 transition text-red-100"
                            >
                                <Youtube size={22} />
                                <span className="text-[10px] font-bold">유튜브</span>
                            </button>
                        )}

                        {/* Instagram */}
                        {companyLinks?.instagram && (
                            <button
                                onClick={() => window.open(companyLinks.instagram, "_blank")}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-pink-600/20 border border-pink-500/30 backdrop-blur hover:bg-pink-600/30 transition text-pink-100"
                            >
                                <Instagram size={22} />
                                <span className="text-[10px] font-bold">인스타</span>
                            </button>
                        )}

                        {/* TikTok */}
                        {companyLinks?.tiktok && (
                            <button
                                onClick={() => window.open(companyLinks.tiktok, "_blank")}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur hover:bg-slate-700/60 transition"
                            >
                                <TikTokIcon size={20} className="text-slate-200" />
                                <span className="text-[10px] text-slate-300 font-bold">틱톡</span>
                            </button>
                        )}

                        {/* Facebook */}
                        {companyLinks?.facebook && (
                            <button
                                onClick={() => window.open(companyLinks.facebook, "_blank")}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 backdrop-blur hover:bg-blue-600/30 transition text-blue-100"
                            >
                                <Facebook size={22} />
                                <span className="text-[10px] font-bold">페이스북</span>
                            </button>
                        )}
                    </div>

                    <p className="mt-8 text-[10px] text-slate-500">
                        LIMSDOOR MEASURE APP v{version || "1.0"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setStep("LANDING");
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-lg leading-none">현장 실측 입력</h1>
                            {version && (
                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] mobile-text border border-green-200 font-bold">
                                    {version}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            포인트 측정 • 사진 • 전송
                            {isSyncing && <span className="text-indigo-500 animate-pulse font-bold ml-1">⚡ 동기화 중...</span>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.open("/portfolio", "_blank")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition active:scale-95"
                    >
                        <ImageIcon size={14} />
                        포트폴리오
                    </button>
                    <button
                        onClick={() => router.push("/field/ar")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition active:scale-95"
                    >
                        <Smartphone size={14} />
                        AR 실측
                    </button>
                    <button
                        onClick={() => document.getElementById("translate-section")?.scrollIntoView({ behavior: "smooth" })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100 transition active:scale-95"
                    >
                        <Languages size={14} />
                        번역
                    </button>
                    <button
                        onClick={() => setShowComparisonModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 transition active:scale-95"
                    >
                        <Eye size={14} />
                        데이터 비교
                    </button>
                </div>
            </div>

            <main className="max-w-3xl mx-auto p-4 space-y-6">

                {/* 1. Customer Info */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-slate-900 rounded-full"></span>
                        고객 정보
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-xs font-bold text-slate-500 block mb-1">고객명</span>
                            <input className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                                value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="예: 홍길동" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-500 block mb-1">연락처</span>
                            <input className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="예: 010-1234-5678" />
                        </label>
                        <label className="block sm:col-span-2">
                            <span className="text-xs font-bold text-slate-500 block mb-1 flex items-center justify-between">
                                <span>여건 주소</span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={handleAutoFillAddress}
                                        disabled={loadingGPS}
                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                        title="현재 위치의 주소로 자동 입력"
                                    >
                                        {loadingGPS ? "📍 가져오는 중..." : "📍 현재 위치"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMapPicker(true)}
                                        className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                                    >
                                        <MapPin size={12} />
                                        지도에서 선택
                                    </button>
                                </div>
                            </span>
                            <div className="flex gap-2">
                                <input className="flex-1 text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                                    value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="예: 구리시 한양아파트" />
                                <button
                                    onClick={() => setAddressModalOpen(true)}
                                    className="px-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition text-sm whitespace-nowrap"
                                >
                                    🔍 주소검색
                                </button>
                            </div>
                            {addressLat && addressLng && (
                                <p className="text-xs text-slate-500 mt-1">
                                    📍 위도: {addressLat.toFixed(6)}, 경도: {addressLng.toFixed(6)}
                                </p>
                            )}
                        </label>
                    </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-green-600 rounded-full"></span>
                        현장 통신 (무전기)
                    </h2>

                    <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <div className="font-bold text-slate-700 text-sm mb-1">실측팀 전용 채널 (CH 2)</div>
                            <div className="text-xs text-slate-500">
                                현장 상황 공유 및 문의<br />
                                <span className="text-indigo-600">* 별도 탭에서 실행됩니다.</span>
                            </div>
                        </div>
                        <button
                            onClick={() => window.open("/radio?channel=2&locked=true", "_blank")}
                            className="bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-3 rounded-xl text-sm font-bold border border-indigo-200 hover:border-indigo-600 transition flex items-center gap-2"
                        >
                            <Mic size={16} />
                            무전기 켜기
                        </button>
                    </div>
                </section>

                <section id="translate-section" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                        현장 번역 (Foreigner Support)
                    </h2>
                    <TranslatePanel onInsertToMemo={(t) => setSiteMemo(prev => prev ? prev + "\n\n" + t : t)} />
                </section>

                {/* 2. Options (Moved ABOVE Measurements per request) */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm border-l-4 border-l-indigo-500">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                        옵션 선택 (제품 정보)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-xs font-bold text-slate-500 block mb-1">문 종류</span>
                            <select className="w-full text-sm p-3 bg-white border border-slate-200 rounded-lg outline-none"
                                value={category} onChange={e => setCategory(e.target.value as DoorCategory)}>
                                <option value="자동문">자동문</option>
                                <option value="수동문">수동문</option>
                                <option value="파티션">파티션</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-500 block mb-1">상세 유형</span>
                            <select className="w-full text-sm p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-indigo-900"
                                value={detail} onChange={e => setDetail(e.target.value)}>
                                {DOOR_OPTIONS[category].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-500 block mb-1">열림 방향 (거실→현관 기준)</span>
                            <select className="w-full text-sm p-3 bg-white border border-slate-200 rounded-lg outline-none"
                                value={openDirection} onChange={e => setOpenDirection(e.target.value as OpenDirection)}>
                                <option value="좌→우 열림">좌 → 우 열림</option>
                                <option value="우→좌 열림">우 → 좌 열림</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-500 block mb-1">도어 색상 (프레임)</span>
                            <input className="w-full text-sm p-3 bg-white border border-slate-200 rounded-lg outline-none"
                                value={doorColor} onChange={e => setDoorColor(e.target.value)} placeholder="예: 화이트, 블랙, 우드" />
                        </label>
                        <label className="block col-span-1 sm:col-span-2">
                            <span className="text-xs font-bold text-slate-500 block mb-1">추가 부자재</span>
                            <input className="w-full text-sm p-3 bg-white border border-slate-200 rounded-lg outline-none"
                                value={addMaterials} onChange={e => setAddMaterials(e.target.value)} placeholder="예: 상부 마감재 100x100, 실리콘 추가" />
                        </label>
                    </div>

                    {detail.includes("원슬라이딩") && (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <span className="text-xs font-bold text-orange-800 block mb-2">원슬라이딩 필수 선택</span>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <input type="radio" checked={slidingMode === "벽부형"} onChange={() => setSlidingMode("벽부형")} /> 벽부형
                                </label>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <input type="radio" checked={slidingMode === "오픈형"} onChange={() => setSlidingMode("오픈형")} /> 오픈형
                                </label>
                            </div>
                        </div>
                    )}
                </section>

                {/* 3. Design & Photos (Moved Up) */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-slate-900 rounded-full"></span>
                        디자인 및 현장
                    </h2>

                    {/* Frame Design */}
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-500">프레임 색상</div>
                        <div className="grid grid-cols-2 gap-3">
                            {DESIGN_OPTIONS.map(d => (
                                <button key={d.id} onClick={() => setDesignId(d.id)}
                                    className={`p-3 rounded-lg border text-left transition-all ${designId === d.id ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-slate-200 hover:bg-slate-50"}`}>
                                    <div className="text-xs font-bold text-slate-900">{d.name}</div>
                                    <div className="text-[10px] text-slate-500">{d.color}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Glass Selection (New Tabbed Hierarchy) */}
                    <div className="space-y-3 pt-2 border-t">
                        <div className="text-xs font-bold text-slate-500">유리 종류 선택</div>

                        {/* 1. Category Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                            {Object.keys(GLASS_HIERARCHY).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setViewGlassCategory(cat as any)}
                                    className={`flex-1 py-1.5 px-2 text-[11px] rounded-md font-bold whitespace-nowrap transition-all 
                                        ${viewGlassCategory === cat ? "bg-white text-indigo-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* 2. Sub Options */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {GLASS_HIERARCHY[viewGlassCategory].map(opt => (
                                <button key={opt} onClick={() => setGlass(opt)}
                                    className={`px-3 py-2 text-xs rounded-lg border transition-all text-center
                                        ${glass === opt ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-md transform scale-[1.02]" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-white"}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <span className="text-xs font-bold text-slate-500 block mb-2">현장 사진</span>
                        <div className="grid grid-cols-4 gap-2">
                            <label className="aspect-square bg-slate-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-200 transition">
                                <Camera size={24} className="text-slate-400" />
                                <span className="text-[10px] text-slate-500 mt-1 font-bold">추가</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={e => onPickFiles(e.target.files)} />
                            </label>
                            {previews.map((p, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-900">
                                    <img src={p.url} className="w-full h-full object-cover opacity-80" />
                                    <button onClick={() => removePreview(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-600 transition">
                                        <ArrowLeft size={12} className="rotate-45" /> {/* X icon replacement */}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Voice Input Section - NEW */}
                <VoiceInput
                    onApplyMeasurement={handleApplyVoiceData}
                    currentDoorType={detail}
                    currentMeasurementCounts={{
                        width: widthPoints.filter(p => p.trim() !== "").length,
                        height: heightPoints.filter(p => p.trim() !== "").length
                    }}
                />

                {/* 4. Measurements (Moved Down) */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-slate-900 rounded-full"></span>
                        실측 포인트 (mm)
                    </h2>

                    {/* Width Grid */}
                    <div className={`p-4 rounded-xl border transition-colors duration-500 ${recPoints.w > 3 ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-600">가로 (Width) - <span className="text-indigo-600">최수 {recPoints.w}포인트</span></span>
                            <span className="text-[10px] text-slate-400">
                                {isOneSliding ? "✨ 가장 큰 값 자동확정 (원슬라이딩)" : "가장 작은 값 자동확정 (기본)"}
                            </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {widthPoints.map((v, i) => (
                                <input key={`w-${i}`} type="number" inputMode="numeric"
                                    className={`w-full p-2 text-center text-sm font-bold border rounded outline-none transition focus:ring-2 ${i < recPoints.w ? "bg-white border-slate-300 focus:ring-indigo-500 ring-1 ring-slate-200" : "bg-slate-100 border-slate-200 text-slate-400"}`}
                                    value={v} onChange={e => setPoint("w", i, e.target.value)} placeholder={`${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* WARNING BOX (All Doors) */}
                    {warning && (
                        <div className={`mx-4 mb-4 p-3 rounded-lg border flex flex-col gap-1
                            ${warning.level === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                                warning.level === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    'bg-green-50 border-green-200 text-green-700'}`}>
                            <div className="flex items-center gap-2 font-bold text-sm">
                                {warning.level === 'critical' ? <AlertTriangle size={16} /> :
                                    warning.level === 'warning' ? <AlertTriangle size={16} /> :
                                        <Check size={16} />}
                                {warning.msg}
                            </div>
                        </div>
                    )}

                    {/* Height Grid */}
                    <div className={`p-4 rounded-xl border transition-colors duration-500 ${recPoints.h > 3 ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-600">세로 (Height) - <span className="text-indigo-600">최소 {recPoints.h}포인트</span></span>
                            <span className="text-[10px] text-slate-400">가장 작은 값 자동확정</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                            {heightPoints.map((v, i) => (
                                <input key={`h-${i}`} type="number" inputMode="numeric"
                                    className={`w-full p-2 text-center text-sm font-bold border rounded outline-none transition focus:ring-2 ${i < recPoints.h ? "bg-white border-slate-300 focus:ring-indigo-500 ring-1 ring-slate-200" : "bg-slate-100 border-slate-200 text-slate-400"}`}
                                    value={v} onChange={e => setPoint("h", i, e.target.value)} placeholder={`${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Confirmation */}
                    <div className="flex bg-slate-800 text-white p-4 rounded-xl items-center justify-around">
                        <div className="text-center">
                            <div className="text-[10px] text-slate-400 mb-1">확정 가로</div>
                            <div className="text-xl font-black">{confirmedWidth || '-'}</div>
                        </div>
                        <div className="w-px h-8 bg-slate-600"></div>
                        <div className="text-center">
                            <div className="text-[10px] text-slate-400 mb-1">확정 세로</div>
                            <div className="text-xl font-black">{confirmedHeight || '-'}</div>
                        </div>
                    </div>
                </section>

                {/* 5. Construction Request Date (NEW) */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <span className="w-1.5 h-4 bg-slate-900 rounded-full"></span>
                        시공 요청일 (예약)
                    </h2>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                value={requestDate}
                                min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                onChange={(e) => setRequestDate(e.target.value)}
                            />
                            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                                <button
                                    onClick={() => setRequestTime("오전")}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${requestTime === "오전" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}
                                >
                                    오전
                                </button>
                                <button
                                    onClick={() => setRequestTime("오후")}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${requestTime === "오후" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}
                                >
                                    오후
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            * 최소 7일 이후 날짜부터 선택 가능합니다.
                        </p>
                    </div>
                </section >

                {/* 6. Memo */}
                < section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" >
                    <h2 className="text-sm font-bold text-slate-900 mb-2">현장 특이사항</h2>
                    <textarea
                        className="w-full bg-slate-50 p-3 rounded-lg text-sm outline-none border border-slate-200 focus:border-slate-400 min-h-[100px]"
                        value={siteMemo} onChange={e => setSiteMemo(e.target.value)}
                        placeholder="예) 오픈형이라 추가 자재 필요, 벽면 수평 불량 등"
                    />
                </section >

                {/* 5.5. Payment & Estimation */}
                < section className="space-y-4" >
                    {/* NEW: Price Estimation Card (Visible Auto-Calc) */}
                    < div className="bg-indigo-900 text-white rounded-xl p-5 shadow-lg relative overflow-hidden" >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Check size={80} />
                        </div>
                        <h2 className="text-sm font-bold text-indigo-200 mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-indigo-400 rounded-full"></div>
                            예상 견적 (자동 계산)
                        </h2>

                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex justify-between items-end border-b border-indigo-700 pb-2">
                                <span className="text-sm font-bold opacity-80">{detail} (제품)</span>
                                <span className="text-lg font-bold">{estimatedPrice.toLocaleString()}원</span>
                            </div>

                            <div className="flex justify-between items-center text-sm opacity-70">
                                <span>ㄴ 자재비 (예상)</span>
                                <span>{materialCost.toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between items-center text-sm opacity-70">
                                <span>ㄴ 시공비 (표준)</span>
                                <span>{installFee.toLocaleString()}원</span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-indigo-700 flex justify-between items-center">
                                <span className="text-sm font-bold text-indigo-200">총 예상 합계</span>
                                <span className="text-2xl font-black text-yellow-300">{estimatedPrice.toLocaleString()}원</span>
                            </div>
                        </div>
                    </div >

                    {/* Payment Request Box */}
                    < div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm relative" >
                        <div className="absolute -top-3 left-4 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded">
                            결제 요청 생성
                        </div>
                        <PayhereLinkPaymentBox
                            estimateId={estimateId}
                            customerName={customerName}
                            customerPhone={customerPhone}
                            initialAmount={estimatedPrice}
                            installFee={installFee}
                            materialCost={materialCost}
                        />
                    </div >
                </section >

                {/* 6. Summary Block */}
                < div className="bg-slate-100 rounded-xl p-4 text-xs space-y-1 text-slate-600 font-mono" >
                    <div>• 고객: {customerName} ({customerPhone})</div>
                    <div>• 제품: {category} - {detail}</div>
                    <div>• 사이즈: {confirmedWidth || '-'} x {confirmedHeight || '-'}</div>
                    <div className="text-[10px] text-slate-400 pt-2">* "전송하기"를 누르면 사무실(카톡공유)과 고객문자 발송이 진행됩니다.</div>
                </div >

            </main >

            {/* Actions */}
            < div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t flex gap-2 z-[100] safe-bottom" >
                <button onClick={() => setShowShareModal(true)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl active:scale-95 transition flex justify-center items-center gap-2">
                    사무실 공유
                </button>
                <button onClick={() => send("both", "full")}
                    className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition flex justify-center items-center gap-2">
                    <Send size={18} className="-ml-1" />
                    고객 전송 (+완료처리)
                </button>
            </div >

            {/* Office Share Selection Modal */}
            {
                showShareModal && (
                    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                            >
                                <X size={24} />
                            </button>
                            <h3 className="text-lg font-bold text-center mb-6">사무실 공유 방식 선택</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        send("office", "db_only");
                                        setShowShareModal(false);
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition"
                                >
                                    <CloudUpload size={24} />
                                    <div>
                                        <div className="text-base">프로그램 전송</div>
                                        <div className="text-[10px] font-normal opacity-70">관리자 페이지 저장 (DB)</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        send("office", "share_only");
                                        setShowShareModal(false);
                                    }}
                                    className="w-full py-4 bg-yellow-400 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-yellow-500 transition"
                                >
                                    <MessageCircle size={24} />
                                    <div>
                                        <div className="text-base">문자/카톡 공유</div>
                                        <div className="text-[10px] font-normal opacity-70">텍스트 복사 및 공유창</div>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-full mt-4 py-3 text-slate-400 font-medium hover:text-slate-600"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )
            }

            {/* === COMPARISON MODAL === */}
            {/* AI Modal */}
            {
                aiResult && aiResult.status !== 'ok' && (
                    <AIValidationModal
                        result={aiResult}
                        onClose={() => setAiResult(null)}
                        onProceed={handleConfirmAI}
                    />
                )
            }

            {/* Comparison Modal */}
            {
                showComparisonModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-100 w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                            <div className="bg-white border-b p-4 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Eye size={18} className="text-indigo-600" /> 데이터 비교</h3>
                                <button onClick={() => setShowComparisonModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800"><X size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Visual Overlay */}
                                <div className="relative w-full aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden border shadow-inner">
                                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="absolute" style={{ width: `${consumerW / 5}px`, height: `${consumerH / 5}px`, opacity: 0.4, filter: "sepia(1) hue-rotate(180deg) saturate(2)", transform: "translate(-10px, -10px)" }}>
                                            <DoorModel type={arDoorType} frameColor={targetOrder.arData?.consumer?.frameColor as FrameColor || "화이트"} glassType={targetOrder.arData?.consumer?.glassType as GlassType || "투명"} width={consumerW} height={consumerH} />
                                        </div>
                                        <div className="absolute" style={{ width: `${fW / 5}px`, height: `${fH / 5}px`, opacity: 0.8, border: "2px dashed blue" }}>
                                            <DoorModel type={arDoorType} frameColor={targetOrder.arData?.consumer?.frameColor as FrameColor || "화이트"} glassType={targetOrder.arData?.consumer?.glassType as GlassType || "투명"} width={fW} height={fH} />
                                        </div>
                                    </div>
                                </div>
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Consumer</div>
                                        <div className="text-sm font-mono text-blue-900">W: {consumerW}<br />H: {consumerH}</div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Field</div>
                                        <div className="text-sm font-mono text-slate-900">W: {fW || "-"}<br />H: {fH || "-"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setCustomerAddress(data.address)}
            />

            {/* Map Picker Modal */}
            {
                showMapPicker && (
                    <NaverMapPicker
                        onConfirm={handleMapConfirm}
                        onClose={() => setShowMapPicker(false)}
                        initialAddress={customerAddress}
                    />
                )
            }
        </div >
    );
}

export default function FieldCorrectionPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Field Tool...</div>}>
            <DemoGuard>
                <FieldCorrectionContent />
            </DemoGuard>
        </Suspense>
    );
}
