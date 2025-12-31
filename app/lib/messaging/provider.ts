export type SendPayload = {
    to: string;              // 수신번호 (숫자만 권장)
    text: string;            // 메시지 내용
    type?: "SMS" | "LMS" | "KAKAO"; // 지금은 SMS/LMS 중심
    subject?: string;        // LMS일 때 제목(선택)
};

export type SendResult = {
    ok: boolean;
    provider: string;
    messageId?: string;
    error?: string;
};

export function normalizePhone(p: string) {
    return (p || "").replace(/[^\d]/g, "");
}
