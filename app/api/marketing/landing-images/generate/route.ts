import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs"; // OpenAI requires nodejs runtime
export const maxDuration = 60; // DALL-E 3 takes time

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API Key가 설정되지 않았습니다." }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const { mode, kind } = body; // mode: LEAD|CONSULT|CLOSE, kind: HERO|ICONS

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API Key가 설정되지 않았습니다." }, { status: 500 });
        }

        let prompt = "";

        // 1. Prompt Engineering based on Mode & Kind
        if (kind === "HERO") {
            if (mode === "LEAD") {
                prompt = "A clean checklist booklet on a desk, soft lighting, professional home interior vibe, modern minimal, no text, no logo. Korean B2B landing hero image, premium, clean UI background.";
            } else if (mode === "CONSULT") {
                prompt = "A professional measuring tape and laser measure in a modern apartment entryway, consultant vibe, realistic, clean composition, no text. Korean B2B landing hero image, premium.";
            } else if (mode === "CLOSE") {
                prompt = "A confident handshake + calendar schedule confirmation vibe, premium office/entryway background, realistic, no text. Korean B2B landing hero image, premium.";
            } else {
                prompt = "Korean B2B landing hero image, minimal, premium, clean UI background, no text"; // Default
            }
        } else if (kind === "ICONS") {
            // Generating a set of icons in one image or just one representative icon for now.
            // DALL-E 3 generates one image. We'll generate a grid of icons or a single composite.
            prompt = "A set of 4 modern flat icons for business: document, chat bubble, star, and shield. Minimalist style, indigo and white colors, vector art, white background.";
        } else {
            return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
        }

        // 2. Call OpenAI DALL-E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json", // Get Base64 to upload directly
            quality: "standard",
        });

        const imageBase64 = response.data?.[0]?.b64_json;
        if (!imageBase64) throw new Error("이미지 생성 실패");

        // 3. Upload to Supabase Storage
        const buffer = Buffer.from(imageBase64, 'base64');
        const filename = `generated/${Date.now()}-${kind.toLowerCase()}.png`;
        const sb = supabaseAdmin();

        // Ensure bucket exists (optional, assuming 'landing-assets' exists or auto-created if public)
        // We will just upload.
        const { data, error } = await sb.storage
            .from("landing-assets")
            .upload(filename, buffer, {
                contentType: "image/png",
                upsert: true
            });

        if (error) {
            console.error("Storage upload error:", error);
            throw error;
        }

        // 4. Get Public URL
        const { data: publicUrlData } = sb.storage
            .from("landing-assets")
            .getPublicUrl(filename);

        return NextResponse.json({
            ok: true,
            url: publicUrlData.publicUrl
        });

    } catch (e: any) {
        console.error("AI Image Gen Error:", e);
        return NextResponse.json({ error: e.message || "이미지 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
