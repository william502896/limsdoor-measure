"use client";

const BUILD_INFO = {
    version: "2025-12-22-AR-STEP",
    deployedAt: "2025-12-22 17:40",
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import VirtualPreviewModal from "../../components/VirtualPreviewModal";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import RecordingWidget from "../../components/FieldCoach/RecordingWidget";
import Timeline, { TimelineEvent, SentimentSegment } from "../../components/FieldCoach/Timeline";
import CoachingReport, { CoachingData } from "../../components/FieldCoach/CoachingReport";
import { OrderStatus } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "limsdoor_admin_settings_v1";

/* ===============================
   Types
================================ */
type DoorCategory = "자동문" | "수동문" | "파티션";
type SendTarget = "office" | "customer" | "both";
type SlidingMode = "벽부형" | "오픈형";
type OpenDirection = "좌→우 열림" | "우→좌 열림";
type InstallLocation = "현관" | "드레스룸" | "알파룸" | "거실";

type DiscountType =
    | "없음"
    | "재구매 고객 할인"
    | "조건부 현장 할인"
    | "추가 자재 조건부 무상"
    | "기타";

type TimeSlot = "오전" | "오후";

type PaymentMethod = "현금결재" | "현금영수증" | "세금계산서" | "카드결재";

type AdminSettings = {
    officePhone: string;
    officeEmail: string;
    measurerName: string;
    measurerPhone: string;
    openaiApiKey?: string;
    businessCardImage?: string;
};

type Preview = {
    file: File;
    url: string;
    kind: "laser" | "site";
};

/* ===============================
   Constants
================================ */
// 오차 기준
const WARN_EXTRA_MATERIAL_MM = 5;
const WARN_PHOTO_REQUIRED_MM = 10;

const EXTRA_MATERIAL_COST_TEXT = "추가자재 적용 시 추가 비용이 발생할 수 있습니다.";

const COMPANY_ACCOUNT_TEXT = `🏦 제품비(주문/발주) 입금 계좌
- 케이뱅크 700100061232
- 주식회사 림스`;

const KAKAO_OFFICE_INVITE_URL = "https://invite.kakao.com/tc/PNzC3cgJCa";

const VAT_RATE = 0.1;

const DOOR_OPTIONS: Record<DoorCategory, string[]> = {
    자동문: ["3연동 도어", "원슬라이딩 도어"],
    수동문: [
        "3연동 중문",
        "원슬라이딩 도어",
        "2슬라이딩도어",
        "3슬라이딩 도어",
        "4슬라이딩도어",
        "호폐도어",
        "스윙도어",
    ],
    파티션: ["1창", "2창"],
};

const GLASS_OPTIONS = [
    "투명 강화",
    "브론즈 강화",
    "다크그레이 강화",
    "브론즈 샤틴",
    "다크 샤틴",
    "플루트 유리",
    "특수 유리",
] as const;

const DESIGN_OPTIONS = [
    { id: "design-01", name: "슬림 블랙 프레임", img: "/door-designs/design-01.jpg" },
    { id: "design-02", name: "화이트 프레임", img: "/door-designs/design-02.jpg" },
    { id: "design-03", name: "브론즈 톤 프레임", img: "/door-designs/design-03.jpg" },
    { id: "design-04", name: "모던 그레이 프레임", img: "/door-designs/design-04.jpg" },
] as const;

const DESIGN_PLACEHOLDER = "/door-designs/placeholder.jpg";

/* ===============================
   Admin (localStorage)
================================ */
function readAdminSettings(): AdminSettings | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        return {
            officePhone: String(obj.officePhone ?? ""),
            officeEmail: String(obj.officeEmail ?? ""),
            measurerName: String(obj.measurerName ?? ""),
            measurerPhone: String(obj.measurerPhone ?? ""),
            openaiApiKey: String(obj.openaiApiKey ?? ""),
        };
    } catch {
        return null;
    }
}

/* ===============================
   Date utils
================================ */
function pad2(n: number) {
    return String(n).padStart(2, "0");
}
function getTodayYmd() {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
function parseDateLocal(ymd: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
}
function addDaysYmd(ymd: string, days: number) {
    const dt = parseDateLocal(ymd);
    if (!dt) return null;
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
function getCurrentYearMonth() {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1 };
}
function getLastDayOfMonth(y: number, m: number) {
    return new Date(y, m, 0).getDate();
}

/* ===============================
   Measurement point rules
================================ */
function getRequiredPoints(category: DoorCategory, detail: string) {
    const isPartition = category === "파티션";
    const isOneSliding = detail.includes("원슬라이딩");
    const isThreeLink = detail.includes("3연동");
    const isHoPae = detail.includes("호폐도어");
    const isSwing = detail.includes("스윙도어");

    if (isPartition) return { wReq: 3, hReq: 3 };
    if (isOneSliding) return { wReq: 3, hReq: 5 };
    if (isThreeLink || isHoPae || isSwing) return { wReq: 3, hReq: 3 };
    return { wReq: 3, hReq: 3 };
}

function parsePositiveInt(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    return Math.trunc(n);
}

function getMinMaxSpread(values: string[]) {
    const nums = values
        .map(parsePositiveInt)
        .filter((n): n is number => typeof n === "number" && n > 0);

    if (nums.length === 0)
        return { min: null as number | null, max: null as number | null, spread: null as number | null };
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return { min, max, spread: max - min };
}

// 확정치 로직
function getConfirmedSize(category: DoorCategory, detail: string, widthPoints: string[], heightPoints: string[]) {
    const wStats = getMinMaxSpread(widthPoints);
    const hStats = getMinMaxSpread(heightPoints);

    const wMin = wStats.min;
    const wMax = wStats.max;
    const hMin = hStats.min;

    const isOneSliding = detail.includes("원슬라이딩");
    const isThreeLink = detail.includes("3연동");
    const isHoPae = detail.includes("호폐도어");
    const isSwing = detail.includes("스윙도어");

    if (category === "파티션") return { confirmedWidth: wMin, confirmedHeight: hMin };
    if (isOneSliding) return { confirmedWidth: wMax, confirmedHeight: hMin };
    if (isThreeLink || isHoPae || isSwing) return { confirmedWidth: wMin, confirmedHeight: hMin };
    return { confirmedWidth: wMin, confirmedHeight: hMin };
}

function normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, "");
}

/* ===============================
   Share / SMS / Email
================================ */
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

function openMailComposer(toEmail: string, subject: string, body: string) {
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    window.location.href = `mailto:${toEmail}?subject=${s}&body=${b}`;
}

/* ===============================
   GPS (map openers)
================================ */
async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
    return await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("이 기기는 위치 정보를 지원하지 않습니다."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}
function openGoogleMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
}
function openNaverMaps(lat: number, lng: number) {
    window.open(`https://map.naver.com/v5/search/${lat},${lng}`, "_blank");
}
function openKakaoMaps(lat: number, lng: number) {
    window.open(`https://map.kakao.com/link/map/${lat},${lng}`, "_blank");
}

/* ===============================
   Signature Canvas
================================ */
function useSignature() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);

    const initWhiteBg = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    };

    useEffect(() => {
        initWhiteBg();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
        drawing.current = true;
        draw(e);
    };

    const end = () => {
        drawing.current = false;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) ctx.beginPath();
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000000";

        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };

    const isEmpty = () => {
        if (!canvasRef.current) return true;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return true;
        const pixels = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            if (a !== 255) return false;
            if (!(r === 255 && g === 255 && b === 255)) return false;
        }
        return true;
    };

    const toDataUrl = () => canvasRef.current?.toDataURL("image/png") ?? "";

    return { canvasRef, start, end, draw, clear, isEmpty, toDataUrl };
}

/* ===============================
   Estimate utils
================================ */
function formatWon(n: number) {
    return `${n.toLocaleString("ko-KR")}원`;
}
function ceilDiv(n: number, d: number) {
    return Math.ceil(n / d);
}
function calcDisplayInstallCostByQty(qty: number) {
    if (qty <= 1) return 150000;
    if (qty === 2) return 200000;
    return 300000;
}

type Estimate = {
    isSupported: boolean;
    baseLabel: string;
    basePrice: number;
    colorLabel: string;
    colorAdd: number;
    glassLabel: string;
    glassAdd: number;
    sizeBaseW: number;
    sizeBaseH: number;
    overW: number;
    overH: number;
    sizeSteps: number;
    sizeAdd: number;

    totalBeforeDiscount: number;
    discountAmount: number;
    totalAfterDiscount: number;

    hasMeasureRecommend: boolean;
    hasPhotoRequired: boolean;
    warningText?: string;
    warningExtraCost?: number;

    extraMaterials?: string[];
    note?: string;
    totalPrice?: number; // Compatibility
};

function calcEstimate(args: {
    category: DoorCategory;
    detail: string;
    designName: string | null | undefined;
    glass: string;
    confirmedWidth: number | null;
    confirmedHeight: number | null;
    widthSpread: number | null;
    heightSpread: number | null;
    discountAmount: number;
}): Estimate {
    const { detail, designName, glass, confirmedWidth, confirmedHeight, widthSpread, heightSpread, discountAmount } = args;

    const isOneSliding = detail.includes("원슬라이딩");
    const isThreeLink = detail.includes("3연동");

    if (!isOneSliding && !isThreeLink) {
        return {
            isSupported: false,
            baseLabel: "견적 산정 대상 아님",
            basePrice: 0,
            colorLabel: "-",
            colorAdd: 0,
            glassLabel: "-",
            glassAdd: 0,
            sizeBaseW: 0,
            sizeBaseH: 0,
            overW: 0,
            overH: 0,
            sizeSteps: 0,
            sizeAdd: 0,
            totalBeforeDiscount: 0,
            discountAmount: Math.max(0, discountAmount || 0),
            totalAfterDiscount: 0,
            hasMeasureRecommend: false,
            hasPhotoRequired: false,
            note: "현재는 원슬라이딩/3연동만 자동견적이 적용됩니다.",
        };
    }

    const basePrice = isOneSliding ? 590000 : 690000;
    const baseLabel = isOneSliding ? "원슬라이딩(화이트+투명 기준)" : "3연동(화이트+투명 기준)";
    const sizeBaseW = isOneSliding ? 1250 : 1350;
    const sizeBaseH = 2300;

    const isWhite = (designName ?? "").includes("화이트");
    const colorAdd = isWhite ? 0 : 70000;
    const colorLabel = isWhite ? "화이트(기본)" : "색상 변경(+70,000)";

    let glassAdd = 0;
    let glassLabel = "투명(기본)";

    if (glass.includes("투명")) {
        glassAdd = 0;
        glassLabel = "투명(기본)";
    } else if (glass.includes("브론즈 강화") || glass.includes("다크그레이 강화")) {
        glassAdd = 80000;
        glassLabel = `${glass}(+80,000)`;
    } else if (glass.includes("샤틴")) {
        glassAdd = 100000;
        glassLabel = `${glass}(+100,000)`;
    } else if (glass.includes("특수")) {
        glassAdd = 130000;
        glassLabel = `${glass}(+130,000)`;
    } else {
        glassAdd = 130000;
        glassLabel = `${glass}(+130,000)`;
    }

    const w = confirmedWidth ?? 0;
    const h = confirmedHeight ?? 0;

    const overW = Math.max(0, w - sizeBaseW);
    const overH = Math.max(0, h - sizeBaseH);

    const stepsW = overW > 0 ? ceilDiv(overW, 100) : 0;
    const stepsH = overH > 0 ? ceilDiv(overH, 100) : 0;

    const sizeSteps = stepsW + stepsH;
    const sizeAdd = sizeSteps * 50000;

    const spreadW = typeof widthSpread === "number" ? widthSpread : 0;
    const spreadH = typeof heightSpread === "number" ? heightSpread : 0;
    const maxSpread = Math.max(spreadW, spreadH);

    const hasMeasureRecommend = maxSpread >= WARN_EXTRA_MATERIAL_MM;
    const hasPhotoRequired = maxSpread >= WARN_PHOTO_REQUIRED_MM;

    let warningText: string | undefined;
    let warningExtraCost = 0;

    if (hasMeasureRecommend) {
        warningExtraCost = 50000;
        warningText =
            `⚠️ 실측 오차 안내\n` +
            `- 가로 오차: ${spreadW}mm / 세로 오차: ${spreadH}mm\n` +
            (hasPhotoRequired
                ? `- 오차 ${WARN_PHOTO_REQUIRED_MM}mm 이상: 현장 상태 확인을 위해 사진 첨부 요청\n`
                : `- 오차 ${WARN_EXTRA_MATERIAL_MM}mm 이상: 마감재(추가자재) 사용 권장\n`) +
            `- ${EXTRA_MATERIAL_COST_TEXT}\n` +
            `- 추가 비용 발생 가능: ${formatWon(warningExtraCost)}`;
    }

    const totalBeforeDiscount = basePrice + colorAdd + glassAdd + sizeAdd;
    const safeDiscount = Math.max(0, Math.trunc(discountAmount || 0));
    const totalAfterDiscount = Math.max(0, totalBeforeDiscount - safeDiscount);

    const extraMaterials = isOneSliding ? ["각바 2EA(기본자재)"] : [];

    return {
        isSupported: true,
        baseLabel,
        basePrice,
        colorLabel,
        colorAdd,
        glassLabel,
        glassAdd,
        sizeBaseW,
        sizeBaseH,
        overW,
        overH,
        sizeSteps,
        sizeAdd,
        totalBeforeDiscount,
        discountAmount: safeDiscount,
        totalAfterDiscount,
        hasMeasureRecommend,
        hasPhotoRequired,
        warningText,
        warningExtraCost,
        extraMaterials,
    };
}

/* ===============================
   Speech
================================ */
function useSpeech() {
    const enabledRef = useRef(true);

    const speak = (text: string) => {
        try {
            if (!enabledRef.current) return;
            if (typeof window === "undefined") return;
            if (!("speechSynthesis" in window)) return;

            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "ko-KR";
            u.rate = 1.05;
            u.pitch = 1.0;
            window.speechSynthesis.speak(u);
        } catch {
            // ignore
        }
    };

    const setEnabled = (v: boolean) => {
        enabledRef.current = v;
    };

    return { speak, setEnabled };
}

/* ===============================
   VAT / Payment
================================ */
function needsVat(method: PaymentMethod) {
    return method === "현금영수증" || method === "세금계산서" || method === "카드결재";
}
function calcVatAmounts(supply: number, method: PaymentMethod) {
    const apply = needsVat(method);
    if (!apply) {
        return {
            vatRate: 0,
            supplyAmount: Math.max(0, Math.trunc(supply)),
            vatAmount: 0,
            totalPayable: Math.max(0, Math.trunc(supply)),
        };
    }
    const safeSupply = Math.max(0, Math.trunc(supply));
    const totalPayable = Math.round(safeSupply * (1 + VAT_RATE));
    const vatAmount = Math.max(0, totalPayable - safeSupply);
    return {
        vatRate: VAT_RATE,
        supplyAmount: safeSupply,
        vatAmount,
        totalPayable,
    };
}

/* ===============================
   Page
================================ */
export default function FieldNewPage() {
    const [admin, setAdmin] = useState<AdminSettings>({
        officePhone: "",
        officeEmail: "",
        measurerName: "",
        measurerPhone: "",
    });

    // AI 결과 상태
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState("");

    // Field Images
    const [siteImage, setSiteImage] = useState<string | null>(null);
    const [sketchImage, setSketchImage] = useState<string | null>(null);

    // AI Virtual Preview Modal State (Must exist)
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // =============================================================
    // AI FIELD COACHING Logic
    // =============================================================
    const recorder = useAudioRecorder();
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [sentimentSegments, setSentimentSegments] = useState<SentimentSegment[]>([]);
    const [coachingData, setCoachingData] = useState<CoachingData | null>(null);
    const [showCoaching, setShowCoaching] = useState(false);

    // Mock AI Analysis Simulation
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (recorder.status === "processing") {
            // Simulated delay for "Analyzing..."
            recorder.setRecStatus("analyzing");

            timer = setTimeout(() => {
                // Mock Result Extraction
                const now = new Date();
                const hhmm = `${now.getHours()}:${now.getMinutes()}`;

                // 1. Add Events
                const newEvents: TimelineEvent[] = [
                    { id: Date.now() + "1", time: hhmm, type: "info", content: "고객: 자동문 화이트 톤 선호 언급" },
                    { id: Date.now() + "2", time: hhmm, type: "risk", content: "AI감지: 예산 우려 (가격 방어 필요)" },
                    { id: Date.now() + "3", time: hhmm, type: "fact", content: "일정: 다음주 수요일 시공 희망" }
                ];
                setTimelineEvents(prev => [...prev, ...newEvents]);

                // 2. Add Sentiment
                setSentimentSegments(prev => [
                    ...prev,
                    { start: 0, end: 30, sentiment: "neutral" },
                    { start: 30, end: 60, sentiment: "worry" },
                    { start: 60, end: 90, sentiment: "positive" }
                ]);

                // 3. Auto-Fill Form (Demonstration)
                setCategory("자동문");
                setGlass("투명 강화"); // Detected "Transparent"
                if (!customerName) setCustomerName("박지성 (음성추출)");

                // 4. Generate Coaching Report
                setCoachingData({
                    leadershipScore: 78,
                    tone: "차분함/전문적",
                    goodPoints: ["고객 니즈 재확인 (Color)", "가격 안내 시점 적절"],
                    badPoints: ["초반 스몰토크 부재", "기술 용어(3연동) 과다 사용"],
                    missedChecklist: ["재방문 일정 확인"],
                    nextAction: "다음 현장에서는 '고객의 불편함'을 먼저 물어보세요."
                });

                // Done
                recorder.setRecStatus("idle");
                setShowCoaching(true); // Open Report automatically
                alert("📢 AI 분석 완료!\n- 타임라인 업데이트됨\n- 자동문/투명유리 자동선택됨\n- 코칭 리포트 생성됨");
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [recorder.status]);


    useEffect(() => {
        const data = readAdminSettings();
        if (data) setAdmin(data);
    }, []);

    // 옵션
    const [category, setCategory] = useState<DoorCategory>("자동문");
    const [detail, setDetail] = useState<string>(DOOR_OPTIONS["자동문"][0]);
    const [glass, setGlass] = useState<string>(GLASS_OPTIONS[0]);

    const [installLocation, setInstallLocation] = useState<InstallLocation>("현관");
    const [quantity, setQuantity] = useState<number>(1);

    const [openDirection, setOpenDirection] = useState<OpenDirection>("좌→우 열림");
    const [designId, setDesignId] = useState<string>(DESIGN_OPTIONS[0].id);
    const [slidingMode, setSlidingMode] = useState<SlidingMode>("벽부형");

    // 현장 할인
    const [discountType, setDiscountType] = useState<DiscountType>("없음");
    const [discountAmountText, setDiscountAmountText] = useState<string>("0");

    const discountAmount = useMemo(() => {
        const n = Number(discountAmountText);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.trunc(n);
    }, [discountAmountText]);

    // 입금/시공일
    const [depositDate, setDepositDate] = useState<string>(getTodayYmd());
    const [requestedInstallDate, setRequestedInstallDate] = useState<string>(getTodayYmd());
    const [timeSlot, setTimeSlot] = useState<TimeSlot>("오전");

    // ✅ 결재 방식(일정 섹션)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("현금결재");

    const { y: fixedY, m: fixedM } = useMemo(() => getCurrentYearMonth(), []);
    const fixedYmPrefix = useMemo(() => `${fixedY}-${pad2(fixedM)}-`, [fixedY, fixedM]);
    const fixedMonthLastDay = useMemo(() => getLastDayOfMonth(fixedY, fixedM), [fixedY, fixedM]);

    const earliestInstallYmd = useMemo(() => addDaysYmd(depositDate, 10), [depositDate]);
    const earliestInstallDateObj = useMemo(
        () => (earliestInstallYmd ? parseDateLocal(earliestInstallYmd) : null),
        [earliestInstallYmd]
    );

    const earliestIsThisMonth = useMemo(() => {
        if (!earliestInstallDateObj) return true;
        return earliestInstallDateObj.getFullYear() === fixedY && earliestInstallDateObj.getMonth() + 1 === fixedM;
    }, [earliestInstallDateObj, fixedY, fixedM]);

    const minDay = useMemo(() => {
        if (!earliestInstallDateObj) return 1;
        if (!earliestIsThisMonth) return 1;
        return earliestInstallDateObj.getDate();
    }, [earliestInstallDateObj, earliestIsThisMonth]);

    const requestedMin = useMemo(() => `${fixedYmPrefix}${pad2(minDay)}`, [fixedYmPrefix, minDay]);
    const requestedMax = useMemo(() => `${fixedYmPrefix}${pad2(fixedMonthLastDay)}`, [fixedYmPrefix, fixedMonthLastDay]);

    const onChangeRequestedInstallDate = (raw: string) => {
        const picked = parseDateLocal(raw);
        if (!picked) return;

        const day = picked.getDate();
        const clampedDay = Math.max(minDay, Math.min(fixedMonthLastDay, day));
        const next = `${fixedYmPrefix}${pad2(clampedDay)}`;
        setRequestedInstallDate(next);
    };

    // 실측 포인트
    const { addCustomer, addOrder, customers, user } = useGlobalStore();
    const router = useRouter(); // Use App Router for navigation
    const req = useMemo(() => getRequiredPoints(category, detail), [category, detail]);
    const [widthPoints, setWidthPoints] = useState<string[]>(Array(3).fill(""));
    const [heightPoints, setHeightPoints] = useState<string[]>(Array(3).fill(""));

    // 고객
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [detailAddress, setDetailAddress] = useState(""); // Detailed Address (Manual)

    // 실측자(관리자 저장값 자동 기입)
    const [measurerName, setMeasurerName] = useState("");
    const [measurerPhone, setMeasurerPhone] = useState("");

    useEffect(() => {
        setMeasurerName((prev) => prev || admin.measurerName);
        setMeasurerPhone((prev) => prev || admin.measurerPhone);
    }, [admin.measurerName, admin.measurerPhone]);

    // 서명
    const signature = useSignature();

    // 메모/사진
    // 메모/사진
    const [siteMemo, setSiteMemo] = useState("");

    // AR Auto-fill Handlers
    const handleSetAutoW = (val: string) => {
        // Fill all 3 points with the same value for now
        setWidthPoints([val, val, val]);
    };
    const handleSetAutoH = (val: string) => {
        setHeightPoints([val, val, val]);
    };

    /* =========================================
       UX: 5-Step Wizard Logic
       ========================================= */
    const [currentStep, setCurrentStep] = useState(1);

    // Validation Helpers
    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1: // Customer
                return !!(customerName.trim() && customerPhone.trim() && customerAddress.trim());
            case 2: // Product
                return true; // Selects always have defaults
            case 3: // Measurement
                if (laserPhotos.length < 1) {
                    // alert("레이저 레벨기 측정 사진을 1장 이상 첨부해주세요."); 
                    // (Validation just checks status, alert on button click)
                    return false;
                }
                // Check points
                const wOk = widthPoints.every((v) => parsePositiveInt(v) !== null);
                const hOk = heightPoints.every((v) => parsePositiveInt(v) !== null);
                if (!wOk || !hOk) return false;
                if (!confirmedWidth || !confirmedHeight) return false;
                return true;
            case 4: // Photo & AI (Optional but check warning)
                if (shouldRequirePhoto && sitePhotos.length < 1) return false;
                return true;
            case 5: // Schedule/Pay (Final)
                if (!depositDate || !requestedInstallDate || !paymentMethod) return false;
                if (signature.isEmpty()) return false;
                return true;
            default:
                return true;
        }
    };

    const goNext = () => {
        if (!validateStep(currentStep)) {
            // Show specific error messages
            if (currentStep === 1) alert("고객명, 연락처, 주소를 모두 입력해주세요.");
            if (currentStep === 3) alert("레이저 사진 첨부 및 모든 실측값을 입력해주세요.");
            if (currentStep === 4) alert("오차 10mm 이상이므로 현장 사진 첨부가 필수입니다.");
            return;
        }
        setCurrentStep(prev => Math.min(5, prev + 1));
        window.scrollTo(0, 0);
    };

    const goPrev = () => {
        setCurrentStep(prev => Math.max(1, prev - 1));
        window.scrollTo(0, 0);
    };

    const [previews, setPreviews] = useState<Preview[]>([]);

    // 음성
    const speech = useSpeech();
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    useEffect(() => {
        speech.setEnabled(voiceEnabled);
    }, [voiceEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setDetail(DOOR_OPTIONS[category][0]);
    }, [category]);

    useEffect(() => {
        if (detail.includes("원슬라이딩")) setSlidingMode("벽부형");
    }, [detail]);

    // 문종/카테고리 변경 시 포인트 초기화
    useEffect(() => {
        setWidthPoints(Array(req.wReq).fill(""));
        setHeightPoints(Array(req.hReq).fill(""));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [req.wReq, req.hReq, category, detail]);

    useEffect(() => {
        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // eslint-disable-line

    const selectedDesign = useMemo(() => DESIGN_OPTIONS.find((d) => d.id === designId), [designId]);

    // 오차
    const wStats = useMemo(() => getMinMaxSpread(widthPoints), [widthPoints]);
    const hStats = useMemo(() => getMinMaxSpread(heightPoints), [heightPoints]);

    const confirmed = useMemo(
        () => getConfirmedSize(category, detail, widthPoints, heightPoints),
        [category, detail, widthPoints, heightPoints]
    );
    const confirmedWidth = confirmed.confirmedWidth;
    const confirmedHeight = confirmed.confirmedHeight;

    const estimate = useMemo(
        () =>
            calcEstimate({
                category,
                detail,
                designName: selectedDesign?.name,
                glass,
                confirmedWidth,
                confirmedHeight,
                widthSpread: wStats.spread,
                heightSpread: hStats.spread,
                discountAmount,
            }),
        [
            category,
            detail,
            selectedDesign?.name,
            glass,
            confirmedWidth,
            confirmedHeight,
            wStats.spread,
            hStats.spread,
            discountAmount,
        ]
    );

    const displayInstallCost = useMemo(() => calcDisplayInstallCostByQty(quantity), [quantity]);

    const productCostAfterDiscount = useMemo(() => {
        if (!estimate.isSupported) return 0;
        return estimate.totalAfterDiscount * Math.max(1, quantity);
    }, [estimate.isSupported, estimate.totalAfterDiscount, quantity]);

    // 공급가(기존 총액 계산): 자재비(할인후) 기준
    const supplyTotal = useMemo(() => {
        if (!estimate.isSupported) return 0;
        return productCostAfterDiscount;
    }, [estimate.isSupported, productCostAfterDiscount]);

    // ✅ 결재 방식에 따른 고객 안내 금액(부가세 포함/미포함)
    const vatInfo = useMemo(() => calcVatAmounts(supplyTotal, paymentMethod), [supplyTotal, paymentMethod]);

    const maxSpread = useMemo(() => Math.max(wStats.spread ?? 0, hStats.spread ?? 0), [wStats.spread, hStats.spread]);
    const shouldRecommendExtraMaterial = maxSpread >= WARN_EXTRA_MATERIAL_MM;
    const shouldRequirePhoto = maxSpread >= WARN_PHOTO_REQUIRED_MM;

    // 10mm 이상이면 메모에 자동 문구
    useEffect(() => {
        if (!shouldRequirePhoto) return;
        const tag = "[오차10mm↑] 현장 확인용 사진 첨부 요청됨";
        setSiteMemo((prev) => {
            if (prev.includes(tag)) return prev;
            return prev ? `${tag}\n${prev}` : tag;
        });
    }, [shouldRequirePhoto]);

    // 입력 완료 시점 오차 음성 안내
    const lastWidthSpokenRef = useRef<string>("");
    const lastHeightSpokenRef = useRef<string>("");

    const isWidthComplete = useMemo(() => widthPoints.every((v) => parsePositiveInt(v) !== null), [widthPoints]);
    const isHeightComplete = useMemo(() => heightPoints.every((v) => parsePositiveInt(v) !== null), [heightPoints]);

    useEffect(() => {
        if (!isWidthComplete) {
            lastWidthSpokenRef.current = "";
            return;
        }

        const wSpread = wStats.spread ?? 0;
        let msg = `가로 실측 완료. 가로 오차는 ${wSpread}밀리미터 입니다.`;
        if (wSpread >= WARN_PHOTO_REQUIRED_MM) {
            msg += ` 오차가 ${WARN_PHOTO_REQUIRED_MM}밀리미터 이상입니다. 사진 첨부가 필요합니다.`;
        } else if (wSpread >= WARN_EXTRA_MATERIAL_MM) {
            msg += ` 오차가 ${WARN_EXTRA_MATERIAL_MM}밀리미터 이상입니다. 추가자재 사용을 권장합니다. ${EXTRA_MATERIAL_COST_TEXT}`;
        }

        if (lastWidthSpokenRef.current === msg) return;
        lastWidthSpokenRef.current = msg;
        speech.speak(msg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isWidthComplete, wStats.spread]);

    useEffect(() => {
        if (!isHeightComplete) {
            lastHeightSpokenRef.current = "";
            return;
        }

        const hSpread = hStats.spread ?? 0;
        let msg = `세로 실측 완료. 세로 오차는 ${hSpread}밀리미터 입니다.`;
        if (hSpread >= WARN_PHOTO_REQUIRED_MM) {
            msg += ` 오차가 ${WARN_PHOTO_REQUIRED_MM}밀리미터 이상입니다. 사진 첨부가 필요합니다.`;
        } else if (hSpread >= WARN_EXTRA_MATERIAL_MM) {
            msg += ` 오차가 ${WARN_EXTRA_MATERIAL_MM}밀리미터 이상입니다. 추가자재 사용을 권장합니다. ${EXTRA_MATERIAL_COST_TEXT}`;
        }

        if (lastHeightSpokenRef.current === msg) return;
        lastHeightSpokenRef.current = msg;
        speech.speak(msg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHeightComplete, hStats.spread]);

    // 사진 선택
    const onPickFiles = (kind: "laser" | "site", files: FileList | null) => {
        if (!files) return;
        const next: Preview[] = [];
        for (const f of Array.from(files)) {
            if (!f.type.startsWith("image/")) continue;
            next.push({ file: f, url: URL.createObjectURL(f), kind });
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

    const laserPhotos = useMemo(() => previews.filter((p) => p.kind === "laser"), [previews]);
    const sitePhotos = useMemo(() => previews.filter((p) => p.kind === "site"), [previews]);

    // 견적 텍스트(고객 확인용)
    const buildEstimateText = () => {
        if (!estimate.isSupported) {
            return `🧾 견적서(고객 확인용)
- 안내: 자동견적 대상 아님 → 제품비는 사무실 확인
- 결재 방식: ${paymentMethod}
- 시공비(표시용/패키지 포함): ${formatWon(displayInstallCost)}
- 총액: 사무실 확인`;
        }

        const warnBlock = estimate.hasMeasureRecommend && estimate.warningText ? `\n\n${estimate.warningText}` : "";
        const extraMaterialLine = detail.includes("원슬라이딩") ? `\n[기본자재]\n- 각바 2EA(원슬라이딩 기본자재)\n` : "";

        const vatBlock = needsVat(paymentMethod)
            ? `\n[결재 방식]\n- ${paymentMethod} (부가세 10% 적용)\n- 공급가: ${formatWon(vatInfo.supplyAmount)}\n- 부가세(10%): ${formatWon(vatInfo.vatAmount)}\n- 결재 합계: ${formatWon(vatInfo.totalPayable)}\n`
            : `\n[결재 방식]\n- ${paymentMethod} (부가세 미적용)\n- 결재 합계: ${formatWon(vatInfo.totalPayable)}\n`;

        return (
            `🧾 견적서(고객 확인용)\n` +
            `- 제품: ${estimate.baseLabel}\n` +
            `- 디자인(프레임): ${selectedDesign?.name ?? "-"} / 유리: ${glass}\n` +
            `- 확정 사이즈: ${confirmedWidth ?? "-"} x ${confirmedHeight ?? "-"} (mm)\n` +
            extraMaterialLine +
            `\n[자재비(도어 패키지)]\n` +
            `- 1조 기준(할인 전): ${formatWon(estimate.totalBeforeDiscount)}\n` +
            `- 1조 기준(할인 후): ${formatWon(estimate.totalAfterDiscount)}\n` +
            `- 수량: ${quantity}조 → 자재비 합계(공급가): ${formatWon(supplyTotal)}\n` +
            `\n[시공비(표시용)]\n` +
            `- 시공비: ${formatWon(displayInstallCost)} (※ 도어 패키지에 포함된 비용을 구분 표시)\n` +
            `\n[고객 결재 안내]\n` +
            vatBlock +
            warnBlock
        );
    };

    // 사무실 전송 텍스트
    const buildOfficeSummaryText = () => {
        const extraMat = detail.includes("원슬라이딩") ? " / 기본자재: 각바2EA" : "";
        const warn = shouldRecommendExtraMaterial
            ? `\n\n⚠️ 오차 안내\n- 가로 오차: ${wStats.spread ?? 0}mm / 세로 오차: ${hStats.spread ?? 0}mm\n- ${maxSpread >= WARN_PHOTO_REQUIRED_MM ? "10mm↑: 사진 첨부 필요" : "5mm↑: 추가자재 권장"
            }\n- ${EXTRA_MATERIAL_COST_TEXT}`
            : "";

        const payBlock = needsVat(paymentMethod)
            ? `\n\n💳 결재 방식\n- ${paymentMethod} (부가세 10% 적용)\n- 공급가: ${formatWon(vatInfo.supplyAmount)}\n- 부가세: ${formatWon(vatInfo.vatAmount)}\n- 결재 합계: ${formatWon(vatInfo.totalPayable)}`
            : `\n\n💳 결재 방식\n- ${paymentMethod} (부가세 미적용)\n- 결재 합계: ${formatWon(vatInfo.totalPayable)}`;

        const fullAddr = `${customerAddress} ${detailAddress}`.trim();

        return (
            `✅ 실측 정보\n` +
            `- 고객: ${customerName}\n` +
            `- 연락처: ${customerPhone}\n` +
            `- 주소: ${fullAddr}\n` +
            `- 시공 위치: ${installLocation}\n` +
            `- 수량: ${quantity}조\n` +
            `- 제품비 입금일: ${depositDate}\n` +
            `- 시공 요청일: ${requestedInstallDate} (${timeSlot})\n` +
            `- 실측자: ${measurerName} (${measurerPhone})\n` +
            `- 문종류: ${category} / ${detail}${extraMat}\n` +
            `- 유리: ${glass}\n` +
            `- 열림 방향(거실→현관 기준): ${openDirection}\n` +
            `- 디자인: ${selectedDesign?.name ?? "-"}\n` +
            `- 확정 가로: ${confirmedWidth ?? "-"}mm\n` +
            `- 확정 세로: ${confirmedHeight ?? "-"}mm\n` +
            `- 할인: ${discountType} / ${discountAmount.toLocaleString("ko-KR")}원\n` +
            `- 레이저레벨 사진: ${laserPhotos.length}장\n` +
            `- 현장사진: ${sitePhotos.length}장\n` +
            `- 고객 서명: ${signature.isEmpty() ? "없음" : "있음"}\n` +
            `\n💰 금액(표시)\n` +
            `- 자재비(도어패키지/공급가): ${estimate.isSupported ? formatWon(supplyTotal) : "사무실 확인"}\n` +
            `- 시공비(표시용/포함): ${formatWon(displayInstallCost)}\n` +
            (estimate.isSupported ? payBlock : "") +
            (siteMemo ? `\n\n📝 특이사항\n${siteMemo}\n` : "") +
            warn +
            `\n\n🔗 카톡 초대 링크(참고): ${KAKAO_OFFICE_INVITE_URL}`
        );
    };

    // 고객 문자
    const buildCustomerSmsText = () => {
        const extraMat = detail.includes("원슬라이딩") ? "\n- 기본자재: 각바 2EA(원슬라이딩)" : "";

        const warnLine = shouldRecommendExtraMaterial
            ? `\n⚠️ 실측 오차 안내\n- 가로 오차: ${wStats.spread ?? 0}mm / 세로 오차: ${hStats.spread ?? 0}mm\n- ${shouldRequirePhoto ? "10mm↑: 사진 첨부가 필요합니다." : "5mm↑: 추가자재 사용을 권장합니다."
            }\n- ${EXTRA_MATERIAL_COST_TEXT}\n`
            : "";

        const moneyBlock = estimate.isSupported
            ? needsVat(paymentMethod)
                ? `\n💰 금액 안내(결재 기준)\n` +
                `- 결재 방식: ${paymentMethod} (부가세 10% 포함)\n` +
                `- 공급가(자재비/수량 포함): ${formatWon(vatInfo.supplyAmount)}\n` +
                `- 부가세(10%): ${formatWon(vatInfo.vatAmount)}\n` +
                `- 결재 합계: ${formatWon(vatInfo.totalPayable)}\n` +
                `\n[참고(표시용)]\n` +
                `- 시공비(표시용/패키지 포함): ${formatWon(displayInstallCost)}\n`
                : `\n💰 금액 안내(결재 기준)\n` +
                `- 결재 방식: ${paymentMethod} (부가세 미포함)\n` +
                `- 결재 합계: ${formatWon(vatInfo.totalPayable)}\n` +
                `\n[참고(표시용)]\n` +
                `- 시공비(표시용/패키지 포함): ${formatWon(displayInstallCost)}\n`
            : `\n💰 금액 안내\n- 제품비: 사무실 확인\n`;

        const fullAddr = `${customerAddress} ${detailAddress}`.trim();

        const baseInfo =
            `📌 림스도어 실측/시공 안내\n` +
            `- 고객: ${customerName || "-"}\n` +
            `- 연락처: ${customerPhone || "-"}\n` +
            `- 주소: ${fullAddr || "-"}\n` +
            `- 시공위치: ${installLocation}\n` +
            `- 수량: ${quantity}조\n` +
            `- 문종류: ${category} / ${detail}\n` +
            `- 유리: ${glass}\n` +
            `- 디자인: ${selectedDesign?.name ?? "-"}\n` +
            `- 열림방향(거실→현관 기준): ${openDirection}\n` +
            `- 확정사이즈: ${confirmedWidth ?? "-"} x ${confirmedHeight ?? "-"} (mm)\n` +
            extraMat +
            `\n🗓️ 일정\n` +
            `- 제품비 입금일(주문일): ${depositDate}\n` +
            `- 시공 요청일: ${requestedInstallDate} (${timeSlot})\n` +
            `- 시공일 지정: 입금일 기준 +10일 이후 날짜로 지정 가능\n` +
            (!earliestIsThisMonth
                ? `- ※ 입금일+10일이 다음 달로 넘어갈 수 있어 사무실에서 최종 조율될 수 있습니다.\n`
                : "");

        const payRule =
            `\n💳 결제 원칙\n` +
            `- 제품비: 주문(발주) 시 입금\n` +
            `- 시공비: 시공 완료 후 입금(※ 도어 패키지에 포함된 비용을 구분 표기)\n`;

        const account = `\n${COMPANY_ACCOUNT_TEXT}\n\n(※ 현장 조건/시공 환경에 따라 변동될 수 있습니다.)`;

        return baseInfo + moneyBlock + warnLine + payRule + account;
    };

    // 전송/서류 전 검증
    const validateBeforeSendOrExport = () => {
        if (!measurerName.trim() || !measurerPhone.trim())
            return "실측자 이름과 연락처를 입력해주세요. (관리자 페이지에서 저장 가능)";
        if (!customerName.trim()) return "고객명을 입력해주세요.";
        if (!customerPhone.trim()) return "고객 연락처를 입력해주세요.";
        if (!customerAddress.trim()) return "고객 주소를 입력해주세요.";

        if (!depositDate) return "제품비 입금일(주문일)을 선택해주세요.";
        if (!requestedInstallDate) return "시공 요청일을 선택해주세요.";
        if (!timeSlot) return "시공 시간(오전/오후)을 선택해주세요.";
        if (!paymentMethod) return "결재 방식을 선택해주세요.";

        if (laserPhotos.length < 1) return "실측 전, 레이저 레벨기 측정 사진을 1장 이상 첨부해주세요.";

        const wOk = widthPoints.every((v) => parsePositiveInt(v) !== null);
        const hOk = heightPoints.every((v) => parsePositiveInt(v) !== null);
        if (!wOk) return `가로 포인트(${req.wReq}개)를 모두 입력해주세요.`;
        if (!hOk) return `세로 포인트(${req.hReq}개)를 모두 입력해주세요.`;

        if (typeof confirmedWidth !== "number" || confirmedWidth <= 0) return "확정 가로값이 유효하지 않습니다.";
        if (typeof confirmedHeight !== "number" || confirmedHeight <= 0) return "확정 세로값이 유효하지 않습니다.";

        if (detail.includes("원슬라이딩") && !slidingMode) return "원슬라이딩 형태(벽부형/오픈형)를 선택해주세요.";
        if (!openDirection) return "도어 열림 방향을 선택해주세요.";

        if (!Number.isFinite(discountAmount) || discountAmount < 0) return "할인 금액이 올바르지 않습니다.";

        if (shouldRequirePhoto && sitePhotos.length < 1) {
            return "오차가 10mm 이상입니다. 현장 상태 확인용 사진(일반 현장사진)을 1장 이상 첨부해주세요.";
        }

        if (signature.isEmpty()) return "고객이 마지막에 서명해야 전송이 가능합니다.";

        return null;
    };

    // 사무실 전송
    const sendOffice = async (text: string) => {
        const officeText = `📌[림스도어 사무실 전송]\n\n${text}\n\n※ 전송 방식 선택:\n- SMS 또는 이메일\n`;

        const shared = await openShareSheet(officeText);
        if (shared) return;

        const hasOfficePhone = !!admin.officePhone?.trim();
        const hasOfficeEmail = !!admin.officeEmail?.trim();

        if (!hasOfficePhone && !hasOfficeEmail) {
            try {
                await navigator.clipboard.writeText(officeText);
                alert(
                    "사무실 전송: 내용이 클립보드에 복사되었습니다.\n관리자 페이지에서 사무실 연락처/이메일을 저장하면 SMS/이메일 전송이 가능합니다."
                );
            } catch {
                alert("사무실 전송 실패: 공유/복사 불가. 관리자 설정을 확인해주세요.");
            }
            return;
        }

        if (hasOfficePhone && hasOfficeEmail) {
            const okSms = confirm("사무실 전송을 SMS로 보내시겠습니까?\n[취소]를 누르면 이메일 작성으로 이동합니다.");
            if (okSms) openSmsComposer(admin.officePhone, officeText);
            else openMailComposer(admin.officeEmail, "[림스도어] 실측 전송", officeText);
            return;
        }

        if (hasOfficePhone) {
            openSmsComposer(admin.officePhone, officeText);
            return;
        }

        openMailComposer(admin.officeEmail, "[림스도어] 실측 전송", officeText);
    };

    // Base64 to File Converter
    const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const sendCustomer = async () => {
        const smsText = buildCustomerSmsText();

        // 1. Try Web Share API with Business Card if available
        if (admin.businessCardImage && navigator.share) {
            const confirmCard = confirm("등록된 '모바일 명함'을 함께 전송하시겠습니까?\n(지원되는 브라우저에서만 이미지가 첨부됩니다)");
            if (confirmCard) {
                try {
                    const file = dataURLtoFile(admin.businessCardImage, `명함_${measurerName}.png`);

                    // Must allow text + files. 
                    // Note: Some apps ignore 'text' if 'files' are present.
                    await navigator.share({
                        text: smsText,
                        files: [file]
                    });
                    return; // Success
                } catch (e: any) {
                    console.warn("Share failed (possibly cancelled or not supported for files):", e);
                    // Fallback to normal SMS if users cancels share or generic error, 
                    // BUT if user cancelled, maybe they don't want to send at all?
                    // Usually correct to fallback to SMS link if share failed technically.
                    if (e.name !== "AbortError") {
                        alert("이미지 공유에 실패하여 텍스트만 전송 창을 엽니다.");
                    } else {
                        return; // User cancelled
                    }
                }
            }
        }

        // 2. Fallback: SMS Link
        openSmsComposer(customerPhone, smsText);
    };

    const send = async (target: SendTarget) => {
        const err = validateBeforeSendOrExport();
        if (err) {
            alert(err);
            return;
        }

        if (shouldRecommendExtraMaterial) {
            const msg = shouldRequirePhoto
                ? `오차가 ${WARN_PHOTO_REQUIRED_MM}밀리미터 이상입니다. 사진 첨부가 필요합니다. ${EXTRA_MATERIAL_COST_TEXT}`
                : `오차가 ${WARN_EXTRA_MATERIAL_MM}밀리미터 이상입니다. 추가자재 사용을 권장합니다. ${EXTRA_MATERIAL_COST_TEXT}`;
            speech.speak(msg);
        }

        const officeText = buildOfficeSummaryText();

        // CRM AUTO-SAVE
        try {
            // 1. Check or Create Customer
            const customerId = customerPhone.replace(/-/g, "").trim() || `unknown-${Date.now()}`;
            const existing = customers.find(c => c.id === customerId);
            if (!existing) {
                addCustomer({
                    id: customerId,
                    name: customerName,
                    phone: customerPhone,
                    address: customerAddress + " " + detailAddress,
                    memo: siteMemo,
                    createdAt: new Date().toISOString().split("T")[0]
                });
            }

            // 2. Create Order
            addOrder({
                id: `ord-${Date.now()}`,
                customerId: customerId,
                tenantId: user?.currentTenantId || "default",
                status: "MEASURED",
                createdAt: new Date().toISOString(),
                measureDate: new Date().toISOString().split("T")[0],
                installDate: requestedInstallDate || undefined,
                estPrice: estimate.totalPrice || 0,
                finalPrice: estimate.totalPrice || 0,
                deposit: 0,
                balance: estimate.totalPrice || 0,
                paymentStatus: "Unpaid",
                items: [{
                    category,
                    detail,
                    location: installLocation,
                    glass,
                    color: "기본",
                    width: confirmedWidth || 0,
                    height: confirmedHeight || 0,
                    quantity: quantity
                }],
                measureFiles: [],
                installFiles: [],
                asHistory: []
            });
            console.log("Auto-saved to CRM Store");
        } catch (e) {
            console.error("Failed to auto-save", e);
        }

        if (target === "office") {
            await sendOffice(officeText);
            return;
        }
        if (target === "customer") {
            await sendCustomer();
            return;
        }
        if (target === "both") {
            await sendOffice(officeText);
            await sendCustomer();
        }
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void send("both");
    };

    const setPoint = (kind: "w" | "h", index: number, value: string) => {
        if (kind === "w") {
            setWidthPoints((prev) => {
                const next = [...prev];
                next[index] = value;
                return next;
            });
        } else {
            setHeightPoints((prev) => {
                const next = [...prev];
                next[index] = value;
                return next;
            });
        }
    };

    // ✨ AI 분석 함수
    const analyzeWithAI = async () => {
        if (!admin.openaiApiKey) {
            alert("관리자 설정(/admin)에서 OpenAI API Key를 먼저 저장해주세요.");
            return;
        }

        const payload = buildOfficeSummaryText();
        const prompt = `다음은 '림스도어' 실측 현장의 정보입니다.
이 정보를 분석하여 다음 내용을 포함한 '시공 리스크 체크리스트'를 작성해 주세요.

1. **현장 요약**: 사이즈, 문종류, 오차 여부를 간단히 요약
2. **주요 리스크 분석**:
   - 실측 오차(가로/세로)에 따른 마감 문제 가능성
   - '원슬라이딩'이나 '3연동' 등 선택된 문 종류에 따른 시공 시 주의사항
   - 엘리베이터 진입 여부나 양중 문제 (사이즈가 클 경우)
3. **시공 전 필수 확인 사항 (Checklist)**
4. **결론 및 권장사항**: 추가자재 필요 여부 등

---
[현장 정보]
${payload}`;

        setIsAiLoading(true);
        setAiResult("");

        try {
            const res = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiKey: admin.openaiApiKey,
                    prompt,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(`AI 분석 오류: ${data.message}`);
                return;
            }

            setAiResult(data.result);
        } catch (e) {
            console.error(e);
            alert("네트워크 오류가 발생했습니다.");
        } finally {
            setIsAiLoading(false);
        }
    };


    // =================================================================
    // STEP RENDERERS
    // =================================================================

    const renderStep1 = () => (
        <div className={styles.animateFadeIn}>
            <div className={styles.sectionTitle}>고객 및 실측자 정보</div>
            <div className={styles.grid2}>
                <label className={styles.label}>
                    <span className={styles.labelText}>고객명</span>
                    <input className={styles.input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="예: 홍길동" />
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>연락처</span>
                    <input className={styles.input} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="예: 010-1234-5678" />
                </label>
                <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                    <span className={styles.labelText}>주소 (GPS 자동)</span>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                            className={styles.input}
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="📍 버튼을 누르면 자동 입력됩니다"
                            readOnly
                            style={{ backgroundColor: "#f9fafb" }}
                        />
                        <button
                            type="button"
                            onClick={async () => {
                                if (!navigator.geolocation) {
                                    alert("GPS를 지원하지 않는 브라우저입니다.");
                                    return;
                                }
                                const confirmGps = confirm("현재 위치를 기반으로 주소를 검색하시겠습니까?");
                                if (!confirmGps) return;
                                try {
                                    const { lat, lng } = await new Promise<{ lat: number, lng: number }>((resolve, reject) => {
                                        navigator.geolocation.getCurrentPosition(
                                            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                                            err => reject(err),
                                            { enableHighAccuracy: true, timeout: 10000 }
                                        );
                                    });
                                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko`);
                                    const data = await res.json();
                                    const region = data.principalSubdivision || "";
                                    const city = data.city || "";
                                    const locality = data.locality || "";
                                    const full = `${region} ${city} ${locality}`.replace(/\s+/g, " ").trim();
                                    if (full) setCustomerAddress(full);
                                    else { alert("주소를 찾을 수 없습니다."); setCustomerAddress("직접 입력 필요"); }
                                } catch (e: any) {
                                    console.error("GPS Error", e);
                                    alert("GPS 정보를 가져오는데 실패했습니다.");
                                }
                            }}
                            style={{ whiteSpace: "nowrap", padding: "0 16px", borderRadius: 8, background: "#3b82f6", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer" }}
                        >
                            📍 내 위치 주소 찾기
                        </button>
                    </div>
                    <span className={styles.labelText} style={{ marginTop: 4 }}>상세 주소 (직접 입력)</span>
                    <input className={styles.input} value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} placeholder="예: 한양아파트 101동 201호" />
                </label>
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
                    <button type="button" className={styles.buttonGhost} onClick={async () => { try { const { lat, lng } = await getCurrentCoords(); openKakaoMaps(lat, lng); } catch { alert("위치 권한 필요"); } }}>🗺️ 지도 열기 (카카오)</button>
                </div>
            </div>
            <div className={styles.sectionTitle} style={{ marginTop: 20 }}>실측자 정보</div>
            <div className={styles.grid2}>
                <label className={styles.label}>
                    <span className={styles.labelText}>이름</span>
                    <input className={styles.input} value={measurerName} onChange={(e) => setMeasurerName(e.target.value)} />
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>연락처</span>
                    <input className={styles.input} value={measurerPhone} onChange={(e) => setMeasurerPhone(e.target.value)} />
                </label>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className={styles.animateFadeIn}>
            <div className={styles.sectionTitle}>도어 옵션 및 사양</div>
            <div className={styles.grid2}>
                <label className={styles.label}>
                    <span className={styles.labelText}>시공 위치</span>
                    <select className={styles.select} value={installLocation} onChange={(e) => setInstallLocation(e.target.value as InstallLocation)}>
                        <option value="현관">현관</option>
                        <option value="드레스룸">드레스룸</option>
                        <option value="알파룸">알파룸</option>
                        <option value="거실">거실</option>
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>수량(조)</span>
                    <select className={styles.select} value={String(quantity)} onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>{n}조</option>)}
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>문 종류</span>
                    <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value as DoorCategory)}>
                        {["자동문", "수동문", "파티션"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>상세 유형</span>
                    <select className={styles.select} value={detail} onChange={(e) => setDetail(e.target.value)}>
                        {DOOR_OPTIONS[category].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <p className={styles.hint}>
                        ✅ 실측 포인트: 가로 {req.wReq} / 세로 {req.hReq}
                        {detail.includes("원슬라이딩") ? " (원슬라이딩: 각바 2EA 기본)" : ""}
                    </p>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>유리 종류</span>
                    <select className={styles.select} value={glass} onChange={(e) => setGlass(e.target.value)}>
                        {GLASS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>열림 방향</span>
                    <select className={styles.select} value={openDirection} onChange={(e) => setOpenDirection(e.target.value as OpenDirection)}>
                        <option value="좌→우 열림">좌→우 (거실→현관 기준)</option>
                        <option value="우→좌 열림">우→좌 (거실→현관 기준)</option>
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>현장 할인</span>
                    <select className={styles.select} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                        <option value="없음">없음</option>
                        <option value="재구매 고객 할인">재구매 고객 할인</option>
                        <option value="조건부 현장 할인">조건부 현장 할인</option>
                        <option value="추가 자재 조건부 무상">추가 자재 조건부 무상</option>
                        <option value="기타">기타</option>
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>할인 금액(원)</span>
                    <input className={styles.input} type="number" value={discountAmountText} onChange={(e) => setDiscountAmountText(e.target.value)} />
                </label>
            </div>

            <div className={styles.sectionTitle} style={{ marginTop: 20 }}>도어 디자인 선택</div>
            <div className={styles.designGrid}>
                {DESIGN_OPTIONS.map((d) => (
                    <button key={d.id} type="button" className={`${styles.designCard} ${designId === d.id ? styles.designCardActive : ""}`} onClick={() => setDesignId(d.id)} title={d.name}>
                        <div className={styles.designThumbWrap}>
                            <img className={styles.designThumb} src={d.img} alt={d.name} onError={(e) => { if (!e.currentTarget.src.endsWith(DESIGN_PLACEHOLDER)) e.currentTarget.src = DESIGN_PLACEHOLDER; }} />
                        </div>
                        <div className={styles.designName}>{d.name}</div>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className={styles.animateFadeIn}>
            <div className={styles.sectionTitle}>1. 레이저 레벨기 측정 (필수 1장↑)</div>
            <div className={styles.photoBar}>
                <input className={styles.file} type="file" accept="image/*" capture="environment" onChange={(e) => onPickFiles("laser", e.target.files)} />
                {laserPhotos.length === 0 && <div className={styles.photoHint} style={{ color: "tomato" }}>📸 아직 사진이 없습니다. (진행 불가)</div>}
            </div>
            {laserPhotos.length > 0 && (
                <div className={styles.photoGrid}>
                    {laserPhotos.map((p, idx) => (
                        <div className={styles.photoItem} key={p.url}>
                            <img className={styles.photoImg} src={p.url} alt="laser" />
                            <button type="button" className={styles.photoRemove} onClick={() => removePreview(previews.findIndex(x => x.url === p.url))}>x</button>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.sectionTitle} style={{ marginTop: 30 }}>2. 실측 포인트 입력 (mm)</div>
            <div className={styles.grid2}>
                <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                    <span className={styles.labelText}>가로 ({req.wReq}개)</span>
                    <div className={styles.grid2}>
                        {widthPoints.map((v, i) => (
                            <input key={`w-${i}`} type="number" inputMode="numeric" className={styles.input} value={v} onChange={(e) => setPoint("w", i, e.target.value)} placeholder={`가로 ${i + 1}`} />
                        ))}
                    </div>
                </label>
                <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                    <span className={styles.labelText}>세로 ({req.hReq}개)</span>
                    <div className={styles.grid2}>
                        {heightPoints.map((v, i) => (
                            <input key={`h-${i}`} type="number" inputMode="numeric" className={styles.input} value={v} onChange={(e) => setPoint("h", i, e.target.value)} placeholder={`세로 ${i + 1}`} />
                        ))}
                    </div>
                </label>
            </div>

            <AutoFillFromAR setW={(val) => setWidthPoints(Array(req.wReq).fill(val))} setH={(val) => setHeightPoints(Array(req.hReq).fill(val))} setMemo={setSiteMemo} />

            <div className={styles.summary} style={{ marginTop: 20 }}>
                <div className={styles.summaryRow}><span className={styles.badge}>확정 가로</span><span className={styles.summaryValue}>{confirmedWidth ?? "-"}mm</span></div>
                <div className={styles.summaryRow}><span className={styles.badge}>확정 세로</span><span className={styles.summaryValue}>{confirmedHeight ?? "-"}mm</span></div>
                <div className={styles.summaryRow} style={{ color: (wStats?.spread || 0) >= 5 ? "tomato" : "inherit" }}><span className={styles.badge}>가로 오차</span><span>{wStats?.spread ?? "-"}mm</span></div>
                <div className={styles.summaryRow} style={{ color: (hStats?.spread || 0) >= 5 ? "tomato" : "inherit" }}><span className={styles.badge}>세로 오차</span><span>{hStats?.spread ?? "-"}mm</span></div>
                {shouldRecommendExtraMaterial && <div className={styles.summaryRow} style={{ gridColumn: "1/-1", color: "orange", fontWeight: "bold" }}>⚠️ {shouldRequirePhoto ? "10mm 이상 (사진필수)" : "5mm 이상 (추가자재 권장)"}</div>}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className={styles.animateFadeIn}>
            <div className={styles.sectionTitle}>현장 사진 (일반)</div>
            <div className={styles.photoBar}>
                <input className={styles.file} type="file" accept="image/*" multiple capture="environment" onChange={(e) => onPickFiles("site", e.target.files)} />
                <div className={styles.photoHint}>사진 여러 장 선택 가능 {shouldRequirePhoto ? "✅ 오차 10mm↑이면 최소 1장 필수" : ""}</div>
            </div>
            {sitePhotos.length > 0 && (
                <div className={styles.photoGrid}>
                    {sitePhotos.map((p) => (
                        <div className={styles.photoItem} key={p.url}>
                            <img className={styles.photoImg} src={p.url} alt="site" />
                            <button type="button" className={styles.photoRemove} onClick={() => removePreview(previews.findIndex(x => x.url === p.url))}>x</button>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.sectionTitle} style={{ marginTop: 30 }}>✨ AI 가상 시공 미리보기</div>
            {sitePhotos.length > 0 ? (
                <button type="button" onClick={() => { if (sitePhotos[0]?.url) { setSiteImage(sitePhotos[0].url); setShowPreviewModal(true); } }} className={styles.buttonGhost} style={{ width: "100%", justifyContent: "center" }}>
                    🎨 가상 시공 실행하기
                </button>
            ) : (
                <div style={{ padding: 20, background: "#f5f5f5", borderRadius: 8, textAlign: "center", color: "#888" }}>현장 사진을 먼저 업로드해주세요.</div>
            )}
            <VirtualPreviewModal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} imageSrc={siteImage || ""} doorOptions={{ category, type: detail, glass, color: (designId !== "design-02") ? "색상 변경" : "화이트" }} />
        </div>
    );

    const renderStep5 = () => (
        <div className={styles.animateFadeIn}>
            <div className={styles.sectionTitle}>일정 및 결제</div>
            <div className={styles.grid2}>
                <label className={styles.label}>
                    <span className={styles.labelText}>입금 예정일</span>
                    <input type="date" className={styles.input} value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>시공 희망일</span>
                    <input type="date" className={styles.input} value={requestedInstallDate} onChange={(e) => setRequestedInstallDate(e.target.value)} />
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>결제 방식</span>
                    <select className={styles.select} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                        <option value="현금결재">현금결재</option>
                        <option value="카드결재">카드결재</option>
                        <option value="세금계산서">세금계산서 발행</option>
                    </select>
                </label>
                <label className={styles.label}>
                    <span className={styles.labelText}>특이사항 메모</span>
                    <textarea className={styles.textarea} value={siteMemo} onChange={(e) => setSiteMemo(e.target.value)} placeholder="예: 엘리베이터 없음, 주차 협소 등" style={{ height: 80 }} />
                </label>
            </div>

            <div className={styles.sectionTitle} style={{ marginTop: 30 }}>고객 서명</div>
            <div className={styles.signatureBox}>
                <canvas
                    ref={signature.canvasRef}
                    className={styles.signatureCanvas}
                    onPointerDown={signature.start}
                    onPointerMove={signature.draw}
                    onPointerUp={signature.end}
                    onPointerLeave={signature.end}
                />
                <button type="button" className={styles.signatureClear} onClick={signature.clear}>서명 초기화</button>
            </div>

            <div className={styles.sectionTitle} style={{ marginTop: 30 }}>최종 확인 및 전송</div>
            <div style={{ whiteSpace: "pre-wrap", background: "#f8f9fa", padding: 16, borderRadius: 8, fontSize: 13, maxHeight: 200, overflowY: "auto", border: "1px solid #ddd" }}>
                {estimateTextForUI}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" className={styles.buttonGhost} onClick={() => send("office")}>🏢 사무실 전송</button>
                <button type="button" className={styles.buttonGhost} onClick={() => send("customer")}>👤 고객 전송</button>
                <button type="button" className={styles.buttonPrimary} style={{ flex: 1 }} onClick={() => send("both")}>🚀 모두 전송 (완료)</button>
            </div>
        </div>
    );



    const estimateTextForUI = useMemo(() => buildEstimateText(), [
        estimate.isSupported,
        estimate.totalBeforeDiscount,
        estimate.totalAfterDiscount,
        estimate.hasMeasureRecommend,
        estimate.warningText,
        glass,
        confirmedWidth,
        confirmedHeight,
        quantity,
        supplyTotal,
        displayInstallCost,
        selectedDesign?.name,
        detail,
        paymentMethod,
        vatInfo.supplyAmount,
        vatInfo.vatAmount,
        vatInfo.totalPayable,
    ]);

    return (
        <>
            <div
                style={{
                    position: "fixed",
                    bottom: 8,
                    right: 8,
                    zIndex: 999999,
                    fontSize: "12px",
                    background: "red",
                    color: "#fff",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    pointerEvents: "none",
                }}
            >
                BUILD 2025-12-22 AR STEP 🔥
            </div>
            <main className={styles.container}>
                <section className={styles.card}>
                    <header className={styles.header}>
                        <h1 className={styles.title}>현장 실측 입력</h1>
                        <p className={styles.subtitle}>옵션 → 레이저레벨 사진 → 실측 → 현장사진 → 일정/결재 → 고객 확인(견적/서명) → 전송</p>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                            <button type="button" className={styles.buttonGhost} onClick={() => router.push("/manage")} style={{ borderColor: "#4f46e5", color: "#4f46e5", fontWeight: "bold" }}>
                                📅 통합 관리 (스케줄)
                            </button>
                            <a className={styles.buttonGhost} href="/admin">
                                ⚙️ 관리자 설정(사무실/실측자)
                            </a>

                            <label className={styles.buttonGhost} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
                                🔊 음성 안내
                            </label>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                <button
                                    type="button"
                                    className={styles.buttonGhost}
                                    style={{ borderColor: "#3b82f6", color: "#3b82f6", cursor: "pointer", width: "100%", justifyContent: "center" }}
                                    onClick={() => {
                                        // Pass current door type options to AR page
                                        const params = new URLSearchParams();
                                        if (category) params.set("category", category);
                                        if (detail) params.set("doorType", detail);
                                        window.location.href = `/field/ar?${params.toString()}`;
                                    }}
                                >
                                    📏 AR 정밀 실측 (베타)
                                </button>
                                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.3 }}>
                                    ※ 시공 위험 판단 보조용 (최종 치수는 레이저 기준)
                                </p>
                            </div>
                        </div>
                    </header>

                    <form className={styles.form} onSubmit={onSubmit}>
                        {/* 고객정보 */}
                        <div className={styles.sectionTitle}>고객 정보</div>
                        <div className={styles.grid2}>
                            <label className={styles.label}>
                                <span className={styles.labelText}>고객명</span>
                                <input className={styles.input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="예: 홍길동" />
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>연락처</span>
                                <input className={styles.input} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="예: 010-1234-5678" />
                            </label>

                            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                                <span className={styles.labelText}>주소 (GPS 자동)</span>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                    <input
                                        className={styles.input}
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                        placeholder="📍 버튼을 누르면 자동 입력됩니다"
                                        readOnly
                                        style={{ backgroundColor: "#f9fafb" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!navigator.geolocation) {
                                                alert("GPS를 지원하지 않는 브라우저입니다.");
                                                return;
                                            }
                                            const confirmGps = confirm("현재 위치를 기반으로 주소를 검색하시겠습니까?");
                                            if (!confirmGps) return;

                                            try {
                                                const { lat, lng } = await new Promise<{ lat: number, lng: number }>((resolve, reject) => {
                                                    navigator.geolocation.getCurrentPosition(
                                                        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                                                        err => reject(err),
                                                        { enableHighAccuracy: true, timeout: 10000 }
                                                    );
                                                });

                                                // Use BigDataCloud Free Reverse Geocoding API (Client-side)
                                                // Note: Needs explicit attribution if used commercially heavily, but fine for low volume internal tool.
                                                // Or better yet, we can use Kakao/Naver if available, but let's try a free open API first.
                                                // https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko

                                                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko`);
                                                const data = await res.json();

                                                // Construct address from data
                                                // Format: { principalSubdivision, city, locality, ... }
                                                const region = data.principalSubdivision || "";
                                                const city = data.city || "";
                                                const locality = data.locality || "";
                                                const w3w = data.plusCode || ""; // Not useful

                                                // Simple construction
                                                const full = `${region} ${city} ${locality}`.replace(/\s+/g, " ").trim();

                                                if (full) {
                                                    setCustomerAddress(full);
                                                    // Auto-focus detail? We need a ref ideally, but user will tap it.
                                                } else {
                                                    alert("주소를 찾을 수 없습니다. 직접 입력해주세요.");
                                                    setCustomerAddress("직접 입력 필요");
                                                }

                                            } catch (e: any) {
                                                console.error("GPS Error", e);
                                                alert("GPS 정보를 가져오는데 실패했습니다: " + e.message);
                                            }
                                        }}
                                        style={{
                                            whiteSpace: "nowrap", padding: "0 16px", borderRadius: 8,
                                            background: "#3b82f6", color: "#fff", border: "none", fontWeight: "bold",
                                            cursor: "pointer"
                                        }}
                                    >
                                        📍 내 위치 주소 찾기
                                    </button>
                                </div>

                                <span className={styles.labelText} style={{ marginTop: 4 }}>상세 주소 (직접 입력)</span>
                                <input
                                    className={styles.input}
                                    value={detailAddress}
                                    onChange={(e) => setDetailAddress(e.target.value)}
                                    placeholder="예: 한양아파트 101동 201호"
                                />
                            </label>

                            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                                <button
                                    type="button"
                                    className={styles.buttonGhost}
                                    onClick={async () => {
                                        try {
                                            const { lat, lng } = await getCurrentCoords();
                                            openKakaoMaps(lat, lng);
                                        } catch {
                                            alert("위치 권한이 필요합니다.");
                                        }
                                    }}
                                >
                                    🗺️ 지도 열기 (카카오)
                                </button>
                                {/* Removed redundant map buttons to save space */}
                            </div>
                        </div>

                        {/* 실측자 */}
                        <div className={styles.sectionTitle}>실측자 정보(자동 기입)</div>
                        <div className={styles.grid2}>
                            <label className={styles.label}>
                                <span className={styles.labelText}>실측자 이름</span>
                                <input className={styles.input} value={measurerName} onChange={(e) => setMeasurerName(e.target.value)} placeholder="예: 임도경" />
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>실측자 연락처</span>
                                <input className={styles.input} value={measurerPhone} onChange={(e) => setMeasurerPhone(e.target.value)} placeholder="예: 010-0000-0000" />
                            </label>
                        </div>

                        {/* 옵션 */}
                        <div className={styles.sectionTitle}>옵션</div>
                        <div className={styles.grid2}>
                            <label className={styles.label}>
                                <span className={styles.labelText}>시공 위치</span>
                                <select className={styles.select} value={installLocation} onChange={(e) => setInstallLocation(e.target.value as InstallLocation)}>
                                    <option value="현관">현관</option>
                                    <option value="드레스룸">드레스룸</option>
                                    <option value="알파룸">알파룸</option>
                                    <option value="거실">거실</option>
                                </select>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>수량(조)</span>
                                <select className={styles.select} value={String(quantity)} onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}>
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={String(n)}>
                                            {n}조
                                        </option>
                                    ))}
                                </select>
                                <p className={styles.hint}>※ 2조 이상 구매도 선택 가능합니다.</p>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>문 종류</span>
                                <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value as DoorCategory)}>
                                    <option value="자동문">자동문</option>
                                    <option value="수동문">수동문</option>
                                    <option value="파티션">파티션</option>
                                </select>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>상세 유형</span>
                                <select className={styles.select} value={detail} onChange={(e) => setDetail(e.target.value)}>
                                    {DOOR_OPTIONS[category].map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                                <p className={styles.hint}>
                                    ✅ 실측 포인트 자동 제안: <b>가로 {req.wReq}포인트 / 세로 {req.hReq}포인트</b>
                                    {detail.includes("원슬라이딩") ? (
                                        <>
                                            <br />
                                            ✅ 원슬라이딩 확정치: <b>가로=최대 / 세로=최소</b> / 기본자재: <b>각바 2EA</b>
                                        </>
                                    ) : (
                                        <>
                                            <br />
                                            ✅ 확정치: <b>가로=최소 / 세로=최소</b>
                                        </>
                                    )}
                                </p>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>유리 종류</span>
                                <select className={styles.select} value={glass} onChange={(e) => setGlass(e.target.value)}>
                                    {GLASS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>도어 열림 방향</span>
                                <select className={styles.select} value={openDirection} onChange={(e) => setOpenDirection(e.target.value as OpenDirection)}>
                                    <option value="좌→우 열림">좌에서 우측 열림 (거실→현관 기준)</option>
                                    <option value="우→좌 열림">우에서 좌측 열림 (거실→현관 기준)</option>
                                </select>
                                <p className={styles.hint}>
                                    기준: <b>(거실에서 현관을 바로 보며)</b>
                                </p>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>현장 할인 종류</span>
                                <select className={styles.select} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                                    <option value="없음">없음</option>
                                    <option value="재구매 고객 할인">재구매 고객 할인</option>
                                    <option value="조건부 현장 할인">조건부 현장 할인</option>
                                    <option value="추가 자재 조건부 무상">추가 자재 조건부 무상</option>
                                    <option value="기타">기타</option>
                                </select>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>현장 할인 금액(원)</span>
                                <input
                                    className={styles.input}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={discountAmountText}
                                    onChange={(e) => setDiscountAmountText(e.target.value)}
                                    placeholder="예: 30000"
                                />
                                <p className={styles.hint}>※ 실측자가 현장에서 수동으로 입력합니다.</p>
                            </label>
                        </div>

                        {detail.includes("원슬라이딩") && (
                            <>
                                <div className={styles.sectionTitle}>원슬라이딩 형태</div>
                                <div className={styles.grid2}>
                                    <label className={styles.label}>
                                        <span className={styles.labelText}>형태 선택</span>
                                        <select className={styles.select} value={slidingMode} onChange={(e) => setSlidingMode(e.target.value as SlidingMode)}>
                                            <option value="벽부형">벽부형(한쪽 면이 벽면에 닫힘)</option>
                                            <option value="오픈형">오픈형(좌우 프레임이 벽면에 닫힘)</option>
                                        </select>
                                    </label>
                                </div>
                            </>
                        )}

                        {/* Auto-fill from AR */}
                        <AutoFillFromAR
                            setW={(val) => setWidthPoints(Array(req.wReq).fill(val))}
                            setH={(val) => setHeightPoints(Array(req.hReq).fill(val))}
                            setMemo={setSiteMemo}
                        />

                        {/* AI Modal */}
                        <VirtualPreviewModal
                            isOpen={showPreviewModal}
                            onClose={() => setShowPreviewModal(false)}
                            imageSrc={siteImage || ""}
                            doorOptions={{
                                category: category,
                                type: detail,
                                // Add more options if available in state
                            }}
                        />



                        {/* 레이저레벨 사진 */}
                        <div className={styles.sectionTitle}>실측 전 필수 사진 (레이저 레벨기 측정)</div>
                        <div className={styles.photoBar}>
                            <input className={styles.file} type="file" accept="image/*" capture="environment" onChange={(e) => onPickFiles("laser", e.target.files)} />
                            <div className={styles.photoHint}>✅ 레이저레벨기로 수평/수직 측정하는 장면을 1장 이상 첨부해야 전송 가능합니다.</div>
                        </div>

                        {laserPhotos.length > 0 && (
                            <div className={styles.photoGrid}>
                                {laserPhotos.map((p, idx) => {
                                    const realIdx = previews.findIndex((x) => x.url === p.url);
                                    return (
                                        <div className={styles.photoItem} key={p.url}>
                                            <img className={styles.photoImg} src={p.url} alt={`레이저레벨-${idx + 1}`} />
                                            <button type="button" className={styles.photoRemove} onClick={() => removePreview(realIdx)}>
                                                삭제
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 실측 */}
                        <div className={styles.sectionTitle}>실측 (mm) - 포인트 입력</div>
                        <div className={styles.grid2}>
                            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                                <span className={styles.labelText}>가로 포인트 ({req.wReq}개)</span>
                                <div className={styles.grid2}>
                                    {widthPoints.map((v, i) => (
                                        <input
                                            key={`w-${i}`}
                                            type="number"
                                            inputMode="numeric"
                                            className={styles.input}
                                            value={v}
                                            onChange={(e) => setPoint("w", i, e.target.value)}
                                            placeholder={`가로 ${i + 1}포인트 (예: 1250)`}
                                        />
                                    ))}
                                </div>
                                <p className={styles.hint}>
                                    가로 오차: <b>{wStats.spread ?? 0}mm</b>{" "}
                                    {(wStats.spread ?? 0) >= WARN_PHOTO_REQUIRED_MM
                                        ? "📸(10mm↑)"
                                        : (wStats.spread ?? 0) >= WARN_EXTRA_MATERIAL_MM
                                            ? "⚠️(5mm↑)"
                                            : ""}
                                </p>
                            </label>

                            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                                <span className={styles.labelText}>세로 포인트 ({req.hReq}개)</span>
                                <div className={styles.grid2}>
                                    {heightPoints.map((v, i) => (
                                        <input
                                            key={`h-${i}`}
                                            type="number"
                                            inputMode="numeric"
                                            className={styles.input}
                                            value={v}
                                            onChange={(e) => setPoint("h", i, e.target.value)}
                                            placeholder={`세로 ${i + 1}포인트 (예: 2300)`}
                                        />
                                    ))}
                                </div>
                                <p className={styles.hint}>
                                    세로 오차: <b>{hStats.spread ?? 0}mm</b>{" "}
                                    {(hStats.spread ?? 0) >= WARN_PHOTO_REQUIRED_MM
                                        ? "📸(10mm↑)"
                                        : (hStats.spread ?? 0) >= WARN_EXTRA_MATERIAL_MM
                                            ? "⚠️(5mm↑)"
                                            : ""}
                                </p>
                            </label>
                        </div>

                        {/* 확정값 */}
                        <div className={styles.summary}>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>확정 가로</span>
                                <span className={styles.summaryValue}>{confirmedWidth ?? "-"}mm</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>확정 세로</span>
                                <span className={styles.summaryValue}>{confirmedHeight ?? "-"}mm</span>
                            </div>

                            {shouldRecommendExtraMaterial && (
                                <div className={styles.summaryRow} style={{ gridColumn: "1 / -1" }}>
                                    <span className={styles.badge}>오차 안내</span>
                                    <span className={styles.summaryValue}>
                                        <b>{shouldRequirePhoto ? "10mm 이상" : "5mm 이상"}</b> →{" "}
                                        {shouldRequirePhoto ? " 사진 첨부 필요" : " 추가자재(마감재) 권장"} / {EXTRA_MATERIAL_COST_TEXT}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 디자인 */}
                        <div className={styles.sectionTitle}>도어 디자인 선택</div>
                        <div className={styles.designGrid}>
                            {DESIGN_OPTIONS.map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    className={`${styles.designCard} ${designId === d.id ? styles.designCardActive : ""}`}
                                    onClick={() => setDesignId(d.id)}
                                    title={d.name}
                                >
                                    <div className={styles.designThumbWrap}>
                                        <img
                                            className={styles.designThumb}
                                            src={d.img}
                                            alt={d.name}
                                            onError={(e) => {
                                                if (e.currentTarget.src.endsWith(DESIGN_PLACEHOLDER)) return;
                                                e.currentTarget.src = DESIGN_PLACEHOLDER;
                                            }}
                                        />
                                    </div>
                                    <div className={styles.designName}>{d.name}</div>
                                </button>
                            ))}
                        </div>

                        {/* 현장 사진 */}
                        <div className={styles.sectionTitle}>현장 사진 첨부(일반)</div>
                        <div className={styles.photoBar}>
                            <input className={styles.file} type="file" accept="image/*" multiple capture="environment" onChange={(e) => onPickFiles("site", e.target.files)} />
                            <div className={styles.photoHint}>사진 여러 장 선택 가능 {shouldRequirePhoto ? "✅ 오차 10mm↑이면 최소 1장 필수" : ""}</div>
                        </div>

                        {sitePhotos.length > 0 && (
                            <div className={styles.photoGrid}>
                                {sitePhotos.map((p) => {
                                    const realIdx = previews.findIndex((x) => x.url === p.url);
                                    return (
                                        <div className={styles.photoItem} key={p.url}>
                                            <img className={styles.photoImg} src={p.url} alt={`현장사진`} />
                                            <button type="button" className={styles.photoRemove} onClick={() => removePreview(realIdx)}>
                                                삭제
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* AI 가상 시공 (New Section) */}
                        <div className={styles.sectionTitle}>✨ AI 가상 시공 미리보기</div>
                        <div style={{ marginBottom: 30, padding: "0 4px" }}>
                            {sitePhotos.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (sitePhotos[0]?.url) {
                                            setSiteImage(sitePhotos[0].url);
                                            setShowPreviewModal(true);
                                        }
                                    }}
                                    style={{
                                        width: "100%", padding: "16px", borderRadius: "12px",
                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                        color: "#fff", border: "none", fontWeight: "bold", fontSize: "1.1rem",
                                        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
                                        cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"
                                    }}
                                >
                                    <span>🪄</span>
                                    <span>가상 시공 실행하기 (AI)</span>
                                </button>
                            ) : (
                                <div style={{
                                    padding: "16px", background: "#f5f5f5", borderRadius: "12px",
                                    color: "#aaa", textAlign: "center", fontSize: "0.95rem",
                                    border: "1px dashed #ddd"
                                }}>
                                    👆 먼저 현장 사진을 첨부하면 활성화됩니다
                                </div>
                            )}
                            <p style={{ fontSize: 13, color: "#666", marginTop: 10, textAlign: "center", lineHeight: "1.4" }}>
                                현재 선택된 <b>{category} {detail}</b> 옵션으로<br />
                                예상 시공 모습을 미리 확인해보세요.
                            </p>
                        </div>

                        {/* 비고 */}
                        <div className={styles.sectionTitle}>특이사항(오차 10mm↑이면 자동 문구 삽입)</div>
                        <label className={styles.label}>
                            <textarea className={styles.textarea} value={siteMemo} onChange={(e) => setSiteMemo(e.target.value)} placeholder="예) 추가 자재 필요 / 특이사항" />
                        </label>

                        {/* ✅ 일정 + ✅ 결재 방식 */}
                        <div className={styles.sectionTitle}>일정(입금/시공) + 결재 방식</div>
                        <div className={styles.grid2}>
                            <label className={styles.label}>
                                <span className={styles.labelText}>제품비 입금일(주문일)</span>
                                <input className={styles.input} type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
                                <p className={styles.hint}>※ 시공일 지정 기준이 되는 날짜입니다.</p>
                            </label>

                            <label className={styles.label}>
                                <span className={styles.labelText}>시공 시간</span>
                                <select className={styles.select} value={timeSlot} onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}>
                                    <option value="오전">오전</option>
                                    <option value="오후">오후</option>
                                </select>
                            </label>

                            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                                <span className={styles.labelText}>시공 요청일</span>
                                <input
                                    className={styles.input}
                                    type="date"
                                    value={requestedInstallDate}
                                    min={requestedMin}
                                    max={requestedMax}
                                    onChange={(e) => onChangeRequestedInstallDate(e.target.value)}
                                />
                                <p className={styles.hint}>
                                    ✅ 달력 선택 가능 (연/월은 <b>{fixedY}년 {fixedM}월</b> 자동 고정, <b>일자만</b> 반영)
                                    <br />
                                    ✅ 규칙: <b>입금일 기준 +10일 이후</b>로 시공일 지정 가능
                                    {!earliestIsThisMonth && (
                                        <>
                                            <br />
                                            ⚠️ <b>입금일+10일이 다음 달</b>로 넘어갈 수 있어, 시공일은 사무실에서 최종 조율될 수 있습니다.
                                        </>
                                    )}
                                </p>
                            </label>

                            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                                <span className={styles.labelText}>결재 방식</span>
                                <select className={styles.select} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                                    <option value="현금결재">현금결재(부가세 미적용)</option>
                                    <option value="현금영수증">현금영수증(부가세 10% 적용)</option>
                                    <option value="세금계산서">세금계산서(부가세 10% 적용)</option>
                                    <option value="카드결재">카드결재(부가세 10% 적용)</option>
                                </select>

                                {estimate.isSupported ? (
                                    <p className={styles.hint}>
                                        {needsVat(paymentMethod) ? (
                                            <>
                                                ✅ 부가세 10% 적용 안내: 공급가 <b>{formatWon(vatInfo.supplyAmount)}</b> + 부가세{" "}
                                                <b>{formatWon(vatInfo.vatAmount)}</b> = 결재 합계 <b>{formatWon(vatInfo.totalPayable)}</b>
                                            </>
                                        ) : (
                                            <>
                                                ✅ 부가세 미적용 안내: 결재 합계 <b>{formatWon(vatInfo.totalPayable)}</b>
                                            </>
                                        )}
                                    </p>
                                ) : (
                                    <p className={styles.hint}>※ 자동견적 대상이 아니면 금액은 사무실 확인입니다.</p>
                                )}
                            </label>
                        </div>

                        {/* 고객 확인 */}
                        <div className={styles.sectionTitle}>고객 확인 (전송 전 확인)</div>
                        <div className={styles.summary}>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>고객</span>
                                <span className={styles.summaryValue}>
                                    {customerName || "-"} / {customerPhone || "-"}
                                </span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>주소</span>
                                <span className={styles.summaryValue}>{customerAddress || "-"}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>일정</span>
                                <span className={styles.summaryValue}>
                                    입금일 {depositDate} / 시공요청 {requestedInstallDate} ({timeSlot})
                                </span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>결재</span>
                                <span className={styles.summaryValue}>
                                    {paymentMethod} {estimate.isSupported ? ` / 결재 합계 ${formatWon(vatInfo.totalPayable)}` : ""}
                                </span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>시공/수량</span>
                                <span className={styles.summaryValue}>
                                    {installLocation} / {quantity}조
                                </span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>옵션</span>
                                <span className={styles.summaryValue}>
                                    {category} / {detail} / {glass} / {openDirection}
                                </span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>디자인</span>
                                <span className={styles.summaryValue}>{selectedDesign?.name ?? "-"}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>확정치</span>
                                <span className={styles.summaryValue}>
                                    {confirmedWidth ?? "-"} x {confirmedHeight ?? "-"} (mm)
                                </span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>레이저레벨</span>
                                <span className={styles.summaryValue}>{laserPhotos.length}장</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.badge}>현장사진</span>
                                <span className={styles.summaryValue}>{sitePhotos.length}장</span>
                            </div>
                        </div>

                        {/* 견적서 */}
                        <div className={styles.sectionTitle}>견적서 (고객 확인용)</div>
                        <div className={styles.quoteBox}>
                            <pre className={styles.quotePre}>{estimateTextForUI}</pre>
                            <p className={styles.hint}>
                                ✅ 결재 방식이 <b>현금영수증/세금계산서/카드결재</b>이면 <b>부가세 10%</b>가 자동 포함되어 고객에게 안내됩니다.
                                <br />
                                ✅ <b>현금결재</b>는 원래 계산(부가세 미적용)대로 고지됩니다.
                            </p>
                        </div>

                        {/* 고객 서명 */}
                        <div className={styles.sectionTitle}>고객 서명 (전송 필수)</div>
                        <div className={styles.signatureBox}>
                            <canvas
                                ref={signature.canvasRef}
                                width={500}
                                height={180}
                                className={styles.signatureCanvas}
                                onPointerDown={(e) => signature.start(e)}
                                onPointerMove={(e) => signature.draw(e)}
                                onPointerUp={signature.end}
                                onPointerLeave={signature.end}
                            />
                            <div className={styles.signatureActions}>
                                <button type="button" className={styles.buttonGhost} onClick={signature.clear}>
                                    서명 다시하기
                                </button>
                            </div>
                            <p className={styles.hint}>※ 고객 서명이 없으면 전송이 불가합니다.</p>
                        </div>

                        {/* 액션 */}
                        <div className={styles.actions}>
                            <button className={styles.button} type="button" onClick={() => void send("office")}>
                                사무실로 전송(공유/SMS/이메일)
                            </button>

                            <button className={styles.buttonGhost} type="button" onClick={() => void send("customer")}>
                                고객용 전송(문자 작성)
                            </button>

                            <button className={styles.buttonStrong} type="submit">
                                사무실 + 고객 동시 전송
                            </button>

                            <button
                                type="button"
                                className={styles.buttonGhost}
                                onClick={() => {
                                    const msg =
                                        `실측 오차 안내입니다. ` +
                                        `가로 오차 ${wStats.spread ?? 0}밀리미터, ` +
                                        `세로 오차 ${hStats.spread ?? 0}밀리미터 입니다. ` +
                                        (shouldRequirePhoto
                                            ? `오차가 ${WARN_PHOTO_REQUIRED_MM}밀리미터 이상이므로 사진 첨부가 필요합니다.`
                                            : shouldRecommendExtraMaterial
                                                ? `오차가 ${WARN_EXTRA_MATERIAL_MM}밀리미터 이상이므로 추가자재 사용을 권장합니다. ${EXTRA_MATERIAL_COST_TEXT}`
                                                : "");
                                    speech.speak(msg);
                                }}
                                title="오차/권장사항 음성 안내"
                            >
                                🔊 오차 안내 음성 다시 듣기
                            </button>

                            <button
                                type="button"
                                className={styles.buttonGhost}
                                onClick={() => void analyzeWithAI()}
                                disabled={isAiLoading}
                                style={{ position: "relative" }}
                            >
                                {isAiLoading ? "🤖 AI 분석 중..." : "🤖 AI 시공 리스크 분석 (앱 내 실행)"}
                            </button>
                        </div>
                    </form>
                </section>

                {/* AI 분석 결과 모달 (간단 구현) */}
                {aiResult && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(0,0,0,0.8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 16,
                            zIndex: 9999,
                        }}
                    >
                        <div
                            style={{
                                background: "#111827",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: 16,
                                width: "min(600px, 100%)",
                                maxHeight: "80vh",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                            }}
                        >
                            <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#fff" }}>🤖 AI 시공 리스크 분석 결과</h2>
                                <button
                                    onClick={() => setAiResult("")}
                                    style={{ background: "transparent", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}
                                >
                                    &times;
                                </button>
                            </div>
                            <div style={{ padding: 16, overflowY: "auto", flex: 1, color: "#e5e7eb", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                {aiResult}
                            </div>
                            <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => {
                                        setAiResult("");
                                        // 필요하면 메모에 추가하는 기능 등 확장 가능
                                    }}
                                    style={{
                                        background: "#374151",
                                        color: "#fff",
                                        border: "none",
                                        padding: "10px 16px",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        fontWeight: 700
                                    }}
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* AI Coaching Timeline (Visible if events exist) */}
            {timelineEvents.length > 0 && (
                <div style={{ margin: "20px 16px 80px", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <Timeline events={timelineEvents} segments={sentimentSegments} />
                    <button
                        onClick={() => setShowCoaching(true)}
                        style={{ width: "100%", padding: 12, borderTop: "1px solid #eee", background: "none", color: "#3b82f6", fontWeight: "bold", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, cursor: "pointer" }}
                    >
                        📊 코칭 리포트 보기
                    </button>
                </div>
            )}

            {/* AI Recording Widget (Floating) */}
            <RecordingWidget
                status={recorder.status}
                onStart={recorder.startRecording}
                onStop={recorder.stopRecording}
                onPause={recorder.pauseRecording}
                onResume={recorder.resumeRecording}
            />

            {/* Coaching Report Modal */}
            <CoachingReport
                isOpen={showCoaching}
                onClose={() => setShowCoaching(false)}
                data={coachingData}
            />

            {/* AR Auto-fill from URL params */}
            <AutoFillFromAR
                setW={handleSetAutoW}
                setH={handleSetAutoH}
                setMemo={setSiteMemo}
            />
        </>
    );
}

// ----------------------------------------------------------------------
// Helper for AR Params
// ----------------------------------------------------------------------
function AutoFillFromAR({
    setW, setH, setMemo
}: {
    setW: (v: string) => void;
    setH: (v: string) => void;
    setMemo: React.Dispatch<React.SetStateAction<string>>;
}) {
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);

        const w = params.get("width");
        const h = params.get("height");

        // Risk Data
        const riskLevel = params.get("riskLevel"); // NORMAL, WARNING, DANGER
        const maxStepMm = params.get("maxStepMm");
        const maxAngle = params.get("maxAngle");
        const extraMat = params.get("extraMaterial") === "true";
        const photoReq = params.get("photoRequired") === "true";

        let msg = "";
        if (riskLevel === "DANGER") {
            msg += `[🚨AR 위험감지] 단차 ${maxStepMm}mm / 각도 ${maxAngle}° -> 사진첨부 필수/관리자 확인 요망\n`;
        } else if (riskLevel === "WARNING") {
            msg += `[⚠️AR 주의감지] 단차 ${maxStepMm}mm / 각도 ${maxAngle}° -> 추가자재 권장\n`;
        }

        if (w && h) {
            setW(w);
            setH(h);

            if (msg) {
                setMemo(prev => msg + prev);
                alert(`AR 실측 데이터 적용됨!\n\n${msg}\n(가로:${w}, 세로:${h})`);
            } else {
                // Simple toast
                const timer = setTimeout(() => alert(`AR 실측값 적용됨!\n(가로:${w}, 세로:${h})`), 300);
            }

            // Clean URL
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [setW, setH, setMemo]);
    return null;
}
