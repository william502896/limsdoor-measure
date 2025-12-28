import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Naver Maps Geocoding API - Address to Coordinates
 * Converts address string to lat/lng coordinates
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query");

        if (!query) {
            return NextResponse.json(
                { ok: false, error: "Query parameter is required" },
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

        // Naver Maps Geocoding API
        const apiUrl = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`;

        const response = await fetch(apiUrl, {
            headers: {
                "X-NCP-APIGW-API-KEY-ID": clientId,
                "X-NCP-APIGW-API-KEY": clientSecret,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Naver Geocoding Error:", errorText);
            return NextResponse.json(
                { ok: false, error: "Geocoding API error", details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract addresses from response
        const addresses = data.addresses || [];

        if (addresses.length === 0) {
            return NextResponse.json({
                ok: true,
                addresses: [],
                message: "No results found"
            });
        }

        // Format results
        const results = addresses.map((addr: any) => ({
            roadAddress: addr.roadAddress || "",
            jibunAddress: addr.jibunAddress || "",
            lat: parseFloat(addr.y),
            lng: parseFloat(addr.x),
            distance: addr.distance
        }));

        return NextResponse.json({
            ok: true,
            addresses: results,
            total: results.length
        });

    } catch (error: any) {
        console.error("Geocoding API Error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
