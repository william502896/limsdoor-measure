"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function Tier1LoginPage() {
    const sp = useSearchParams();
    const router = useRouter();
    const nextPath = useMemo(() => sp.get("next") || "/admin", [sp]);

    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/admin/tier1/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });

        setLoading(false);

        if (!res.ok) {
            setErr("비밀번호가 올바르지 않습니다.");
            return;
        }

        // Force reload to ensure cookies update in Layout/Middleware
        window.location.href = nextPath;
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, backgroundColor: "#111", color: "white" }}>
            <div style={{ width: 360, maxWidth: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>1티어 관리자 로그인</h1>
                <p style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
                    최고관리자 전용 메뉴에 접근하려면 비밀번호가 필요합니다.
                </p>

                <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호"
                        style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.25)", color: "#fff", outline: 'none' }}
                    />
                    <button
                        disabled={loading || !password}
                        style={{ padding: "12px 12px", borderRadius: 12, border: 0, cursor: "pointer", background: password ? "#4f46e5" : "#333", color: "white", fontWeight: 'bold', transition: 'background 0.2s' }}
                    >
                        {loading ? "확인 중..." : "로그인"}
                    </button>
                    {err && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</div>}
                </form>
            </div>
        </div>
    );
}
