import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generate Naver Cloud Platform API Gateway Signature (v2)
 * Required for CLOVA Speech API authentication
 */
function makeSignature({
    method,
    urlPathWithQuery,
    timestamp,
    accessKey,
    secretKey,
}: {
    method: string;
    urlPathWithQuery: string;
    timestamp: string;
    accessKey: string;
    secretKey: string;
}) {
    const message = `${method} ${urlPathWithQuery}\n${timestamp}\n${accessKey}`;
    return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

export async function POST(req: Request) {
    try {
        // Environment variables for Naver Cloud Platform
        const accessKey = process.env.NCLOUD_ACCESS_KEY_ID;
        const secretKey = process.env.NCLOUD_SECRET_KEY;
        const domainCode = process.env.CLOVA_SPEECH_DOMAIN_CODE;
        const base = process.env.CLOVA_SPEECH_API_URL_BASE || "https://clovaspeech-gw.ncloud.com";

        if (!accessKey || !secretKey || !domainCode) {
            return NextResponse.json(
                { ok: false, error: "Missing Naver Cloud credentials. Please set NCLOUD_ACCESS_KEY_ID, NCLOUD_SECRET_KEY, and CLOVA_SPEECH_DOMAIN_CODE" },
                { status: 500 }
            );
        }

        // Parse form data
        const formData = await req.formData();
        const audioFile = formData.get("audio");

        if (!audioFile || !(audioFile instanceof Blob)) {
            return NextResponse.json(
                { ok: false, error: "No audio file provided" },
                { status: 400 }
            );
        }

        // CLOVA Speech API endpoint
        const urlPath = `/external/v1/${domainCode}/recognizer/upload?lang=ko-KR`;
        const timestamp = Date.now().toString();

        // Generate authentication signature
        const signature = makeSignature({
            method: "POST",
            urlPathWithQuery: urlPath,
            timestamp,
            accessKey,
            secretKey,
        });

        const endpoint = `${base}${urlPath}`;

        // Prepare upload form
        const uploadForm = new FormData();
        uploadForm.append("media", audioFile, "audio.webm");

        // Call CLOVA Speech API
        const clovaResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
                "x-ncp-apigw-timestamp": timestamp,
                "x-ncp-iam-access-key": accessKey,
                "x-ncp-apigw-signature-v2": signature,
            },
            body: uploadForm,
        });

        const responseText = await clovaResponse.text();

        // Parse response (defensive parsing)
        let json: any = null;
        try {
            json = JSON.parse(responseText);
        } catch (e) {
            // Response is not JSON
        }

        // Extract transcript from various possible response structures
        const transcript =
            json?.text ||
            json?.result?.text ||
            json?.result?.transcript ||
            json?.transcript ||
            "";

        if (!clovaResponse.ok) {
            console.error("CLOVA STT Error:", json || responseText);
            return NextResponse.json(
                { ok: false, error: "CLOVA Speech API error", status: clovaResponse.status, raw: json || responseText },
                { status: clovaResponse.status }
            );
        }

        if (!transcript) {
            return NextResponse.json(
                { ok: false, error: "No transcript received", raw: json || responseText },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            text: transcript,
            raw: json || responseText,
        });

    } catch (error: any) {
        console.error("STT API Error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
