import { NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ===============================
   Types
================================ */
type DoorCategory = "자동문" | "수동문" | "파티션";
type InstallLocation = "현관" | "드레스룸" | "알파룸" | "거실";
type OpenDirection = "좌→우" | "우→좌";

export type MeasurementPayload = {
    createdAt?: string;

    customerName?: string;
    customerPhone?: string;
    address?: string;

    // 단일값(있으면 표시)
    widthMm?: number;
    heightMm?: number;

    // 포인트 실측(있으면 오차 검사/표시)
    widthPointsMm?: number[];  // ex) [1200, 1205, 1198]
    heightPointsMm?: number[]; // ex) [2300, 2312, 2304, 2302, 2308]

    doorCategory?: DoorCategory;
    doorType?: string; // ex) 3연동, 원슬라이딩, 호폐, 스윙, 파티션 1창/2창 등

    openDirection?: OpenDirection; // (거실에서 현관 바로 보며) 좌→우 / 우→좌
    glassType?: string;
    doorDesign?: string;

    installLocation?: InstallLocation;
    quantity?: number; // 1,2,3...
    onSiteDiscountReason?: string; // 재구매/조건부/기타
    onSiteDiscountAmount?: number; // 원 단위

    memo?: string;

    // 사진: URL 또는 dataURL(base64)
    photos?: string[];
};

/* ===============================
   Constants
================================ */
const COMPANY_NAME = "주식회사 림스";
const COMPANY_ACCOUNT_TEXT = `🏦 입금 계좌
- 케이뱅크 700100061232
- ${COMPANY_NAME}`;

const POLICY_TEXT = `※ 견적 기준(요약)
- 원슬라이딩: 화이트+투명 기준 590,000원 / 기준사이즈 1250×2300(mm)
- 3연동: 화이트+투명 기준 690,000원 / 기준사이즈 1350×2300(mm)
- 색상 변경: +70,000원
- 유리 변경: 브론즈/다크그레이 +80,000원 / 샤틴류 +120,000원
- 현장 여건에 따라 마감재(추가자재) 필요 및 비용이 추가될 수 있습니다.`;

/* ===============================
   Utils
================================ */
function nowKstString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function safeNum(n?: number) {
    return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

function rangeDelta(points?: number[]) {
    const arr = (points ?? []).filter((v) => typeof v === "number" && Number.isFinite(v));
    if (arr.length < 2) return 0;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return Math.abs(max - min);
}

function requiredPointsByDoorType(doorType?: string) {
    const t = (doorType ?? "").trim();

    // 사용자 요구사항 반영:
    // 3연동, 호폐, 스윙 = 가로3/세로3
    // 원슬라이딩 = 가로3/세로5
    // 파티션 = 가로3/세로3
    if (t.includes("원슬라이딩")) return { w: 3, h: 5 };
    if (t.includes("3연동")) return { w: 3, h: 3 };
    if (t.includes("호폐")) return { w: 3, h: 3 };
    if (t.includes("스윙")) return { w: 3, h: 3 };
    if (t.includes("파티션")) return { w: 3, h: 3 };

    // 기본값
    return { w: 3, h: 3 };
}

function extraMaterialSuggestion(doorType?: string) {
    const t = (doorType ?? "").trim();
    // 사용자 요구사항: 오차 10mm 이상이면
    // - 실측 오류 경고 + 마감재(추가자재) 권고
    // - 추가비용 가능: 3연동 5만원, 원슬라이딩 5만원
    if (t.includes("3연동")) return { label: "마감재(추가자재) 권고", extraCostWon: 50000 };
    if (t.includes("원슬라이딩")) return { label: "마감재(추가자재) 권고", extraCostWon: 50000 };
    return { label: "마감재(추가자재) 권고", extraCostWon: undefined as number | undefined };
}

function assertBytes(name: string, bytes: Uint8Array) {
    if (!bytes || bytes.length === 0) {
        throw new Error(`${name} bytes are empty (0). Check file path / fs read.`);
    }
}

async function fetchBytes(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
    return new Uint8Array(await res.arrayBuffer());
}

function isDataUrl(s: string) {
    return /^data:image\/(png|jpeg|jpg);base64,/.test(s);
}

function dataUrlToBytes(dataUrl: string) {
    const base64 = dataUrl.split(",")[1] ?? "";
    return Uint8Array.from(Buffer.from(base64, "base64"));
}

/* ===============================
   Excel (Office)
================================ */
async function createOfficeExcel(payload: MeasurementPayload) {
    const wb = new ExcelJS.Workbook();
    wb.creator = COMPANY_NAME;
    wb.created = new Date();

    const ws = wb.addWorksheet("실측_사무실용", {
        properties: { defaultRowHeight: 18 },
        pageSetup: { paperSize: 9, orientation: "portrait" },
    });

    ws.columns = [
        { header: "항목", key: "k", width: 22 },
        { header: "값", key: "v", width: 55 },
    ];

    const addRow = (k: string, v: any) => ws.addRow({ k, v: v ?? "" });

    addRow("작성일시", payload.createdAt ?? nowKstString());
    addRow("고객명", payload.customerName ?? "");
    addRow("연락처", payload.customerPhone ?? "");
    addRow("주소", payload.address ?? "");

    addRow("문 종류(대)", payload.doorCategory ?? "");
    addRow("문 종류(세부)", payload.doorType ?? "");
    addRow("열림 방향", payload.openDirection ?? "");
    addRow("유리 종류", payload.glassType ?? "");
    addRow("도어 디자인", payload.doorDesign ?? "");

    addRow("시공 위치", payload.installLocation ?? "");
    addRow("수량", safeNum(payload.quantity) ?? "");
    addRow("현장 할인 사유", payload.onSiteDiscountReason ?? "");
    addRow("현장 할인 금액(원)", safeNum(payload.onSiteDiscountAmount) ?? "");

    addRow("가로(mm) 단일", safeNum(payload.widthMm) ?? "");
    addRow("세로(mm) 단일", safeNum(payload.heightMm) ?? "");
    addRow("가로 포인트(mm)", (payload.widthPointsMm ?? []).join(", "));
    addRow("세로 포인트(mm)", (payload.heightPointsMm ?? []).join(", "));

    const wDelta = rangeDelta(payload.widthPointsMm);
    const hDelta = rangeDelta(payload.heightPointsMm);
    addRow("가로 오차(최대-최소)", wDelta || "");
    addRow("세로 오차(최대-최소)", hDelta || "");

    const needWarn = Math.max(wDelta, hDelta) >= 10;
    addRow("오차 경고(10mm+)", needWarn ? "⚠️ 10mm 이상: 실측 오류 가능" : "");

    const extra = extraMaterialSuggestion(payload.doorType);
    addRow("추가자재 권고", needWarn ? extra.label : "");
    addRow("추가비용 가능(원)", needWarn ? (extra.extraCostWon ?? "") : "");

    addRow("메모", payload.memo ?? "");

    addRow("사진 URL/데이터", "");
    (payload.photos ?? []).forEach((p, i) => addRow(`사진 ${i + 1}`, p));

    // 스타일
    ws.getRow(1).font = { bold: true };
    ws.eachRow((row, rowNumber) => {
        row.alignment = { vertical: "middle", wrapText: true };
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            if (rowNumber === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
        });
    });

    return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ===============================
   PDF (Customer)
================================ */
async function createCustomerPdf(payload: MeasurementPayload) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // 폰트 로드(로컬)
    const fontPath = path.join(process.cwd(), "assets", "fonts", "Pretendard-Regular.ttf");
    const fontBytes = new Uint8Array(fs.readFileSync(fontPath));
    assertBytes("Font", fontBytes);

    const font = await pdfDoc.embedFont(fontBytes, { subset: true });

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const margin = 38;
    let y = height - margin;

    const drawText = (t: string, x: number, y: number, size = 11, color = rgb(0, 0, 0)) => {
        page.drawText(t ?? "", { x, y, size, font, color });
    };

    const drawLabelValue = (label: string, value: string, x: number, y: number) => {
        drawText(label, x, y, 10, rgb(0.25, 0.25, 0.25));
        drawText(value || "-", x + 90, y, 11, rgb(0, 0, 0));
    };

    // Header
    drawText("림스도어 실측 확인서 / 견적 안내", margin, y, 18, rgb(0.1, 0.1, 0.1));
    y -= 26;
    drawText(`작성일시: ${payload.createdAt ?? nowKstString()}`, margin, y, 10, rgb(0.35, 0.35, 0.35));
    y -= 18;

    // Box - Customer
    page.drawRectangle({ x: margin, y: y - 92, width: width - margin * 2, height: 92, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85) });
    let by = y - 22;
    drawLabelValue("고객명", payload.customerName ?? "", margin + 12, by);
    drawLabelValue("연락처", payload.customerPhone ?? "", margin + 290, by);
    by -= 18;
    drawLabelValue("주소", payload.address ?? "", margin + 12, by);
    y -= 110;

    // Box - Selection summary
    page.drawRectangle({ x: margin, y: y - 140, width: width - margin * 2, height: 140, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85) });
    drawText("선택 요약", margin + 12, y - 20, 12, rgb(0.15, 0.15, 0.15));

    const installLoc = payload.installLocation ?? "-";
    const qty = safeNum(payload.quantity) ? String(payload.quantity) : "-";
    const disc = safeNum(payload.onSiteDiscountAmount) ? `${payload.onSiteDiscountAmount!.toLocaleString()}원` : "-";
    const discReason = payload.onSiteDiscountReason ?? "-";

    let sy = y - 42;
    drawLabelValue("문종(대)", payload.doorCategory ?? "", margin + 12, sy);
    drawLabelValue("문종(세부)", payload.doorType ?? "", margin + 290, sy);
    sy -= 18;
    drawLabelValue("유리", payload.glassType ?? "", margin + 12, sy);
    drawLabelValue("디자인", payload.doorDesign ?? "", margin + 290, sy);
    sy -= 18;
    drawLabelValue("열림", payload.openDirection ?? "", margin + 12, sy);
    drawLabelValue("시공위치", installLoc, margin + 290, sy);
    sy -= 18;
    drawLabelValue("수량", qty, margin + 12, sy);
    drawLabelValue("현장할인", `${discReason} / ${disc}`, margin + 290, sy);

    y -= 160;

    // Measurement & points suggestion
    const req = requiredPointsByDoorType(payload.doorType);
    page.drawRectangle({ x: margin, y: y - 160, width: width - margin * 2, height: 160, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85) });
    drawText("실측 요약", margin + 12, y - 20, 12, rgb(0.15, 0.15, 0.15));

    const wSingle = safeNum(payload.widthMm) ? `${payload.widthMm} mm` : "-";
    const hSingle = safeNum(payload.heightMm) ? `${payload.heightMm} mm` : "-";

    const wPts = (payload.widthPointsMm ?? []).filter((v) => Number.isFinite(v));
    const hPts = (payload.heightPointsMm ?? []).filter((v) => Number.isFinite(v));

    const wDelta = rangeDelta(wPts);
    const hDelta = rangeDelta(hPts);
    const needWarn = Math.max(wDelta, hDelta) >= 10;

    let my = y - 42;
    drawLabelValue("가로(단일)", wSingle, margin + 12, my);
    drawLabelValue("세로(단일)", hSingle, margin + 290, my);
    my -= 18;

    drawText(`권장 실측 포인트: 가로 ${req.w} / 세로 ${req.h}`, margin + 12, my, 11, rgb(0.2, 0.2, 0.2));
    my -= 18;

    drawText(`가로 포인트: ${wPts.length ? wPts.join(", ") : "-"}`, margin + 12, my, 10, rgb(0.25, 0.25, 0.25));
    my -= 16;
    drawText(`세로 포인트: ${hPts.length ? hPts.join(", ") : "-"}`, margin + 12, my, 10, rgb(0.25, 0.25, 0.25));
    my -= 18;

    drawText(`오차(최대-최소): 가로 ${wDelta || 0}mm / 세로 ${hDelta || 0}mm`, margin + 12, my, 11, rgb(0.2, 0.2, 0.2));
    my -= 18;

    if (needWarn) {
        // warning box
        page.drawRectangle({
            x: margin + 12,
            y: my - 28,
            width: width - margin * 2 - 24,
            height: 40,
            color: rgb(1, 0.97, 0.97),
            borderColor: rgb(0.9, 0.2, 0.2),
            borderWidth: 1,
        });
        const extra = extraMaterialSuggestion(payload.doorType);
        drawText("⚠️ 10mm 이상 오차: 실측 오류 가능 / 마감재(추가자재) 필요 가능", margin + 20, my - 8, 11, rgb(0.75, 0.1, 0.1));
        const extraCost = extra.extraCostWon ? `추가비용 가능: ${extra.extraCostWon.toLocaleString()}원` : "추가비용 가능";
        drawText(extraCost, margin + 20, my - 24, 10, rgb(0.6, 0.1, 0.1));
        my -= 44;
    }

    y -= 178;

    // Policy + account + signature
    page.drawRectangle({ x: margin, y: y - 170, width: width - margin * 2, height: 170, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85) });
    drawText("안내 / 계좌 / 서명", margin + 12, y - 20, 12, rgb(0.15, 0.15, 0.15));

    // policy text (wrap manually)
    const policyLines = POLICY_TEXT.split("\n");
    let py = y - 42;
    for (const line of policyLines) {
        drawText(line, margin + 12, py, 9.5, rgb(0.25, 0.25, 0.25));
        py -= 12;
    }

    // account
    const accLines = COMPANY_ACCOUNT_TEXT.split("\n");
    py -= 2;
    for (const line of accLines) {
        drawText(line, margin + 12, py, 10.5, rgb(0.1, 0.1, 0.1));
        py -= 14;
    }

    // signature
    page.drawRectangle({
        x: margin + 360,
        y: y - 150,
        width: (width - margin * 2) - 372,
        height: 55,
        borderWidth: 1,
        borderColor: rgb(0.75, 0.75, 0.75),
    });
    drawText("고객 서명", margin + 370, y - 116, 10, rgb(0.35, 0.35, 0.35));

    // Photos (optional) - add second page if needed
    const photos = (payload.photos ?? []).filter(Boolean).slice(0, 4);
    if (photos.length) {
        const p2 = pdfDoc.addPage([595.28, 841.89]);
        drawTextOnPage(p2, font, margin, 841.89 - margin, "현장 사진(일부)", 16);

        let px = margin;
        let py2 = 841.89 - margin - 30;

        for (let i = 0; i < photos.length; i++) {
            const src = photos[i];
            let bytes: Uint8Array;
            if (isDataUrl(src)) bytes = dataUrlToBytes(src);
            else bytes = await fetchBytes(src);

            // 간단 판별: jpg/png
            const isPng = isDataUrl(src) ? src.startsWith("data:image/png") : src.toLowerCase().includes(".png");
            const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

            const boxW = 250;
            const boxH = 180;

            // 2열 배치
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = margin + col * (boxW + 20);
            const yImg = py2 - row * (boxH + 35) - boxH;

            p2.drawRectangle({ x, y: yImg, width: boxW, height: boxH, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85) });

            const scale = Math.min(boxW / img.width, boxH / img.height);
            const w = img.width * scale;
            const h = img.height * scale;

            p2.drawImage(img, { x: x + (boxW - w) / 2, y: yImg + (boxH - h) / 2, width: w, height: h });

            drawTextOnPage(p2, font, x, yImg - 14, `사진 ${i + 1}`, 10, rgb(0.35, 0.35, 0.35));
        }
    }

    return Buffer.from(await pdfDoc.save());
}

function drawTextOnPage(
    page: any,
    font: any,
    x: number,
    y: number,
    t: string,
    size = 12,
    color = rgb(0, 0, 0)
) {
    page.drawText(t ?? "", { x, y, size, font, color });
}

/* ===============================
   Route
================================ */
export async function POST(req: Request) {
    try {
        const payload = (await req.json()) as MeasurementPayload;

        const createdAt = payload.createdAt ?? nowKstString();
        payload.createdAt = createdAt;

        // 파일 생성
        const [xlsxBuf, pdfBuf] = await Promise.all([
            createOfficeExcel(payload),
            createCustomerPdf(payload),
        ]);

        // ZIP 묶기
        const zip = new JSZip();
        const baseName = `RIMS_${(payload.customerName ?? "고객").replace(/\s+/g, "")}_${createdAt.replace(/[: ]/g, "-")}`;
        zip.file(`${baseName}_OFFICE.xlsx`, xlsxBuf);
        zip.file(`${baseName}_CUSTOMER.pdf`, pdfBuf);

        const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

        return new NextResponse(zipBuf, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${baseName}.zip"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, message: err?.message ?? "Export failed" },
            { status: 500 }
        );
    }
}
