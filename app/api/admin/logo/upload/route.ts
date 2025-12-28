import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabaseClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const supabase = createSupabaseAdmin();

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    // 간단 검증
    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ ok: false, error: "NOT_IMAGE" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: "TOO_LARGE" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `company-logos/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, bytes, {
            contentType: file.type,
            upsert: false,
        });

    if (upErr) {
        return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    return NextResponse.json({ ok: true, url: publicUrl, path });
}
