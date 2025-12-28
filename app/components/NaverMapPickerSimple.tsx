"use client";

import { useEffect, useRef, useState } from "react";
import { loadNaverMapsScript } from "@/app/lib/naverMapsLoader";

export type PickResult = {
    lat: number;
    lng: number;
    addressText: string;
    source: "PIN_PICK" | "GPS";
    gpsLat?: number | null;
    gpsLng?: number | null;
};

/**
 * NaverMapPickerSimple - Simplified map picker for field workers
 * - Click map to pick location
 * - GPS current location button
 * - Automatic reverse geocoding
 * Used as alternative to the full NaverMapPicker modal
 */
export default function NaverMapPickerSimple({
    initialLat = 37.5665,
    initialLng = 126.978,
    onPick,
}: {
    initialLat?: number;
    initialLng?: number;
    onPick: (r: PickResult) => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);

    async function reverse(lat: number, lng: number) {
        const r = await fetch(`/api/naver/reverse-geocoding?lat=${lat}&lng=${lng}`, { cache: "no-store" });
        const j = await r.json();
        return (j?.addressText as string) || `좌표(${lat.toFixed(6)}, ${lng.toFixed(6)})`;
    }

    useEffect(() => {
        (async () => {
            await loadNaverMapsScript();
            if (!ref.current) return;

            const center = new window.naver.maps.LatLng(initialLat, initialLng);
            const map = new window.naver.maps.Map(ref.current, { center, zoom: 16 });
            const marker = new window.naver.maps.Marker({ position: center, map });

            mapRef.current = map;
            markerRef.current = marker;

            window.naver.maps.Event.addListener(map, "click", async (e: any) => {
                const lat = e.coord.y;
                const lng = e.coord.x;
                marker.setPosition(new window.naver.maps.LatLng(lat, lng));
                const addressText = await reverse(lat, lng);
                onPick({ lat, lng, addressText, source: "PIN_PICK" });
            });

            setLoading(false);
        })();
    }, [initialLat, initialLng]);

    async function goMyLocation() {
        if (!navigator.geolocation) {
            return alert("이 기기에서 위치 기능을 사용할 수 없습니다.");
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const gpsLat = pos.coords.latitude;
                const gpsLng = pos.coords.longitude;

                if (mapRef.current && markerRef.current) {
                    const ll = new window.naver.maps.LatLng(gpsLat, gpsLng);
                    mapRef.current.setCenter(ll);
                    markerRef.current.setPosition(ll);
                }

                const addressText = await reverse(gpsLat, gpsLng);
                onPick({ lat: gpsLat, lng: gpsLng, addressText, source: "GPS", gpsLat, gpsLng });
            },
            (err) => alert(`위치 권한/오류: ${err.message}`),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <button type="button" onClick={goMyLocation} style={{ padding: "10px 12px" }}>
                    📍 현재 위치로 찾기
                </button>
                {loading && <div style={{ fontSize: 12, opacity: 0.7 }}>지도 로딩중…</div>}
            </div>

            <div
                ref={ref}
                style={{
                    width: "100%",
                    height: 360,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.1)",
                }}
            />
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
                💡 지도를 터치하면 핀이 찍히고 주소가 자동으로 확정됩니다.
            </div>
        </div>
    );
}
