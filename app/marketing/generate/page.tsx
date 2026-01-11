"use client";

import { useState } from "react";

export default function MarketingGeneratePage() {
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);

    const generate = async (type: "hook" | "script" | "plan") => {
        try {
            setLoading(true);
            setResult("");

            const res = await fetch("/api/marketing/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    context: `
- AR 실측 기반 유입 고객
- 중문 시공/판매 목적
- 사진/추가자재/리스크 설명 필요
          `,
                }),
            });

            const json = await res.json();
            setResult(json.result || "");
        } catch {
            alert("생성 실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 20, maxWidth: 960, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>📣 마케팅 자동 생성</h1>
            <p style={{ color: "#666" }}>
                시크릿 자료실을 기반으로 실전용 마케팅 문구를 즉시 생성합니다.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button onClick={() => generate("hook")} style={btnStyle}>후킹 문장 20개</button>
                <button onClick={() => generate("script")} style={btnStyle}>상담 스크립트</button>
                <button onClick={() => generate("plan")} style={btnStyle}>1페이지 마케팅 플랜</button>
            </div>

            {loading && <div style={{ marginTop: 16 }}>⏳ 생성 중...</div>}

            {result && (
                <textarea
                    value={result}
                    readOnly
                    rows={22}
                    style={{
                        marginTop: 20,
                        width: "100%",
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        whiteSpace: "pre-wrap",
                    }}
                />
            )}
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#2b5cff",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
};
