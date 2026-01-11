"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLeveling } from "../../lib/useLeveling";
import { calcGap, calcVerticalError, evaluateRisk, THRESHOLD } from "../../lib/arUtils";

// ==========================================
// Types
// ==========================================
type ReferenceObject = {
    id: string;
    name: string;
    sizeMm: number;
};

type TemplateStep = {
    label: string;
    mode: "width" | "height";
};

type MeasureTemplate = {
    name: string;
    steps: TemplateStep[];
};

// Default Templates
const TEMPLATE_DEFAULT: MeasureTemplate = {
    name: "기본(1개소)",
    steps: [
        { label: "가로(폭)", mode: "width" },
        { label: "세로(높이)", mode: "height" },
    ]
};
const TEMPLATE_COMPLEX: MeasureTemplate = {
    name: "정밀(3개소)",
    steps: [
        { label: "가로 상단", mode: "width" },
        { label: "가로 중간", mode: "width" },
        { label: "가로 하단", mode: "width" },
        { label: "세로 좌측", mode: "height" },
        { label: "세로 중간", mode: "height" },
        { label: "세로 우측", mode: "height" },
    ]
};

const STORAGE_KEY_ADMIN = "limsdoor_admin_settings_v1";

export default function ArPage() {
    // ==========================================
    // State
    // ==========================================
    const [status, setStatus] = useState("초기화 중...");
    const [isArRunning, setIsArRunning] = useState(false);
    const [scanState, setScanState] = useState<"LOW" | "MED" | "HIGH">("LOW");

    // Config
    const [doorType, setDoorType] = useState("");
    const [refObjects, setRefObjects] = useState<ReferenceObject[]>([]);
    const [selectedRefId, setSelectedRefId] = useState<string>("");

    // Calibration
    const [scaleFactor, setScaleFactor] = useState(1.0);
    const [isCalibrated, setIsCalibrated] = useState(false);

    // Workflow
    const [mode, setMode] = useState<"calibration" | "measurement" | "complete">("measurement");
    const [template, setTemplate] = useState<MeasureTemplate>(TEMPLATE_DEFAULT);
    const [stepIdx, setStepIdx] = useState(0);

    // Data Store
    const [results, setResults] = useState<number[]>([]);
    const [activePoints, setActivePoints] = useState<THREE.Mesh[]>([]);
    const [calibPoints, setCalibPoints] = useState<THREE.Mesh[]>([]);

    // Precision Guide Data
    const [referencePlane, setReferencePlane] = useState<{ point: THREE.Vector3, normal: THREE.Vector3 } | null>(null);
    const [liveGap, setLiveGap] = useState(0); // mm
    const [liveAngle, setLiveAngle] = useState(0); // deg (Vertical Error)
    const [maxGapDetected, setMaxGapDetected] = useState(0);
    const [maxAngleDetected, setMaxAngleDetected] = useState(0);

    // Leveling
    const [useLevelingAssist, setUseLevelingAssist] = useState(true);
    const leveling = useLeveling(useLevelingAssist);

    // ThreeJS Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const reticleRef = useRef<THREE.Group | null>(null);
    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const reticleValidRef = useRef(false);

    // ================= PATCH START: Scan Plane Refs + UI Stable =================
    const scanGroupRef = useRef<THREE.Group | null>(null);
    const scanPlaneRef = useRef<THREE.Mesh | null>(null);
    const scanBorderRef = useRef<THREE.LineSegments | null>(null);
    const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const scanCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const scanTextureRef = useRef<THREE.CanvasTexture | null>(null);

    // stable 판단(렌더루프용)
    const highStableMsRef = useRef(0);
    const lastTimeRef = useRef<number | null>(null);
    const highStableRef = useRef(false);

    // UI 강조용 state(변화할 때만 업데이트)
    const [isHighStableUI, setIsHighStableUI] = useState(false);
    // ================= PATCH END =================

    // ================= PATCH START: Opening Corner Auto + Drag =================
    type CornerKey = "TL" | "TR" | "BR" | "BL";
    type Corner2 = { x: number; y: number }; // scanPlane local 좌표(PlaneGeometry 기준)

    // scanPlane(0.9 x 2.1) 기준 local 좌표: x ∈ [-0.45, 0.45], y ∈ [-1.05, 1.05]
    const PLANE_W = 0.9;
    const PLANE_H = 2.1;
    const HALF_W = PLANE_W / 2;
    const HALF_H = PLANE_H / 2;

    // ================= PATCH START: Opening UX Upgrades =================
    const MARGIN_RATIO_BASE = 0.92;          // 기본 여유
    const MARGIN_RATIO_TIGHT = 0.96;         // 좀 더 꽉 차게
    const CORNER_HIT_RADIUS = 0.07;          // 드래그 히트 반경(월드 단위 아님, local 비교용)
    const CORNER_MIN_SIZE_W = 0.35;          // 최소 폭(미터)
    const CORNER_MIN_SIZE_H = 0.75;          // 최소 높이(미터)

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    function normalizeCorners(c: Record<CornerKey, Corner2>) {
        // 좌/우, 상/하를 강제 정렬해서 TL/TR/BR/BL이 뒤집히지 않게 스냅
        const xs = [c.TL.x, c.TR.x, c.BR.x, c.BL.x].sort((a, b) => a - b);
        const ys = [c.TL.y, c.TR.y, c.BR.y, c.BL.y].sort((a, b) => a - b);

        const left = xs[0];
        const right = xs[3];
        const top = ys[3];
        const bottom = ys[0];

        // 최소 크기 강제(문틀처럼 보이도록)
        let L = left, R = right, T = top, B = bottom;

        const minHalfW = CORNER_MIN_SIZE_W / 2;
        const minHalfH = CORNER_MIN_SIZE_H / 2;

        // 가운데 기준으로 최소 폭/높이 보장
        const cx = (L + R) / 2;
        const cy = (T + B) / 2;

        const halfW = Math.max((R - L) / 2, minHalfW);
        const halfH = Math.max((T - B) / 2, minHalfH);

        L = clamp(cx - halfW, -HALF_W, HALF_W);
        R = clamp(cx + halfW, -HALF_W, HALF_W);
        B = clamp(cy - halfH, -HALF_H, HALF_H);
        T = clamp(cy + halfH, -HALF_H, HALF_H);

        return {
            TL: { x: L, y: T },
            TR: { x: R, y: T },
            BR: { x: R, y: B },
            BL: { x: L, y: B },
        } as Record<CornerKey, Corner2>;
    }

    function getNearestCornerKey(
        localX: number,
        localY: number,
        c: Record<CornerKey, Corner2>
    ): CornerKey | null {
        // local 좌표 기준으로 가장 가까운 코너를 잡는다(레이캐스터 없이도 동작)
        let best: { k: CornerKey; d: number } | null = null;
        (Object.keys(c) as CornerKey[]).forEach((k) => {
            const dx = c[k].x - localX;
            const dy = c[k].y - localY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (!best || d < best.d) best = { k, d };
        });
        if (!best) return null;
        return best.d <= CORNER_HIT_RADIUS ? best.k : best.k; // 반경 체크를 엄격히 하려면 조건 추가
    }

    // ================= PATCH START: Edge Snap =================
    const SNAP_PX = 18; // 체감 스냅 거리(픽셀 느낌). 실제는 local거리로 변환해서 사용
    const SNAP_LOCAL = 0.06; // local 좌표(미터) 기준 스냅 거리(권장 0.04~0.08)

    // 문틀 스캔 면 경계(plane bounds)
    const EDGE_L = -HALF_W;
    const EDGE_R = +HALF_W;
    const EDGE_T = +HALF_H;
    const EDGE_B = -HALF_H;

    function snapToEdgesLocal(x: number, y: number) {
        // 경계에 가까우면 딸깍 붙이기
        let sx = x;
        let sy = y;

        if (Math.abs(x - EDGE_L) < SNAP_LOCAL) sx = EDGE_L;
        else if (Math.abs(x - EDGE_R) < SNAP_LOCAL) sx = EDGE_R;

        if (Math.abs(y - EDGE_T) < SNAP_LOCAL) sy = EDGE_T;
        else if (Math.abs(y - EDGE_B) < SNAP_LOCAL) sy = EDGE_B;

        return { x: sx, y: sy };
    }

    // “현재 박스” 기준으로 스냅(좌/우/상/하 라인에 붙는 느낌)
    // - 사용자가 TL을 움직이면 left/top에 더 잘 붙도록 유도 가능
    function snapCornerWithBias(
        key: CornerKey,
        x: number,
        y: number,
        c: Record<CornerKey, Corner2>
    ) {
        // 1) 먼저 plane 바깥 경계 스냅
        let p = snapToEdgesLocal(x, y);

        // 2) 다음으로 "현재 사각형의 라인"에 스냅(문서스캔 느낌)
        // 현재 사각형 라인
        const box = normalizeCorners(c);
        const L = box.TL.x;
        const R = box.TR.x;
        const T = box.TL.y;
        const B = box.BL.y;

        // 코너별로 더 자연스러운 라인에 우선 스냅(바이어스)
        const snapLine = (v: number, target: number) =>
            Math.abs(v - target) < SNAP_LOCAL ? target : v;

        if (key === "TL") {
            p.x = snapLine(p.x, L);
            p.y = snapLine(p.y, T);
        } else if (key === "TR") {
            p.x = snapLine(p.x, R);
            p.y = snapLine(p.y, T);
        } else if (key === "BR") {
            p.x = snapLine(p.x, R);
            p.y = snapLine(p.y, B);
        } else if (key === "BL") {
            p.x = snapLine(p.x, L);
            p.y = snapLine(p.y, B);
        }

        return p;
    }
    // ================= PATCH END =================

    const [openingMode, setOpeningMode] = useState(false); // 개구부 자동 보정 모드
    const [cornersLocal, setCornersLocal] = useState<Record<CornerKey, Corner2> | null>(null);

    // Sync Ref for Loop Access
    const cornersLocalRef = useRef<Record<CornerKey, Corner2> | null>(null);

    const draggingCornerRef = useRef<CornerKey | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const pointerNdcRef = useRef(new THREE.Vector2());
    const cornerMeshesRef = useRef<Record<CornerKey, THREE.Mesh> | null>(null);

    const openingOnceInitRef = useRef(false); // HIGH에서 1회 자동배치 여부
    // ================= PATCH END =================

    // ================= PATCH START: HUD Auto Hide =================
    const HUD_IDLE_MS = 2000; // 2초 무입력 시 숨김
    const [hudVisible, setHudVisible] = useState(true);
    const hudLastInputRef = useRef<number>(Date.now());
    const hudVisibleRef = useRef(true);
    // ================= PATCH END =================

    // ================= PATCH START: Single FAB UX =================
    const [fabOpen, setFabOpen] = useState(false);
    const fabPressTimerRef = useRef<number | null>(null);
    // ================= PATCH END =================

    // ================= PATCH START: AI Explain Layer (Text + TTS) =================
    const [aiText, setAiText] = useState<string>("");
    const [aiToast, setAiToast] = useState<string>(""); // 짧은 상태 토스트
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [ttsSpeaking, setTtsSpeaking] = useState(false);

    const lastAnnounceRef = useRef<number>(0);
    const lastAnnounceKeyRef = useRef<string>("");
    // ================= PATCH END =================

    // Logic Refs
    const refPlaneRef = useRef<{ point: THREE.Vector3, normal: THREE.Vector3 } | null>(null);
    const maxValsRef = useRef({ gap: 0, angle: 0 });

    // Load Settings
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const dType = params.get("doorType") || "";
        setDoorType(dType);

        if (dType.includes("3연동") || dType.includes("3슬라이딩")) {
            setTemplate(TEMPLATE_COMPLEX);
        } else {
            setTemplate(TEMPLATE_DEFAULT);
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY_ADMIN);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.referenceObjects)) {
                    setRefObjects(parsed.referenceObjects);
                    if (parsed.referenceObjects.length > 0) setSelectedRefId(parsed.referenceObjects[0].id);
                }
            }
        } catch { }
    }, []);

    // Sync Ref
    useEffect(() => {
        refPlaneRef.current = referencePlane;
    }, [referencePlane]);

    // Sync Corners Ref
    useEffect(() => {
        cornersLocalRef.current = cornersLocal;
    }, [cornersLocal]);

    // ================= PATCH START: HUD Auto Hide Loop =================
    useEffect(() => {
        if (!isArRunning) {
            hudVisibleRef.current = true;
            setHudVisible(true);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const idle = now - hudLastInputRef.current;

            // 경고가 떠있는 동안엔 HUD 숨기지 않는 옵션(안전)
            const warningOn =
                liveGap >= THRESHOLD.GAP_WARNING_MM ||
                liveAngle >= THRESHOLD.ANGLE_WARNING_DEG;

            if (!warningOn && idle >= HUD_IDLE_MS) {
                if (hudVisibleRef.current) {
                    hudVisibleRef.current = false;
                    setHudVisible(false);
                }
            }
        };

        const id = window.setInterval(tick, 150);

        // 입력 이벤트: 탭/드래그/스크롤/키 입력시 HUD 깨우기
        const onAnyInput = () => bumpHud();

        window.addEventListener("pointerdown", onAnyInput, { passive: true });
        window.addEventListener("pointermove", onAnyInput, { passive: true });
        window.addEventListener("wheel", onAnyInput, { passive: true });
        window.addEventListener("keydown", onAnyInput);

        return () => {
            window.clearInterval(id);
            window.removeEventListener("pointerdown", onAnyInput);
            window.removeEventListener("pointermove", onAnyInput);
            window.removeEventListener("wheel", onAnyInput);
            window.removeEventListener("keydown", onAnyInput);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isArRunning, liveGap, liveAngle]);
    // ================= PATCH END =================

    // ================= PATCH START: HUD Input Handler =================
    const bumpHud = () => {
        hudLastInputRef.current = Date.now();
        if (!hudVisibleRef.current) {
            hudVisibleRef.current = true;
            setHudVisible(true);
        }
    };
    // ================= PATCH END =================

    // ================= PATCH START: AI Explain Helpers =================
    const buildExplainText = (args: {
        widthMm?: number;
        heightMm?: number;
        gapMm: number;
        angleDeg: number;
        riskLevel: string;
        photoRequired: boolean;
        extraMaterialRecommended: boolean;
    }) => {
        const { widthMm, heightMm, gapMm, angleDeg, riskLevel, photoRequired, extraMaterialRecommended } = args;

        const sizePart =
            widthMm && heightMm ? `예상 사이즈는 가로 ${widthMm}mm, 세로 ${heightMm}mm 입니다. ` : "";

        const riskPart =
            riskLevel === "DANGER"
                ? "현재 오차가 커서 시공 리스크가 높습니다. "
                : riskLevel === "WARNING"
                    ? "현재 오차가 있어 추가 확인이 필요합니다. "
                    : "현재 상태는 비교적 안정적입니다. ";

        const detailPart = `단차는 약 ${gapMm.toFixed(1)}mm, 수직오차는 ${angleDeg.toFixed(1)}도 입니다. `;

        const actionPart =
            photoRequired
                ? "사진 첨부가 필수입니다. 문틀 상단과 바닥면을 정면으로 다시 촬영해 주세요. "
                : extraMaterialRecommended
                    ? "추가 자재 사용을 권장합니다. 마감재 또는 보강재를 준비해 주세요. "
                    : "이대로 캡처하거나 확정해도 됩니다. ";

        return (sizePart + riskPart + detailPart + actionPart).trim();
    };

    const speak = (text: string) => {
        if (!ttsEnabled) return;
        if (typeof window === "undefined") return;
        const synth = window.speechSynthesis;
        if (!synth) return;

        try {
            synth.cancel(); // 겹침 방지
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "ko-KR";
            u.rate = 1.05;
            u.pitch = 1.0;

            u.onstart = () => setTtsSpeaking(true);
            u.onend = () => setTtsSpeaking(false);
            u.onerror = () => setTtsSpeaking(false);

            synth.speak(u);
        } catch {
            // ignore
        }
    };

    const stopSpeak = () => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        synth.cancel();
        setTtsSpeaking(false);
    };
    // ================= PATCH END =================

    // ================= PATCH START: Risk Label Normalize =================
    const normalizeRisk = (riskLevel: string) => {
        const v = (riskLevel || "").toUpperCase();
        if (v.includes("DANGER") || v.includes("HIGH") || v.includes("RISK")) return "DANGER";
        if (v.includes("WARN") || v.includes("MID")) return "WARNING";
        return "OK";
    };
    // ================= PATCH END =================

    // Scene Setup
    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        // Reticle
        const reticle = new THREE.Group();
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        reticleRef.current = reticle;

        // ================= PATCH START: Scan Group Setup =================
        const scanGroup = new THREE.Group();
        scanGroup.visible = false;
        scene.add(scanGroup);
        scanGroupRef.current = scanGroup;

        // Scan Canvas / Texture
        const scanCanvas = document.createElement("canvas");
        scanCanvas.width = 512;
        scanCanvas.height = 1024;
        const scanCtx = scanCanvas.getContext("2d");
        if (scanCtx) {
            scanCanvasRef.current = scanCanvas;
            scanCtxRef.current = scanCtx;

            const scanTexture = new THREE.CanvasTexture(scanCanvas);
            scanTexture.minFilter = THREE.LinearFilter;
            scanTexture.magFilter = THREE.LinearFilter;
            scanTexture.wrapS = scanTexture.wrapT = THREE.ClampToEdgeWrapping;
            scanTextureRef.current = scanTexture;

            // Scan Plane (문틀 느낌: 세로 직사각형)
            const planeGeo = new THREE.PlaneGeometry(0.9, 2.1);
            const planeMat = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.16,
                map: scanTexture,
                side: THREE.DoubleSide,
                depthWrite: false,
            });

            const scanPlane = new THREE.Mesh(planeGeo, planeMat);
            scanPlaneRef.current = scanPlane;
            scanGroup.add(scanPlane);

            // Border
            const edges = new THREE.EdgesGeometry(planeGeo);
            const border = new THREE.LineSegments(
                edges,
                new THREE.LineBasicMaterial({
                    color: 0x00ffb0,
                    transparent: true,
                    opacity: 0.8,
                })
            );
            scanBorderRef.current = border;
            scanGroup.add(border);

            // ================= PATCH START: Outside Mask (scan-app 느낌) =================
            const maskGeo = new THREE.PlaneGeometry(2.4, 3.2); // scanPlane보다 크게
            const maskMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const maskPlane = new THREE.Mesh(maskGeo, maskMat);

            // scanPlane은 밝게, maskPlane은 어둡게. "구멍"을 내기 위해 stencil 대신 간단히 2장 구조로 구현:
            // 1) 큰 어두운 면(maskPlane)
            // 2) 작은 밝은 면(scanPlane + 텍스처)
            // → 시각적으로 '스캔 영역만 밝다' 효과
            scanGroup.add(maskPlane);

            // maskPlane을 scanPlane보다 살짝 뒤로
            maskPlane.position.z = -0.002;
            // ================= PATCH END =================

            // ================= PATCH START: Corner Meshes Setup =================
            if (scanGroup && scanPlane) {
                const makeCorner = () =>
                    new THREE.Mesh(
                        new THREE.SphereGeometry(0.018),
                        new THREE.MeshBasicMaterial({ color: 0x00ffb0 })
                    );

                const TL = makeCorner();
                const TR = makeCorner();
                const BR = makeCorner();
                const BL = makeCorner();

                // 처음엔 숨김 (openingMode에서만 표시)
                TL.visible = TR.visible = BR.visible = BL.visible = false;

                scanGroup.add(TL, TR, BR, BL);

                cornerMeshesRef.current = { TL, TR, BR, BL };
            }
            // ================= PATCH END =================
        }
        // ================= PATCH END =================


        // Render Loop
        renderer.setAnimationLoop((time, frame) => {
            if (!frame) return;
            const session = renderer.xr.getSession();
            if (!session) return;

            // Hit Test Init
            if (!hitTestSourceRef.current) {
                session.requestReferenceSpace("viewer")?.then((refSpace) => {
                    session.requestHitTestSource?.({ space: refSpace })?.then((source) => {
                        hitTestSourceRef.current = source;
                    });
                });
            }

            if (hitTestSourceRef.current) {
                const refSpace = renderer.xr.getReferenceSpace();
                if (refSpace) {
                    const hitResults = frame.getHitTestResults(hitTestSourceRef.current);
                    if (hitResults.length > 0) {
                        const hit = hitResults[0];
                        const pose = hit.getPose(refSpace);
                        if (pose) {
                            reticle.visible = true;
                            reticle.matrix.fromArray(pose.transform.matrix);
                            reticleValidRef.current = true;

                            // -- Calc Normal & Pos --
                            const mat = reticleRef.current!.matrix;
                            const pos = new THREE.Vector3().setFromMatrixPosition(mat);
                            const normal = new THREE.Vector3();
                            mat.extractBasis(new THREE.Vector3(), normal, new THREE.Vector3());

                            // Angle
                            const ang = calcVerticalError(normal);
                            setLiveAngle(ang);
                            if (ang > maxValsRef.current.angle) {
                                maxValsRef.current.angle = ang;
                                setMaxAngleDetected(ang);
                            }

                            // Gap
                            let currentGap = 0;
                            if (refPlaneRef.current) {
                                const gap = calcGap(pos, refPlaneRef.current.normal, refPlaneRef.current.point);
                                currentGap = gap;
                                setLiveGap(gap);
                                if (gap > maxValsRef.current.gap) {
                                    maxValsRef.current.gap = gap;
                                    setMaxGapDetected(gap);
                                }
                            }

                            const gap = currentGap; // Alias for the patch block

                            // ================= PATCH START: Vertical Scan Plane Logic =================
                            const scanGroup = scanGroupRef.current;
                            const scanPlane = scanPlaneRef.current;
                            const scanBorder = scanBorderRef.current;
                            const scanCanvas = scanCanvasRef.current;
                            const scanCtx = scanCtxRef.current;
                            const scanTexture = scanTextureRef.current;

                            // dt 계산 (reticle 유무 상관없이 time 기반 누적)
                            if (lastTimeRef.current === null) lastTimeRef.current = time;
                            const dt = time - lastTimeRef.current;
                            lastTimeRef.current = time;

                            if (scanGroup && scanPlane && scanCanvas && scanCtx && scanTexture) {
                                // hit-test 유효할 때만 표시
                                const valid = reticleValidRef.current;
                                scanGroup.visible = valid;

                                if (valid) {
                                    // --- 위치: z-fighting 방지 (표면에서 살짝 띄움) ---
                                    scanGroup.position.copy(pos).add(normal.clone().multiplyScalar(0.01));

                                    // --- 문틀처럼 "세로로 서는" 방향 계산 ---
                                    const worldUp = new THREE.Vector3(0, 1, 0);
                                    const forward = normal.clone().normalize();

                                    let right = new THREE.Vector3().crossVectors(worldUp, forward);
                                    if (right.length() < 0.001) right.set(1, 0, 0);
                                    right.normalize();

                                    const up = new THREE.Vector3().crossVectors(forward, right).normalize();

                                    const basis = new THREE.Matrix4().makeBasis(right, up, forward);
                                    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
                                    scanGroup.quaternion.copy(q);

                                    // --- HIGH 안정화 조건: ang/gap(현재 프레임 값)로 판단 ---
                                    const stable =
                                        ang < THRESHOLD.ANGLE_WARNING_DEG &&
                                        (refPlaneRef.current ? gap < THRESHOLD.GAP_WARNING_MM : true);

                                    if (stable) {
                                        highStableMsRef.current += dt;
                                    } else {
                                        highStableMsRef.current = 0;
                                        highStableRef.current = false;
                                    }

                                    if (highStableMsRef.current >= 400) {
                                        highStableRef.current = true;
                                    }

                                    if (highStableRef.current !== isHighStableUI) {
                                        setIsHighStableUI(highStableRef.current);
                                    }

                                    // --- 상태별 시각 연출 ---
                                    const isHigh = highStableRef.current;
                                    (scanPlane.material as THREE.MeshBasicMaterial).opacity = isHigh ? 0.26 : 0.16;
                                    if (scanBorder) (scanBorder.material as THREE.LineBasicMaterial).opacity = isHigh ? 1.0 : 0.8;

                                    // ================= PATCH START: Better Auto Placement =================
                                    if (isHigh && openingMode) {
                                        if (!openingOnceInitRef.current || !cornersLocalRef.current) {
                                            // 각도/단차가 아주 안정적이면 좀 더 꽉 차게, 아니면 기본 여유
                                            const veryStable =
                                                ang < THRESHOLD.ANGLE_WARNING_DEG * 0.6 &&
                                                (!refPlaneRef.current || gap < THRESHOLD.GAP_WARNING_MM * 0.6);

                                            const ratio = veryStable ? MARGIN_RATIO_TIGHT : MARGIN_RATIO_BASE;

                                            const mX = HALF_W * ratio;
                                            const mY = HALF_H * ratio;

                                            const initial = normalizeCorners({
                                                TL: { x: -mX, y: +mY },
                                                TR: { x: +mX, y: +mY },
                                                BR: { x: +mX, y: -mY },
                                                BL: { x: -mX, y: -mY },
                                            });

                                            // Use State Setter via Ref loop trick or just call state
                                            // But we are in a loop. We need to dispatch state update.
                                            // Earlier "setCornersLocal" call implies we can call it.
                                            setCornersLocal(initial);
                                            openingOnceInitRef.current = true;
                                        }
                                    } else {
                                        openingOnceInitRef.current = false;
                                    }
                                    // ================= PATCH END =================

                                    // 코너 메쉬 위치 업데이트(있을 때만)
                                    const cornerMeshes = cornerMeshesRef.current;
                                    const curCorners = cornersLocalRef.current;
                                    if (cornerMeshes && curCorners) {
                                        const show = openingMode && reticleValidRef.current;
                                        (Object.keys(cornerMeshes) as CornerKey[]).forEach((k) => {
                                            cornerMeshes[k].visible = show;
                                        });

                                        if (show) {
                                            // scanPlane local 좌표를 scanGroup local로 배치 (plane z=0)
                                            cornerMeshes.TL.position.set(curCorners.TL.x, curCorners.TL.y, 0);
                                            cornerMeshes.TR.position.set(curCorners.TR.x, curCorners.TR.y, 0);
                                            cornerMeshes.BR.position.set(curCorners.BR.x, curCorners.BR.y, 0);
                                            cornerMeshes.BL.position.set(curCorners.BL.x, curCorners.BL.y, 0);
                                        }

                                        // ================= PATCH START: Corner Highlight While Dragging =================
                                        const draggingKey = draggingCornerRef.current;
                                        (Object.keys(cornerMeshes) as CornerKey[]).forEach((k) => {
                                            cornerMeshes[k].scale.setScalar(draggingKey === k ? 1.25 : 1.0);
                                        });
                                        // ================= PATCH END =================
                                    }
                                    // ================= PATCH END =================

                                    // --- 스캔 애니메이션 (HIGH면 거의 정지 느낌) ---
                                    const w = scanCanvas.width;
                                    const h = scanCanvas.height;

                                    scanCtx.clearRect(0, 0, w, h);

                                    // 배경(연한 그라디언트)
                                    const bg = scanCtx.createLinearGradient(0, 0, 0, h);
                                    bg.addColorStop(0, "rgba(0,255,180,0.05)");
                                    bg.addColorStop(0.5, "rgba(0,255,180,0.09)");
                                    bg.addColorStop(1, "rgba(0,255,180,0.05)");
                                    scanCtx.fillStyle = bg;
                                    scanCtx.fillRect(0, 0, w, h);

                                    // 스캔 라인: MED에서 이동, HIGH에서 약화
                                    const speed = isHigh ? 0.08 : 0.6; // HIGH일수록 거의 멈춤
                                    const y = ((time * speed) / 20) % h;

                                    const grad = scanCtx.createLinearGradient(0, y - 60, 0, y + 60);
                                    grad.addColorStop(0, "rgba(0,255,180,0)");
                                    grad.addColorStop(0.5, isHigh ? "rgba(0,255,180,0.35)" : "rgba(0,255,180,0.95)");
                                    grad.addColorStop(1, "rgba(0,255,180,0)");

                                    scanCtx.fillStyle = grad;
                                    scanCtx.fillRect(0, y - 60, w, 120);

                                    scanTexture.needsUpdate = true;
                                } else {
                                    if (isHighStableUI) setIsHighStableUI(false);
                                }
                            }
                            // ================= PATCH END =================

                            // ================= PATCH START: Auto AI Toast/Explain (Loop) =================
                            const riskNow = evaluateRisk(maxValsRef.current.gap, maxValsRef.current.angle);
                            const riskLevelNow = normalizeRisk(riskNow.riskLevel);

                            const toast =
                                riskLevelNow === "DANGER"
                                    ? "🚨 위험: 오차 큼 (사진필수)"
                                    : riskLevelNow === "WARNING"
                                        ? "⚠️ 주의: 추가자재 권장"
                                        : (highStableRef.current ? "✅ 안정: 지금 캡처 추천" : "🔎 표면 탐색 중");

                            if (toast !== aiToast) setAiToast(toast);

                            // 1.2초에 한 번만 “의미 있게 바뀌었을 때” 자동 음성 안내 (스팸 방지)
                            const now = Date.now();
                            const key = `${riskLevelNow}-${highStableRef.current ? "H" : "M"}-${Math.round(ang * 10)}-${Math.round((refPlaneRef.current ? gap : 0) * 10)}`;
                            const canAnnounce = now - lastAnnounceRef.current > 1200 && key !== lastAnnounceKeyRef.current;

                            if (canAnnounce) {
                                lastAnnounceRef.current = now;
                                lastAnnounceKeyRef.current = key;

                                const explain = buildExplainText({
                                    gapMm: refPlaneRef.current ? gap : 0,
                                    angleDeg: ang,
                                    riskLevel: riskLevelNow,
                                    photoRequired: !!riskNow.photoRequired,
                                    extraMaterialRecommended: !!riskNow.extraMaterialRecommended,
                                });

                                setAiText(explain);

                                // DANGER/WARNING 또는 안정(HIGH) 진입 시만 읽어주기(필요하면 조건 완화 가능)
                                if (riskLevelNow !== "OK" || highStableRef.current) {
                                    speak(explain);
                                }
                            }
                            // ================= PATCH END =================

                        }
                    } else {
                        reticleRef.current!.visible = false;
                        reticleValidRef.current = false;
                        // Hide scan group if tracking lost
                        if (scanGroupRef.current) scanGroupRef.current.visible = false;
                        highStableMsRef.current = 0;
                        highStableRef.current = false;
                        setScanState("LOW");
                        // also sync custom UI
                        if (isHighStableUI) setIsHighStableUI(false);
                    }
                }
            }
            renderer.render(scene, camera);
        });

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onResize);

        return () => {
            if (rendererRef.current) rendererRef.current.setAnimationLoop(null);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    // Actions
    const startAR = async () => {
        if (!window.isSecureContext) {
            alert(
                "⚠️ 보안 컨텍스트 오류 (HTTPS 필요)\n\n" +
                "현재 IP 접속(HTTP) 중이므로 AR이 차단됩니다.\n" +
                "해결 방법:\n" +
                "1. Chrome 주소창에 'chrome://flags' 입력\n" +
                "2. 'Insecure origins treated as secure' 검색\n" +
                "3. 'Enabled' 설정 후 IP 주소 입력 및 재실행"
            );
            return;
        }
        if (!navigator.xr) {
            return alert("⚠️ 이 기기는 WebXR(AR)을 지원하지 않습니다.\n(Chrome 브라우저 또는 안드로이드 기기 필요)");
        }
        if (useLevelingAssist && !leveling.permissionGranted) {
            await leveling.requestPermission();
        }

        try {
            const session = await (navigator as any).xr.requestSession("immersive-ar", {
                requiredFeatures: ["hit-test"],
                optionalFeatures: ["dom-overlay", "plane-detection"],
                domOverlay: { root: document.body }
            });

            if (rendererRef.current) {
                rendererRef.current.xr.setReferenceSpaceType("local");
                rendererRef.current.xr.setSession(session);
            }

            session.addEventListener("end", () => setIsArRunning(false));
            setIsArRunning(true);

            // Reset Data
            setResults([]);
            setCalibPoints([]);
            setActivePoints([]);
            setStepIdx(0);
            setReferencePlane(null);
            setMaxGapDetected(0);
            setMaxAngleDetected(0);
            maxValsRef.current = { gap: 0, angle: 0 };

            // Reset Patch State
            setScanState("LOW");
            setIsHighStableUI(false);
            highStableMsRef.current = 0;
            highStableRef.current = false;

            // Reset Corners
            setOpeningMode(false);
            setCornersLocal(null);
            openingOnceInitRef.current = false;

            // Reset FAB
            setFabOpen(false);

            if (selectedRefId) {
                const refObj = refObjects.find(r => r.id === selectedRefId);
                setMode("calibration");
                setStatus(refObj ? `[보정] ${refObj.name} 측정` : "측정 대기");
            } else {
                setMode("measurement");
                setStatus("첫 번째 지점(기준)을 찍으세요");
            }
        } catch (e: any) {
            alert(`AR 세션 시작 실패: ${e.message}\n(WebXR 권한 거부 또는 호환성 문제)`);
        }
    };

    const onCapture = () => {
        if (!reticleValidRef.current || !sceneRef.current) return;

        const mat = reticleRef.current!.matrix;
        const pos = new THREE.Vector3().setFromMatrixPosition(mat);
        const normal = new THREE.Vector3();
        mat.extractBasis(new THREE.Vector3(), normal, new THREE.Vector3());

        // Visual Marker
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.015),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        mesh.position.copy(pos);
        sceneRef.current.add(mesh);

        if (mode === 'calibration') {
            handleCalibration(mesh);
        } else if (mode === 'measurement') {
            if (!referencePlane) {
                setReferencePlane({ point: pos, normal: normal });
                setStatus("기준면 설정됨. 이제 단차를 확인하며 측정하세요.");
            }
            handleMeasurement(mesh);
        }
    };

    const handleCalibration = (mesh: THREE.Mesh) => {
        const next = [...calibPoints, mesh];
        setCalibPoints(next);

        if (next.length === 2) {
            const measuredM = next[0].position.distanceTo(next[1].position);
            const refObj = refObjects.find(r => r.id === selectedRefId);
            if (refObj) {
                const factor = refObj.sizeMm / (measuredM * 1000);
                setScaleFactor(factor);
                alert(`보정 완료! 계수: ${factor.toFixed(3)}`);
            }
            next.forEach(m => m.visible = false);
            setCalibPoints([]);
            setMode("measurement");
            setStatus("측정 시작 (기준면 설정 대기)");
        }
    };

    const handleMeasurement = (mesh: THREE.Mesh) => {
        const next = [...activePoints, mesh];
        setActivePoints(next);

        if (next.length === 2) {
            drawLine(next[0].position, next[1].position, 0xffff00);

            const rawM = next[0].position.distanceTo(next[1].position);
            const valMm = Math.round(rawM * 1000 * scaleFactor);

            setResults([...results, valMm]);
            setActivePoints([]);

            const nextIdx = stepIdx + 1;
            if (nextIdx < template.steps.length) {
                setStepIdx(nextIdx);
                setStatus(`[${valMm}mm] 다음: ${template.steps[nextIdx].label}`);
            } else {
                setMode("complete");
                setStatus("측정 완료. 결과 확인 후 전송하세요.");
            }
        }
    };

    const drawLine = (p1: THREE.Vector3, p2: THREE.Vector3, color: number) => {
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([p1, p2]),
            new THREE.LineBasicMaterial({ color, linewidth: 3 })
        );
        sceneRef.current?.add(line);
    };

    const onConfirm = () => {
        const widths = results.filter((_, i) => template.steps[i].mode === 'width');
        const heights = results.filter((_, i) => template.steps[i].mode === 'height');
        const avgW = widths.length ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : 0;
        const avgH = heights.length ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : 0;

        const risk = evaluateRisk(maxGapDetected, maxAngleDetected);

        const params = new URLSearchParams();
        params.set("width", String(avgW));
        params.set("height", String(avgH));
        params.set("riskLevel", risk.riskLevel);
        params.set("maxStepMm", String(risk.maxStepMm));
        params.set("maxAngle", String(risk.maxAngle));
        params.set("extraMaterial", String(risk.extraMaterialRecommended));
        params.set("photoRequired", String(risk.photoRequired));

        window.location.href = `/field/new?${params.toString()}`;
    };

    // UI Helpers
    const getRiskColor = (val: number, warn: number, danger: number) => {
        if (val >= danger) return "red";
        if (val >= warn) return "yellow";
        return "lime";
    };

    // ================= PATCH START: FAB Helpers =================
    const getFabLabel = () => {
        if (openingMode && cornersLocal) return "확정";
        return "캡처";
    };

    const onFabClick = () => {
        if (openingMode && cornersLocal) {
            // 개구부 확정 로직 재사용
            const cg = scanGroupRef.current;
            if (!cg) return;

            const toWorld = (c: { x: number; y: number }) => {
                const v = new THREE.Vector3(c.x, c.y, 0);
                cg.localToWorld(v);
                return v;
            };

            const TL = toWorld(cornersLocal.TL);
            const TR = toWorld(cornersLocal.TR);
            const BL = toWorld(cornersLocal.BL);

            const widthM = TL.distanceTo(TR);
            const heightM = TL.distanceTo(BL);

            const widthMm = Math.round(widthM * 1000 * scaleFactor);
            const heightMm = Math.round(heightM * 1000 * scaleFactor);

            const risk = evaluateRisk(maxGapDetected, maxAngleDetected);

            const params = new URLSearchParams();
            params.set("width", String(widthMm));
            params.set("height", String(heightMm));
            params.set("riskLevel", risk.riskLevel);
            params.set("maxStepMm", String(risk.maxStepMm));
            params.set("maxAngle", String(risk.maxAngle));
            params.set("extraMaterial", String(risk.extraMaterialRecommended));
            params.set("photoRequired", String(risk.photoRequired));

            params.set(
                "riskSummary",
                encodeURIComponent(
                    JSON.stringify({
                        widthMm,
                        heightMm,
                        gapMm: maxGapDetected,
                        angleDeg: maxAngleDetected,
                        riskLevel: normalizeRisk(risk.riskLevel),
                        photoRequired: !!risk.photoRequired,
                        extraMaterialRecommended: !!risk.extraMaterialRecommended,
                    })
                )
            );

            // ================= PATCH START: Detail Announce before Redirect =================
            const finalText = buildExplainText({
                widthMm,
                heightMm,
                gapMm: liveGap,
                angleDeg: liveAngle,
                riskLevel: normalizeRisk(risk.riskLevel),
                photoRequired: !!risk.photoRequired,
                extraMaterialRecommended: !!risk.extraMaterialRecommended,
            });
            setAiText(finalText);
            speak(finalText);
            // ================= PATCH END =================

            window.location.href = `/field/new?${params.toString()}`;
        } else {
            onCapture();
        }
    };
    // ================= PATCH END =================

    return (
        <div
            style={{ position: "relative", width: "100%", height: "100vh", background: "#000", overflow: "hidden" }}
            // ================= PATCH START: Better Corner Pick (plane hit -> nearest corner) =================
            onPointerDown={(e) => {
                // ================= PATCH START: HUD Input Handler =================
                bumpHud();
                // ================= PATCH END =================

                if (!openingMode || !cornersLocal || !scanPlaneRef.current || !cameraRef.current || !rendererRef.current) return;

                const rect = (rendererRef.current.domElement as HTMLCanvasElement).getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
                pointerNdcRef.current.set(x, y);

                const raycaster = raycasterRef.current;
                raycaster.setFromCamera(pointerNdcRef.current, cameraRef.current);

                // 먼저 scanPlane을 맞춰서 local 좌표 획득
                const hits = raycaster.intersectObject(scanPlaneRef.current, true);
                if (hits.length === 0) return;

                const p = hits[0].point.clone();
                scanGroupRef.current?.worldToLocal(p);

                // local좌표에서 가장 가까운 코너 선택
                draggingCornerRef.current = getNearestCornerKey(p.x, p.y, cornersLocal);
            }}
            // ================= PATCH END =================

            onPointerMove={(e) => {
                // ================= PATCH START: HUD Input Handler =================
                bumpHud();
                // ================= PATCH END =================

                if (!openingMode) return;
                const dragging = draggingCornerRef.current;
                if (!dragging) return;
                if (!cornersLocal || !scanPlaneRef.current || !cameraRef.current || !rendererRef.current) return;

                // 화면 좌표 -> NDC
                const rect = (rendererRef.current.domElement as HTMLCanvasElement).getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
                pointerNdcRef.current.set(x, y);

                const raycaster = raycasterRef.current;
                raycaster.setFromCamera(pointerNdcRef.current, cameraRef.current);

                // scanPlane과 교차해서 plane local 좌표 얻기
                const hits = raycaster.intersectObject(scanPlaneRef.current, true);
                if (hits.length === 0) return;

                const p = hits[0].point.clone(); // world
                // world -> scanPlane local(=scanGroup local)
                scanGroupRef.current?.worldToLocal(p);

                // clamp to plane bounds
                const nx = Math.max(-HALF_W, Math.min(HALF_W, p.x));
                const ny = Math.max(-HALF_H, Math.min(HALF_H, p.y));

                // ================= PATCH START: Apply Edge Snap on Drag =================
                const snapped = snapCornerWithBias(dragging, nx, ny, cornersLocal);

                const updated = {
                    ...cornersLocal,
                    [dragging]: { x: snapped.x, y: snapped.y },
                } as Record<CornerKey, Corner2>;

                // 항상 코너 정렬/스냅(뒤집힘 방지)
                setCornersLocal(normalizeCorners(updated));
                // ================= PATCH END =================
            }}
            onPointerUp={() => {
                draggingCornerRef.current = null;
            }}
            onPointerCancel={() => {
                draggingCornerRef.current = null;
            }}
        >
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

            {/* START SCREEN */}
            {!isArRunning && (
                <div style={overlayStyle}>
                    <h1>📐 AR 정밀 실측 가이드 (v3)</h1>
                    <button onClick={startAR} style={bigBtnStyle}>측정 시작</button>

                    <div style={{ marginTop: 20, textAlign: "left", fontSize: 13, color: "#ccc" }}>
                        <p>✅ <b>스캔 면 확인</b>: 녹색 사각형이 나타날 때까지 이동하세요</p>
                        <p>✅ <b>안정화</b>: 녹색 빛이 고정되면 촬영하세요</p>
                        <p>🚨 <b>자동 경고</b>: 5mm/1.5° 이상 오차 시 주의</p>
                    </div>
                </div>
            )}

            {/* HUD */}
            {isArRunning && (
                <>
                    {/* ================= PATCH START: AI Toast + TTS Controls ================= */}
                    {isArRunning && (
                        <>
                            {/* 작은 상태 토스트(가림 최소) */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: 14,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    padding: "7px 12px",
                                    borderRadius: 16,
                                    background: "rgba(0,0,0,0.35)",
                                    color: "rgba(255,255,255,0.92)",
                                    fontSize: 12,
                                    zIndex: 60,
                                    pointerEvents: "none",
                                    backdropFilter: "blur(8px)",
                                    maxWidth: "92vw",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {aiToast || "🔎 표면 탐색 중"}
                            </div>

                            {/* 음성/설명 버튼(우상단 작은 버튼) */}
                            <div style={{ position: "absolute", top: 14, right: 14, zIndex: 70, display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => {
                                        bumpHud();
                                        setTtsEnabled((v) => !v);
                                        if (ttsSpeaking) stopSpeak();
                                    }}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 14,
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        background: ttsEnabled ? "rgba(0,255,180,0.20)" : "rgba(255,255,255,0.12)",
                                        color: "#fff",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                    }}
                                >
                                    {ttsEnabled ? "🔊 음성ON" : "🔇 음성OFF"}
                                </button>

                                <button
                                    onClick={() => {
                                        bumpHud();
                                        if (ttsSpeaking) stopSpeak();
                                        else if (aiText) speak(aiText);
                                    }}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 14,
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        background: "rgba(255,255,255,0.12)",
                                        color: "#fff",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                    }}
                                >
                                    {ttsSpeaking ? "⏹ 중지" : "▶ 안내"}
                                </button>
                            </div>
                        </>
                    )}
                    {/* ================= PATCH END ================= */}

                    {/* Mini hint (HUD 숨김 상태에서만) */}
                    {isArRunning && !hudVisible && (
                        <div
                            style={{
                                position: "absolute",
                                top: 48, // Moved down to avoid overlapping with AI toast
                                left: "50%",
                                transform: "translateX(-50%)",
                                padding: "6px 10px",
                                borderRadius: 14,
                                background: "rgba(0,0,0,0.35)",
                                color: "rgba(255,255,255,0.85)",
                                fontSize: 12,
                                zIndex: 50,
                                pointerEvents: "none",
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            화면을 탭하면 상세 정보가 표시됩니다
                        </div>
                    )}

                    {/* LOW Scan State Hint */}
                    {scanState === "LOW" && (
                        <div style={{
                            position: "absolute", top: "15%", left: 0, right: 0,
                            textAlign: "center", pointerEvents: "none"
                        }}>
                            <span style={{
                                background: "rgba(0,0,0,0.5)", color: "#fff",
                                padding: "6px 14px", borderRadius: 20, fontSize: 14
                            }}>
                                표면 탐색 중...
                            </span>
                        </div>
                    )}

                    {/* Top Right: Real-time Info */}
                    <div style={{
                        position: "absolute",
                        top: 50, // Moved down below toast/buttons
                        right: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        alignItems: "flex-end",
                        opacity: hudVisible ? 1 : 0,
                        transition: "opacity 220ms ease",
                        pointerEvents: hudVisible ? "auto" : "none"
                    }}>
                        <div style={hudBox}>
                            <span style={{ fontSize: 10, color: "#aaa" }}>수직오차</span><br />
                            <span style={{ fontSize: 18, fontWeight: "bold", color: getRiskColor(liveAngle, THRESHOLD.ANGLE_WARNING_DEG, THRESHOLD.ANGLE_DANGER_DEG) }}>
                                {liveAngle.toFixed(1)}°
                            </span>
                        </div>
                        <div style={hudBox}>
                            <span style={{ fontSize: 10, color: "#aaa" }}>단차(Gap)</span><br />
                            <span style={{ fontSize: 18, fontWeight: "bold", color: getRiskColor(liveGap, THRESHOLD.GAP_WARNING_MM, THRESHOLD.GAP_DANGER_MM) }}>
                                {liveGap.toFixed(1)}mm
                            </span>
                        </div>
                    </div>

                    {/* Top Left: Step Info */}
                    <div style={{
                        position: "absolute",
                        top: 50, // Moved down
                        left: 20,
                        opacity: hudVisible ? 1 : 0,
                        transition: "opacity 220ms ease",
                        pointerEvents: hudVisible ? "auto" : "none"
                    }}>
                        <div style={hudBox}>
                            <div style={{ fontSize: 12, color: "#aaa" }}>{mode}</div>
                            <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>
                                {template.steps[stepIdx]?.label || "완료"}
                            </div>
                        </div>
                    </div>

                    {/* Center Warning Message */}
                    {(liveGap >= THRESHOLD.GAP_WARNING_MM || liveAngle >= THRESHOLD.ANGLE_WARNING_DEG) && (
                        <div style={{
                            position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
                            background: liveGap >= THRESHOLD.GAP_DANGER_MM ? "rgba(255,0,0,0.8)" : "rgba(255,200,0,0.8)",
                            padding: "10px 20px", borderRadius: 20, fontWeight: "bold", color: "#fff",
                            animation: liveGap >= THRESHOLD.GAP_DANGER_MM ? "blink 1s infinite" : "none"
                        }}>
                            {liveGap >= THRESHOLD.GAP_DANGER_MM ? "🚨 위험: 오차 큼 (사진필수)" : "⚠️ 주의: 추가자재 권장"}
                        </div>
                    )}

                    {/* ================= PATCH START: Single FAB Bottom UI ================= */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: 26,
                            left: 0,
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                            pointerEvents: hudVisible ? "auto" : "none",
                            opacity: hudVisible ? 1 : 0,
                            transition: "opacity 220ms ease",
                        }}
                    >
                        {/* FAB Container */}
                        <div style={{ position: "relative" }}>
                            {/* Sub Actions */}
                            {fabOpen && (
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: 88,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 10,
                                        padding: "10px 12px",
                                        borderRadius: 18,
                                        background: "rgba(0,0,0,0.45)",
                                        backdropFilter: "blur(8px)",
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            setOpeningMode((v) => !v);
                                            setFabOpen(false);
                                        }}
                                        style={{
                                            padding: "10px 14px",
                                            borderRadius: 14,
                                            border: "1px solid rgba(255,255,255,0.25)",
                                            background: openingMode
                                                ? "rgba(0,255,180,0.25)"
                                                : "rgba(255,255,255,0.15)",
                                            color: "#fff",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {openingMode ? "개구부 보정 ON" : "개구부 자동"}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setFabOpen(false);
                                            startAR(); // 재시작
                                        }}
                                        style={{
                                            padding: "10px 14px",
                                            borderRadius: 14,
                                            border: "1px solid rgba(255,255,255,0.25)",
                                            background: "rgba(255,255,255,0.15)",
                                            color: "#fff",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                        }}
                                    >
                                        재탐색
                                    </button>
                                </div>
                            )}

                            {/* Main FAB */}
                            <button
                                onClick={onFabClick}
                                onPointerDown={() => {
                                    fabPressTimerRef.current = window.setTimeout(() => {
                                        setFabOpen(true);
                                    }, 420); // 길게 누르면 메뉴
                                }}
                                onPointerUp={() => {
                                    if (fabPressTimerRef.current) {
                                        window.clearTimeout(fabPressTimerRef.current);
                                        fabPressTimerRef.current = null;
                                    }
                                }}
                                style={{
                                    width: 84,
                                    height: 84,
                                    borderRadius: "50%",
                                    background: isHighStableUI
                                        ? "linear-gradient(135deg, #00ffb0, #2bffd8)"
                                        : "rgba(255,255,255,0.22)",
                                    border: isHighStableUI ? "none" : "4px solid #fff",
                                    color: "#000",
                                    fontSize: 18,
                                    fontWeight: 900,
                                    boxShadow: isHighStableUI
                                        ? "0 0 26px rgba(0,255,180,0.9)"
                                        : "0 4px 18px rgba(0,0,0,0.45)",
                                    cursor: "pointer",
                                }}
                            >
                                {getFabLabel()}
                            </button>
                        </div>
                    </div>
                    {/* ================= PATCH END ================= */}
                </>
            )}

            <style jsx>{`
                @keyframes blink { 50% { opacity: 0.5; } }
             `}</style>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", color: "#fff",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100
};
const bigBtnStyle: React.CSSProperties = {
    padding: "16px 40px", fontSize: 20, fontWeight: "bold", borderRadius: 30,
    border: "none", background: "#2b5cff", color: "#fff", cursor: "pointer"
};
const hudBox: React.CSSProperties = {
    background: "rgba(0,0,0,0.6)", padding: "8px 12px", borderRadius: 8,
    color: "#fff", textAlign: "right", backdropFilter: "blur(4px)"
};
const confirmBtnStyle: React.CSSProperties = {
    padding: "12px 24px", borderRadius: 24, background: "#2b5cff",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 16, fontWeight: "bold"
};
