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
    const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
    const hitTestSourceRequestedRef = useRef(false);

    // Points logic
    const currentPointsRef = useRef<THREE.Mesh[]>([]); // Current step points (max 2)
    const activeLineRef = useRef<THREE.Line | null>(null); // Current step line

    // Store all visuals to clear later
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
        // ✅ Reticle (Crosshair + Dot)
        // ============================================
        const reticleGroup = new THREE.Group();
        reticleGroup.matrixAutoUpdate = false;
        reticleGroup.visible = false;
        scene.add(reticleGroup);
        reticleRef.current = reticleGroup;

        // Outer Ring (Cyan)
        const ringGeo = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        reticleGroup.add(ring);

        // Crosshair Lines (White)
        const lineGeo = new THREE.PlaneGeometry(0.3, 0.003).rotateX(-Math.PI / 2);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line1 = new THREE.Mesh(lineGeo, lineMat);
        const line2 = new THREE.Mesh(lineGeo, lineMat);
        line2.rotation.y = Math.PI / 2;
        reticleGroup.add(line1);
        reticleGroup.add(line2);

        // Center Dot (Red)
        const dotGeo = new THREE.CircleGeometry(0.008, 32).rotateX(-Math.PI / 2);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        reticleGroup.add(dot);

        // Controller
        const controller = renderer.xr.getController(0);
        controller.addEventListener("select", onSelect);
        scene.add(controller);

        function onSelect() {
            if (!reticleGroup.visible) return;
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
                        setStep("idle"); // Reset workflow
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
                        }
                    } else {
                        reticleGroup.visible = false;
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
    }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

    // ==========================================
    // Core Logic: Point Addition based on Step
    // ==========================================
    const addPoint = (pos: THREE.Vector3) => {
        if (!sceneRef.current) return;

        // Only allow adding points in 'width' or 'height' steps
        if (step !== 'width' && step !== 'height') return;

        // Visual Marker
        const geometry = new THREE.SphereGeometry(0.03, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: step === 'width' ? 0xffff00 : 0x00ff00 }); // Yellow for Width, Green for Height
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        sceneRef.current.add(mesh);

        currentPointsRef.current.push(mesh);
        allMeshesRef.current.push(mesh);

        // Check Progress (1st Point or 2nd Point?)
        if (currentPointsRef.current.length === 1) {
            setStatus("첫 번째 점 완료. 반대편 점을 찍어주세요.");
        } else if (currentPointsRef.current.length === 2) {
            // 2nd Point -> Calculate Distance
            const p1 = currentPointsRef.current[0].position;
            const p2 = currentPointsRef.current[1].position;
            const distM = p1.distanceTo(p2);
            const distMm = Math.round(distM * 1000);

            // Draw Line
            const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const lineMat = new THREE.LineBasicMaterial({
                color: step === 'width' ? 0xffff00 : 0x00ff00,
                linewidth: 4
            });
            const line = new THREE.Line(lineGeo, lineMat);
            sceneRef.current.add(line);
            allMeshesRef.current.push(line);

            // State Action
            if (step === 'width') {
                setWidthVal(distMm);
                setStatus(`가로 ${distMm}mm 측정 완료! 2초 후 세로 측정으로 넘어갑니다.`);

                // Auto transition to Height after delay
                setTimeout(() => {
                    startHeightMeasurement();
                }, 2000);
            } else if (step === 'height') {
                setHeightVal(distMm);
                setStep('complete');
                setStatus(`세로 ${distMm}mm 측정 완료! 측정값이 저장되었습니다.`);
            }

            // Cleanup current points ref for next step, BUT keep meshes in scene
            currentPointsRef.current = [];
        }
    };

    const startHeightMeasurement = () => {
        setStep("height");
        setStatus("STEP 2: 세로(높이) 측정 - 위/아래 모서리를 찍어주세요.");
        currentPointsRef.current = []; // Ensure clear
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

            // Start Workflow
            setIsArRunning(true);
            setStep("width");
            setWidthVal(null);
            setHeightVal(null);
            currentPointsRef.current = [];

            // Clear previous meshes
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

            {/* State-Based Guide Lines (CSS Overlay) */}
            {isArRunning && step === 'width' && (
                <div style={{
                    position: "absolute",
                    top: "50%", left: "10%", right: "10%", height: 0,
                    borderBottom: "2px dotted rgba(255, 255, 0, 0.8)", // Yellow Dotted
                    pointerEvents: "none",
                    zIndex: 5
                }}>
                    <div style={{ position: "absolute", top: -25, width: "100%", textAlign: "center", color: "yellow", fontSize: 12 }}>
                        가로 측정 가이드선
                    </div>
                </div>
            )}

            {isArRunning && step === 'height' && (
                <div style={{
                    position: "absolute",
                    left: "50%", top: "15%", bottom: "15%", width: 0,
                    borderLeft: "2px dotted rgba(0, 255, 0, 0.8)", // Green Dotted
                    pointerEvents: "none",
                    zIndex: 5
                }}>
                    <div style={{ position: "absolute", left: 10, top: "50%", color: "#00ff00", fontSize: 12, width: 100 }}>
                        세로 측정 가이드선
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
                    <p style={{ color: "#aaa", marginTop: 16, fontSize: 14 }}>
                        가로(너비) 측정 후<br />자동으로 세로(높이) 측정으로 이어집니다.
                    </p>
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
