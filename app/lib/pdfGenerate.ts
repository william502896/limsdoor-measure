import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function fileBytes(relPath: string) {
    return fs.readFileSync(path.join(process.cwd(), relPath));
}
function formatDate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}
function safe(v: any) {
    return v === null || v === undefined || v === "" ? "-" : String(v);
}
function cleanUrl(u?: string | null) {
    const s = (u ?? "").trim();
    return s.length ? s : null;
}
async function fetchBytes(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
}

function drawCell(page: any, x: number, y: number, w: number, h: number) {
    page.drawRectangle({
        x,
        y: y - h,
        width: w,
        height: h,
        borderWidth: 1,
        borderColor: rgb(0.82, 0.82, 0.82),
        color: rgb(1, 1, 1),
    });
}

function drawTextWrap(page: any, text: string, x: number, y: number, w: number, font: any, size = 11) {
    const padding = 0;
    const maxWidth = w - padding * 2;
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const wd of words) {
        const test = line ? `${line} ${wd}` : wd;
        const width = font.widthOfTextAtSize(test, size);
        if (width <= maxWidth) line = test;
        else {
            if (line) lines.push(line);
            line = wd;
        }
    }
    if (line) lines.push(line);

    let ty = y;
    for (const ln of lines) {
        page.drawText(ln, { x, y: ty, size, font, color: rgb(0.12, 0.12, 0.12) });
        ty -= size + 4;
    }
    return ty;
}

async function buildPdfBytes(measurement: any, mode: "OFFICE" | "CUSTOMER") {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontRegular = await pdfDoc.embedFont(fileBytes("app/assets/fonts/NotoSansKR-Regular.ttf"));
    const fontBold = await pdfDoc.embedFont(fileBytes("app/assets/fonts/NotoSansKR-Bold.ttf"));
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 32;

    // 헤더
    const headerH = 70;
    page.drawRectangle({
        x: margin,
        y: height - margin - headerH,
        width: width - margin * 2,
        height: headerH,
        borderWidth: 1,
        borderColor: rgb(0.85, 0.85, 0.85),
        color: rgb(0.97, 0.97, 0.97),
    });

    page.drawText(`림스도어 실측 확인서 (${mode === "OFFICE" ? "사무실용" : "고객용"})`, {
        x: margin + 14,
        y: height - margin - 30,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(`발행일: ${formatDate()}`, {
        x: margin + 14,
        y: height - margin - 52,
        size: 11,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
    });

    page.drawText(`ID: ${measurement.id}`, {
        x: width - margin - 210,
        y: height - margin - 52,
        size: 9,
        font: fontMono,
        color: rgb(0.35, 0.35, 0.35),
    });

    // 레이아웃
    let cursorY = height - margin - headerH - 14;

    const leftW = 350;
    const rightW = width - margin * 2 - leftW - 12;
    const leftX = margin;
    const rightX = margin + leftW + 12;

    // 대표 이미지(공용)
    const primaryUrl = cleanUrl(measurement.primary_image_url);
    const imgBoxH = 260;

    page.drawRectangle({
        x: rightX,
        y: cursorY,
        width: rightW,
        height: imgBoxH,
        borderWidth: 1,
        borderColor: rgb(0.85, 0.85, 0.85),
        color: rgb(1, 1, 1),
    });

    page.drawText("대표 캡처", {
        x: rightX + 10,
        y: cursorY - 18,
        size: 12,
        font: fontBold,
        color: rgb(0.12, 0.12, 0.12),
    });

    if (primaryUrl) {
        try {
            const bytes = await fetchBytes(primaryUrl);
            const isPng = primaryUrl.toLowerCase().includes(".png");
            const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

            const boxX = rightX + 10;
            const boxYTop = cursorY - 34;
            const boxW = rightW - 20;
            const boxH = imgBoxH - 44;

            const scale = Math.min(boxW / img.width, boxH / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const dx = boxX + (boxW - drawW) / 2;
            const dy = (boxYTop - boxH) + (boxH - drawH) / 2;

            page.drawImage(img, { x: dx, y: dy, width: drawW, height: drawH });

            page.drawText(primaryUrl, {
                x: rightX + 10,
                y: cursorY - imgBoxH + 10,
                size: 7.5,
                font: fontMono,
                color: rgb(0.35, 0.35, 0.35),
            });
        } catch {
            page.drawText("이미지 불러오기 실패(링크만 표시)", {
                x: rightX + 10,
                y: cursorY - 42,
                size: 10,
                font: fontRegular,
                color: rgb(0.6, 0.1, 0.1),
            });
            page.drawText(primaryUrl, {
                x: rightX + 10,
                y: cursorY - 58,
                size: 8.5,
                font: fontMono,
                color: rgb(0.35, 0.35, 0.35),
            });
        }
    } else {
        page.drawText("대표 이미지가 없습니다.", {
            x: rightX + 10,
            y: cursorY - 42,
            size: 10,
            font: fontRegular,
            color: rgb(0.55, 0.55, 0.55),
        });
    }

    // 표(모드별 항목 차등)
    const tableTop = cursorY;
    const tableH = 520;

    page.drawRectangle({
        x: leftX,
        y: tableTop,
        width: leftW,
        height: tableH,
        borderWidth: 1,
        borderColor: rgb(0.85, 0.85, 0.85),
        color: rgb(1, 1, 1),
    });

    page.drawText(mode === "OFFICE" ? "발주/검수 정보" : "확정 안내", {
        x: leftX + 10,
        y: tableTop - 18,
        size: 12,
        font: fontBold,
        color: rgb(0.12, 0.12, 0.12),
    });

    const commonRows: Array<[string, string]> = [
        ["고객명", safe(measurement.customer_name)],
        ["전화", safe(measurement.customer_phone)],
        ["가로(mm)", safe(measurement.width_mm)],
        ["세로(mm)", safe(measurement.height_mm)],
        ["문 종류", `${safe(measurement.category)} / ${safe(measurement.detail)}`],
        ["유리", safe(measurement.glass)],
        ["디자인", safe(measurement.design)],
        ["열림방향", safe(measurement.open_direction)],
    ];

    const officeOnlyRows: Array<[string, string]> = [
        ["주소", safe(measurement.customer_address)],
        ["mm/px", safe(measurement.mm_per_px)],
        ["대각선차(mm)", safe(measurement.diag_diff_mm)],
        ["추가비용", Number(measurement.extra_cost ?? 0) > 0 ? `+${Number(measurement.extra_cost).toLocaleString()}원` : "-"],
        ["관리자메모", safe(measurement.admin_note)],
    ];

    const customerOnlyRows: Array<[string, string]> = [
        ["안내", "본 문서는 현장 실측 기반으로 확정된 정보입니다."],
        ["주의", safe(measurement.warning_text)],
    ];

    const rows = mode === "OFFICE"
        ? [...commonRows, ...officeOnlyRows]
        : [...commonRows, ...customerOnlyRows];

    const startY = tableTop - 34;
    const rowH = 46;
    const keyW = 95;
    const valW = leftW - keyW;

    let yRow = startY;

    for (const [k, v] of rows) {
        // 키 셀
        page.drawRectangle({
            x: leftX,
            y: yRow,
            width: keyW,
            height: rowH,
            borderWidth: 1,
            borderColor: rgb(0.85, 0.85, 0.85),
            color: rgb(0.97, 0.97, 0.97),
        });

        page.drawText(k, {
            x: leftX + 8,
            y: yRow - 18,
            size: 11,
            font: fontBold,
            color: rgb(0.18, 0.18, 0.18),
        });

        // 값 셀
        drawCell(page, leftX + keyW, yRow, valW, rowH);
        drawTextWrap(page, String(v ?? "-"), leftX + keyW + 8, yRow - 18, valW - 16, fontRegular, 11);

        yRow -= rowH;
        if (yRow < tableTop - tableH + 20) break;
    }

    // OFFICE용: corners JSON 축약 표기(하단)
    if (mode === "OFFICE") {
        const corners = measurement.corners ? JSON.stringify(measurement.corners) : "-";
        const areaX = rightX;
        const areaY = cursorY - imgBoxH - 14;
        const areaH = 240;

        page.drawRectangle({
            x: areaX,
            y: areaY,
            width: rightW,
            height: areaH,
            borderWidth: 1,
            borderColor: rgb(0.85, 0.85, 0.85),
            color: rgb(1, 1, 1),
        });

        page.drawText("코너좌표(corners)", {
            x: areaX + 10,
            y: areaY - 18,
            size: 12,
            font: fontBold,
            color: rgb(0.12, 0.12, 0.12),
        });

        const mono = fontMono;
        const text = corners.length > 700 ? corners.slice(0, 700) + "..." : corners;

        let ty = areaY - 40;
        const lines = text.match(/.{1,78}/g) ?? [text];
        for (const ln of lines.slice(0, 14)) {
            page.drawText(ln, { x: areaX + 10, y: ty, size: 8.5, font: mono, color: rgb(0.2, 0.2, 0.2) });
            ty -= 11;
            if (ty < areaY - areaH + 12) break;
        }
    }

    // 하단 안내
    const footerY = margin + 26;
    const footerText =
        mode === "OFFICE"
            ? "※ 사무실용(검수/발주). 이상 시 재실측 또는 관리자 메모 확인."
            : "※ 고객용(확정 안내). 이상 시 담당자에게 문의해주세요.";

    page.drawText(footerText, {
        x: margin,
        y: footerY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
    });

    return await pdfDoc.save();
}

export async function generateTwoPdfsAndUpload(measurement: any) {
    const sb = supabaseAdmin();

    const officeBytes = await buildPdfBytes(measurement, "OFFICE");
    const customerBytes = await buildPdfBytes(measurement, "CUSTOMER");

    const officePath = `pdf/${measurement.id}/office_${measurement.id}.pdf`;
    const customerPath = `pdf/${measurement.id}/customer_${measurement.id}.pdf`;

    const up1 = await sb.storage.from("measurements").upload(officePath, officeBytes, {
        contentType: "application/pdf",
        upsert: true,
    });
    if (up1.error) return { ok: false, error: up1.error.message };

    const up2 = await sb.storage.from("measurements").upload(customerPath, customerBytes, {
        contentType: "application/pdf",
        upsert: true,
    });
    if (up2.error) return { ok: false, error: up2.error.message };

    const { data: pub1 } = sb.storage.from("measurements").getPublicUrl(officePath);
    const { data: pub2 } = sb.storage.from("measurements").getPublicUrl(customerPath);

    const officeUrl = pub1.publicUrl;
    const customerUrl = pub2.publicUrl;

    const upd = await sb
        .from("measurements")
        .update({
            pdf_office_url: officeUrl,
            pdf_office_path: officePath,
            pdf_customer_url: customerUrl,
            pdf_customer_path: customerPath,
        } as any)
        .eq("id", measurement.id);

    if (upd.error) return { ok: false, error: upd.error.message };

    return { ok: true, officeUrl, customerUrl, officePath, customerPath };
}
