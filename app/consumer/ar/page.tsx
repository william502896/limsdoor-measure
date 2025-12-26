"use client";

import React, { useMemo, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Camera, ArrowLeft, Check, Home } from "lucide-react";

type Step = "select" | "camera" | "result";

type Selection = {
    doorType: "3연동" | "원슬라이딩" | "스윙" | "여닫이" | "";
    frameColor: "화이트" | "블랙" | "골드" | "블루" | "";
    glass: "투명" | "브론즈" | "샤틴" | "";
    design: "기본" | "라인" | "격자" | "";
};

function isReady(s: Selection) {
    return Boolean(s.doorType && s.frameColor && s.glass && s.design);
}

// (데모) 선택값으로 가격 대충 계산(원하시면 기존 정책표로 정확히 연결 가능)
function calcPrice(s: Selection) {
    let base = s.doorType === "3연동" ? 690000 : 590000;
    if (s.frameColor && s.frameColor !== "화이트") base += 70000;
    if (s.glass === "브론즈") base += 80000;
    if (s.glass === "샤틴") base += 60000;
    return base;
}

function ConsumerArContent() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("select");
    const [selection, setSelection] = useState<Selection>({
        doorType: "3연동",
        frameColor: "화이트",
        glass: "투명",
        design: "기본",
    });

    const price = useMemo(() => calcPrice(selection), [selection]);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [captured, setCaptured] = useState<string>(""); // dataURL
    const [composited, setComposited] = useState<string>(""); // dataURL
    const [cameraError, setCameraError] = useState("");

    async function startCamera() {
        setCameraError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setCameraError("카메라를 실행할 수 없습니다. (HTTPS 또는 권한 확인 필요)");
        }
    }

    function stopCamera() {
        const v = videoRef.current;
        const stream = v?.srcObject as MediaStream | null;
        stream?.getTracks()?.forEach((t) => t.stop());
        if (v) v.srcObject = null;
    }

    async function capture() {
        const v = videoRef.current;
        if (!v) return;

        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL("image/jpeg", 0.9);
        setCaptured(photo);

        // 간단 합성: 사진 + 가짜 오버레이(사각형 프레임)
        const out = document.createElement("canvas");
        out.width = canvas.width;
        out.height = canvas.height;
        const octx = out.getContext("2d");
        if (!octx) return;

        // 1) 배경
        const bg = new Image();
        bg.src = photo;
        await bg.decode();
        octx.drawImage(bg, 0, 0, out.width, out.height);

        // 2) 오버레이(데모용: 문 프레임 박스)
        // 실제로는 doorType/frameColor/glass/design에 따라 PNG를 불러와서 drawImage 하면 됨.
        octx.lineWidth = Math.max(6, Math.floor(out.width * 0.01));
        octx.strokeStyle =
            selection.frameColor === "블랙"
                ? "#111"
                : selection.frameColor === "골드"
                    ? "#b08a2a"
                    : selection.frameColor === "블루"
                        ? "#1b3ea8"
                        : "#fff";

        const marginX = out.width * 0.18;
        const marginY = out.height * 0.18;
        octx.strokeRect(marginX, marginY, out.width - marginX * 2, out.height - marginY * 2);

        // 3) 텍스트(선택정보)
        octx.fillStyle = "rgba(0,0,0,0.55)";
        octx.fillRect(24, 24, 420, 110);
        octx.fillStyle = "#fff";
        octx.font = "bold 28px system-ui";
        octx.fillText(`LIMSDOOR AR`, 40, 62);
        octx.font = "16px system-ui";
        octx.fillText(
            `${selection.doorType} / ${selection.frameColor} / ${selection.glass} / ${selection.design}`,
            40,
            92
        );
        octx.fillText(`예상: ${price.toLocaleString()}원`, 40, 116);

        const merged = out.toDataURL("image/jpeg", 0.92);
        setComposited(merged);

        stopCamera();
        setStep("result");
    }

    // Step 이동 시 카메라 자동 실행/정지
    React.useEffect(() => {
        if (step === "camera") startCamera().catch(() => { });
        if (step !== "camera") stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    return (
        <div style={{ minHeight: "100vh", background: "#0b1026", color: "#fff", paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 20px)" }}>
            {/* Top bar */}
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 50,
                    background: "rgba(11,16,38,0.85)",
                    backdropFilter: "blur(10px)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={() => {
                            if (step === "select") router.push("/");
                            if (step === "camera") setStep("select");
                            if (step === "result") setStep("select");
                        }}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                        {step === "select" && "AR 제품 선택"}
                        {step === "camera" && "촬영하기"}
                        {step === "result" && "합성 결과"}
                    </div>
                </div>
                <button
                    onClick={() => router.push('/')}
                    style={{ opacity: 0.7 }}
                >
                    <Home size={22} />
                </button>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
                {step === "select" && (
                    <div
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 20,
                            padding: 20,
                        }}
                    >
                        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>
                            어떤 문을 설치할까요?
                        </div>

                        <Section label="도어 종류">
                            {(["3연동", "원슬라이딩", "스윙", "여닫이"] as const).map((v) => (
                                <Chip
                                    key={v}
                                    active={selection.doorType === v}
                                    onClick={() => setSelection((p) => ({ ...p, doorType: v }))}
                                    text={v}
                                />
                            ))}
                        </Section>

                        <Section label="프레임 컬러">
                            <div style={{ display: "flex", gap: 12 }}>
                                {(["화이트", "블랙", "골드", "블루"] as const).map((v) => {
                                    const colorMap: Record<string, string> = { "화이트": "#fff", "블랙": "#111", "골드": "#d4af37", "블루": "#1e3a8a" };
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => setSelection((p) => ({ ...p, frameColor: v }))}
                                            style={{
                                                width: 50, height: 50, borderRadius: "50%",
                                                background: colorMap[v],
                                                border: selection.frameColor === v ? "3px solid #7b5cff" : "1px solid rgba(255,255,255,0.2)",
                                                position: "relative",
                                                boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                                            }}
                                        >
                                            {selection.frameColor === v && (
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Check size={24} color={v === "화이트" ? "#000" : "#fff"} />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </Section>

                        <Section label="유리 종류">
                            {(["투명", "브론즈", "샤틴"] as const).map((v) => (
                                <Chip
                                    key={v}
                                    active={selection.glass === v}
                                    onClick={() => setSelection((p) => ({ ...p, glass: v }))}
                                    text={v}
                                />
                            ))}
                        </Section>

                        <Section label="디자인 패턴">
                            {(["기본", "라인", "격자"] as const).map((v) => (
                                <Chip
                                    key={v}
                                    active={selection.design === v}
                                    onClick={() => setSelection((p) => ({ ...p, design: v }))}
                                    text={v}
                                />
                            ))}
                        </Section>

                        <div
                            style={{
                                marginTop: 24,
                                padding: 20,
                                borderRadius: 16,
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.10)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
                                <div style={{ opacity: 0.8, fontWeight: 700 }}>예상 견적가</div>
                                <div style={{ fontSize: 32, fontWeight: 900, color: "#a5b4fc" }}>
                                    {price.toLocaleString()}원
                                </div>
                            </div>

                            <button
                                disabled={!isReady(selection)}
                                onClick={() => setStep("camera")}
                                style={{
                                    width: "100%",
                                    padding: "20px",
                                    borderRadius: 16,
                                    border: "none",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                                    background: isReady(selection) ? "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" : "rgba(91,71,255,0.35)",
                                    color: "#fff",
                                    fontWeight: 900,
                                    fontSize: 20,
                                    cursor: isReady(selection) ? "pointer" : "not-allowed",
                                    transition: "all 0.2s",
                                    boxShadow: isReady(selection) ? "0 10px 20px -5px rgba(99,102,241,0.5)" : "none"
                                }}
                            >
                                <Camera size={24} />
                                <span>내 집에 적용하기 (AR)</span>
                            </button>
                        </div>

                        <div style={{ marginTop: 12, opacity: 0.6, fontSize: 13, textAlign: "center" }}>
                            * 위 견적은 예상 금액이며, 실측 후 확정됩니다.
                        </div>
                    </div>
                )}

                {step === "camera" && (
                    <div
                        style={{
                            background: "#000",
                            borderRadius: 20,
                            overflow: "hidden",
                            position: "relative",
                            minHeight: "70vh",
                            display: "flex", flexDirection: "column"
                        }}
                    >
                        {cameraError ? (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: "#f87171" }}>
                                {cameraError}
                            </div>
                        ) : (
                            <div style={{ flex: 1, position: "relative" }}>
                                <video ref={videoRef} playsInline autoPlay muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                                {/* Guideline Overlay */}
                                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", border: "10px solid rgba(0,0,0,0.5)" }}>
                                    <div style={{ width: "100%", height: "100%", border: "2px dashed rgba(255,255,255,0.5)", position: "relative" }}>
                                        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", textShadow: "0 2px 4px rgba(0,0,0,0.8)", fontWeight: 700 }}>
                                            설치할 공간을 비춰주세요
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ padding: 20, background: "rgba(0,0,0,0.8)", display: "flex", gap: 12 }}>
                            <button
                                onClick={() => setStep("select")}
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    borderRadius: 16,
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    background: "rgba(255,255,255,0.1)",
                                    color: "#fff",
                                    fontWeight: 800,
                                }}
                            >
                                옵션 변경
                            </button>
                            <button
                                onClick={capture}
                                disabled={!!cameraError}
                                style={{
                                    flex: 2,
                                    padding: 16,
                                    borderRadius: 16,
                                    border: "none",
                                    background: cameraError ? "#555" : "#5b47ff",
                                    color: "#fff",
                                    fontWeight: 900,
                                    fontSize: 18
                                }}
                            >
                                촬영 및 합성
                            </button>
                        </div>
                    </div>
                )}

                {step === "result" && (
                    <div
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 20,
                            padding: 20,
                        }}
                    >
                        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>
                            합성 결과 (미리보기)
                        </div>

                        {composited ? (
                            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)", position: "relative" }}>
                                <img
                                    src={composited}
                                    alt="result"
                                    style={{ width: "100%", display: "block" }}
                                />
                                <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 8, fontSize: 12 }}>
                                    LIMSDOOR AR
                                </div>
                            </div>
                        ) : (
                            <div style={{ opacity: 0.7, padding: 40, textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: 16 }}>
                                결과 이미지가 없습니다.
                            </div>
                        )}

                        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                            <button
                                onClick={() => setStep("camera")}
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    borderRadius: 16,
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#fff",
                                    fontWeight: 800,
                                }}
                            >
                                다시 촬영
                            </button>
                            <button
                                onClick={() => {
                                    alert("견적이 저장되었습니다! (데모)");
                                    router.push('/');
                                }}
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    borderRadius: 16,
                                    border: "none",
                                    background: "#5b47ff",
                                    color: "#fff",
                                    fontWeight: 900,
                                }}
                            >
                                견적 저장 완료
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 800, marginBottom: 12, opacity: 0.9, fontSize: 16 }}>{label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{children}</div>
        </div>
    );
}

function Chip({
    active,
    onClick,
    text,
}: {
    active: boolean;
    onClick: () => void;
    text: string;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: active ? "2px solid #7b5cff" : "1px solid rgba(255,255,255,0.15)",
                background: active ? "rgba(123,92,255,0.25)" : "rgba(255,255,255,0.05)",
                color: active ? "#fff" : "rgba(255,255,255,0.7)",
                fontWeight: active ? 800 : 600,
                transition: "all 0.2s"
            }}
        >
            {text}
        </button>
    );
}

export default function ConsumerArPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0b1026] flex items-center justify-center text-white">Loading...</div>}>
            <ConsumerArContent />
        </Suspense>
    );
}
