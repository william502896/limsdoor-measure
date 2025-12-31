"use client";

import React, { useEffect, useMemo, useState } from "react";

type QueueRow = any;

function getKey() {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("key") || "";
}

const STATUS = ["READY", "SENDING", "SENT", "FAILED", "SKIPPED"] as const;

export default function AdminMarketingQueuePage() {
    const adminKey = useMemo(() => getKey(), []);
    const [status, setStatus] = useState<(typeof STATUS)[number]>("READY");
    const [q, setQ] = useState("");
    const [limit, setLimit] = useState(120);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<QueueRow[]>([]);

    async function fetchList() {
        setLoading(true);
        try {
            const url =
                `/api/admin/marketing/queue?key=${encodeURIComponent(adminKey)}` +
                `&status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.ok) setItems(json.items || []);
            else alert(json.error || "Load failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    async function retry(id: string) {
        const res = await fetch(`/api/admin/marketing/queue?key=${encodeURIComponent(adminKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "retry", id }),
        });
        const json = await res.json();
        if (!json.ok) return alert(json.error || "Retry failed");
        await fetchList();
    }

    async function forceFail(id: string) {
        const reason = prompt("실패 사유(관리자 강제):", "FORCED_BY_ADMIN") || "FORCED_BY_ADMIN";
        const res = await fetch(`/api/admin/marketing/queue?key=${encodeURIComponent(adminKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "force_fail", id, reason }),
        });
        const json = await res.json();
        if (!json.ok) return alert(json.error || "force_fail failed");
        await fetchList();
    }

    return (
        <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ margin: "8px 0 12px" }}>Admin · Marketing · Queue</h2>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={sel()}>
                    {STATUS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>

                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="검색: 전화/이름/캠페인/에러"
                    style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, minWidth: 260 }}
                />

                <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value || 120))}
                    style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 120 }}
                />

                <button onClick={fetchList} style={btn(true)}>
                    {loading ? "로딩..." : "새로고침"}
                </button>

                <a href={`/admin/marketing/templates?key=${encodeURIComponent(adminKey)}`} style={{ marginLeft: "auto" }}>
                    템플릿 관리 →
                </a>
            </div>

            <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 120px 1fr 120px 220px", gap: 0, background: "#fafafa", padding: 10, fontSize: 12 }}>
                    <b>수신자</b>
                    <b>타입</b>
                    <b>내용/템플릿</b>
                    <b>시도</b>
                    <b>상태/액션</b>
                </div>

                {items.map((it) => (
                    <div
                        key={it.id}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "160px 120px 1fr 120px 220px",
                            padding: 10,
                            borderTop: "1px solid #eee",
                            alignItems: "start",
                            gap: 0,
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 700 }}>{it.to_name || "-"}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{it.to_phone}</div>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>{new Date(it.scheduled_at).toLocaleString()}</div>
                        </div>

                        <div style={{ fontSize: 12 }}>
                            <div><b>{it.msg_type}</b></div>
                            {it.msg_type === "KAKAO" && (
                                <div style={{ opacity: 0.75 }}>
                                    {it.kakao_template_key || it.kakao_template_id || "-"}
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                            {(it.text || "").slice(0, 280)}
                            {(it.text || "").length > 280 ? "…" : ""}
                            {it.last_error ? (
                                <div style={{ marginTop: 6, color: "#b00020", fontSize: 12 }}>
                                    <b>ERR:</b> {it.last_error}
                                </div>
                            ) : null}
                        </div>

                        <div style={{ fontSize: 12 }}>
                            <div>
                                attempts: <b>{it.attempts ?? 0}</b> / {it.max_attempts ?? 3}
                            </div>
                            {it.next_retry_at ? (
                                <div style={{ opacity: 0.75, marginTop: 4 }}>
                                    next: {new Date(it.next_retry_at).toLocaleString()}
                                </div>
                            ) : null}
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ fontSize: 12 }}>
                                <b>{it.status}</b> {it.provider ? <span style={{ opacity: 0.75 }}>· {it.provider}</span> : null}
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                    onClick={() => retry(it.id)}
                                    style={btn(false)}
                                    disabled={it.status === "SENT"}
                                    title="READY로 복구하여 재시도"
                                >
                                    재시도
                                </button>
                                <button
                                    onClick={() => forceFail(it.id)}
                                    style={btn(false, true)}
                                    title="관리자 강제 FAILED"
                                >
                                    강제실패
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {items.length === 0 && <div style={{ padding: 14, opacity: 0.7 }}>데이터가 없습니다.</div>}
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
                접근 URL 예시: <code>/admin/marketing/queue?key=ADMIN_SECRET</code>
            </div>
        </div>
    );
}

function btn(primary = false, danger = false): React.CSSProperties {
    return {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid " + (danger ? "#f2b8b8" : "#ddd"),
        background: primary ? "#111" : danger ? "#fff5f5" : "#fff",
        color: primary ? "#fff" : "#111",
        cursor: "pointer",
    };
}
function sel(): React.CSSProperties {
    return { padding: 10, border: "1px solid #ddd", borderRadius: 10 };
}
