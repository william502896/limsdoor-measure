"use client";

import React, { useEffect, useMemo, useState } from "react";
import { renderText } from "@/app/lib/messaging/templateRender";

type TemplateRow = {
    id: string;
    template_key: string;
    pf_id: string;
    template_id: string;
    content: string;
    variables: string[];
    required_variables: string[];
    strict_variables: boolean;
    enable_sms_fallback: boolean;
    fallback_text: string | null;
    buttons: any[];
    updated_at: string;
};

function getKey() {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("key") || "";
}

export default function AdminMarketingTemplatesPage() {
    const adminKey = useMemo(() => getKey(), []);
    const [q, setQ] = useState("");
    const [items, setItems] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [editing, setEditing] = useState<TemplateRow | null>(null);

    // Preview
    const [previewVarsJson, setPreviewVarsJson] = useState(
        JSON.stringify({ customerName: "홍길동", amount: "590000", account: "케이뱅크 700100061232" }, null, 2)
    );

    // Test enqueue
    const [testPhone, setTestPhone] = useState("01000000000");

    async function fetchList() {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/marketing/templates?key=${encodeURIComponent(adminKey)}&q=${encodeURIComponent(q)}`);
            const json = await res.json();
            if (json.ok) setItems(json.items || []);
            else alert(json.error || "Load failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function newTemplate() {
        setEditing({
            id: "",
            template_key: "",
            pf_id: "",
            template_id: "",
            content: "안녕하세요 #{customerName}님, 안내드립니다.\n금액: #{amount}원\n계좌: #{account}",
            variables: ["customerName", "amount", "account"],
            required_variables: ["customerName", "amount", "account"],
            strict_variables: true,
            enable_sms_fallback: true,
            fallback_text: "림스도어 안내: #{customerName}님 #{amount}원 / #{account}",
            buttons: [
                { name: "견적 확인", type: "WL", linkMo: "https://example.com/estimate", linkPc: "https://example.com/estimate" },
                { name: "전화 문의", type: "WL", linkMo: "tel:01012345678", linkPc: "tel:01012345678" },
            ],
            updated_at: new Date().toISOString(),
        });
    }

    async function save() {
        if (!editing) return;
        const isCreate = !editing.id;

        const payload: any = { ...editing };
        if (isCreate) delete payload.id;

        const res = await fetch(`/api/admin/marketing/templates?key=${encodeURIComponent(adminKey)}`, {
            method: isCreate ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!json.ok) return alert(json.error || "Save failed");

        setEditing(null);
        await fetchList();
    }

    async function remove(id: string) {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        const res = await fetch(`/api/admin/marketing/templates?key=${encodeURIComponent(adminKey)}&id=${encodeURIComponent(id)}`, {
            method: "DELETE",
        });
        const json = await res.json();
        if (!json.ok) return alert(json.error || "Delete failed");
        await fetchList();
    }

    function parseVars() {
        try {
            const obj = JSON.parse(previewVarsJson);
            return obj && typeof obj === "object" ? obj : {};
        } catch {
            return {};
        }
    }

    const previewText = useMemo(() => {
        if (!editing) return "";
        const vars = parseVars();
        const base = editing.fallback_text || editing.content || "";
        return renderText(base, vars);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, previewVarsJson]);

    async function testEnqueue() {
        if (!editing?.template_key) return alert("template_key를 먼저 입력하세요.");
        const vars = parseVars();

        const res = await fetch(`/api/admin/marketing/test-enqueue?key=${encodeURIComponent(adminKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to_phone: testPhone,
                msg_type: "KAKAO",
                kakao_template_key: editing.template_key,
                kakao_variables: vars,
                text: "[ADMIN_TEST]",
            }),
        });

        const json = await res.json();
        if (!json.ok) return alert(json.error || "enqueue failed");
        alert("테스트 큐 적재 완료! /admin/marketing/queue에서 READY 확인 후 messages worker 실행하세요.");
    }

    return (
        <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ margin: "8px 0 12px" }}>Admin · Marketing · Kakao Templates</h2>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="검색: template_key / pf_id / template_id"
                    style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, minWidth: 320 }}
                />
                <button onClick={fetchList} style={btn()}>
                    {loading ? "로딩..." : "검색/새로고침"}
                </button>
                <button onClick={newTemplate} style={btn(true)}>
                    + 새 템플릿
                </button>
                <a href={`/admin/marketing/queue?key=${encodeURIComponent(adminKey)}`} style={{ marginLeft: "auto" }}>
                    큐 모니터링 →
                </a>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={card()}>
                    <h3 style={{ marginTop: 0 }}>목록</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                        {items.map((it) => (
                            <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <b>{it.template_key}</b>
                                    <span style={{ fontSize: 12, opacity: 0.7 }}>· {it.template_id}</span>
                                    <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
                                        {new Date(it.updated_at).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                                    <button onClick={() => setEditing(it)} style={btn()}>
                                        편집
                                    </button>
                                    <button onClick={() => remove(it.id)} style={btn(false, true)}>
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                        {items.length === 0 && <div style={{ opacity: 0.7 }}>템플릿이 없습니다.</div>}
                    </div>
                </div>

                <div style={card()}>
                    <h3 style={{ marginTop: 0 }}>편집 / 미리보기</h3>

                    {!editing ? (
                        <div style={{ opacity: 0.7 }}>왼쪽에서 템플릿을 선택하거나 “새 템플릿”을 누르세요.</div>
                    ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <Field label="template_key" value={editing.template_key} onChange={(v) => setEditing({ ...editing, template_key: v })} />
                                <Field label="pf_id" value={editing.pf_id} onChange={(v) => setEditing({ ...editing, pf_id: v })} />
                                <Field label="template_id" value={editing.template_id} onChange={(v) => setEditing({ ...editing, template_id: v })} />
                                <div />
                            </div>

                            <Textarea
                                label="content (검수용 원문)"
                                value={editing.content}
                                onChange={(v) => setEditing({ ...editing, content: v })}
                                rows={5}
                            />

                            <Textarea
                                label="fallback_text (SMS 폴백 문구)"
                                value={editing.fallback_text || ""}
                                onChange={(v) => setEditing({ ...editing, fallback_text: v })}
                                rows={3}
                            />

                            <Field
                                label="variables (쉼표 구분)"
                                value={(editing.variables || []).join(",")}
                                onChange={(v) => setEditing({ ...editing, variables: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                            />
                            <Field
                                label="required_variables (쉼표 구분)"
                                value={(editing.required_variables || []).join(",")}
                                onChange={(v) =>
                                    setEditing({ ...editing, required_variables: v.split(",").map((s) => s.trim()).filter(Boolean) })
                                }
                            />

                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <label style={chk()}>
                                    <input
                                        type="checkbox"
                                        checked={!!editing.strict_variables}
                                        onChange={(e) => setEditing({ ...editing, strict_variables: e.target.checked })}
                                    />
                                    strict_variables (누락 시 차단)
                                </label>
                                <label style={chk()}>
                                    <input
                                        type="checkbox"
                                        checked={!!editing.enable_sms_fallback}
                                        onChange={(e) => setEditing({ ...editing, enable_sms_fallback: e.target.checked })}
                                    />
                                    enable_sms_fallback
                                </label>
                            </div>

                            <Textarea
                                label="buttons (JSON 배열)"
                                value={JSON.stringify(editing.buttons || [], null, 2)}
                                onChange={(v) => {
                                    try {
                                        const obj = JSON.parse(v);
                                        setEditing({ ...editing, buttons: Array.isArray(obj) ? obj : [] });
                                    } catch {
                                        // 입력 중 JSON 깨질 수 있으니 무시
                                    }
                                }}
                                rows={6}
                            />

                            <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
                                <h4 style={{ margin: "0 0 8px" }}>미리보기 변수(JSON)</h4>
                                <textarea
                                    value={previewVarsJson}
                                    onChange={(e) => setPreviewVarsJson(e.target.value)}
                                    rows={6}
                                    style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 12, fontFamily: "monospace" }}
                                />
                                <div style={{ marginTop: 10 }}>
                                    <h4 style={{ margin: "0 0 6px" }}>폴백 SMS 렌더 결과</h4>
                                    <div style={{ whiteSpace: "pre-wrap", border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                                        {previewText || "(렌더 결과 없음)"}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={save} style={btn(true)}>
                                    저장
                                </button>
                                <button onClick={() => setEditing(null)} style={btn()}>
                                    닫기
                                </button>

                                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                    <input
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="테스트 수신번호"
                                        style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 180 }}
                                    />
                                    <button onClick={testEnqueue} style={btn()}>
                                        테스트 큐 적재
                                    </button>
                                </div>
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                                테스트 큐 적재 후 <b>/admin/marketing/queue</b>에서 READY 확인 → <b>messages worker</b> 실행하세요.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
                접근 URL 예시: <code>/admin/marketing/templates?key=ADMIN_SECRET</code>
            </div>
        </div>
    );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
            <input value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12 }} />
        </label>
    );
}

function Textarea({
    label,
    value,
    onChange,
    rows,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    rows: number;
}) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
            <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12 }} />
        </label>
    );
}

function btn(primary = false, danger = false): React.CSSProperties {
    return {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid " + (danger ? "#f2b8b8" : "#ddd"),
        background: primary ? "#111" : danger ? "#fff5f5" : "#fff",
        color: primary ? "#fff" : "#111",
        cursor: "pointer",
    };
}

function card(): React.CSSProperties {
    return { border: "1px solid #eee", borderRadius: 16, padding: 14, background: "#fff" };
}
function chk(): React.CSSProperties {
    return { display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", border: "1px solid #eee", borderRadius: 999 };
}
