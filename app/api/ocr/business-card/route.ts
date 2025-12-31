
import { NextRequest, NextResponse } from "next/server";
import { json, error, nowMs, newRequestId } from "@/app/lib/api-utils";
import { getGeminiModel, MODEL_VISION } from "@/app/lib/gemini-client";
import { logApi } from "@/app/lib/logger";

export const runtime = "nodejs"; // Vision processing might need nodejs runtime for buffer handling

export async function POST(req: NextRequest) {
    const start = nowMs();
    const requestId = newRequestId();

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return error({ request_id: requestId, code: "NO_FILE", message: "No file uploaded" }, 400);
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString("base64");
        const mimeType = file.type;

        const model = getGeminiModel(MODEL_VISION);

        const prompt = `
        Analyze this image (Business Card OR Business Registration Certificate).
        Extract the following information in strict JSON format:
        {
            "document_type": "business_card" | "business_license",
            "company_name": "Company Name (상호 for License)",
            "ceo_name": "Representative Name (대표자 for License, Name for Card)",
            "business_number": "Business Registration Number (사업자번호)",
            "industry": "Industry Type (업태)",
            "sector": "Sector (종목)",
            "address": "Address (사업장소재지)",
            "mobile": "Mobile Phone",
            "tel": "Office Phone (전화번호)",
            "fax": "Fax",
            "email": "Email",
            "homepage": "Website"
        }
        For Business Licenses (사업자등록증), prioritize extracting 'business_number', 'company_name', 'ceo_name', 'address', 'industry', 'sector'.
        If a field is not found, return null or empty string. 
        Do not include markdown formatting like \`\`\`json. Just return the raw JSON object.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            }
        ]);

        const responseText = result.response.text();
        let extractedData = {};

        try {
            // Clean up code blocks if present
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            extractedData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("OCR JSON Parse Error:", e, responseText);
            // Fallback: return extracting text raw
            extractedData = { raw_text: responseText };
        }

        await logApi({
            request_id: requestId,
            endpoint: "ocr-business-card",
            role: "admin",
            ok: true,
            latency_ms: nowMs() - start,
            meta: { file_size: buffer.length }
        });

        return json({
            status: "ok",
            data: extractedData
        });

    } catch (e: any) {
        console.error("[OCR ERROR]", e);
        return error({ request_id: requestId, code: "OCR_ERROR", message: e.message }, 500);
    }
}
