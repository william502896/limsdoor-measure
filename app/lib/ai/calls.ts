import { z } from "zod";
import { getGeminiModel, MODEL_TEXT, MODEL_VISION } from "@/app/lib/gemini-client";

/* =========================================================
   공통 유틸
========================================================= */
function safeJsonStringify(obj: unknown) {
    return JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

function parseJsonContent(content: string | null = "") {
    if (!content) return null;
    const clean = content.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Failed:", clean);
        return null;
    }
}

// Helper to construct prompt parts
// Note: For images, we should ideally pass base64 if running on server. 
// Since we have URLs, purely server-side fetch is needed, but for now we'll assume text-only if complex.
// IMPROVEMENT: For this migration, we will focus on Text capabilities first to restore 404/429.
// Vision calls might need extra logic to fetch URL -> Base64.
// Let's implement a text-based fallback for vision if fetch logic is complex, OR try to fetch.

async function buildPromptWithImage(system: string, user: string, imageUrls: string[]) {
    // Gemini System Instructions are passed at model init, but here we can just prepend to prompt for simplicity
    // or use systemInstruction in getGenerativeModel (cleaner).

    // For now, prepend system prompt to user prompt
    const textPart = `${system}\n\n---\n\n${user}`;

    // If we have images, we need to fetch them. 
    // This is a blocking operation but necessary for multimodal.
    // Simplifying: If image URL is present, we just pass text for now to ensure STABILITY.
    // TODO: Implement URL -> Base64 fetching for full vision support.

    return [textPart];
}

/* =========================================================
   1) A-1 measure-audit
========================================================= */
export async function callMeasureAuditAI(payload: any) {
    const system = [
        "You are a field measurement QA assistant.",
        "Return valid JSON only. Structure: { grade, confidence, summary, likely_causes, next_actions, flags, extra_material }"
    ].join("\n");
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   2) A-2 photo-classify
========================================================= */
export async function callPhotoClassifyAI(payload: any) {
    const system = "Classify installation-site photos. Return JSON: { classified, missing_required, warnings }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT); // Vision temporarily disabled for stability
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   3) A-3 memo-polish
========================================================= */
export async function callMemoPolishAI(payload: any) {
    const system = "Rewrite field notes. Return JSON: { customer_note, office_note, confidence }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   4) A-4 install-checklist
========================================================= */
export async function callInstallChecklistAI(payload: any) {
    const system = "Generate installer checklist. Return JSON: { steps, tools, materials, confidence }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   5) B-1 ar-judge
========================================================= */
export async function callArJudgeAI(payload: any) {
    const system = "Judge AR placement. Return JSON: { result, confidence, message, fix_actions }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   6) B-2 recommend
========================================================= */
export async function callRecommendAI(payload: any) {
    const system = "Recommend 3 door combos. Return JSON: { recommendations: [{ tier, combo, why, price_range_krw }] }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   7) B-3 lead-intake
========================================================= */
export async function callLeadIntakeAI(payload: any) {
    const system = "Summarize lead. Return JSON: { summary: { office_brief, next_questions }, confidence }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}

/* =========================================================
   8) B-4 style-match
========================================================= */
export async function callStyleMatchAI(payload: any) {
    const system = "Analyze style and suggest door config. Return JSON: { style_analysis, suggested_config, reasoning }";
    const user = safeJsonStringify(payload);

    const model = getGeminiModel(MODEL_TEXT);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    return parseJsonContent(result.response.text());
}
