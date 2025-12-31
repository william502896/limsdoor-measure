import { buildOptoutUrl } from "@/app/lib/messaging/optoutSignedLink";

export function appendOptoutFooter(text: string, toPhone: string) {
    const label = (process.env.OPTOUT_FOOTER_LABEL || "수신거부").trim();
    const base = (text || "").trim();

    // 링크 생성 실패해도 본문은 유지
    let link = "";
    try {
        link = buildOptoutUrl(toPhone);
    } catch {
        return base;
    }

    const footer = `${label}: ${link}`;

    // 중복 삽입 방지
    if (base.includes(label) && base.includes("/optout")) return base;

    return `${base}\n\n${footer}`.trim();
}
