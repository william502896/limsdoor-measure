"use client";

import { useState } from "react";
import AddressSearch, { SearchSelect } from "@/app/components/AddressSearch";
import NaverMapViewer from "@/app/components/NaverMapViewer";

/**
 * Consumer Request Page - Simple address confirmation + consultation request  
 * - Address search only (no pin dragging - prevents errors)
 * - Map preview after selection
 * - Minimal friction for customer onboarding
 */
export default function ConsumerRequestPage() {
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [addressText, setAddressText] = useState("");
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);

    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    function onSelect(v: SearchSelect) {
        setAddressText(v.addressText);
        setLat(v.lat);
        setLng(v.lng);
    }

    async function submit() {
        if (!addressText || lat == null || lng == null) {
            alert("주소 검색으로 위치를 먼저 확정해주세요.");
            return;
        }

        setSaving(true);
        setResult(null);

        const r = await fetch("/api/measurements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                created_by_role: "CONSUMER",
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                address_text: addressText,
                lat,
                lng,
                address_source: "SEARCH",
                verified_level: "UNVERIFIED",
                status: "SUBMITTED",
            }),
        });

        const j = await r.json();
        setSaving(false);

        if (!j.ok) return setResult(`실패: ${j.error}`);
        setResult(`✅ 요청 완료! 접수번호: ${j.data.id.slice(0, 8)}...`);
    }

    return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>소비자(고객) — 주소 확정 & 상담 요청</h2>
            <div style={{ opacity: 0.75, marginBottom: 12, fontSize: 14 }}>
                💡 주소는 "검색으로 확정"만 가능 (핀 이동 ❌) - 오입력 방지
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="고객명"
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
                />
                <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="연락처"
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
                />

                <AddressSearch onSelect={onSelect} />

                {lat != null && lng != null && (
                    <>
                        <div style={{ marginTop: 6, fontSize: 14 }}>
                            <b>📍 확정 주소:</b> {addressText}
                        </div>
                        <NaverMapViewer lat={lat} lng={lng} />
                    </>
                )}

                <button type="button" onClick={submit} disabled={saving} style={{ padding: "12px 14px" }}>
                    {saving ? "전송중..." : "📨 상담/견적 요청하기"}
                </button>

                {result && <div style={{ marginTop: 10, fontSize: 14 }}>{result}</div>}
            </div>
        </div>
    );
}
