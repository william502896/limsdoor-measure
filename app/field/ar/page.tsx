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

    // v3: Precision Guide Data
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

        // Reticle Visuals (v3: Enhanced with Normal Indicator)
        // 1. Ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        reticle.add(ring);

        // 2. Normal Stick (Upwards from ring)
        const stick = new THREE.Mesh(
            new THREE.CylinderGeometry(0.002, 0.002, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        stick.position.y = 0.05;
        reticle.add(stick);

        // Render Loop
        renderer.setAnimationLoop((time, frame) => {
            if (!frame) return;
            const session = renderer.xr.getSession();
            if (!session) return;

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

                            // v3: Real-time Calculations
                            const pos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
                            // Extract Normal (Y axis of reticle matrix in WebXR hit test usually aligns with surface normal)
                            const normal = new THREE.Vector3();
                            reticle.matrix.extractBasis(new THREE.Vector3(), normal, new THREE.Vector3());

                            // 1. Angle Calc
                            const vError = calcVerticalError(normal);
                            setLiveAngle(vError);
                            if (vError > maxAngleDetected) setMaxAngleDetected(vError);

                            // 2. Gap Calc (if reference exists)
                            // We need access to the CURRENT referencePlane state (tricky in loop)
                            // Using a ref for performance/access might be better but let's try closure if state updates fast enough? 
                            // Actually, state inside render loop is stale. Need a Ref for referencePlane.
                        }
                    } else {
                        reticle.visible = false;
                        reticleValidRef.current = false;
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
    }, []); // Empty deps, so state access inside loop is blocked. Fixed below via Ref.

    // State Ref for loop access
    const refPlaneRef = useRef<{ point: THREE.Vector3, normal: THREE.Vector3 } | null>(null);
    const maxValsRef = useRef({ gap: 0, angle: 0 });

    // Update Refs when state changes (for UI consistency if needed, though loop drives logic)
    useEffect(() => {
        refPlaneRef.current = referencePlane;
    }, [referencePlane]);

    // Enhanced Loop Logic (Ref Based)
    useEffect(() => {
        if (!rendererRef.current) return;
        const renderer = rendererRef.current;

        renderer.setAnimationLoop((time, frame) => {
            if (!frame) return;
            const scene = sceneRef.current;
            const camera = cameraRef.current;
            if (!scene || !camera) return;

            const session = renderer.xr.getSession();
            if (hitTestSourceRef.current && session) {
                const refSpace = renderer.xr.getReferenceSpace();
                if (refSpace) {
                    const results = frame.getHitTestResults(hitTestSourceRef.current);
                    if (results.length > 0) {
                        const hit = results[0];
                        const pose = hit.getPose(refSpace);
                        if (pose) {
                            reticleRef.current!.visible = true;
                            reticleRef.current!.matrix.fromArray(pose.transform.matrix);
                            reticleValidRef.current = true;

                            // -- Calc --
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
                            if (refPlaneRef.current) {
                                const gap = calcGap(pos, refPlaneRef.current.normal, refPlaneRef.current.point);
                                setLiveGap(gap);
                                if (gap > maxValsRef.current.gap) {
                                    maxValsRef.current.gap = gap;
                                    setMaxGapDetected(gap);
                                }
                            }
                        }
                    } else {
                        reticleRef.current!.visible = false;
                        reticleValidRef.current = false;
                    }
                }
            }
            renderer.render(scene, camera);
        });
    }, []);


    // ==========================================
    // Actions
    // ==========================================
    const startAR = async () => {
        if (!navigator.xr) return alert("WebXR 미지원");

        // Permission
        if (useLevelingAssist && !leveling.permissionGranted) {
            await leveling.requestPermission();
        }

        try {
            const session = await (navigator as any).xr.requestSession("immersive-ar", {
                requiredFeatures: ["hit-test"],
                optionalFeatures: ["dom-overlay", "plane-detection"], // Request Plane Detection
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

            if (selectedRefId) {
                const refObj = refObjects.find(r => r.id === selectedRefId);
                setMode("calibration");
                setStatus(refObj ? `[보정] ${refObj.name} 측정` : "측정 대기");
            } else {
                setMode("measurement");
                setStatus("첫 번째 지점(기준)을 찍으세요");
            }
        } catch (e) {
            alert("AR 세션 시작 실패");
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
            // v3: Set Reference Plane on First Point of each pair? 
            // Or Global Reference?
            // "Guide System" implies detecting wall flatness. 
            // Let's set Reference Plane on the VERY FIRST point (Measurement start).
            if (!referencePlane) {
                // First point becomes Reference
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
            // ... Calibration Logic (Same as before) ...
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
            // Line
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
        // Aggregate
        const widths = results.filter((_, i) => template.steps[i].mode === 'width');
        const heights = results.filter((_, i) => template.steps[i].mode === 'height');
        const avgW = widths.length ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : 0;
        const avgH = heights.length ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : 0;

        // v3 Risk Assessment
        const risk = evaluateRisk(maxGapDetected, maxAngleDetected);

        const params = new URLSearchParams();
        params.set("width", String(avgW));
        params.set("height", String(avgH));
        // Pass Risk Data
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

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh", background: "#000", overflow: "hidden" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

            {/* START SCREEN */}
            {!isArRunning && (
                <div style={overlayStyle}>
                    <h1>📐 AR 정밀 실측 가이드 (v3)</h1>
                    <button onClick={startAR} style={bigBtnStyle}>측정 시작</button>

                    <div style={{ marginTop: 20, textAlign: "left", fontSize: 13, color: "#ccc" }}>
                        <p>✅ <b>녹색/네온 가이드</b>: 측정 면 표시</p>
                        <p>✅ <b>실시간 오차</b>: 수직/수평/단차 감지</p>
                        <p>🚨 <b>자동 경고</b>: 5mm/1.5° 이상 시 경고</p>
                    </div>
                </div>
            )}

            {/* HUD */}
            {isArRunning && (
                <>
                    {/* Top Right: Real-time Info */}
                    <div style={{ position: "absolute", top: 20, right: 20, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        {/* Angle */}
                        <div style={hudBox}>
                            <span style={{ fontSize: 10, color: "#aaa" }}>수직오차</span><br />
                            <span style={{ fontSize: 18, fontWeight: "bold", color: getRiskColor(liveAngle, THRESHOLD.ANGLE_WARNING_DEG, THRESHOLD.ANGLE_DANGER_DEG) }}>
                                {liveAngle.toFixed(1)}°
                            </span>
                        </div>
                        {/* Gap */}
                        <div style={hudBox}>
                            <span style={{ fontSize: 10, color: "#aaa" }}>단차(Gap)</span><br />
                            <span style={{ fontSize: 18, fontWeight: "bold", color: getRiskColor(liveGap, THRESHOLD.GAP_WARNING_MM, THRESHOLD.GAP_DANGER_MM) }}>
                                {liveGap.toFixed(1)}mm
                            </span>
                        </div>
                    </div>

                    {/* Top Left: Step Info */}
                    <div style={{ position: "absolute", top: 20, left: 20 }}>
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

                    {/* Bottom Controls */}
                    <div style={{ position: "absolute", bottom: 40, left: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                        <div style={{ textShadow: "0 1px 2px #000" }}>{status}</div>

                        {mode !== 'complete' && (
                            <button onClick={onCapture} style={captureBtnStyle} />
                        )}

                        {mode === 'complete' && (
                            <button onClick={onConfirm} style={confirmBtnStyle}>
                                결과 확정 및 전송
                            </button>
                        )}
                    </div>
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
const captureBtnStyle: React.CSSProperties = {
    width: 80, height: 80, borderRadius: "50%",
    background: "rgba(255,255,255,0.2)", border: "4px solid #fff",
    cursor: "pointer"
};
const confirmBtnStyle: React.CSSProperties = {
    padding: "12px 24px", borderRadius: 24, background: "#2b5cff",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 16, fontWeight: "bold"
};



