import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { q } = await req.json();
        const query = String(q || "").trim();
        if (query.length < 2) return NextResponse.json({ hits: [] });

        const sb = supabaseAdmin();

        // chunk에서 검색
        const { data, error } = await sb
            .from("secret_doc_chunks")
            .select("content, doc_id, secret_docs(title)")
            .ilike("content", `%${query}%`)
            .limit(12);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const hits = (data || []).map((row: any) => {
            const content = row.content as string;
            const idx = content.toLowerCase().indexOf(query.toLowerCase());
            const start = Math.max(0, idx - 120);
            const end = Math.min(content.length, idx + 240);
            const snippet = content.slice(start, end);

            return {
                title: row.secret_docs?.title || "문서",
                snippet: snippet,
            };
        });

        return NextResponse.json({ hits });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "search error" }, { status: 500 });
    }
}
