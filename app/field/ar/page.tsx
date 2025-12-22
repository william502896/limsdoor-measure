"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Point = {
    x: number;
    y: number;
    z: number;
};

export default function ArPage() {
    const [distance, setDistance] = useState<number | null>(null);
    const [points, setPoints] = useState<Point[]>([]);
    const [status, setStatus] = useState("AR 시작 버튼을 눌러주세요");
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

    const pointsRef = useRef<THREE.Mesh[]>([]);
    const lineRef = useRef<THREE.Line | null>(null);

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
        // ✅ Improved Reticle (High Visibility)
        // ============================================
        const reticleGroup = new THREE.Group();
        reticleGroup.matrixAutoUpdate = false;
        reticleGroup.visible = false;
        scene.add(reticleGroup);
        reticleRef.current = reticleGroup;

        // 1. Precise Outer Ring (Cyan)
        const ringGeo = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        reticleGroup.add(ring);

        // 2. Crosshair Lines (White, Thin)
        const lineGeo = new THREE.PlaneGeometry(0.3, 0.003).rotateX(-Math.PI / 2);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line1 = new THREE.Mesh(lineGeo, lineMat); // Horizontal
        const line2 = new THREE.Mesh(lineGeo, lineMat); // Vertical
        line2.rotation.y = Math.PI / 2;
        reticleGroup.add(line1);
        reticleGroup.add(line2);

        // 3. Center Dot (Red)
        const dotGeo = new THREE.CircleGeometry(0.008, 32).rotateX(-Math.PI / 2);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        reticleGroup.add(dot);

        // Controller (Tap Event)
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
                            // Avoid setting status every frame if possible
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
            if (containerRef.current && rendererRef.current) {
                // containerRef.current.removeChild(rendererRef.current.domElement);
            }
            window.removeEventListener("resize", onWindowResize);
        };
    }, []);

    const addPoint = (pos: THREE.Vector3) => {
        if (!sceneRef.current) return;

        if (pointsRef.current.length >= 2) {
            clearMeasurements();
        }

        // Add Marker
        const geometry = new THREE.SphereGeometry(0.03, 32, 32); // Smaller marker
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        sceneRef.current.add(mesh);
        pointsRef.current.push(mesh);

        const newPoints = [...points, { x: pos.x, y: pos.y, z: pos.z }];
        setPoints(newPoints);

        if (pointsRef.current.length === 2) {
            const p1 = pointsRef.current[0].position;
            const p2 = pointsRef.current[1].position;
            const distM = p1.distanceTo(p2);
            const distMm = Math.round(distM * 1000);
            setDistance(distMm);
            setStatus(`측정 완료: ${distMm}mm`);

            const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 4 });
            const line = new THREE.Line(lineGeo, lineMat);
            sceneRef.current.add(line);
            lineRef.current = line;
        } else {
            setStatus("첫 번째 점 완료. 개구부 반대쪽 안쪽을 찍어주세요.");
        }
    };

    const clearMeasurements = () => {
        if (!sceneRef.current) return;

        pointsRef.current.forEach(p => sceneRef.current?.remove(p));
        pointsRef.current = [];

        if (lineRef.current) {
            sceneRef.current.remove(lineRef.current);
            lineRef.current = null;
        }

        setPoints([]);
        setDistance(null);
        setStatus("다시 측정하려면 바닥/벽을 비추고 터치하세요.");
    };

    const onComplete = () => {
        if (distance === null) return;
        navigator.clipboard.writeText(String(distance));
        alert(`측정값 ${distance}mm가 복사되었습니다.\n실측 화면에 붙여넣기 하세요.`);
        window.location.href = "/field/new";
    };

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

            setStatus("개구부 안쪽 모서리를 천천히 비춰주세요...");
            setIsArRunning(true);

        } catch (e) {
            console.error(e);
            alert("AR 세션을 시작할 수 없습니다. (HTTPS/호환 기기 확인)");
        }
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

                {isSupported === false && (
                    <div style={{ background: "rgba(255,50,50,0.8)", padding: 10, borderRadius: 8, marginTop: 10, fontSize: 12 }}>
                        ⚠️ AR 미지원: HTTPS 접속인지, 또는 호환되는 Android Chrome인지 확인해주세요.
                    </div>
                )}

                {isIOS && (
                    <div style={{ background: "rgba(255,50,50,0.8)", padding: 10, borderRadius: 8, marginTop: 10, fontSize: 12 }}>
                        ⚠️ 아이폰 주의: Safari에서는 작동하지 않을 수 있습니다.
                        App Store에서 <b>'WebXR Viewer'</b>(Mozilla) 앱을 설치하여 실행해주세요.
                    </div>
                )}
            </div>

            {/* Static Crosshair Overlay (Only when AR is running) */}
            {isArRunning && (
                <div style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 15,
                    opacity: 0.7
                }}>
                    <div style={{ width: 40, height: 2, background: "#fff", position: "absolute", top: 0, left: -20, boxShadow: "0 0 2px #000" }}></div>
                    <div style={{ width: 2, height: 40, background: "#fff", position: "absolute", top: -20, left: 0, boxShadow: "0 0 2px #000" }}></div>
                    <div style={{ position: "absolute", top: 30, left: -100, width: 200, textAlign: "center", color: "yellow", fontSize: 13, textShadow: "0 1px 2px #000" }}>
                        ▲ 개구부 안쪽 모서리 일치 ▲
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
                        AR 카메라 시작
                    </button>
                    <p style={{ color: "#aaa", marginTop: 16, fontSize: 14 }}>
                        개구부 <b>안쪽 사이즈</b>를 측정합니다.
                    </p>
                </div>
            )}

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
                {distance !== null && (
                    <button
                        onClick={onComplete}
                        style={{ padding: "12px 24px", borderRadius: 24, border: "none", background: "#3b82f6", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                    >
                        측정값 사용 ({distance}mm)
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
