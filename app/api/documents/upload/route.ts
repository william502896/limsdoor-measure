import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { supabaseServer } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const sb = await supabaseServer();
        const { data: auth } = await sb.auth.getUser();
        if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const form = await req.formData();
        const file = form.get("file") as File | null;
        const title = String(form.get("title") ?? "");
        const category = String(form.get("category") ?? "marketing");
        const tagsRaw = String(form.get("tags") ?? "");
        const tags = tagsRaw ? tagsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

        if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
        if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

        // 내 회사ID
        const { data: profile, error: pErr } = await sb
            .from("profiles")
            .select("company_id")
            .eq("id", auth.user.id)
            .single();
        if (pErr || !profile?.company_id) return NextResponse.json({ error: "company_id missing" }, { status: 403 });

        const admin = supabaseAdmin();

        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const key = `${profile.company_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const arrayBuf = await file.arrayBuffer();
        const { error: upErr } = await admin.storage.from("company-docs").upload(key, arrayBuf, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
        });
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

        // private 버킷이므로 signed url 생성
        const { data: signed, error: sErr } = await admin.storage
            .from("company-docs")
            .createSignedUrl(key, 60 * 60 * 24 * 7); // 7일
        if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

        // DB 저장 (RLS 통과 위해 company_id 포함)
        const { data: row, error: dErr } = await sb
            .from("documents")
            .insert({
                company_id: profile.company_id,
                title,
                file_url: key, // ✅ 스토리지 키 저장
                file_type: ext,
                category,
                tags,
            })
            .select("*")
            .single();

        if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });

        return NextResponse.json({ ok: true, row, signedUrl: signed.signedUrl });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
