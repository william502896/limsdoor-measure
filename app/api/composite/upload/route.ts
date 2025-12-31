import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function dataUrlToBuffer(dataUrl: string) {
    const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!m) throw new Error("Invalid dataURL");
    const mime = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, "base64");
    return { mime, buf };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { dataUrl, estimateId } = body as { dataUrl: string; estimateId?: string };

        if (!dataUrl) return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });

        const { mime, buf } = dataUrlToBuffer(dataUrl);
        if (!mime.includes("png")) {
            // 지금은 png 다운로드 기준
            return NextResponse.json({ error: "Only PNG supported" }, { status: 400 });
        }

        const sb = supabaseAdmin();
        const bucket = "composites";
        const safeEstimateId = (estimateId ?? "no_estimate").replace(/[^a-zA-Z0-9_-]/g, "_");
        const path = `${safeEstimateId}/door_composite_${Date.now()}.png`;

        const { error: upErr } = await sb.storage.from(bucket).upload(path, buf, {
            contentType: "image/png",
            upsert: true,
        });
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

        const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
        const url = pub?.publicUrl;
        if (!url) return NextResponse.json({ error: "Failed to create public url" }, { status: 500 });

        // (선택) DB에 기록
        // await sb.from("composite_images").insert([{ estimate_id: estimateId ?? null, url }]);

        return NextResponse.json({ ok: true, url, path });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}
