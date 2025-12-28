"use client";

import { useState } from "react";

export type SearchSelect = {
    lat: number;
    lng: number;
    addressText: string;
    source: "SEARCH";
};

function formatAddr(item: any): { addressText: string; lat: number; lng: number } | null {
    const addr = item?.roadAddress || item?.jibunAddress || item?.englishAddress;
    const lat = Number(item?.y);
    const lng = Number(item?.x);
    if (!addr || Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { addressText: addr, lat, lng };
}

/**
 * AddressSearch - Search-based address picker
 * Uses Naver Geocoding API to find addresses
 * Returns up to 5 candidates for user selection
 * Primary method for consumer app address input
 */
export default function AddressSearch({ onSelect }: { onSelect: (v: SearchSelect) => void }) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [err, setErr] = useState<string | null>(null);

    async function search() {
        const q = query.trim();
        if (!q) return;

        setLoading(true);
        setErr(null);

        try {
            const r = await fetch(`/api/naver/geocoding?query=${encodeURIComponent(q)}`, { cache: "no-store" });
            const j = await r.json();
            const addrs = j?.data?.addresses || [];
            setItems(Array.isArray(addrs) ? addrs.slice(0, 5) : []);
        } catch (e: any) {
            setErr(e?.message || "검색 실패");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 8 }}>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && search()}
                    placeholder="주소를 입력하세요 (예: 양구군 양구읍 관공리)"
                    style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.15)",
                    }}
                />
                <button type="button" onClick={search} style={{ padding: "10px 12px" }}>
                    {loading ? "검색중..." : "🔍 주소 검색"}
                </button>
            </div>

            {err && <div style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>{err}</div>}

            {items.length > 0 && (
                <div
                    style={{
                        marginTop: 10,
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: 12,
                        overflow: "hidden",
                    }}
                >
                    {items.map((it, idx) => {
                        const parsed = formatAddr(it);
                        if (!parsed) return null;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onSelect({ ...parsed, source: "SEARCH" })}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "12px 12px",
                                    border: "none",
                                    background: "white",
                                    borderBottom: idx === items.length - 1 ? "none" : "1px solid rgba(0,0,0,0.08)",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ fontSize: 14 }}>{parsed.addressText}</div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
