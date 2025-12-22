"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Point = {
    x: number;
    y: number;
    z: number;
};

// Workflow State: 'idle' -> 'width' (2 points) -> 'height' (2 points) -> 'complete'
type MeasureStep = "idle" | "width" | "height" | "complete";

export default function ArPage() {
    // Measurements
    const [widthVal, setWidthVal] = useState<number | null>(null);
    const [heightVal, setHeightVal] = useState<number | null>(null);

    // Workflow
    const [step, setStep] = useState<MeasureStep>("idle");
    const [status, setStatus] = useState("AR 시작 버튼을 눌러주세요");

    // Accuracy Helpers
    const [cameraDist, setCameraDist] = useState<number | null>(null); // Distance to wall (cm)
    const [isOptimalRange, setIsOptimalRange] = useState(false); // 0.3m ~ 1.5m

    // System
    const [isIOS, setIsIOS] = useState(false);
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [isArRunning, setIsArRunning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Three.js refs
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const reticleRef = useRef<THREE.Group | null>(null);
    const ringMatRef = useRef<THREE.MeshBasicMaterial | null>(null); // To change color
    const dotMatRef = useRef<THREE.MeshBasicMaterial | null>(null); // To change color

    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const hitTestSourceRequestedRef = useRef(false);

    // Points logic
    const currentPointsRef = useRef<THREE.Mesh[]>([]); // Current step points (max 2)
    const allMeshesRef = useRef<THREE.Object3D[]>([]);

    // Check iOS
    useEffect(() => {
        const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
        if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
            setIsIOS(true);
        }
    }, []);

    // Check WebXR Support
    useEffect(() => {
        if ("xr" in navigator) {
            (navigator as any).xr.isSessionSupported("immersive-ar").then((supported: boolean) => {
                setIsSupported(supported);
                if (!supported) setStatus("이 기기/브라우저는 AR을 지원하지 않습니다.");
            });
        } else {
            setIsSupported(false);
            setStatus("WebXR을 지원하지 않는 브라우저입니다. (HTTPS 필요)");
        }
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Light
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        // ============================================
        // ✅ Reticle (Crosshair + Ring)
        // ============================================
        const reticleGroup = new THREE.Group();
        reticleGroup.matrixAutoUpdate = false;
        reticleGroup.visible = false;
        scene.add(reticleGroup);
        reticleRef.current = reticleGroup;

        // Dynamic Materials for Color Changing
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Default Red
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });  // Default Red
        ringMatRef.current = ringMat;
        dotMatRef.current = dotMat;

        // Geom
        const ringGeo = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        reticleGroup.add(ring);

        const dotGeo = new THREE.CircleGeometry(0.008, 32).rotateX(-Math.PI / 2);
        const dot = new THREE.Mesh(dotGeo, dotMat);
        reticleGroup.add(dot);

        // Controller
        const controller = renderer.xr.getController(0);
        controller.addEventListener("select", onSelect);
        scene.add(controller);

        function onSelect() {
            if (!reticleGroup.visible) {
                setStatus("⚠️ 표면을 찾을 수 없습니다. (빨간색 조준점이 보여야 합니다)");
                return;
            }
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(reticleGroup.matrix);
            addPoint(position);
        }

        // Render Loop
        renderer.setAnimationLoop((timestamp, frame) => {
            if (frame) {
                const referenceSpace = renderer.xr.getReferenceSpace();
                const session = renderer.xr.getSession();

                if (!hitTestSourceRequestedRef.current && session && referenceSpace) {
                    session.requestReferenceSpace("viewer")?.then((referenceSpace) => {
                        session.requestHitTestSource?.({ space: referenceSpace })?.then((source) => {
                            hitTestSourceRef.current = source;
                        });
                    });

                    session.addEventListener("end", () => {
                        hitTestSourceRequestedRef.current = false;
                        hitTestSourceRef.current = null;
                        setStatus("AR 세션이 종료되었습니다.");
                        setIsArRunning(false);
                        setStep("idle");
                    });
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

                            // ============================
                            // 📏 Distance Calculation
                            // ============================
                            const reticlePos = new THREE.Vector3().setFromMatrixPosition(reticleGroup.matrix);
                            const cameraPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld); // Camera position in world space

                            // Usually in WebXR 'local' space, camera starts at 0,0,0 but best to get from matrix
                            // Note: In Three.js WebXR, camera position is updated automatically.

                            const distM = cameraPos.distanceTo(reticlePos);
                            const distCm = Math.round(distM * 100);

                            // Update State (Throttle this in production, but here roughly ok)
                            // React state updates in loop can be heavy, but for simple text it might be fine on modern phones.
                            // To optimize, we could ref a DOM element directly, but let's try state first.
                            if (Math.abs((cameraDist ?? 0) - distCm) > 5) { // Only update if changed > 5cm to reduce renders
                                setCameraDist(distCm);

                                // Optimal Range: 30cm ~ 150cm (0.3 ~ 1.5m)
                                const isOptimal = distM >= 0.3 && distM <= 1.5;
                                setIsOptimalRange(isOptimal);

                                // Update Color
                                const color = isOptimal ? 0x00ff00 : 0xff0000; // Green vs Red
                                if (ringMatRef.current) ringMatRef.current.color.setHex(color);
                                if (dotMatRef.current) dotMatRef.current.color.setHex(color);
                            }
                        }
                    } else {
                        reticleGroup.visible = false;
                        setCameraDist(null);
                    }
                }
            }
            renderer.render(scene, camera);
        });

        const onWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onWindowResize);

        return () => {
            if (rendererRef.current) {
                rendererRef.current.setAnimationLoop(null);
            }
            window.removeEventListener("resize", onWindowResize);
        };
    }, [cameraDist]); // Add dependency if needed, but refs cover it mostly

    const addPoint = (pos: THREE.Vector3) => {
        if (!sceneRef.current) return;
        if (step !== 'width' && step !== 'height') return;

        // Add Marker
        const geometry = new THREE.SphereGeometry(0.02, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: isOptimalRange ? 0x00ff00 : 0xffff00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        sceneRef.current.add(mesh);

        currentPointsRef.current.push(mesh);
        allMeshesRef.current.push(mesh);

        if (currentPointsRef.current.length === 1) {
            setStatus("첫 번째 점 완료. 반대편 점을 찍어주세요.");
        } else if (currentPointsRef.current.length === 2) {
            const p1 = currentPointsRef.current[0].position;
            const p2 = currentPointsRef.current[1].position;
            const distM = p1.distanceTo(p2);
            const distMm = Math.round(distM * 1000);

            // Draw Line
            const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const lineMat = new THREE.LineBasicMaterial({
                color: step === 'width' ? 0xffff00 : 0x00ff00,
                linewidth: 3,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            sceneRef.current.add(line);
            allMeshesRef.current.push(line);

            if (step === 'width') {
                setWidthVal(distMm);
                setStatus(`가로 ${distMm}mm 완료! 2초 후 세로 측정 시작...`);
                setTimeout(() => {
                    startHeightMeasurement();
                }, 2000);
            } else if (step === 'height') {
                setHeightVal(distMm);
                setStep('complete');
                setStatus(`측정 완료! (가로 ${widthVal}, 세로 ${distMm})`);
            }
            currentPointsRef.current = [];
        }
    };

    const startHeightMeasurement = () => {
        setStep("height");
        setStatus("STEP 2: 세로(높이) 측정 - 위/아래 모서리를 찍어주세요.");
        currentPointsRef.current = [];
    }

    const startAR = async () => {
        if (!navigator.xr) {
            alert("WebXR을 지원하지 않는 브라우저입니다.");
            return;
        }
        try {
            const session = await (navigator as any).xr.requestSession("immersive-ar", {
                requiredFeatures: ["hit-test"],
                optionalFeatures: ["dom-overlay"],
                domOverlay: { root: document.body },
            });

            if (!rendererRef.current) return;
            rendererRef.current.xr.setReferenceSpaceType("local");
            rendererRef.current.xr.setSession(session);

            setIsArRunning(true);
            setStep("width");
            setWidthVal(null);
            setHeightVal(null);
            currentPointsRef.current = [];

            allMeshesRef.current.forEach(obj => sceneRef.current?.remove(obj));
            allMeshesRef.current = [];

            setStatus("STEP 1: 가로(너비) 측정 - 좌/우 모서리를 찍어주세요.");

        } catch (e) {
            console.error(e);
            alert("AR 세션을 시작할 수 없습니다. (HTTPS/호환 기기 확인)");
        }
    };

    const onComplete = () => {
        const textToCopy = `가로:${widthVal}, 세로:${heightVal}`;
        navigator.clipboard.writeText(textToCopy);
        const params = new URLSearchParams();
        if (widthVal) params.set("width", String(widthVal));
        if (heightVal) params.set("height", String(heightVal));

        alert(`측정값(가로 ${widthVal}, 세로 ${heightVal})이 복사되었습니다.\n입력 화면으로 이동합니다.`);
        window.location.href = `/field/new?${params.toString()}`;
    };

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative", background: isArRunning ? "transparent" : "#000", overflow: "hidden" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

            {/* UI Overlay */}
            <div style={{
                position: "absolute",
                top: 20, left: 20, right: 20,
                pointerEvents: "none",
                color: "#fff",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                fontFamily: "sans-serif",
                zIndex: 10
            }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📏 AR 실측 (BETA)</h1>
                <p style={{ margin: "5px 0", fontSize: 16, fontWeight: "bold", background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: 4, display: "inline-block" }}>
                    {status}
                </p>

                {/* Values Display */}
                {(widthVal !== null || heightVal !== null) && (
                    <div style={{ marginTop: 10, fontSize: 14, background: "rgba(0,0,0,0.6)", padding: 8, borderRadius: 8 }}>
                        {widthVal && <div>↔ 가로: <span style={{ color: "#ffff00", fontWeight: "bold" }}>{widthVal}mm</span></div>}
                        {heightVal && <div>↕ 세로: <span style={{ color: "#00ff00", fontWeight: "bold" }}>{heightVal}mm</span></div>}
                    </div>
                )}
            </div>

            {/* MINIMAL Center Crosshair for Aiming */}
            {isArRunning && step !== 'complete' && (
                <div style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 5,
                    opacity: 0.8
                }}>
                    <div style={{ width: 24, height: 2, background: "#fff", position: "absolute", left: -12, top: 0 }}></div>
                    <div style={{ width: 2, height: 24, background: "#fff", position: "absolute", left: 0, top: -12 }}></div>

                    <div style={{ position: "absolute", top: 25, left: -60, width: 120, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                        {step === 'width' ? "↔ 가로" : "↕ 세로"}
                    </div>
                </div>
            )}

            {/* DISTANCE FEEDBACK (Top Center Overlay) */}
            {isArRunning && cameraDist !== null && (
                <div style={{
                    position: "absolute",
                    top: 100, left: "50%",
                    transform: "translateX(-50%)",
                    pointerEvents: "none",
                    zIndex: 20,
                    textAlign: "center"
                }}>
                    <div style={{
                        color: isOptimalRange ? "#00ff00" : "#ff3333",
                        fontWeight: "bold",
                        fontSize: "18px",
                        background: "rgba(0,0,0,0.7)",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: isOptimalRange ? "2px solid #00ff00" : "2px solid #ff3333"
                    }}>
                        거리: {cameraDist}cm
                        <div style={{ fontSize: "12px", color: "#fff", marginTop: 4, fontWeight: "normal" }}>
                            {isOptimalRange ? "✅ 측정하기 좋은 거리입니다" : "❌ 50~150cm 거리에서 측정하세요"}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Start Button */}
            {isSupported !== false && !isArRunning && (
                <div style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 20,
                    textAlign: "center",
                    width: "100%",
                }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>📸</div>
                    <button
                        onClick={startAR}
                        style={{
                            padding: "16px 32px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            color: "#fff",
                            backgroundColor: "#3b82f6",
                            border: "none",
                            borderRadius: "30px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                            cursor: "pointer"
                        }}
                    >
                        AR 가로/세로 측정 시작
                    </button>
                    {/* Calibration / Accuracy Tip */}
                    <div style={{ marginTop: 24, background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 8, maxWidth: "80%", marginLeft: "auto", marginRight: "auto" }}>
                        <p style={{ color: "#ccc", margin: 0, fontSize: 13, textAlign: "left" }}>
                            💡 <b>정확도 팁:</b><br />
                            1. <b>약 1m 거리</b>에서 천천히 움직이세요.<br />
                            2. <b>스마트폰, 500ml 물병</b> 등 아는 물건을 먼저 측정해보고 정밀도를 확인하시면 좋습니다.
                        </p>
                    </div>
                </div>
            )}

            {/* Bottom Controls */}
            <div style={{
                position: "absolute",
                bottom: 40, width: "100%",
                display: "flex", justifyContent: "center", gap: 16,
                pointerEvents: "auto",
                zIndex: 10
            }}>
                <button
                    onClick={() => window.location.href = "/field/new"}
                    style={{ padding: "12px 20px", borderRadius: 24, border: "none", background: "#374151", color: "#fff", cursor: "pointer" }}
                >
                    취소 / 돌아가기
                </button>

                {step === 'complete' && widthVal && heightVal && (
                    <button
                        onClick={onComplete}
                        style={{ padding: "12px 24px", borderRadius: 24, border: "none", background: "#3b82f6", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                    >
                        측정값 사용하기
                    </button>
                )}
            </div>

            <style jsx global>{`
                button:active {
                    transform: scale(0.95);
                }
            `}</style>
        </div>
    );
}
