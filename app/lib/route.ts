import { NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";

import { makePdf, type MeasurementPayload } from "../../lib/makePdf";
import { makeXlsx } from "../../lib/makeXlsx";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const payload = (await req.json()) as MeasurementPayload;

        const pdfBytes = await makePdf(payload);
        const xlsxBytes = await makeXlsx(payload);

        const zipStream = new PassThrough();
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", (err) => {
            throw err;
        });

        archive.pipe(zipStream);

        const baseName = `실측_${payload.customerName ?? "고객"}_${(payload.createdAt ?? new Date().toISOString()).slice(0, 10)}`;

        archive.append(Buffer.from(pdfBytes), { name: `${baseName}.pdf` });
        archive.append(xlsxBytes, { name: `${baseName}.xlsx` });

        await archive.finalize();

        return new NextResponse(zipStream as any, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.zip"`,
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, message: e?.message ?? "Export failed" },
            { status: 500 }
        );
    }
}
