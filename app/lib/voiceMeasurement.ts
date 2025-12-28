// Voice Measurement Utility for Field Measurement App
// Handles recording, STT API calls, and intelligent parsing of measurement data

export type ParsedMeasurement = {
    widthMm?: number;
    heightMm?: number;
    doorCategory?: "자동문" | "수동문" | "파티션";
    doorType?: string;
    openDirection?: "좌→우 열림" | "우→좌 열림";
    glassType?: string;
    installLocation?: "현관" | "드레스룸" | "알파룸" | "거실";
    memoAdd?: string;
};

export type RecordingState = "idle" | "recording" | "processing" | "success" | "error";

/**
 * Voice Recording and STT Hook
 */
export class VoiceRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    async startRecording(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: "audio/webm",
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
        } catch (error: any) {
            throw new Error(`Microphone access denied: ${error.message}`);
        }
    }

    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error("No active recording"));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
                this.cleanup();
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === "recording";
    }
}

/**
 * Upload audio to STT API
 */
export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string; raw?: any }> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
    });

    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.error || "STT failed");
    }

    return {
        text: data.text,
        raw: data.raw,
    };
}

/**
 * Convert Korean number words to digits
 * 예: "천이백" → 1200, "이천삼백" → 2300
 */
function koreanToNumber(text: string): number | null {
    const korean: Record<string, number> = {
        '십': 10, '백': 100, '천': 1000, '만': 10000,
        '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5,
        '육': 6, '칠': 7, '팔': 8, '구': 9, '영': 0, '공': 0
    };

    let result = 0;
    let current = 0;
    let prevUnit = 1;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '만') {
            result = (result + current) * 10000;
            current = 0;
            prevUnit = 1;
        } else if (char === '천') {
            current += (current === 0 ? 1 : current) * 1000;
            prevUnit = 1000;
        } else if (char === '백') {
            current += (current % 1000 === 0 ? 1 : current % 1000) * 100;
            prevUnit = 100;
        } else if (char === '십') {
            const digit = current % 100;
            current = current - digit + (digit === 0 ? 1 : digit) * 10;
            prevUnit = 10;
        } else if (korean[char] !== undefined && korean[char] < 10) {
            if (prevUnit > 1) {
                current += korean[char];
            } else {
                current = current * 10 + korean[char];
            }
        }
    }

    return result + current || null;
}

/**
 * Parse measurement data from transcribed text
 * Enhanced with Korean number support and validation
 */
export function parseMeasurementFromText(text: string): ParsedMeasurement {
    const result: ParsedMeasurement = {};
    const lowerText = text.toLowerCase().replace(/\s+/g, "");

    // ==== 1. Parse Width and Height with Korean number support ====

    // Try Korean numbers first
    const widthKoreanMatch = text.match(/가로\s*([가-힣]+)/);
    if (widthKoreanMatch) {
        const num = koreanToNumber(widthKoreanMatch[1]);
        if (num) result.widthMm = num;
    }

    const heightKoreanMatch = text.match(/세로\s*([가-힣]+)/);
    if (heightKoreanMatch) {
        const num = koreanToNumber(heightKoreanMatch[1]);
        if (num) result.heightMm = num;
    }

    // Try digit patterns (higher priority if both exist)
    const widthMatch = text.match(/가로\s*(\d+)\s*(?:미리|밀리|mm)?/i) ||
        text.match(/가로\s*(\d+)\s*미터\s*(\d+)/i);
    if (widthMatch) {
        result.widthMm = widthMatch[2]
            ? parseInt(widthMatch[1]) * 1000 + parseInt(widthMatch[2])
            : parseInt(widthMatch[1]);
    }

    const heightMatch = text.match(/세로\s*(\d+)\s*(?:미리|밀리|mm)?/i) ||
        text.match(/세로\s*(\d+)\s*미터\s*(\d+)/i);
    if (heightMatch) {
        result.heightMm = heightMatch[2]
            ? parseInt(heightMatch[1]) * 1000 + parseInt(heightMatch[2])
            : parseInt(heightMatch[1]);
    }

    // Pattern: XXXX x YYYY, XXXX에 YYYY, XXXX곱하기YYYY
    if (!result.widthMm || !result.heightMm) {
        const dimMatch = text.match(/(\d+)\s*(?:x|에|곱하기)\s*(\d+)/i);
        if (dimMatch) {
            result.widthMm = result.widthMm || parseInt(dimMatch[1]);
            result.heightMm = result.heightMm || parseInt(dimMatch[2]);
        }
    }

    // ==== 2. Parse Door Category and Type ====
    if (lowerText.includes("자동문")) {
        result.doorCategory = "자동문";
        if (lowerText.includes("3연동") || lowerText.includes("삼연동")) {
            result.doorType = "3연동 도어";
        } else if (lowerText.includes("원슬라이딩") || lowerText.includes("원슬")) {
            result.doorType = "원슬라이딩 도어";
        }
    } else if (lowerText.includes("수동문")) {
        result.doorCategory = "수동문";
        if (lowerText.includes("3연동") || lowerText.includes("삼연동")) {
            result.doorType = "3연동 도어";
        } else if (lowerText.includes("스윙")) {
            result.doorType = "스윙 도어";
        } else if (lowerText.includes("호폐") || lowerText.includes("호페")) {
            result.doorType = "호폐 도어";
        }
    } else if (lowerText.includes("파티션") || lowerText.includes("파티숀")) {
        result.doorCategory = "파티션";
        if (lowerText.includes("1창")) {
            result.doorType = "1창(싱글)";
        } else if (lowerText.includes("2창")) {
            result.doorType = "2창(더블)";
        }
    }

    // ==== 3. Parse Open Direction ====
    if (
        lowerText.includes("좌에서우") ||
        lowerText.includes("왼쪽에서오른쪽") ||
        lowerText.includes("좌우열림") ||
        lowerText.includes("좌에서우로")
    ) {
        result.openDirection = "좌→우 열림";
    } else if (
        lowerText.includes("우에서좌") ||
        lowerText.includes("오른쪽에서왼쪽") ||
        lowerText.includes("우좌열림") ||
        lowerText.includes("우에서좌로")
    ) {
        result.openDirection = "우→좌 열림";
    }

    // ==== 4. Parse Glass Type ====
    const glassKeywords = {
        "화이트 투명": ["투명", "클리어", "화이트투명"],
        "화이트 브론즈": ["브론즈", "브론즈톤"],
        "화이트 다크그레이": ["다크그레이", "그레이", "다크"],
        "샤틴": ["샤틴", "샤틴톤"],
        "플루트": ["플루트", "플륫"],
        "특수": ["특수"],
    };

    for (const [glassName, keywords] of Object.entries(glassKeywords)) {
        if (keywords.some((kw) => lowerText.includes(kw))) {
            result.glassType = glassName;
            break;
        }
    }

    // ==== 5. Parse Install Location ====
    const locations = ["현관", "드레스룸", "알파룸", "거실"];
    for (const loc of locations) {
        if (text.includes(loc)) {
            result.installLocation = loc as any;
            break;
        }
    }

    // ==== 6. Add unprocessed text to memo ====
    // If we couldn't parse key information, add original text to memo
    if (!result.widthMm && !result.heightMm && !result.doorCategory) {
        result.memoAdd = `[음성 입력] ${text.slice(0, 100)}`;
    }

    return result;
}

/**
 * Validate parsed measurement data
 * Returns validation status and messages per specification
 */
export function validateMeasurement(data: ParsedMeasurement): {
    isValid: boolean;
    needsConfirmation: boolean;
    confirmationMessage?: string;
    warnings: string[];
} {
    const warnings: string[] = [];
    let needsConfirmation = false;
    let confirmationMessage = "";

    // Rule: Must have both width and height
    if (!data.widthMm || !data.heightMm) {
        needsConfirmation = true;
        confirmationMessage = "가로와 세로를 다시 말씨해 주세요";
        return { isValid: false, needsConfirmation, confirmationMessage, warnings };
    }

    // Check reasonable ranges (100mm ~ 5000mm)
    if (data.widthMm < 100 || data.widthMm > 5000) {
        warnings.push("가로 값이 비정상적입니다. 확인해주세요.");
    }
    if (data.heightMm < 100 || data.heightMm > 5000) {
        warnings.push("세로 값이 비정상적입니다. 확인해주세요.");
    }

    return {
        isValid: true,
        needsConfirmation,
        warnings
    };
}

/**
 * Generate voice feedback text (for TTS)
 */
export function generateVoiceFeedback(data: ParsedMeasurement): string {
    const parts: string[] = [];

    if (data.widthMm) parts.push(`가로 ${data.widthMm}`);
    if (data.heightMm) parts.push(`세로 ${data.heightMm}`);
    if (data.doorCategory) parts.push(data.doorCategory);
    if (data.doorType) parts.push(data.doorType);

    if (parts.length === 0) {
        return "인식된 데이터가 없습니다. 다시 말씨해 주세요.";
    }

    return `${parts.join(', ')} 입력되었습니다.`;
}

/**
 * Speak text using Web Speech API (TTS)
 */
export function speakFeedback(text: string): void {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

/**
 * Check if MediaRecorder is supported
 */
export function isRecordingSupported(): boolean {
    return typeof window !== "undefined" &&
        "mediaDevices" in navigator &&
        "MediaRecorder" in window;
}
