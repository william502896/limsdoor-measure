"use client";

import React, { useMemo, useState } from "react";

function getParam(name: string) {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get(name) || "";
}

export default function OptoutPage() {
    const p = useMemo(() => getParam("p"), []);
    const ts = useMemo(() => getParam("ts"), []);
    const sig = useMemo(() => getParam("sig"), []);

    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    async function submit() {
        if (!p || !ts || !sig) return alert("유효하지 않은 링크입니다.");

        setLoading(true);
        try {
            const res = await fetch("/api/public/optout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ p, ts, sig }),
            });
            const json = await res.json();
            if (!json.ok) return alert(json.error || "실패");
            setDone(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 20 }}>
            <h2 style={{ margin: "8px 0 12px" }}>수신거부</h2>

            {done ? (
                <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 14 }}>
                    <b>처리 완료</b>
                    <div style={{ marginTop: 8, opacity: 0.8 }}>해당 번호로 더 이상 마케팅 메시지가 발송되지 않습니다.</div>
                </div>
            ) : (
                <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                        아래 버튼을 누르면 즉시 수신거부 처리됩니다.
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        style={{
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: "1px solid #111",
                            background: "#111",
                            color: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        {loading ? "처리 중..." : "수신거부 처리"}
                    </button>

                    <div style={{ fontSize: 12, opacity: 0.65 }}>
                        링크가 만료되면 새 메시지에 포함된 수신거부 링크를 다시 이용해 주세요.
                    </div>
                </div>
            )}
        </div>
    );
}
