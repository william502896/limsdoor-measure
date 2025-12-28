import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Naver Maps Reverse Geocoding API - Coordinates to Address
 * Converts lat/lng coordinates to address string
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");

        if (!lat || !lng) {
            return NextResponse.json(
                { ok: false, error: "Lat and lng parameters are required" },
                { status: 400 }
            );
        }

        const clientId = process.env.NAVER_MAPS_CLIENT_ID;
        const clientSecret = process.env.NAVER_MAPS_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { ok: false, error: "Naver Maps credentials not configured" },
                { status: 500 }
            );
        }

        // Naver Maps Reverse Geocoding API
        // coords: lng,lat (경도,위도 순서 주의!)
        const apiUrl = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&orders=roadaddr,addr&output=json`;

        const response = await fetch(apiUrl, {
            headers: {
                "X-NCP-APIGW-API-KEY-ID": clientId,
                "X-NCP-APIGW-API-KEY": clientSecret,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Naver Reverse Geocoding Error:", errorText);
            return NextResponse.json(
                { ok: false, error: "Reverse Geocoding API error", details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract address from response
        const results = data.results || [];

        if (results.length === 0) {
            return NextResponse.json({
                ok: true,
                address: null,
                message: "No address found for this location"
            });
        }

        // Priority: road address > jibun address
        const roadAddr = results.find((r: any) => r.name === "roadaddr");
        const jibunAddr = results.find((r: any) => r.name === "addr");

        let fullAddress = "";
        let region = {};

        if (roadAddr && roadAddr.region) {
            const r = roadAddr.region;
            const land = roadAddr.land;
            fullAddress = `${r.area1.name} ${r.area2.name} ${r.area3.name} ${land.name} ${land.number1}${land.number2 ? '-' + land.number2 : ''}`;
            region = r;
        } else if (jibunAddr && jibunAddr.region) {
            const r = jibunAddr.region;
            const land = jibunAddr.land;
            fullAddress = `${r.area1.name} ${r.area2.name} ${r.area3.name} ${land.name} ${land.number1}${land.number2 ? '-' + land.number2 : ''}`;
            region = r;
        }

        return NextResponse.json({
            ok: true,
            address: fullAddress.trim(),
            roadAddress: roadAddr ? fullAddress.trim() : null,
            jibunAddress: jibunAddr ? fullAddress.trim() : null,
            region,
            raw: results
        });

    } catch (error: any) {
        console.error("Reverse Geocoding API Error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
