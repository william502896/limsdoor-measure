import fs from "fs";
import path from "path";

export const COMPANY_ACCOUNT_TEXT = `🏦 입금 계좌
- 케이뱅크 700100061232
- 주식회사 림스`;

export const POLICY_TEXT = `※ 견적 기준(요약)
- 원슬라이딩: 화이트+투명 기준 590,000원 / 기준사이즈 1250×2300(mm)
- 3연동:     화이트+투명 기준 690,000원 / 기준사이즈 1350×2300(mm)
- 색상 변경: +70,000원
- 유리 변경: 브론즈/다크그레이 +80,000원 / 샤틴류 +100,000원 / 특수유리 +130,000원
- 사이즈 초과: 100mm당 50,000원 추가(가로+세로 초과분 합산)`;

export function dataUrlToUint8Array(dataUrl: string) {
    const base64 = dataUrl.split(",")[1] ?? "";
    return Uint8Array.from(Buffer.from(base64, "base64"));
}

export function safeText(v: any) {
    if (v === null || v === undefined) return "";
    return String(v);
}

export function formatWon(n: number) {
    if (!Number.isFinite(n)) return "";
    return `${Math.trunc(n).toLocaleString("ko-KR")}원`;
}

export function toKoreanDateString(isoLike: any) {
    const s = safeText(isoLike);
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s;
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

export async function loadKoreanFontBytes() {
    // public/fonts/NotoSansKR-Regular.ttf
    const p = path.join(process.cwd(), "public", "fonts", "NotoSansKR-Regular.ttf");
    if (fs.existsSync(p)) return fs.readFileSync(p);
    return null;
}

export function contentDispositionZip(filename: string) {
    const encoded = encodeURIComponent(filename);
    return `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`;
}

export function validatePayload(payload: any) {
    if (!payload?.customerName) return "고객명이 누락되었습니다.";
    if (!payload?.customerPhone) return "고객 연락처가 누락되었습니다.";
    if (!payload?.address) return "고객 주소가 누락되었습니다.";

    if (!payload?.measurerName) return "실측자 이름이 누락되었습니다.";
    if (!payload?.measurerPhone) return "실측자 연락처가 누락되었습니다.";

    const sig = safeText(payload?.customerSignature);
    if (!sig.startsWith("data:image/")) return "고객 서명이 누락되었습니다. (서명 후 다시 시도)";

    const w = Number(payload?.widthMm ?? 0);
    const h = Number(payload?.heightMm ?? 0);
    if (!Number.isFinite(w) || w <= 0) return "확정 가로(mm)가 올바르지 않습니다.";
    if (!Number.isFinite(h) || h <= 0) return "확정 세로(mm)가 올바르지 않습니다.";

    if (!payload?.estimate || !Number.isFinite(Number(payload.estimate.total))) {
        return "견적 정보(estimate)가 누락되었습니다.";
    }

    return null;
}