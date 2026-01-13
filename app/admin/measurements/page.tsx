"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// 🔥 프로젝트에 맞게 경로 수정
import { createSupabaseBrowser as createClient } from "@/app/lib/supabaseClient";

type Row = {
    id: string;
    created_at: string;

    customer_name?: string | null;
    customer_phone?: string | null;
    address?: string | null;

    door_kind?: string | null;

    confirmed_width_mm?: number | null;
    confirmed_height_mm?: number | null;

    open_direction?: string | null;
    frame_finish?: string | null;
    frame_color?: string | null;
    glass_type?: string | null;

    material_price?: number | null;
    install_price?: number | null;
    total_price?: number | null;

    status?: string | null;
    admin_status?: string | null;

    // JSON fields fallbacks
    door_type?: string | null;
    width_mm?: number | null;
    height_mm?: number | null;
    customer_address?: string | null;
};

const DOOR_FILTERS = [
    { key: "ALL", label: "전체" },
    { key: "ONE_SLIDE", label: "원슬라이딩" },
    { key: "3T", label: "3연동" },
    { key: "SWING", label: "스윙" },
    { key: "HOPE", label: "호폐" },
];

const RANGE_FILTERS = [
    { key: "7D", label: "최근 7일" },
    { key: "30D", label: "최근 30일" },
    { key: "ALL", label: "전체" },
];

function fmtDate(iso: string) {
    try {
        return new Date(iso).toLocaleString("ko-KR");
    } catch {
        return iso;
    }
}

function money(n: number | null | undefined) {
    const v = typeof n === "number" ? n : 0;
    return v.toLocaleString("ko-KR");
}

function short(v: any, fallback = "-") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

function doorLabel(k?: string | null) {
    if (!k) return "-";
    const v = k.toUpperCase();
    if (v.includes("ONE") || v.includes("SLIDE")) return "원슬라이딩";
    if (v.includes("3T") || v.includes("3")) return "3연동";
    if (v.includes("SWING")) return "스윙";
    if (v.includes("HOPE")) return "호폐";
    return k;
}

function matchDoorFilter(door_kind: string | null | undefined, key: string) {
    if (key === "ALL") return true;
    const v = String(door_kind ?? "").toUpperCase();
    if (key === "ONE_SLIDE") return v.includes("ONE") || v.includes("SLIDE");
    if (key === "3T") return v.includes("3T") || v.includes("3");
    if (key === "SWING") return v.includes("SWING");
    if (key === "HOPE") return v.includes("HOPE");
    return true;
}

function calcFromRangeKey(rangeKey: string) {
    const now = new Date();
    if (rangeKey === "7D") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d.toISOString();
    }
    if (rangeKey === "30D") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return d.toISOString();
    }
    return null;
}

function statusLabel(row: Row) {
    return short(row.status ?? row.admin_status, "미분류");
}

function statusStyle(label: string) {
    // 상태값이 프로젝트마다 다를 수 있어 “문자 포함”으로 대충 분류
    const v = label.toUpperCase();
    if (v.includes("AS")) return { bg: "rgba(250,204,21,0.16)", bd: "rgba(250,204,21,0.35)" }; // 노랑
    if (v.includes("완료") || v.includes("DONE") || v.includes("시공")) return { bg: "rgba(34,197,94,0.16)", bd: "rgba(34,197,94,0.35)" }; // 초록
    if (v.includes("결제") || v.includes("PAID") || v.includes("CONFIRM")) return { bg: "rgba(59,130,246,0.16)", bd: "rgba(59,130,246,0.35)" }; // 파랑
    if (v.includes("대기") || v.includes("WAIT") || v.includes("PENDING")) return { bg: "rgba(244,63,94,0.14)", bd: "rgba(244,63,94,0.35)" }; // 빨강
    return { bg: "rgba(148,163,184,0.14)", bd: "rgba(148,163,184,0.30)" }; // 회색
}

export default function Page() {
    // const supabase = useMemo(() => createClient(), []); // Removed: Using API API instead

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Row[]>([]);
    const [error, setError] = useState<string>("");

    const [q, setQ] = useState("");
    const [doorFilter, setDoorFilter] = useState("ALL");
    const [rangeFilter, setRangeFilter] = useState("30D");
    const [sortKey, setSortKey] = useState<"NEW" | "PRICE">("NEW");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(r => r.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`${selectedIds.size}건을 삭제하시겠습니까? 복구할 수 없습니다.`)) return;

        try {
            const ids = Array.from(selectedIds).join(",");
            const res = await fetch(`/api/measurements/delete?id=${ids}`, { method: "DELETE" });
            if (!res.ok) throw new Error("삭제 실패");
            alert("삭제되었습니다.");
            setSelectedIds(new Set());
            load();
        } catch (e: any) {
            alert(e.message);
        }
    };

    async function load() {
        setLoading(true);
        setError("");

        try {
            const timeMin = calcFromRangeKey(rangeFilter);
            // Construct API URL
            const url = new URL("/api/measurements/list", window.location.href);
            if (timeMin) {
                url.searchParams.set("since", timeMin);
            }

            const res = await fetch(url.toString());
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to fetch data");
            }

            const data = await res.json();

            // Map DB fields to Row type if differences exist
            const mapped: Row[] = (data || []).map((d: any) => ({
                ...d,
                // Fallback mapping if columns differ
                door_kind: d.door_kind ?? d.door_type,
                confirmed_width_mm: d.confirmed_width_mm ?? d.width_mm,
                confirmed_height_mm: d.confirmed_height_mm ?? d.height_mm,
                customer_name: d.customer_name, // Direct map
                customer_phone: d.customer_phone,
                address: d.address ?? d.customer_address
            }));

            setRows(mapped);
        } catch (err: any) {
            setError(err.message);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }



    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeFilter]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        let list = rows.filter((r) => matchDoorFilter(r.door_kind, doorFilter));

        if (qq) {
            list = list.filter((r) => {
                const s = `${r.customer_name ?? ""} ${r.customer_phone ?? ""} ${r.address ?? ""}`.toLowerCase();
                return s.includes(qq);
            });
        }

        if (sortKey === "PRICE") {
            list = [...list].sort((a, b) => {
                const ta = a.total_price ?? ((a.material_price ?? 0) + (a.install_price ?? 0));
                const tb = b.total_price ?? ((b.material_price ?? 0) + (b.install_price ?? 0));
                return tb - ta;
            });
        } else {
            // NEW: 이미 created_at desc로 가져왔으니 그대로
        }
        return list;
    }, [rows, q, doorFilter, sortKey]);

    function copy(text: string) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => { });
        }
    }

    return (
        <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
            {/* 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h1 style={{ fontSize: 22, fontWeight: 900 }}>실측 폴더(목록)</h1>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        type="button"
                        onClick={load}
                        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white", color: "#334155" }}
                    >
                        새로고침
                    </button>

                    <Link
                        href="/field/new?from=admin"
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "#111827",
                            color: "white",
                            textDecoration: "none",
                            fontWeight: 800,
                        }}
                    >
                        + 새 실측 작성
                    </Link>
                </div>
            </div>

            {/* 툴바 */}
            <div
                style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    gap: 10,
                    alignItems: "center",
                }}
            >
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="검색: 고객명 / 전화 / 주소"
                    style={{
                        padding: "12px 12px",
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "white",
                        color: "#1e293b",
                    }}
                />

                <select
                    value={doorFilter}
                    onChange={(e) => setDoorFilter(e.target.value)}
                    style={{
                        padding: "12px 10px",
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "white",
                        color: "#1e293b",
                    }}
                >
                    {DOOR_FILTERS.map((o) => (
                        <option key={o.key} value={o.key}>
                            문종: {o.label}
                        </option>
                    ))}
                </select>

                <select
                    value={rangeFilter}
                    onChange={(e) => setRangeFilter(e.target.value)}
                    style={{
                        padding: "12px 10px",
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "white",
                        color: "#1e293b",
                    }}
                >
                    {RANGE_FILTERS.map((o) => (
                        <option key={o.key} value={o.key}>
                            기간: {o.label}
                        </option>
                    ))}
                </select>

                <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as any)}
                    style={{
                        padding: "12px 10px",
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "white",
                        color: "#1e293b",
                    }}
                >
                    <option value="NEW">정렬: 최신순</option>
                    <option value="PRICE">정렬: 금액순</option>
                </select>
            </div>

            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#334155", fontWeight: 600 }}>
                        <input
                            type="checkbox"
                            checked={filtered.length > 0 && selectedIds.size === filtered.length}
                            onChange={handleSelectAll}
                            style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                        <span>전체 선택 ({selectedIds.size}개)</span>
                    </label>
                    <div style={{ fontSize: 12, opacity: 0.75, marginLeft: 8, color: "#64748b" }}>
                        / 표시 {filtered.length}건
                    </div>
                </div>
                {selectedIds.size > 0 && (
                    <button
                        onClick={handleDeleteSelected}
                        style={{
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontWeight: "bold",
                            cursor: "pointer",
                        }}
                    >
                        선택 삭제 ({selectedIds.size})
                    </button>
                )}
            </div>

            {error ? (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#fee2e2", color: "#991b1b" }}>
                    불러오기 오류: {error}
                </div>
            ) : null}

            {loading ? (
                <div style={{ marginTop: 14, opacity: 0.8 }}>불러오는 중...</div>
            ) : null}

            {/* 목록 */}
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {filtered.map((r) => {
                    const size =
                        r.confirmed_width_mm && r.confirmed_height_mm
                            ? `${r.confirmed_width_mm} x ${r.confirmed_height_mm}`
                            : "-";

                    const total = r.total_price ?? ((r.material_price ?? 0) + (r.install_price ?? 0));
                    const st = statusLabel(r);
                    const stStyle = statusStyle(st);

                    return (
                        <div
                            key={r.id}
                            style={{
                                borderRadius: 14,
                                border: selectedIds.has(r.id) ? "2px solid #6366f1" : "1px solid #cbd5e1",
                                padding: 14,
                                background: "white",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                color: "#1e293b",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ display: "grid", gap: 6, flex: 1 }}>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(r.id)}
                                            onChange={() => toggleSelect(r.id)}
                                            style={{ width: 18, height: 18, cursor: "pointer" }}
                                        />
                                        <div style={{ fontWeight: 900, fontSize: 16 }}>
                                            {short(r.customer_name)}
                                            <span style={{ fontWeight: 700, opacity: 0.75, marginLeft: 8 }}>
                                                {short(r.customer_phone)}
                                            </span>
                                        </div>

                                        <span
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: 999,
                                                background: stStyle.bg,
                                                border: `1px solid ${stStyle.bd}`,
                                                fontSize: 12,
                                                opacity: 0.95,
                                            }}
                                        >
                                            {st}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: 13, opacity: 0.9, color: "#475569" }}>
                                        {doorLabel(r.door_kind)} / {size} (mm)
                                    </div>

                                    <div style={{ fontSize: 12, opacity: 0.75, color: "#64748b" }}>
                                        주소: {short(r.address, "주소 없음")}
                                    </div>

                                    <div style={{ fontSize: 12, opacity: 0.75, color: "#64748b" }}>
                                        방향: {short(r.open_direction)} / 프레임: {short(r.frame_finish)} {short(r.frame_color)} / 유리: {short(r.glass_type)}
                                    </div>
                                </div>

                                <div style={{ textAlign: "right", minWidth: 160 }}>
                                    <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>{money(total)}원</div>
                                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, color: "#64748b" }}>{fmtDate(r.created_at)}</div>
                                </div>
                            </div>

                            {/* 빠른 액션 */}
                            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                                <Link
                                    href={`/admin/measurements/${r.id}`}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        background: "#111827",
                                        color: "white",
                                        textDecoration: "none",
                                        fontWeight: 800,
                                    }}
                                >
                                    상세 보기
                                </Link>

                                <Link
                                    href={`/field/new?from=admin&edit=${r.id}`}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #cbd5e1",
                                        color: "#475569",
                                        textDecoration: "none",
                                        fontWeight: 800,
                                        background: "white",
                                    }}
                                >
                                    현장 화면으로 열기(수정)
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => copy(String(r.customer_phone ?? ""))}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #cbd5e1",
                                        background: "white",
                                        color: "#475569",
                                        fontWeight: 800,
                                    }}
                                >
                                    전화 복사
                                </button>

                                {r.customer_phone ? (
                                    <a
                                        href={`tel:${String(r.customer_phone).replace(/[^0-9]/g, "")}`}
                                        style={{
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #cbd5e1",
                                            background: "white",
                                            color: "#475569",
                                            fontWeight: 800,
                                            textDecoration: "none",
                                        }}
                                    >
                                        전화 걸기
                                    </a>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={() => copy(`${short(r.customer_name)} ${short(r.customer_phone)}\n${short(r.address)}`)}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #cbd5e1",
                                        background: "white",
                                        color: "#475569",
                                        fontWeight: 800,
                                    }}
                                >
                                    고객정보 복사
                                </button>

                                {/* 계약 전환 버튼 */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const depositInput = prompt(`계약금을 입력하세요 (총액: ${money(r.total_price || 0)}원):\n전액 지불시 총액 입력, 없으면 0 입력`);
                                        if (depositInput === null) return;

                                        const depositAmount = Number(depositInput) || 0;

                                        try {
                                            const res = await fetch('/api/measurements/convert-to-contract', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    id: r.id,
                                                    deposit_amount: depositAmount,
                                                    contract_date: new Date().toISOString().split('T')[0]
                                                })
                                            });

                                            if (!res.ok) throw new Error('계약 전환 실패');

                                            const result = await res.json();
                                            alert(`✅ 계약으로 전환되었습니다!\n상태: ${result.contract_status}\n입금: ${result.payment_status}`);
                                            load();
                                        } catch (e: any) {
                                            alert(`❌ 오류: ${e.message}`);
                                        }
                                    }}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #10b981",
                                        background: "#ecfdf5",
                                        color: "#059669",
                                        fontWeight: 800,
                                    }}
                                >
                                    계약 전환
                                </button>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) return;
                                        try {
                                            const res = await fetch(`/api/measurements/delete?id=${r.id}`, { method: "DELETE" });
                                            if (!res.ok) throw new Error("삭제 실패");
                                            alert("삭제되었습니다.");
                                            load(); // 목록 새로고침
                                        } catch (e: any) {
                                            alert(e.message);
                                        }
                                    }}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(239,68,68,0.5)",
                                        background: "rgba(220,38,38,0.2)",
                                        color: "#fca5a5",
                                        fontWeight: 800,
                                    }}
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    );
                })}

                {!loading && filtered.length === 0 ? (
                    <div style={{ padding: 16, opacity: 0.85 }}>
                        조건에 맞는 실측이 없습니다.
                    </div>
                ) : null}
            </div>
        </div>
    );
}
