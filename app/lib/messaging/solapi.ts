import crypto from "crypto";
import { SendPayload, SendResult } from "./provider";

type SolapiInput = SendPayload & {
    from: string;

    // ✅ 알림톡용
    kakao?: {
        pfId: string;
        templateId: string;
        variables?: Record<string, any>;
        disableSms?: boolean;
        // 필요 시 buttons/title/replacements 확장 가능
    };

    // ✅ 폴백 문자 문구(알림톡 실패 시)
    fallbackText?: string;
};

function hmacSignature(date: string, salt: string, secret: string) {
    const data = date + salt;
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * 솔라피 인증 헤더는 콘솔 문서 기준으로 미세 차이가 있을 수 있습니다.
 * 구조는 동일하고, 헤더 키/서명 방식만 문서대로 맞추면 됩니다.
 */
function buildSolapiHeaders() {
    const apiKey = process.env.SOLAPI_API_KEY || "";
    const apiSecret = process.env.SOLAPI_API_SECRET || "";
    if (!apiKey || !apiSecret) throw new Error("SOLAPI_API_KEY/SECRET missing");

    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString("hex");
    const signature = hmacSignature(date, salt, apiSecret);

    return {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    };
}

export async function sendViaSolapi(input: SolapiInput): Promise<SendResult> {
    try {
        const domain = process.env.SOLAPI_DOMAIN || "api.solapi.com";
        const url = `https://${domain}/messages/v4/send`; // 콘솔 문서 기준으로 확인 권장

        const type = input.type || "SMS";
        const isKakao = type === "KAKAO";

        // ✅ 1) 알림톡(ATA)
        if (isKakao) {
            if (!input.kakao?.pfId || !input.kakao?.templateId) {
                return { ok: false, provider: "SOLAPI", error: "KAKAO pfId/templateId missing" };
            }

            const body = {
                message: {
                    to: input.to,
                    from: input.from,     // 일부 계정/설정에선 from 필요
                    text: input.text,     // 템플릿 원문 또는 참고용
                    type: "ATA",          // 알림톡(ATA)
                    kakaoOptions: {
                        pfId: input.kakao.pfId,
                        templateId: input.kakao.templateId,
                        variables: input.kakao.variables || {},
                        disableSms: !!input.kakao.disableSms, // false면 실패 시 문자 대체 가능
                        buttons: (input.kakao as any).buttons || [],   // ✅ 추가
                    },
                },
            };

            const res = await fetch(url, { method: "POST", headers: buildSolapiHeaders(), body: JSON.stringify(body) });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                return {
                    ok: false,
                    provider: "SOLAPI",
                    error: json?.error?.message || json?.message || `HTTP_${res.status}`,
                };
            }

            const messageId = json?.messageId || json?.groupId || json?.data?.messageId || json?.data?.groupId;
            return { ok: true, provider: "SOLAPI", messageId };
        }

        // ✅ 2) SMS/LMS (기존 유지)
        const isLms = type === "LMS" || (input.text?.length || 0) > 80;

        const body = {
            message: {
                to: input.to,
                from: input.from,
                text: input.text,
                subject: isLms ? (input.subject || "림스도어 안내") : undefined,
                type: isLms ? "LMS" : "SMS",
            },
        };

        const res = await fetch(url, { method: "POST", headers: buildSolapiHeaders(), body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return {
                ok: false,
                provider: "SOLAPI",
                error: json?.error?.message || json?.message || `HTTP_${res.status}`,
            };
        }

        const messageId = json?.messageId || json?.groupId || json?.data?.messageId || json?.data?.groupId;
        return { ok: true, provider: "SOLAPI", messageId };
    } catch (e: any) {
        return { ok: false, provider: "SOLAPI", error: e?.message || "SOLAPI_SEND_ERROR" };
    }
}
