import { SendPayload, SendResult } from "./provider";

type AligoInput = SendPayload & { from: string };

export async function sendViaAligo(input: AligoInput): Promise<SendResult> {
    try {
        const key = process.env.ALIGO_API_KEY || "";
        const userId = process.env.ALIGO_USER_ID || "";
        if (!key || !userId) throw new Error("ALIGO_API_KEY/USER_ID missing");

        // 알리고는 종종 x-www-form-urlencoded 형태를 사용합니다(문서 확인).
        // 여기서는 form 형태로 안전하게 구성합니다.
        const url = "https://apis.aligo.in/send/"; // 문서 기준 확인 권장

        const type = input.type || "SMS";
        const isLms = type === "LMS" || (input.text?.length || 0) > 80;

        const form = new URLSearchParams();
        form.set("key", key);
        form.set("user_id", userId);
        form.set("sender", input.from);
        form.set("receiver", input.to);
        form.set("msg", input.text);
        if (isLms) {
            form.set("msg_type", "LMS");
            form.set("title", input.subject || "림스도어 안내");
        } else {
            form.set("msg_type", "SMS");
        }

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
        });

        const json = await res.json().catch(() => ({}));

        // 알리고는 result_code 같은 값을 쓰는 경우가 많습니다(문서 확인)
        const ok = String(json?.result_code || "").startsWith("1") || json?.success === true;

        if (!res.ok || !ok) {
            return {
                ok: false,
                provider: "ALIGO",
                error: json?.message || json?.result_message || `HTTP_${res.status}`,
            };
        }

        const messageId = json?.msg_id || json?.message_id || undefined;
        return { ok: true, provider: "ALIGO", messageId };
    } catch (e: any) {
        return { ok: false, provider: "ALIGO", error: e?.message || "ALIGO_SEND_ERROR" };
    }
}
