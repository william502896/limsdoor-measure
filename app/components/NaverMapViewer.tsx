"use client";

import { useEffect, useRef } from "react";
import { loadNaverMapsScript } from "@/app/lib/naverMapsLoader";

/**
 * NaverMapViewer - Read-only map component
 * Displays a marker at the given lat/lng coordinates
 * Used for preview/confirmation in consumer app
 */
export default function NaverMapViewer({
    lat,
    lng,
    height = 260,
    zoom = 16,
}: {
    lat: number;
    lng: number;
    height?: number;
    zoom?: number;
}) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let map: any;
        let marker: any;

        (async () => {
            await loadNaverMapsScript();
            if (!ref.current) return;

            const center = new window.naver.maps.LatLng(lat, lng);
            map = new window.naver.maps.Map(ref.current, { center, zoom });
            marker = new window.naver.maps.Marker({ position: center, map });
        })();

        return () => {
            map = null;
            marker = null;
        };
    }, [lat, lng, zoom]);

    return (
        <div
            ref={ref}
            style={{
                width: "100%",
                height,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid rgba(0,0,0,0.1)",
            }}
        />
    );
}
