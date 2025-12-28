"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadNaverMapsScript } from "@/app/lib/naverMapsLoader";

type Measurement = {
    id: string;
    created_at: string;
    customer_name: string | null;
    customer_phone: string | null;
    address_text: string | null;
    lat: number | null;
    lng: number | null;
    status: string;
    verified_level: string;
    distance_mismatch_m: number | null;
};

/**
 * Admin Map Control Page - Monitor all measurements on map
 * - Pin clusters for all measurements
 * - Filter by status, verified_level
 * - Click pins for details
 * - Verification actions
 */
export default function AdminMapPage() {
    const ref = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    const [list, setList] = useState<Measurement[]>([]);
    const [filterVerified, setFilterVerified] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("");

    const filtered = useMemo(() => {
        return list.filter((m) => {
            if (filterVerified && m.verified_level !== filterVerified) return false;
            if (filterStatus && m.status !== filterStatus) return false;
            return true;
        });
    }, [list, filterVerified, filterStatus]);

    useEffect(() => {
        (async () => {
            await loadNaverMapsScript();
            if (!ref.current) return;

            const center = new window.naver.maps.LatLng(37.5665, 126.978);
            mapRef.current = new window.naver.maps.Map(ref.current, { center, zoom: 10 });

            await refresh();
        })();
    }, []);

    async function refresh() {
        const qs = new URLSearchParams();
        qs.set("limit", "300");
        const r = await fetch(`/api/measurements?${qs.toString()}`, { cache: "no-store" });
        const j = await r.json();
        if (!j.ok) return alert(j.error);
        setList(j.data as Measurement[]);
    }

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing markers
        for (const mk of markersRef.current) mk.setMap(null);
        markersRef.current = [];

        // Create new markers
        for (const m of filtered) {
            if (m.lat == null || m.lng == null) continue;

            const pos = new window.naver.maps.LatLng(m.lat, m.lng);
            const marker = new window.naver.maps.Marker({ position: pos, map });

            const badge =
                m.verified_level === "WARNED"
                    ? "⚠️ WARNED"
                    : m.verified_level === "CONFIRMED_BY_ADMIN"
                        ? "✅ CONFIRMED"
                        : "⏳ UNVERIFIED";

            const html = `
                <div style="padding:10px 12px; font-size:12px; max-width:260px;">
                    <div style="font-weight:700; margin-bottom:6px;">${badge}</div>
                    <div><b>${m.customer_name || "-"}</b> (${m.customer_phone || "-"})</div>
                    <div style="margin-top:6px; opacity:0.85;">${m.address_text || "-"}</div>
                    <div style="margin-top:6px; opacity:0.7;">status: ${m.status}</div>
                    ${m.distance_mismatch_m != null ? `<div style="margin-top:4px; color:crimson;">mismatch: ${m.distance_mismatch_m}m</div>` : ""}
                    <div style="margin-top:6px; opacity:0.7; font-size:10px;">id: ${m.id}</div>
                </div>
            `;

            const info = new window.naver.maps.InfoWindow({ content: html });

            window.naver.maps.Event.addListener(marker, "click", () => {
                info.open(map, marker);
            });

            markersRef.current.push(marker);
        }
    }, [filtered]);

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
            <h2 style={{ marginBottom: 10 }}>관리자 — 지도 관제</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <select
                    value={filterVerified}
                    onChange={(e) => setFilterVerified(e.target.value)}
                    style={{ padding: "10px 12px" }}
                >
                    <option value="">verified 전체</option>
                    <option value="WARNED">⚠️ WARNED만</option>
                    <option value="UNVERIFIED">⏳ UNVERIFIED만</option>
                    <option value="CONFIRMED_BY_ADMIN">✅ CONFIRMED만</option>
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "10px 12px" }}>
                    <option value="">status 전체</option>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                    <option value="AS">AS</option>
                </select>

                <button type="button" onClick={refresh} style={{ padding: "10px 12px" }}>
                    🔄 새로고침
                </button>

                <div style={{ fontSize: 13, opacity: 0.75, alignSelf: "center" }}>
                    표시 {filtered.length}건 / 전체 {list.length}건
                </div>
            </div>

            <div
                ref={ref}
                style={{
                    width: "100%",
                    height: 520,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.1)",
                }}
            />
        </div>
    );
}
