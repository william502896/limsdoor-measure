"use client";

import { useEffect, useMemo, useState } from "react";

type Measurement = any;
type Photo = any;

export default function AdminMeasurementDetail({ params }: { params: { id: string } }) {
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string>("");

    const [m, setM] = useState<Measurement | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);

    const [adminStatus, setAdminStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
    const [adminNote, setAdminNote] = useState<string>("");

    const title = useMemo(() => {
        if (!m) return `실측 상세`;
        return `${m.customer_name ?? ""} / ${m.width_mm ?? 0}×${m.height_mm ?? 0}mm`;
    }, [m]);

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await fetch("/api/admin/measurements/get", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            setM(data.measurement);
            setPhotos(data.photos ?? []);
            setAdminStatus((data.measurement?.admin_status ?? "PENDING") as any);
            setAdminNote(data.measurement?.admin_note ?? "");
        } catch (e: any) {
            setErr(e?.message ?? "로드 실패");
        } finally {
            setLoading(false);
        }
    }

    async function save() {
        if (!m) return;
        setSaving(true);
        setErr("");
        try {
            const res = await fetch("/api/admin/measurements/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: m.id,
                    admin_status: adminStatus,
                    admin_note: adminNote,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            // 화면 반영
            setM((prev: Measurement | null) => (prev ? { ...prev, ...data.updated } : prev));

            if (data.transitioned) {
                alert(`저장 완료 + 자동 발송 실행\n${JSON.stringify(data.sendLogs, null, 2)}`);
            } else {
                alert("저장 완료");
            }
        } catch (e: any) {
            setErr(e?.message ?? "저장 실패");
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) {
        return (
            <div style={wrap}>
                <h2 style={h2}>실측 불러오는 중…</h2>
            </div>
        );
    }

    if (err) {
        return (
            <div style={wrap}>
                <h2 style={h2}>오류</h2>
                <div style={errBox}>{err}</div>
                <button style={btn} onClick={load}>다시 불러오기</button>
            </div>
        );
    }

    if (!m) {
        return (
            <div style={wrap}>
                <h2 style={h2}>데이터 없음</h2>
            </div>
        );
    }

    const primary = m.primary_image_url || m.image_data_url || null;

    return (
        <div style={wrap}>
            <div style={topRow}>
                <div>
                    <div style={badge}>MEASUREMENT</div>
                    <h1 style={h1}>{title}</h1>
                    <div style={sub}>
                        ID: <span style={{ opacity: 0.9 }}>{m.id}</span>
                    </div>
                </div>

                <div style={actions}>
                    <button style={btn} onClick={load} disabled={saving}>새로고침</button>
                    <button style={btnPrimary} onClick={save} disabled={saving}>
                        {saving ? "저장 중…" : "저장"}
                    </button>
                </div>
            </div>

            <div style={grid}>
                {/* 대표 이미지 */}
                <div style={card}>
                    <h3 style={h3}>대표 캡처</h3>
                    {primary ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={primary} alt="primary" style={img} />
                    ) : (
                        <div style={empty}>대표 이미지가 없습니다.</div>
                    )}
                </div>

                {/* 관리자 상태 */}
                <div style={card}>
                    <h3 style={h3}>관리자 처리</h3>

                    <div style={row}>
                        <label style={label}>상태</label>
                        <select
                            value={adminStatus}
                            onChange={(e) => setAdminStatus(e.target.value as any)}
                            style={select}
                        >
                            <option value="PENDING">보류(PENDING)</option>
                            <option value="APPROVED">확정(APPROVED)</option>
                            <option value="REJECTED">반려(REJECTED)</option>
                        </select>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <label style={label}>메모</label>
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            style={textarea}
                            placeholder="예: 실측값 확인 완료 / 보강 필요 / 고객 재확인 요청 등"
                        />
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                        저장을 눌러야 DB에 반영됩니다.
                    </div>
                </div>

                {/* 고객/옵션 */}
                <div style={card}>
                    <h3 style={h3}>고객 정보</h3>
                    <Info k="이름" v={m.customer_name} />
                    <Info k="전화" v={m.customer_phone} />
                    <Info k="주소" v={m.customer_address} />

                    <hr style={hr} />

                    <h3 style={h3}>옵션</h3>
                    <Info k="카테고리" v={m.category} />
                    <Info k="상세" v={m.detail} />
                    <Info k="유리" v={m.glass} />
                    <Info k="디자인" v={m.design} />
                    <Info k="열림방향" v={m.open_direction} />
                </div>

                {/* 실측값 */}
                <div style={card}>
                    <h3 style={h3}>실측 값</h3>
                    <Info k="가로(mm)" v={m.width_mm} />
                    <Info k="세로(mm)" v={m.height_mm} />
                    <Info k="mm/px" v={m.mm_per_px} />
                    <Info k="source" v={m.source} />

                    <details style={{ marginTop: 10 }}>
                        <summary style={{ cursor: "pointer", opacity: 0.9 }}>코너 좌표(corners) 보기</summary>
                        <pre style={pre}>{JSON.stringify(m.corners ?? null, null, 2)}</pre>
                    </details>
                </div>

                {/* 사진 리스트 */}
                <div style={{ ...card, gridColumn: "1 / -1" }}>
                    <h3 style={h3}>업로드 사진({photos.length})</h3>
                    {photos.length === 0 ? (
                        <div style={empty}>사진이 없습니다.</div>
                    ) : (
                        <div style={photoGrid}>
                            {photos.map((p) => (
                                <a key={p.id} href={p.public_url} target="_blank" rel="noreferrer" style={photoItem}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.public_url} alt={p.file_name} style={thumb} />
                                    <div style={photoMeta}>
                                        <div style={{ fontWeight: 900, fontSize: 12 }}>{p.file_name}</div>
                                        <div style={{ fontSize: 11, opacity: 0.75 }}>{p.mime_type || ""}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Info({ k, v }: { k: string; v: any }) {
    return (
        <div style={infoRow}>
            <div style={infoKey}>{k}</div>
            <div style={infoVal}>{v ?? "-"}</div>
        </div>
    );
}

/** ===== styles ===== */
const wrap: React.CSSProperties = { padding: 16, maxWidth: 1200, margin: "0 auto" };
const topRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
const actions: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center" };
const badge: React.CSSProperties = { display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", fontSize: 12, fontWeight: 900 };
const h1: React.CSSProperties = { margin: "10px 0 6px", fontSize: 24, fontWeight: 900 };
const h2: React.CSSProperties = { margin: "10px 0", fontSize: 18, fontWeight: 900 };
const h3: React.CSSProperties = { margin: "0 0 10px", fontSize: 16, fontWeight: 900 };
const sub: React.CSSProperties = { fontSize: 12, opacity: 0.75 };

const grid: React.CSSProperties = {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 12,
};

const card: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
};

const img: React.CSSProperties = { width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)" };
const empty: React.CSSProperties = { padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", opacity: 0.85 };

const row: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center" };
const label: React.CSSProperties = { width: 70, fontSize: 12, opacity: 0.8, fontWeight: 900 };

const select: React.CSSProperties = {
    flex: 1,
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontWeight: 900,
};

const textarea: React.CSSProperties = {
    width: "100%",
    minHeight: 110,
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.45,
};

const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,160,255,0.55)",
    background: "rgba(0,160,255,0.18)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const infoRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, padding: "6px 0" };
const infoKey: React.CSSProperties = { fontSize: 12, opacity: 0.8, fontWeight: 900 };
const infoVal: React.CSSProperties = { fontSize: 13, opacity: 0.95, wordBreak: "break-word" };

const hr: React.CSSProperties = { border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "10px 0" };
const pre: React.CSSProperties = { marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", overflow: "auto", fontSize: 12 };

const photoGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 };
const photoItem: React.CSSProperties = { display: "block", textDecoration: "none", color: "inherit", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", overflow: "hidden" };
const thumb: React.CSSProperties = { width: "100%", height: 140, objectFit: "cover", display: "block" };
const photoMeta: React.CSSProperties = { padding: 8 };

const errBox: React.CSSProperties = { padding: 12, borderRadius: 12, background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)", marginBottom: 10 };
