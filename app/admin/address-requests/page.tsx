"use client";

import { useEffect, useState } from "react";

type ReqRow = {
    id: string;
    measurement_id: string;
    created_at: string;
    requested_by_role: string;
    requested_by_name: string | null;
    proposed_address_text: string | null;
    proposed_lat: number | null;
    proposed_lng: number | null;
    reason: string | null;
    status: string;
};

/**
 * Admin Address Requests Page - Approve/reject address change requests
 * - Lists all PENDING requests
 * - Approve: updates measurement + logs event
 * - Reject: just updates request status
 */
export default function AdminAddressRequestsPage() {
    const [list, setList] = useState<ReqRow[]>([]);
    const [loading, setLoading] = useState(false);

    async function refresh() {
        setLoading(true);
        const r = await fetch("/api/address-change-requests?status=PENDING", { cache: "no-store" });
        const j = await r.json();
        setLoading(false);
        if (!j.ok) return alert(j.error);
        setList(j.data);
    }

    useEffect(() => {
        refresh();
    }, []);

    async function act(id: string, action: "APPROVE" | "REJECT") {
        const note =
            prompt(action === "APPROVE" ? "승인 메모(선택)" : "반려 사유(필수)")?.trim() || "";
        if (action === "REJECT" && !note) return;

        const r = await fetch(`/api/address-change-requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action,
                reviewed_by: "ADMIN",
                review_note: note || null,
            }),
        });

        const j = await r.json();
        if (!j.ok) return alert(j.error);
        alert("✅ 처리 완료");
        refresh();
    }

    return (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
            <h2 style={{ marginBottom: 10 }}>관리자 — 주소 변경 요청 승인/반려</h2>

            <button type="button" onClick={refresh} style={{ padding: "10px 12px", marginBottom: 12 }}>
                {loading ? "불러오는 중..." : "🔄 새로고침"}
            </button>

            <div style={{ display: "grid", gap: 10 }}>
                {list.map((r) => (
                    <div
                        key={r.id}
                        style={{
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 14,
                            padding: 12,
                            background: "white",
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>요청ID: {r.id.slice(0, 8)}...</div>
                        <div style={{ opacity: 0.8, fontSize: 13 }}>measurement_id: {r.measurement_id.slice(0, 8)}...</div>
                        <div style={{ marginTop: 8 }}>
                            <div>
                                <b>요청자:</b> {r.requested_by_role} / {r.requested_by_name || "-"}
                            </div>
                            <div>
                                <b>사유:</b> {r.reason || "-"}
                            </div>
                            <div style={{ marginTop: 6 }}>
                                <b>제안 주소:</b> {r.proposed_address_text || "-"}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {r.proposed_lat?.toFixed(6)}, {r.proposed_lng?.toFixed(6)}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button type="button" onClick={() => act(r.id, "APPROVE")} style={{ padding: "10px 12px" }}>
                                ✅ 승인
                            </button>
                            <button type="button" onClick={() => act(r.id, "REJECT")} style={{ padding: "10px 12px" }}>
                                ❌ 반려
                            </button>
                        </div>
                    </div>
                ))}

                {list.length === 0 && (
                    <div style={{ marginTop: 10, opacity: 0.7, padding: 20, textAlign: "center" }}>
                        대기(PENDING) 요청이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
