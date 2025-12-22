"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLeveling } from "../../lib/useLeveling";

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
    // We can add specific instructions or guide images here later
};

type MeasureTemplate = {
    name: string;
    steps: TemplateStep[];
};

// Default: 1 Width, 1 Height
const TEMPLATE_DEFAULT: MeasureTemplate = {
    name: "기본(1개소)",
    steps: [
        { label: "가로(폭)", mode: "width" },
        { label: "세로(높이)", mode: "height" },
    ]
};

// Complex: 3 Widths, 3 Heights
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
    const [isSupported, setIsSupported] = useState<boolean | null>(null);

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

    // Data
    const [results, setResults] = useState<number[]>([]);
    const [activePoints, setActivePoints] = useState<THREE.Mesh[]>([]); // Current pair (max 2)
    const [calibPoints, setCalibPoints] = useState<THREE.Mesh[]>([]);

    // Real-time
    const [cameraDist, setCameraDist] = useState<number | null>(null);
    const [isOptimal, setIsOptimal] = useState(false);

    // Leveling
    const [useLevelingAssist, setUseLevelingAssist] = useState(true);
    const [strictLeveling, setStrictLeveling] = useState(false);
    const leveling = useLeveling(useLevelingAssist);

    // ThreeJS
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const reticleRef = useRef<THREE.Group | null>(null);
    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const reticleValidRef = useRef(false);

    // ==========================================
    // Init & Config Load
    // ==========================================
    useEffect(() => {
        // WebXR Check
        if ("xr" in navigator) {
            (navigator as any).xr.isSessionSupported("immersive-ar").then((supported: boolean) => {
                setIsSupported(supported);
                if (!supported) setStatus("AR 미지원 기기");
            });
        } else {
            setIsSupported(false);
            setStatus("WebXR 미지원 브라우저");
        }

        // URL Params
        const params = new URLSearchParams(window.location.search);
        const dType = params.get("doorType") || "";
        setDoorType(dType);

        // Template Logic
        if (dType.includes("3연동") || dType.includes("3슬라이딩") || dType.includes("3채널")) {
            setTemplate(TEMPLATE_COMPLEX);
        } else {
            setTemplate(TEMPLATE_DEFAULT);
        }

        // Load Admin Settings
        try {
            const raw = localStorage.getItem(STORAGE_KEY_ADMIN);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.referenceObjects)) {
                    setRefObjects(parsed.referenceObjects);
                    // Default select first if exists
                    if (parsed.referenceObjects.length > 0) {
                        setSelectedRefId(parsed.referenceObjects[0].id);
                    }
                }
            }

            // Load Toggles
            const savedLevel = localStorage.getItem("lims_leveling_assist");
            const savedStrict = localStorage.getItem("lims_leveling_strict");
            if (savedLevel !== null) setUseLevelingAssist(savedLevel === "true");
            if (savedStrict !== null) setStrictLeveling(savedStrict === "true");

        } catch { }
    }, []);

    // ==========================================
    // Three.js SCENE
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
        const reticle = new THREE.Group();
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        reticleRef.current = reticle;

        // Reticle Visuals
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        reticle.add(ring);
        const dot = new THREE.Mesh(
            new THREE.CircleGeometry(0.005, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        reticle.add(dot);

        // Render Loop
        renderer.setAnimationLoop((time, frame) => {
            if (!frame) return;
            const session = renderer.xr.getSession();
            if (!session) return;

            // Hit Test
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
                    const results = frame.getHitTestResults(hitTestSourceRef.current);
                    if (results.length > 0) {
                        const hit = results[0];
                        const pose = hit.getPose(refSpace);
                        if (pose) {
                            reticle.visible = true;
                            reticle.matrix.fromArray(pose.transform.matrix);
                            reticleValidRef.current = true;

                            // Distance
                            const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
                            const retPos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
                            const dist = camPos.distanceTo(retPos);

                            // UI Update
                            updateDistanceUI(dist);
                        }
                    } else {
                        reticle.visible = false;
                        reticleValidRef.current = false;
                        setCameraDist(null);
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

    const updateDistanceUI = (distM: number) => {
        const cm = Math.round(distM * 100);
        setCameraDist(cm);
        const opt = distM >= 0.5 && distM <= 1.5; // Optimal: 50~150cm
        setIsOptimal(opt);

        // Update Reticle Color
        if (reticleRef.current) {
            const hex = opt ? 0x00ff00 : 0xff3333; // Green or Red
            reticleRef.current.children.forEach((c: any) => {
                if (c.material) c.material.color.setHex(hex);
            });
        }
    };


    // ==========================================
    // Actions
    // ==========================================
    const startAR = async () => {
        if (!navigator.xr) return alert("WebXR 미지원");

        // Permission Check (Leveling)
        if (useLevelingAssist && !leveling.permissionGranted) {
            await leveling.requestPermission();
        }

        try {
            const session = await (navigator as any).xr.requestSession("immersive-ar", {
                requiredFeatures: ["hit-test"],
                optionalFeatures: ["dom-overlay"],
                domOverlay: { root: document.body }
            });

            if (rendererRef.current) {
                rendererRef.current.xr.setReferenceSpaceType("local");
                rendererRef.current.xr.setSession(session);
            }

            session.addEventListener("end", () => {
                setIsArRunning(false);
                hitTestSourceRef.current = null;
            });

            setIsArRunning(true);
            setResults([]);
            setCalibPoints([]);
            setActivePoints([]);
            setStepIdx(0);

            // Determine Start Mode
            if (selectedRefId) {
                const refObj = refObjects.find(r => r.id === selectedRefId);
                if (refObj) {
                    setMode("calibration");
                    setStatus(`[보정] ${refObj.name}의 한쪽 끝을 찍으세요.`);
                } else {
                    setMode("measurement");
                    setStatus(template.steps[0].label + " 측정 대기");
                }
            } else {
                setMode("measurement");
                setStatus(template.steps[0].label + " 측정 대기");
                setIsCalibrated(false);
                setScaleFactor(1.0);
            }

        } catch (e) {
            console.error(e);
            alert("AR 세션 시작 실패");
        }
    };

    const onCapture = () => {
        if (!reticleValidRef.current || !sceneRef.current) return;

        // Strict Leveling Check
        if (useLevelingAssist && strictLeveling && !leveling.isLevel) {
            alert(`⚠️ 수평/수직을 맞춰주세요! (현재 ${leveling.gamma.toFixed(1)}°)`);
            return;
        }

        const pos = new THREE.Vector3().setFromMatrixPosition(reticleRef.current!.matrix);

        // Add visual Marker
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.015),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        mesh.position.copy(pos);
        sceneRef.current.add(mesh);

        // Logic
        if (mode === 'calibration') handleCalibration(mesh);
        else if (mode === 'measurement') handleMeasurement(mesh);
    };

    const handleCalibration = (mesh: THREE.Mesh) => {
        const next = [...calibPoints, mesh];
        setCalibPoints(next);

        if (next.length === 1) {
            setStatus("반대쪽 끝을 찍으세요.");
        } else if (next.length === 2) {
            // Draw Line
            drawLine(next[0].position, next[1].position, 0xff00ff);

            // Calc Factor
            const measuredM = next[0].position.distanceTo(next[1].position);
            const refObj = refObjects.find(r => r.id === selectedRefId);
            if (refObj) {
                const factor = refObj.sizeMm / (measuredM * 1000);
                setScaleFactor(factor);
                setIsCalibrated(true);
                alert(`보정 완료! (계수: ${factor.toFixed(3)})\n이제 실측을 시작합니다.`);
            }

            // Cleanup visuals
            next.forEach(m => m.visible = false);
            setCalibPoints([]);

            // Next
            setMode("measurement");
            setStatus(`${template.steps[0].label} 측정 시작`);
        }
    };

    const handleMeasurement = (mesh: THREE.Mesh) => {
        const next = [...activePoints, mesh];
        setActivePoints(next);

        if (next.length === 1) {
            setStatus("반대쪽을 찍으세요.");
        } else if (next.length === 2) {
            drawLine(next[0].position, next[1].position, 0xffff00);

            const rawM = next[0].position.distanceTo(next[1].position);
            const valMm = Math.round(rawM * 1000 * scaleFactor);

            // Save result
            const newRes = [...results, valMm];
            setResults(newRes);
            setActivePoints([]);

            // Next Step
            const nextIdx = stepIdx + 1;
            if (nextIdx < template.steps.length) {
                setStepIdx(nextIdx);
                setStatus(`[${valMm}mm] 다음: ${template.steps[nextIdx].label}`);
            } else {
                setMode("complete");
                setStatus("모든 측정 완료! 확정 버튼을 누르세요.");
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

    // Finalize
    const onConfirm = () => {
        // Aggregate
        const widths = results.filter((_, i) => template.steps[i].mode === 'width');
        const heights = results.filter((_, i) => template.steps[i].mode === 'height');

        const avgW = widths.length ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : 0;
        const avgH = heights.length ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : 0;

        const params = new URLSearchParams();
        if (avgW) params.set("width", String(avgW));
        if (avgH) params.set("height", String(avgH));

        // Copy details
        const details = template.steps.map((s, i) => `${s.label}: ${results[i]}mm`).join("\n");
        navigator.clipboard.writeText(details); // Auto copy

        alert(`입력 화면으로 이동합니다.\n가로: ${avgW}, 세로: ${avgH}`);
        window.location.href = `/field/new?${params.toString()}`;
    };

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh", background: "#000", overflow: "hidden" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

            {/* START SCREEN */}
            {!isArRunning && (
                <div style={overlayStyle}>
                    <h1>📏 AR 정밀 실측 (v2)</h1>
                    <p style={{ opacity: 0.8 }}>{doorType || "기본"}</p>

                    {/* Ref Object Selector */}
                    <div style={{ margin: "20px 0", width: "80%", maxWidth: 300 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>기준 물체 보정 (선택)</label>
                        <select
                            value={selectedRefId}
                            onChange={e => setSelectedRefId(e.target.value)}
                            style={{ width: "100%", padding: 10, borderRadius: 8, background: "#333", color: "#fff", border: "1px solid #555" }}
                        >
                            <option value="">(보정 안함)</option>
                            {refObjects.map(obj => (
                                <option key={obj.id} value={obj.id}>{obj.name} ({obj.sizeMm}mm)</option>
                            ))}
                        </select>
                        <p style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
                            * 보정 시 오차를 크게 줄일 수 있습니다.
                        </p>
                    </div>

                    {/* Leveling Toggles */}
                    <div style={{ background: "rgba(255,255,255,0.1)", padding: 15, borderRadius: 10, width: "80%", maxWidth: 300, textAlign: "left" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <input type="checkbox" checked={useLevelingAssist} onChange={e => {
                                setUseLevelingAssist(e.target.checked);
                                localStorage.setItem("lims_leveling_assist", String(e.target.checked));
                            }} />
                            수평/수직 가이드 켜기
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, opacity: useLevelingAssist ? 1 : 0.5 }}>
                            <input type="checkbox" checked={strictLeveling} onChange={e => {
                                setStrictLeveling(e.target.checked);
                                localStorage.setItem("lims_leveling_strict", String(e.target.checked));
                            }} disabled={!useLevelingAssist} />
                            정렬 OK일 때만 촬영 (Strict)
                        </label>
                    </div>

                    <button onClick={startAR} style={bigBtnStyle}>
                        측정 시작
                    </button>
                    <button onClick={() => window.location.href = "/field/new"} style={{ background: "transparent", border: "none", color: "#aaa", marginTop: 20 }}>
                        돌아가기
                    </button>
                </div>
            )}

            {/* RUNNING HUD */}
            {isArRunning && (
                <>
                    {/* Top Bar */}
                    <div style={{ position: "absolute", top: 20, left: 20, right: 20, display: "flex", justifyContent: "space-between", pointerEvents: "none" }}>
                        {/* Step Info */}
                        <div style={hudBox}>
                            <div style={{ fontSize: 12, color: "#ccc" }}>
                                {mode === 'calibration' ? "보정 중" : `STEP ${stepIdx + 1}/${template.steps.length}`}
                            </div>
                            <div style={{ fontWeight: "bold", fontSize: 16, color: "yellow" }}>
                                {mode === 'calibration' ? "기준 물체 찍기" : template.steps[stepIdx]?.label}
                            </div>
                        </div>

                        {/* Distance / Level */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                            {cameraDist !== null && (
                                <div style={{ ...hudBox, borderColor: isOptimal ? "lime" : "red", borderWidth: 1, borderStyle: "solid" }}>
                                    {cameraDist}cm {isOptimal ? "✅" : "⚠️"}
                                </div>
                            )}
                            {useLevelingAssist && (
                                <div style={{ ...hudBox, borderColor: leveling.status === 'ok' ? "lime" : "red", borderWidth: 1, borderStyle: "solid" }}>
                                    {leveling.status === 'ok' ? "Level OK" : "Tilted"} ({leveling.gamma.toFixed(1)}°)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results List */}
                    <div style={{ position: "absolute", top: 120, left: 20, pointerEvents: "none" }}>
                        {results.map((val, i) => (
                            <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 2px #000" }}>
                                {template.steps[i].label}: <span style={{ color: "yellow", fontWeight: "bold" }}>{val}mm</span>
                            </div>
                        ))}
                    </div>

                    {/* Center Message */}
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -150%)", pointerEvents: "none", textShadow: "0 1px 4px #000", textAlign: "center", width: "80%" }}>
                        {status}
                    </div>

                    {/* Bottom Controls */}
                    <div style={{ position: "absolute", bottom: 40, left: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, pointerEvents: "auto" }}>

                        {/* Capture Button */}
                        {mode !== 'complete' && (
                            <button onClick={onCapture} style={{
                                width: 80, height: 80, borderRadius: "50%",
                                background: (useLevelingAssist && strictLeveling && !leveling.isLevel) ? "rgba(255,0,0,0.3)" : "rgba(255,255,255,0.2)",
                                border: "4px solid #fff", zIndex: 20
                            }}>
                                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", margin: "6px auto" }} />
                            </button>
                        )}

                        <div style={{ display: "flex", gap: 20 }}>
                            <button onClick={() => window.location.reload()} style={subBtn}>재시작</button>
                            {mode === 'complete' && (
                                <button onClick={onConfirm} style={{ ...subBtn, background: "#2b5cff", border: "none" }}>
                                    확정 및 입력
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", color: "#fff",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100
};

const bigBtnStyle: React.CSSProperties = {
    marginTop: 30, padding: "16px 40px", fontSize: 20, fontWeight: "bold",
    borderRadius: 30, border: "none", background: "#2b5cff", color: "#fff",
    cursor: "pointer"
};

const hudBox: React.CSSProperties = {
    background: "rgba(0,0,0,0.6)", padding: "8px 12px", borderRadius: 8, color: "#fff"
};

const subBtn: React.CSSProperties = {
    padding: "12px 24px", borderRadius: 24, background: "#333", color: "#fff", border: "1px solid #555", cursor: "pointer"
};
