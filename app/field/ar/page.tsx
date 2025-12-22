"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ==========================================
// Types & Interfaces
// ==========================================
type Point = { x: number; y: number; z: number };

// Template definitions
type TemplateStep = {
    label: string;
    mode: "width" | "height";
    count: number; // how many segments (points - 1) or actually just pairs. 
    // Simplified: We will just collect points in pairs.
    // 1 measurement = 2 points.
};

type MeasureTemplate = {
    name: string;
    steps: TemplateStep[];
};

// Default Template (1 Width, 1 Height)
const TEMPLATE_DEFAULT: MeasureTemplate = {
    name: "기본(1개소)",
    steps: [
        { label: "가로(폭)", mode: "width", count: 1 },
        { label: "세로(높이)", mode: "height", count: 1 },
    ]
};

// Complex Template (3 Widths, 3 Heights)
const TEMPLATE_COMPLEX: MeasureTemplate = {
    name: "정밀(3개소)",
    steps: [
        { label: "가로 상단", mode: "width", count: 1 },
        { label: "가로 중간", mode: "width", count: 1 },
        { label: "가로 하단", mode: "width", count: 1 },
        { label: "세로 좌측", mode: "height", count: 1 },
        { label: "세로 중간", mode: "height", count: 1 },
        { label: "세로 우측", mode: "height", count: 1 },
    ]
};

const STORAGE_KEY_ADMIN = "limsdoor_admin_settings_v1";

export default function ArPage() {
    // ==========================================
    // State
    // ==========================================
    // Setup
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [status, setStatus] = useState("로딩 중...");
    const [isArRunning, setIsArRunning] = useState(false);

    // Configuration
    const [doorType, setDoorType] = useState("");
    const [refObjName, setRefObjName] = useState("");
    const [refObjSize, setRefObjSize] = useState<number>(0);
    const [scaleFactor, setScaleFactor] = useState(1.0); // Default 1.0

    // Workflow
    const [mode, setMode] = useState<"calibration" | "measurement" | "complete">("measurement");
    const [template, setTemplate] = useState<MeasureTemplate>(TEMPLATE_DEFAULT);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    // Data
    // We store results as array of values for each step
    const [results, setResults] = useState<number[]>([]);

    // Calibration specific
    const [calibPoints, setCalibPoints] = useState<THREE.Mesh[]>([]);

    // Measurement specific (Active Step)
    const [activePoints, setActivePoints] = useState<THREE.Mesh[]>([]); // max 2

    // Real-time helpers
    const [cameraDist, setCameraDist] = useState<number | null>(null);
    const [isOptimal, setIsOptimal] = useState(false);

    // ThreeJS Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const reticleRef = useRef<THREE.Group | null>(null);
    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const activeLinesRef = useRef<THREE.Line[]>([]); // Store lines to clear them if needed

    const reticleValidRef = useRef(false);

    // ==========================================
    // Initialization
    // ==========================================
    useEffect(() => {
        // 1. Check WebXR
        if ("xr" in navigator) {
            (navigator as any).xr.isSessionSupported("immersive-ar").then((supported: boolean) => {
                setIsSupported(supported);
                if (!supported) setStatus("이 기기/브라우저는 AR을 지원하지 않습니다.");
                else setStatus("AR 시작 대기 중...");
            });
        } else {
            setIsSupported(false);
            setStatus("WebXR 미지원 브라우저 (HTTPS 확인)");
        }

        // 2. Load Config from URL & LocalStorage
        const params = new URLSearchParams(window.location.search);
        const dType = params.get("doorType") || "";
        setDoorType(dType);

        // Template Selection
        if (dType.includes("3연동") || dType.includes("3슬라이딩") || dType.includes("3채널")) {
            setTemplate(TEMPLATE_COMPLEX);
        } else {
            setTemplate(TEMPLATE_DEFAULT);
        }

        // Reference Object
        try {
            const raw = localStorage.getItem(STORAGE_KEY_ADMIN);
            if (raw) {
                const settings = JSON.parse(raw);
                if (settings.referenceObjectName && settings.referenceObjectSize) {
                    setRefObjName(settings.referenceObjectName);
                    setRefObjSize(Math.floor(Number(settings.referenceObjectSize)));
                    setMode("calibration"); // Start with calibration if available
                    setStatus(`보정 모드: ${settings.referenceObjectName}(으)로 보정 시작`);
                }
            }
        } catch (e) { console.error(e); }

    }, []);


    // ==========================================
    // Three.js Setup
    // ==========================================
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
        const reticleGroup = new THREE.Group();
        reticleGroup.matrixAutoUpdate = false;
        reticleGroup.visible = false;
        scene.add(reticleGroup);
        reticleRef.current = reticleGroup;

        // Reticle Visuals (Cyan Ring + Red Dot)
        const ringGeo = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        reticleGroup.add(ring);

        const dotGeo = new THREE.CircleGeometry(0.005, 32).rotateX(-Math.PI / 2);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        reticleGroup.add(dot);

        // We do NOT attach tap event listener to screen anymore.
        // We solely rely on "Capture Button" (HTML UI).

        // Render Loop
        renderer.setAnimationLoop((timestamp, frame) => {
            if (frame) {
                const session = renderer.xr.getSession();
                if (!session) return;

                // Hit Test Logic
                const referenceSpace = renderer.xr.getReferenceSpace();
                if (!hitTestSourceRef.current && !hitTestSourceRequestedRef.current) {
                    session.requestReferenceSpace("viewer")?.then((refSpace) => {
                        session.requestHitTestSource?.({ space: refSpace })?.then((source) => {
                            hitTestSourceRef.current = source;
                        });
                    });
                    session.addEventListener("end", onSessionEnd);
                    hitTestSourceRequestedRef.current = true;
                }

                if (hitTestSourceRef.current && referenceSpace) {
                    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const pose = hit.getPose(referenceSpace);
                        if (pose) {
                            reticleGroup.visible = true;
                            reticleGroup.matrix.fromArray(pose.transform.matrix);
                            reticleValidRef.current = true;

                            // Distance Check
                            const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
                            const retPos = new THREE.Vector3().setFromMatrixPosition(reticleGroup.matrix);
                            const distM = camPos.distanceTo(retPos);
                            // Update UI roughly
                            updateDistanceUI(distM);
                        }
                    } else {
                        reticleGroup.visible = false;
                        reticleValidRef.current = false;
                        setCameraDist(null);
                    }
                }
            }
            renderer.render(scene, camera);
        });

        const onWindowResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onWindowResize);

        return () => {
            if (rendererRef.current) rendererRef.current.setAnimationLoop(null);
            window.removeEventListener("resize", onWindowResize);
        };
    }, []);

    const hitTestSourceRequestedRef = useRef(false);

    const onSessionEnd = () => {
        setIsArRunning(false);
        hitTestSourceRequestedRef.current = false;
        hitTestSourceRef.current = null;
    };

    const updateDistanceUI = (distM: number) => {
        const distCm = Math.round(distM * 100);
        setCameraDist(distCm);
        const opt = distM >= 0.3 && distM <= 1.5;
        setIsOptimal(opt);

        // Update Reticle Color directly for performance
        if (reticleRef.current) {
            const color = opt ? 0x00ff00 : 0xff0000;
            reticleRef.current.children.forEach((mesh: any) => {
                if (mesh.material) mesh.material.color.setHex(color);
            });
        }
    };


    // ==========================================
    // Core Actions
    // ==========================================

    const startAR = async () => {
        if (!navigator.xr) return alert("WebXR 미지원");
        try {
            const session = await (navigator as any).xr.requestSession("immersive-ar", {
                requiredFeatures: ["hit-test"],
                optionalFeatures: ["dom-overlay"],
                domOverlay: { root: document.body },
            });

            if (rendererRef.current) {
                rendererRef.current.xr.setReferenceSpaceType("local");
                rendererRef.current.xr.setSession(session);
            }
            setIsArRunning(true);

            // Reset state
            setActivePoints([]);
            setCalibPoints([]);
            setResults([]);
            setCurrentStepIdx(0);

            // Mode check
            if (refObjName && refObjSize > 0) {
                setMode("calibration");
                setStatus(`보정 [1/2]: ${refObjName}의 한쪽 끝을 찍어주세요.`);
            } else {
                setMode("measurement");
                setStatus(getStepInstruction(0));
            }

        } catch (e) {
            console.error(e);
            alert("AR 시작 실패");
        }
    };

    // "Capture" Button Clicked
    const onCapture = () => {
        if (!isArRunning) return;
        if (!reticleValidRef.current || !reticleRef.current || !sceneRef.current) {
            alert("⚠️ 표면을 찾을 수 없습니다. (조준점이 보여야 합니다)");
            return;
        }

        const pos = new THREE.Vector3().setFromMatrixPosition(reticleRef.current.matrix);

        // Marker
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        sphere.position.copy(pos);
        sceneRef.current.add(sphere);

        if (mode === "calibration") {
            handleCalibration(pos, sphere);
        } else if (mode === "measurement") {
            handleMeasurement(pos, sphere);
        }
    };

    const handleCalibration = (pos: THREE.Vector3, mesh: THREE.Mesh) => {
        const next = [...calibPoints, mesh];
        setCalibPoints(next);

        if (next.length === 1) {
            setStatus(`보정 [2/2]: ${refObjName}의 반대쪽 끝을 찍어주세요.`);
        } else if (next.length === 2) {
            // Draw Line
            drawLine(next[0].position, next[1].position, 0xff00ff);

            // Calculate
            const distRaw = next[0].position.distanceTo(next[1].position); // meters
            const distMm = distRaw * 1000;

            // Factor: Real(147) / Measured(140) = 1.05
            const factor = refObjSize / distMm;
            setScaleFactor(factor);

            alert(`보정 완료!\n측정됨: ${distMm.toFixed(1)}mm\n실제: ${refObjSize}mm\n보정계수: ${factor.toFixed(3)}\n\n이제 실측을 시작합니다.`);

            // Transition
            setMode("measurement");
            setCalibPoints([]); // clear memory logic, visuals remain
            // Clear visual calib line/points to avoid clutter? Let's hide them.
            next.forEach(m => m.visible = false);

            setStatus(getStepInstruction(0));
        }
    };

    const handleMeasurement = (pos: THREE.Vector3, mesh: THREE.Mesh) => {
        const next = [...activePoints, mesh];
        setActivePoints(next);

        if (next.length === 1) {
            setStatus("첫 번째 점 완료. 반대편을 찍어주세요.");
        } else if (next.length === 2) {
            // Draw Line
            drawLine(next[0].position, next[1].position, 0xffff00);

            // Calc
            const rawM = next[0].position.distanceTo(next[1].position);
            const correctedMm = Math.round(rawM * 1000 * scaleFactor);

            // Save result
            const newRes = [...results, correctedMm];
            setResults(newRes);
            setActivePoints([]); // reset for next Pair

            // Advance Step
            const nextIdx = currentStepIdx + 1;
            if (nextIdx < template.steps.length) {
                setCurrentStepIdx(nextIdx);
                setStatus(`[완료: ${correctedMm}mm] 다음: ${template.steps[nextIdx].label} 측정해주세요.`);
            } else {
                setMode("complete");
                setStatus("모든 측정이 완료되었습니다! 완료 버튼을 눌러주세요.");
            }
        }
    };

    const drawLine = (p1: THREE.Vector3, p2: THREE.Vector3, color: number) => {
        if (!sceneRef.current) return;
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const mat = new THREE.LineBasicMaterial({ color, linewidth: 4 });
        const line = new THREE.Line(geo, mat);
        sceneRef.current.add(line);
        activeLinesRef.current.push(line);
    };

    const getStepInstruction = (idx: number) => {
        if (idx >= template.steps.length) return "완료";
        const s = template.steps[idx];
        return `STEP ${idx + 1}/${template.steps.length}: ${s.label} 측정 (양 끝점을 찍으세요)`;
    };


    // Finalize
    const onConfirm = () => {
        // Simple aggregation: Widths are steps where mode='width', Heights where mode='height'
        const widths = results.filter((_, i) => template.steps[i].mode === "width");
        const heights = results.filter((_, i) => template.steps[i].mode === "height");

        // Logic: Send 'Average' or 'Min'? 
        // User requested "Show differentiated dimensions".
        // For simplicity towards FieldNewPage, we might just rename params or send average.
        // Or if multiple, maybe send as string "1000,1001,1000".
        // Let's settle on sending the *average* or *last* for now to fit the single input field, 
        // or prompt the user. But user said "auto fill".
        // Ideally we pick the smallest for "opening" logic, but average is safer for error.
        // Let's use AVERAGE.

        const avgW = widths.length ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : 0;
        const avgH = heights.length ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : 0;

        const params = new URLSearchParams();
        if (avgW > 0) params.set("width", String(avgW));
        if (avgH > 0) params.set("height", String(avgH));

        // Copy detail to clipboard just in case
        const detailText = template.steps.map((s, i) => `${s.label}: ${results[i]}mm`).join("\n");
        navigator.clipboard.writeText(detailText);

        alert(`측정 완료!\n\n[평균값]\n가로: ${avgW}mm\n세로: ${avgH}mm\n\n(상세 측정값은 클립보드에 복사되었습니다)`);
        window.location.href = `/field/new?${params.toString()}`;
    };

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative", background: "#000", overflow: "hidden" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

            {/* Start Screen */}
            {!isArRunning && (
                <div style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                    background: "rgba(0,0,0,0.8)", zIndex: 50, color: "#fff", padding: 20, textAlign: "center"
                }}>
                    <div style={{ fontSize: 60, marginBottom: 20 }}>📏</div>
                    <h1 style={{ margin: "0 0 10px 0" }}>AR 정밀 실측</h1>
                    <p style={{ opacity: 0.8, marginBottom: 30 }}>
                        {doorType ? `[${doorType}] 모드로 측정합니다.` : "기본 모드로 측정합니다."}
                        <br />
                        {refObjName ? `※ ${refObjName}(${refObjSize}mm) 보정 적용됨` : "※ 보정 설정 없음 (관리자 페이지)"}
                    </p>

                    {isSupported !== false ? (
                        <button onClick={startAR} style={{
                            padding: "16px 40px", fontSize: 20, fontWeight: "bold",
                            background: "#2b5cff", color: "#fff", border: "none", borderRadius: 30
                        }}>
                            측정 시작
                        </button>
                    ) : (
                        <div style={{ color: "#ff5555" }}>{status}</div>
                    )}

                    <button onClick={() => window.location.href = "/field/new"} style={{ marginTop: 20, background: "transparent", border: "1px solid #666", color: "#aaa", padding: "10px 20px", borderRadius: 20 }}>
                        돌아가기
                    </button>
                </div>
            )}

            {/* HUD Overlay */}
            {isArRunning && (
                <>
                    {/* Top Info */}
                    <div style={{ position: "absolute", top: 20, left: 20, right: 20, pointerEvents: "none", zIndex: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ background: "rgba(0,0,0,0.6)", padding: "8px 12px", borderRadius: 8 }}>
                                <div style={{ fontSize: 13, color: "#aaa" }}>현재 단계</div>
                                <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>
                                    {mode === "calibration" ? "보정 진행 중" : template.steps[currentStepIdx]?.label || "완료"}
                                </div>
                            </div>

                            {/* Distance Indicator */}
                            {cameraDist !== null && (
                                <div style={{
                                    background: isOptimal ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)",
                                    border: `1px solid ${isOptimal ? "#00ff00" : "#ff0000"}`,
                                    padding: "8px 12px", borderRadius: 8, textAlign: "right"
                                }}>
                                    <div style={{ fontSize: 12, color: "#fff" }}>거리</div>
                                    <div style={{ fontSize: 18, fontWeight: "bold", color: isOptimal ? "#00ff00" : "#ff5555" }}>
                                        {cameraDist}cm
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Instruction Banner */}
                        <div style={{ marginTop: 10, textAlign: "center" }}>
                            <div style={{ display: "inline-block", background: "rgba(0,0,0,0.7)", padding: "8px 16px", borderRadius: 20, color: "#fff", fontWeight: "bold", fontSize: 15 }}>
                                {status}
                            </div>
                        </div>
                    </div>

                    {/* Results Table (Mini) */}
                    <div style={{ position: "absolute", top: 120, left: 20, pointerEvents: "none", zIndex: 10 }}>
                        {results.map((r, i) => (
                            <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>
                                {template.steps[i].label}: <span style={{ color: "#ffff00" }}>{r}mm</span>
                            </div>
                        ))}
                    </div>

                    {/* Capture Button (The Big One) */}
                    {mode !== "complete" && (
                        <button
                            onClick={onCapture}
                            style={{
                                position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
                                width: 80, height: 80, borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                border: "4px solid #fff",
                                boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                                zIndex: 20, display: "flex", justifyContent: "center", alignItems: "center"
                            }}
                        >
                            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff" }} />
                        </button>
                    )}

                    {/* Footer Controls */}
                    <div style={{ position: "absolute", bottom: 20, width: "100%", display: "flex", justifyContent: "center", gap: 20, zIndex: 20 }}>
                        <button onClick={() => window.location.href = "/field/new"} style={{
                            padding: "10px 20px", borderRadius: 20, border: "none", background: "#333", color: "#fff"
                        }}>
                            취소
                        </button>

                        {mode === "complete" && (
                            <button onClick={onConfirm} style={{
                                padding: "10px 30px", borderRadius: 20, border: "none", background: "#2b5cff", color: "#fff", fontWeight: "bold"
                            }}>
                                확정 및 입력
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
