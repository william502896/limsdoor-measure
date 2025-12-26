import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client for Gemini
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy",
    baseURL: process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Configure Model
const MODEL_VISION = process.env.OPENAI_MODEL_VISION || "gemini-2.0-flash-exp";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: "Image data is required" }, { status: 400 });
        }

        const systemPrompt = `
You are an expert Document Data Extractor specializing in Korean Purchase Invoices (거래명세서) and Receipts (영수증).
Analyze the provided image and extract the following information.
If there are multiple items, extract the MOST PROMINENT or FIRST item.
Return pure JSON with no markdown formatting.

Target Structure:
{
  "supplier": "string (Company Name, supplyr)",
  "item_name": "string (Full item name including spec)",
  "unit_price": "number (Unit cost, without VAT if usually separated, or total if not)",
  "unit": "string (EA, SET, BOX, etc. - maintain Korean or convert to EA)",
  "confidence": "number (0-1)"
}

Rules:
1. be precise with numbers.
2. fix common OCR typos in Korean context (e.g. '0' vs 'ㅇ').
3. if supplier is missing, try to infer from header logo text.
`;

        const response = await openai.chat.completions.create({
            model: MODEL_VISION,
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract purchase data from this invoice." },
                        { type: "image_url", image_url: { url: image } }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000
        });

        const content = response.choices[0].message.content;
        let parsed;
        try {
            parsed = JSON.parse(content || "{}");
        } catch (e) {
            console.error("Failed to parse JSON", content);
            parsed = {};
        }

        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error("OCR API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
