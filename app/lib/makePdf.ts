import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";

export type MeasurementPayload = {
    createdAt?: string;

    customerName?: string;
    customerPhone?: string;
    address?: string;

    measurerName?: string;
    measurerPhone?: string;

    widthMm?: number;
    heightMm?: number;

    doorCategory?: string;
    doorType?: string;
    openDirection?: string;

    glassType?: string;
    doorDesign?: string;

    memo?: string;

    // ✅ 고객 서명 (dataURL PNG)
    customerSignature?: string;

    // ✅ 견적(자동 계산 결과를 route.ts에서 넘겨줌)
    estimate?: {
        total?: number;
        base?: number;
        colorAdd?: number;
        glassAdd?: number;
        sizeAdd?: number;
        sizeBaseW?: number;
        sizeBaseH?: number;
    };

    // (선택) 사진 URL or dataURL 배열 - 지금은 미사용
    photos?: string[];
};

// ===============================
// Helpers
// ===============================
function safeText(v: any) {
    const s = String(v ?? "").trim();
    return s.length ? s : "-";
}

function formatWon(n: number) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "-";
    return `${Math.trunc(num).toLocaleString("ko-KR")}원`;
}

function toKoreanDate(isoLike?: string) {
    const s = String(isoLike ?? "").trim();
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return safeText(isoLike);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

// data:image/png;base64,... -> Uint8Array
function dataUrlToBytes(dataUrl: string) {
    const base64 = dataUrl.split(",")[1] ?? "";
    const buf = Buffer.from(base64, "base64");
    return new Uint8Array(buf);
}
function isPngDataUrl(s?: string) {
    return typeof s === "string" && /^data:image\/png;base64,/.test(s);
}

// 줄바꿈 텍스트 출력(간단)
function drawMultilineText(args: {
    page: any;
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    lineHeight: number;
    font: any;
    size: number;
    color?: any;
}) {
    const { page, text, x, y, maxWidth, lineHeight, font, size, color } = args;
    const words = text.split(/\s+/);
    let line = "";
    let cursorY = y;

    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const width = font.widthOfTextAtSize(test, size);
        if (width <= maxWidth) {
            line = test;
        } else {
            page.drawText(line, { x, y: cursorY, size, font, color });
            cursorY -= lineHeight;
            line = w;
        }
    }
    if (line) page.drawText(line, { x, y: cursorY, size, font, color });
    return cursorY - lineHeight;
}

export async function makePdf(payload: MeasurementPayload) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // ✅ 한글 폰트 로딩(서버 파일시스템에서 읽기)
    const fontPath = `${process.cwd()}/public/fonts/NotoSansKR-Regular.ttf`;
    const fontBytes = await fs.readFile(fontPath);
    const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

    // A4
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // ===============================
    // 1) 헤더
    // ===============================
    const primaryColor = rgb(0.07, 0.2, 0.45);

    page.drawRectangle({
        x: 0,
        y: height - 80,
        width,
        height: 80,
        color: primaryColor,
    });

    page.drawText("RIMS DOOR | 실측 확인서 / 견적서", {
        x: 40,
        y: height - 52,
        size: 18,
        color: rgb(1, 1, 1),
        font: customFont,
    });

    const serial = new Date().getTime().toString().slice(-8);
    page.drawText(`No. ${serial}`, {
        x: width - 140,
        y: height - 52,
        size: 10,
        color: rgb(0.9, 0.9, 0.9),
        font: customFont,
    });

    let y = height - 120;

    // ===============================
    // 2) 표 Row Helper
    // ===============================
    const drawRow = (label: string, value: string, currentY: number) => {
        page.drawRectangle({
            x: 40,
            y: currentY - 6,
            width: 110,
            height: 26,
            color: rgb(0.95, 0.95, 0.95),
        });

        page.drawText(label, {
            x: 50,
            y: currentY,
            size: 11,
            font: customFont,
            color: rgb(0.15, 0.15, 0.15),
        });

        page.drawText(value, {
            x: 160,
            y: currentY,
            size: 11,
            font: customFont,
            color: rgb(0.15, 0.15, 0.15),
        });

        page.drawLine({
            start: { x: 40, y: currentY - 12 },
            end: { x: width - 40, y: currentY - 12 },
            thickness: 0.6,
            color: rgb(0.82, 0.82, 0.82),
        });

        return currentY - 30;
    };

    // ===============================
    // 고객/실측자 정보
    // ===============================
    y = drawRow("작성일", toKoreanDate(payload.createdAt), y);
    y = drawRow("고객 성함", safeText(payload.customerName), y);
    y = drawRow("연락처", safeText(payload.customerPhone), y);
    y = drawRow("설치 주소", safeText(payload.address), y);
    y = drawRow("실측자", safeText(payload.measurerName), y);
    y = drawRow("실측자 연락처", safeText(payload.measurerPhone), y);

    y -= 8;

    // ===============================
    // 실측 데이터
    // ===============================
    page.drawText("■ 실측 데이터", {
        x: 40,
        y,
        size: 13,
        font: customFont,
        color: rgb(0.1, 0.1, 0.1),
    });
    y -= 24;

    const w = typeof payload.widthMm === "number" ? payload.widthMm : 0;
    const h = typeof payload.heightMm === "number" ? payload.heightMm : 0;

    y = drawRow("확정 사이즈(mm)", `${w} x ${h}`, y);
    y = drawRow("문 종류", `${safeText(payload.doorCategory)} (${safeText(payload.doorType)})`, y);
    y = drawRow("열림 방향", safeText(payload.openDirection), y);
    y = drawRow("유리/디자인", `${safeText(payload.glassType)} / ${safeText(payload.doorDesign)}`, y);

    // ===============================
    // ✅ 견적 섹션(추가)
    // ===============================
    y -= 10;
    page.drawText("■ 견적서(자동 계산)", {
        x: 40,
        y,
        size: 13,
        font: customFont,
        color: rgb(0.1, 0.1, 0.1),
    });
    y -= 24;

    const est = payload.estimate ?? {};
    const baseW = Number(est.sizeBaseW ?? 0);
    const baseH = Number(est.sizeBaseH ?? 0);

    y = drawRow("기준 사이즈(mm)", baseW && baseH ? `${baseW} x ${baseH}` : "-", y);
    y = drawRow("기본가", formatWon(Number(est.base ?? 0)), y);
    y = drawRow("색상 추가", formatWon(Number(est.colorAdd ?? 0)), y);
    y = drawRow("유리 추가", formatWon(Number(est.glassAdd ?? 0)), y);
    y = drawRow("사이즈 추가", formatWon(Number(est.sizeAdd ?? 0)), y);

    // 합계는 강조(배경색)
    page.drawRectangle({
        x: 40,
        y: y - 6,
        width: width - 80,
        height: 28,
        color: rgb(0.92, 0.96, 1),
    });
    page.drawText("합계", {
        x: 50,
        y: y,
        size: 12,
        font: customFont,
        color: rgb(0.07, 0.2, 0.45),
    });
    page.drawText(formatWon(Number(est.total ?? 0)), {
        x: 160,
        y: y,
        size: 12,
        font: customFont,
        color: rgb(0.07, 0.2, 0.45),
    });
    page.drawLine({
        start: { x: 40, y: y - 12 },
        end: { x: width - 40, y: y - 12 },
        thickness: 0.6,
        color: rgb(0.82, 0.82, 0.82),
    });
    y -= 36;

    // 정책문구(작게)
    const policyText =
        `※ 견적 기준\n` +
        `- 원슬라이딩: 화이트+투명 기준 590,000원 / 기준사이즈 1250×2300(mm)\n` +
        `- 3연동: 화이트+투명 기준 690,000원 / 기준사이즈 1350×2300(mm)\n` +
        `- 색상 변경: +70,000원\n` +
        `- 유리 변경: 브론즈/다크그레이 +80,000원 / 샤틴류 +100,000원 / 특수유리 +130,000원\n` +
        `- 사이즈 초과: 100mm당 50,000원 추가(가로+세로 초과분 합산)\n`;

    // 너무 길면 서명 영역 침범하므로 y가 낮으면 고정 위치로 출력
    const policyX = 40;
    const policyMaxW = width - 80;
    const policyLineH = 12;
    const policySize = 8.8;

    // 서명 박스 상단이 120 근처니까, 정책은 최소 y=210 이상에서 끝내기
    const policyStartY = Math.max(y, 250);

    page.drawRectangle({
        x: 40,
        y: policyStartY - 82,
        width: width - 80,
        height: 78,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
        color: rgb(1, 1, 1),
    });

    drawMultilineText({
        page,
        text: policyText,
        x: policyX + 10,
        y: policyStartY - 16,
        maxWidth: policyMaxW - 20,
        lineHeight: policyLineH,
        font: customFont,
        size: policySize,
        color: rgb(0.25, 0.25, 0.25),
    });

    y = policyStartY - 95;

    // ===============================
    // 메모
    // ===============================
    y -= 8;
    page.drawText("■ 비고", {
        x: 40,
        y,
        size: 13,
        font: customFont,
        color: rgb(0.1, 0.1, 0.1),
    });
    y -= 18;

    const memo = safeText(payload.memo);
    const memoBoxH = 65;

    page.drawRectangle({
        x: 40,
        y: y - memoBoxH,
        width: width - 80,
        height: memoBoxH,
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 1,
        color: rgb(1, 1, 1),
    });

    const memoX = 50;
    const memoY = y - 18;
    const memoMaxW = width - 100;

    drawMultilineText({
        page,
        text: memo === "-" ? "" : memo,
        x: memoX,
        y: memoY,
        maxWidth: memoMaxW,
        lineHeight: 14,
        font: customFont,
        size: 10,
        color: rgb(0.2, 0.2, 0.2),
    });

    if (memo === "-") {
        page.drawText("특이사항 없음", {
            x: memoX,
            y: memoY,
            size: 10,
            font: customFont,
            color: rgb(0.5, 0.5, 0.5),
        });
    }

    // ===============================
    // ✅ 계좌 정보(추가) - 하단에 짧게 표시
    // ===============================
    const accountText = `🏦 입금 계좌: 케이뱅크 700100061232 (주식회사 림스)`;
    page.drawText(accountText, {
        x: 40,
        y: 48,
        size: 9.5,
        font: customFont,
        color: rgb(0.2, 0.2, 0.2),
    });

    // ===============================
    // 4) 하단 서명란 + 실제 서명 이미지 삽입
    // ===============================
    const signBoxY = 120;

    page.drawRectangle({
        x: 40,
        y: signBoxY - 50,
        width: width - 80,
        height: 90,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(1, 1, 1),
    });

    page.drawText("위의 실측 내용을 확인하였으며, 견적 내용을 확인하고 이에 동의합니다.", {
        x: 55,
        y: signBoxY + 20,
        size: 10,
        font: customFont,
        color: rgb(0.25, 0.25, 0.25),
    });

    page.drawText("고객 서명", {
        x: 55,
        y: signBoxY - 10,
        size: 11,
        font: customFont,
        color: rgb(0.15, 0.15, 0.15),
    });

    const sigAreaX = width - 220;
    const sigAreaY = signBoxY - 40;
    const sigAreaW = 160;
    const sigAreaH = 55;

    page.drawRectangle({
        x: sigAreaX,
        y: sigAreaY,
        width: sigAreaW,
        height: sigAreaH,
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 1,
        color: rgb(1, 1, 1),
    });

    if (isPngDataUrl(payload.customerSignature)) {
        try {
            const sigBytes = dataUrlToBytes(payload.customerSignature!);
            const sigImg = await pdfDoc.embedPng(sigBytes);

            const imgW = sigImg.width;
            const imgH = sigImg.height;
            const scale = Math.min(sigAreaW / imgW, sigAreaH / imgH);

            const drawW = imgW * scale;
            const drawH = imgH * scale;

            const drawX = sigAreaX + (sigAreaW - drawW) / 2;
            const drawY = sigAreaY + (sigAreaH - drawH) / 2;

            page.drawImage(sigImg, { x: drawX, y: drawY, width: drawW, height: drawH });
        } catch {
            page.drawText("서명 이미지 오류", {
                x: sigAreaX + 10,
                y: sigAreaY + 20,
                size: 9,
                font: customFont,
                color: rgb(0.8, 0.2, 0.2),
            });
        }
    } else {
        page.drawText("(서명 없음)", {
            x: sigAreaX + 45,
            y: sigAreaY + 20,
            size: 9,
            font: customFont,
            color: rgb(0.5, 0.5, 0.5),
        });
    }

    // 하단 푸터
    page.drawText(`발행일: ${new Date().toISOString().slice(0, 10)}`, {
        x: 40,
        y: 30,
        size: 9,
        font: customFont,
        color: rgb(0.45, 0.45, 0.45),
    });

    return await pdfDoc.save();
}
