import { supabaseServer } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
    id: string;
    title: string;
    source: string | null;
    tags: string[] | null;
    file_url: string;
    created_at: string;
};

export default async function AdminSecretPage() {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    if (!auth?.user) return <div style={{ padding: 16 }}>로그인이 필요합니다.</div>;

    const { data: profile } = await sb
        .from("profiles")
        .select("role, company_id")
        .eq("id", auth.user.id)
        .single();

    if (!profile?.company_id) return <div style={{ padding: 16 }}>company_id가 없습니다(온보딩 필요)</div>;
    if (profile.role !== "ADMIN") return <div style={{ padding: 16 }}>ADMIN만 접근 가능합니다.</div>;

    const { data: rows, error } = await sb
        .from("secret_documents")
        .select("id,title,source,tags,file_url,created_at")
        .order("created_at", { ascending: false });

    return (
        <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>🔒 시크릿 자료실(1티어 관리자)</h1>
            <p style={{ opacity: 0.7, marginTop: 6 }}>
                PDF/이미지/TXT 업로드 가능 · 모바일은 촬영 후 업로드도 가능
            </p>

            <UploadBox />

            {error && <pre style={{ color: "crimson" }}>{error.message}</pre>}

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {(rows as Row[] | null)?.map((r) => (
                    <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 800 }}>{r.title}</div>
                        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                            {r.source ?? "-"} · {new Date(r.created_at).toLocaleString("ko-KR")}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {(r.tags ?? []).map((t) => (
                                <span key={t} style={{ fontSize: 12, background: "#f4f4f4", padding: "2px 8px", borderRadius: 999 }}>
                                    #{t}
                                </span>
                            ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                            storage key: {r.file_url}
                            <div style={{ marginTop: 4, fontWeight: "bold", color: "#2b5cff" }}>
                                OCR: {(r as any).ocr_status ?? "NONE"}
                            </div>
                        </div>

                        <form
                            action={async () => {
                                "use server";
                                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
                                await fetch(`${baseUrl}/api/ocr/extract`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ table: "secret_documents", id: r.id }),
                                    cache: "no-store",
                                });
                            }}
                            style={{ marginTop: 10 }}
                        >
                            <button type="submit" style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>
                                🧠 OCR 텍스트 추출
                            </button>
                        </form>

                        <form
                            action={async (formData) => {
                                "use server";
                                const framework = formData.get("framework");
                                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
                                await fetch(`${baseUrl}/api/marketing/run`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        table: "secret_documents",
                                        id: r.id,
                                        framework,
                                    }),
                                    cache: "no-store",
                                });
                            }}
                            style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                            {["MARKETING", "BRAND", "TRAFFIC", "STORY", "STARTUP", "ONEPAGE"].map((f) => (
                                <button key={f} type="submit" name="framework" value={f} style={{ fontSize: 11, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", background: "#f9f9f9", cursor: "pointer" }}>
                                    ⚡ {f}
                                </button>
                            ))}
                        </form>
                    </div>
                ))}
                {(rows?.length ?? 0) === 0 && <div style={{ opacity: 0.7 }}>자료가 없습니다.</div>}
            </div>
        </div>
    );
}

function UploadBox() {
    return (
        <form
            action={async (formData) => {
                "use server";
                const file = formData.get("file") as File | null;
                if (!file) return;

                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
                const res = await fetch(`${baseUrl}/api/secret/upload`, {
                    method: "POST",
                    body: formData,
                    cache: "no-store",
                });

                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error || "업로드 실패");
                }
            }}
            style={{
                marginTop: 16,
                border: "1px dashed #bbb",
                borderRadius: 14,
                padding: 14,
                display: "grid",
                gap: 10,
            }}
        >
            <div style={{ fontWeight: 700 }}>📤 업로드 / 촬영</div>

            <input name="title" placeholder="제목 (예: 마케팅 설계자 요약 1장)" required style={inp} />
            <input name="source" placeholder="출처 (예: 마케팅 설계자 / 브랜드 설계자 / 돈의 속성)" style={inp} />
            <input name="tags" placeholder="태그(쉼표로) 예: 설계자,퍼널,리드마그넷" style={inp} />

            {/* 모바일 촬영 지원: accept + capture */}
            <input name="file" type="file" accept="image/*,application/pdf,text/plain" required style={inp} />

            <button type="submit" style={btn}>
                업로드
            </button>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
                업로드 후 DB에는 storage key가 저장됩니다(버킷은 private).
            </div>
        </form>
    );
}

const inp: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 14,
};

const btn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#2b5cff",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
};
