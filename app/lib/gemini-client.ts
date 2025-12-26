import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "dummy-key-for-build";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(apiKey);

export const MODEL_TEXT = "gemini-2.5-flash"; // Stable 2.5 Flash
export const MODEL_VISION = "gemini-2.5-pro"; // Stable 2.5 Pro

if (!process.env.GEMINI_API_KEY) {
    console.warn("[WARN] GEMINI_API_KEY is not set. Using dummy key for build safety.");
}

// Helper to get model instance
export function getGeminiModel(modelName: string = MODEL_TEXT) {
    return genAI.getGenerativeModel({ model: modelName });
}

// Re-export client for advanced usage if needed
export { genAI };
