import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { supabaseServer } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const sb = await supabaseServer();
        const { data: auth } = await sb.auth.getUser();
        if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile, error: pErr } = await sb
            .from("profiles")
            .select("company_id, role")
            .eq("id", auth.user.id)
            .single();

        if (pErr || !profile?.company_id) return NextResponse.json({ error: "company_id missing" }, { status: 403 });
        if (profile.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

        const form = await req.formData();
        const file = form.get("file") as File | null;
        const title = String(form.get("title") ?? "");
        const source = String(form.get("source") ?? "");
        const tagsRaw = String(form.get("tags") ?? "");
        const tags = tagsRaw ? tagsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

        if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
        if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

        const admin = supabaseAdmin();
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const key = `${profile.company_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const buf = await file.arrayBuffer();
        const { error: upErr } = await admin.storage.from("company-secret").upload(key, buf, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
        });
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

        const { data: row, error: dErr } = await sb
            .from("secret_documents")
            .insert({
                company_id: profile.company_id,
                title,
                file_url: key, // ✅ 스토리지 키
                source,
                tags,
            })
            .select("*")
            .single();

        if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });

        return NextResponse.json({ ok: true, row });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
