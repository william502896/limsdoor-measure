"use client";

import { useBusinessModule } from "@/app/hooks/useBusinessModule";
import { BusinessModuleType } from "@/app/modules/types";

export default function AdminSystemPage() {
    const { moduleType, switchModule } = useBusinessModule();

    const modules: { id: BusinessModuleType; label: string; desc: string }[] = [
        { id: "DOOR", label: "🚪 현관중문 (Door)", desc: "단차, 수직오차 중심 리스크 분석" },
        { id: "WINDOW", label: "🪟 창호/샷시 (Window)", desc: "벽면 평탄도, 하부 수평, 유리 양중비 분석" },
        { id: "INTERIOR", label: "🏠 부분 인테리어", desc: "면적, 천장고, 습기, 설비 리스크 분석 (준비중)" },
        { id: "FURNITURE", label: "🪑 맞춤 가구", desc: "벽 각도, 깊이, 수납 효율 분석 (준비중)" },
    ];

    return (
        <div style={{ padding: 30, maxWidth: 800, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>🛠 시스템/업종 설정 (OS Mode)</h1>
            <p style={{ color: "#666", marginBottom: 30 }}>
                현재 앱의 작동 모드를 변경합니다. 업종을 전환하면 AR 측정 로직, 리스크 판단 기준, 마케팅 템플릿이 즉시 해당 업종에 맞춰 변경됩니다.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
                {modules.map((m) => {
                    const isActive = moduleType === m.id;
                    return (
                        <div
                            key={m.id}
                            onClick={() => switchModule(m.id)}
                            style={{
                                padding: 20,
                                borderRadius: 16,
                                border: isActive ? "2px solid #2b5cff" : "1px solid #eee",
                                background: isActive ? "#f0f6ff" : "#fff",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ fontSize: 18, fontWeight: 800, color: isActive ? "#2b5cff" : "#333" }}>
                                        {m.label}
                                    </h3>
                                    <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>{m.desc}</p>
                                </div>
                                <div style={{
                                    width: 20, height: 20, borderRadius: "50%",
                                    border: isActive ? "6px solid #2b5cff" : "2px solid #ddd"
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 40, padding: 20, background: "#f9f9f9", borderRadius: 12 }}>
                <h4 style={{ fontWeight: 800, marginBottom: 8 }}>📢 프랜차이즈/지사 복제 안내</h4>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                    이 설정은 전역적으로 적용되며, 클라이언트 브라우저에 저장됩니다.<br />
                    실제 운영 시에는 <strong>도메인 또는 로그인 계정</strong>에 따라 자동으로 이 모드가 고정되도록 배포할 수 있습니다.<br />
                    (예: window.limsdoor.com 접속 시 자동으로 WINDOW 모드 적용)
                </p>
            </div>
        </div>
    );
}
