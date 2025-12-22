"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

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

    const containerRef = useRef<HTMLDivElement>(null);

    // Three.js refs
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const reticleRef = useRef<THREE.Mesh | null>(null);
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

        // Reticle (조준점)
        const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const reticleMaterial = new THREE.MeshBasicMaterial();
        const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        reticleRef.current = reticle;

        // AR Button Customization
        const button = ARButton.createButton(renderer, {
            requiredFeatures: ["hit-test"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body },
        });

        // 커스텀 스타일 및 텍스트 적용
        button.innerText = "AR 카메라 시작";
        button.style.backgroundColor = "#3b82f6"; // Blue
        button.style.borderRadius = "24px";
        button.style.border = "none";
        button.style.color = "white";
        button.style.fontWeight = "bold";
        button.style.padding = "12px 24px";
        button.style.fontSize = "16px";
        button.style.bottom = "100px"; // 위치 조정해서 하단 버튼과 안 겹치게
        button.style.opacity = "1";

        document.body.appendChild(button);

        // Controller (Tap Event)
        const controller = renderer.xr.getController(0);
        controller.addEventListener("select", onSelect);
        scene.add(controller);

        function onSelect() {
            if (!reticle.visible) return;

            const position = new THREE.Vector3();
            position.setFromMatrixPosition(reticle.matrix);

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
                        button.style.display = "block"; // Reset button visibility logic if needed
                    });

                    hitTestSourceRequestedRef.current = true;
                }

                if (hitTestSourceRef.current && referenceSpace) {
                    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const pose = hit.getPose(referenceSpace);

                        if (pose) {
                            reticle.visible = true;
                            reticle.matrix.fromArray(pose.transform.matrix);
                            setStatus("조준점(흰색 고리)이 보이면 화면을 터치하세요.");
                        }
                    } else {
                        reticle.visible = false;
                        setStatus("바닥이나 벽을 천천히 비춰주세요...");
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
            if (document.body.contains(button)) {
                document.body.removeChild(button);
            }
            window.removeEventListener("resize", onWindowResize);
            // clean up scenes if complex
        };
    }, []);

    const addPoint = (pos: THREE.Vector3) => {
        if (!sceneRef.current) return;

        // Check if we already have 2 points (full line)
        // If so, reset
        if (pointsRef.current.length >= 2) {
            clearMeasurements();
        }

        // Add Marker
        const geometry = new THREE.SphereGeometry(0.05, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        sceneRef.current.add(mesh);
        pointsRef.current.push(mesh);

        const newPoints = [...points, { x: pos.x, y: pos.y, z: pos.z }];
        setPoints(newPoints);

        // Calculate if 2 points
        if (pointsRef.current.length === 2) {
            const p1 = pointsRef.current[0].position;
            const p2 = pointsRef.current[1].position;
            const distM = p1.distanceTo(p2); // meters
            const distMm = Math.round(distM * 1000); // millimeters
            setDistance(distMm);
            setStatus(`측정 완료: ${distMm}mm`);

            // Draw Line
            const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 5 });
            const line = new THREE.Line(lineGeo, lineMat);
            sceneRef.current.add(line);
            lineRef.current = line;
        } else {
            setStatus("첫 번째 점이 찍혔습니다. 두 번째 점을 찍어주세요.");
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
        // Save to localStorage or similar to pass back
        // Or just copy to clipboard
        navigator.clipboard.writeText(String(distance));
        alert(`측정값 ${distance}mm가 복사되었습니다.\n실측 화면에 붙여넣기 하세요.`);
        window.location.href = "/field/new";
    };

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative", background: "#000", overflow: "hidden" }}>
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
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📏 AR 실측 (BETA)</h1>
                <p style={{ margin: "5px 0", fontSize: 14, opacity: 0.9 }}>{status}</p>

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

            <div style={{
                position: "absolute",
                bottom: 40, width: "100%",
                display: "flex", justifyContent: "center", gap: 16,
                pointerEvents: "auto",
                zIndex: 10
            }}>
                <button
                    onClick={() => window.location.href = "/field/new"}
                    style={{ padding: "12px 20px", borderRadius: 24, border: "none", background: "#374151", color: "#fff" }}
                >
                    취소 / 돌아가기
                </button>
                {distance !== null && (
                    <button
                        onClick={onComplete}
                        style={{ padding: "12px 24px", borderRadius: 24, border: "none", background: "#3b82f6", color: "#fff", fontWeight: "bold" }}
                    >
                        측정값 사용 ({distance}mm)
                    </button>
                )}
            </div>

            <style jsx global>{`
                /* Hide 'Start AR' button initially to customize or just accept default */
                /* Three.js ARButton styles it automatically at bottom center */
            `}</style>
        </div>
    );
}
