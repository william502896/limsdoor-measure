import ExcelJS from "exceljs";
import type { MeasurementPayload } from "./makePdf";

export async function makeXlsx(payload: MeasurementPayload) {
    const wb = new ExcelJS.Workbook();

    // 1) 실측표 시트
    const ws = wb.addWorksheet("실측표");
    ws.columns = [
        { header: "항목", key: "k", width: 18 },
        { header: "값", key: "v", width: 45 },
    ];

    const add = (k: string, v: any) => ws.addRow({ k, v: v ?? "-" });

    add("작성일", payload.createdAt ? new Date(payload.createdAt).toLocaleString("ko-KR") : new Date().toLocaleString("ko-KR"));
    add("고객명", payload.customerName);
    add("연락처", payload.customerPhone);
    add("주소", payload.address);

    ws.addRow({ k: "", v: "" });

    add("가로(mm)", payload.widthMm);
    add("세로(mm)", payload.heightMm);
    add("문 종류", payload.doorCategory);
    add("세부 타입", payload.doorType);
    add("열림 방향", payload.openDirection); // 핵심
    add("유리 종류", payload.glassType);
    add("도어 디자인", payload.doorDesign);
    add("특이사항", payload.memo);

    ws.getRow(1).font = { bold: true };
    ws.eachRow((row) => {
        row.alignment = { vertical: "middle", wrapText: true };
    });

    // 2) 사진 링크 시트
    const ps = wb.addWorksheet("사진");
    ps.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "링크", key: "url", width: 90 },
    ];
    ps.getRow(1).font = { bold: true };

    (payload.photos ?? []).forEach((p, idx) => {
        const r = ps.addRow({ no: idx + 1, url: p });

        // http 링크면 클릭 가능하게
        if (typeof p === "string" && p.startsWith("http")) {
            r.getCell("url").value = { text: p, hyperlink: p };
        }
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}
