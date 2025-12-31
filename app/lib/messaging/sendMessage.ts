import { SendPayload, SendResult, normalizePhone } from "./provider";
import { sendViaSolapi } from "./solapi";
import { sendViaAligo } from "./aligo";
import { appendOptoutFooter } from "./optoutFooter";

export async function sendMessage(payload: SendPayload & {
    kakao?: { pfId: string; templateId: string; variables?: Record<string, any>; disableSms?: boolean; buttons?: any[] };
    fallbackText?: string;
}): Promise<SendResult> {
    const provider = (process.env.MESSAGE_PROVIDER || "SOLAPI").toUpperCase();

    const to = normalizePhone(payload.to);
    const from = normalizePhone(process.env.DEFAULT_FROM_PHONE || "");
    if (!to) return { ok: false, provider, error: "TO_PHONE_EMPTY" };
    if (!from) return { ok: false, provider, error: "DEFAULT_FROM_PHONE_EMPTY" };

    // SOLAPI/ALIGO 모두에게 "문자"로 갈 때만 꼬리말 붙임 (KAKAO는 템플릿이라 불가)
    const safe: {
        to: string;
        text: string;
        type: "SMS" | "LMS" | "KAKAO";
        msg_type: "SMS" | "LMS" | "KAKAO"; // 하위호환
        subject?: string;
        kakao?: { pfId: string; templateId: string; variables?: Record<string, any>; disableSms?: boolean; buttons?: any[] };
        fallbackText?: string;
    } = {
        to: normalizePhone(payload.to),
        text: payload.text || "",
        type: payload.type || "SMS",
        msg_type: payload.type || "SMS",
        subject: payload.subject,
        kakao: payload.kakao,
        fallbackText: payload.fallbackText,
    };

    // ✅ SMS/LMS에만 수신거부 꼬리말 자동 삽입 (알림톡은 템플릿에서 관리)
    if (safe.type !== "KAKAO") {
        safe.text = appendOptoutFooter(safe.text || "", safe.to);
    }

    if (provider === "ALIGO") {
        return await sendViaAligo({ ...safe, from });
    }
    // 기본값 SOLAPI
    return await sendViaSolapi({
        ...safe,
        from,
        kakao: safe.kakao,
        fallbackText: safe.fallbackText,
    });
}
