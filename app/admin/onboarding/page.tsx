"use client";

import React, { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

type PersonRow = { name: string; phone?: string; note?: string };

export default function AdminOnboardingPage() {
    const router = useRouter();
    const supabase = useMemo(() => createSupabaseBrowser(), []);

    const [step, setStep] = useState<"LANDING" | "FORM">("LANDING");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // 회사 기본정보
    const [businessNumber, setBusinessNumber] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [fax, setFax] = useState("");
    const [kakao, setKakao] = useState("");

    // Social Media
    const [youtube, setYoutube] = useState("");
    const [tiktok, setTiktok] = useState("");
    const [instagram, setInstagram] = useState("");
    const [facebook, setFacebook] = useState("");

    // Dynamic URLs (Max 5)
    const [homepages, setHomepages] = useState<string[]>([""]);
    const [mallUrls, setMallUrls] = useState<string[]>([""]);

    // 로고
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [logoUploading, setLogoUploading] = useState(false);

    // 대표(OWNER) 정보
    const [ownerName, setOwnerName] = useState("");
    const [ownerJobTitle, setOwnerJobTitle] = useState("");
    const [ownerPhone, setOwnerPhone] = useState("");

    // Tier 1 Admin Password
    const [masterPassword, setMasterPassword] = useState("0000");

    // 반복 입력
    const [measurers, setMeasurers] = useState<PersonRow[]>([{ name: "", phone: "", note: "" }]);
    const [installers, setInstallers] = useState<PersonRow[]>([{ name: "", phone: "", note: "" }]);

    // --- Actions ---
    function handlePreview() {
        document.cookie = "onboarded=1; path=/";
        document.cookie = "company_id=demo; path=/";
        router.replace("/admin");
    }

    // --- Form Logic ---
    async function uploadLogo(file: File) {
        setLogoUploading(true);
        setErr(null);
        try {
            const form = new FormData();
            form.append("file", file);

            const res = await fetch("/api/admin/logo/upload", { method: "POST", body: form });
            const json = await res.json();
            if (!res.ok || !json.ok) throw new Error(json.error || "UPLOAD_FAILED");
            setLogoUrl(json.url);
        } catch (e: any) {
            setErr(e?.message || "로고 업로드 실패");
        } finally {
            setLogoUploading(false);
        }
    }

    function updateUrl(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) {
        setter(prev => prev.map((u, i) => i === idx ? val : u));
    }
    function addUrl(setter: React.Dispatch<React.SetStateAction<string[]>>) {
        setter(prev => {
            if (prev.length >= 5) return prev;
            return [...prev, ""];
        });
    }
    function removeUrl(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) {
        setter(prev => prev.filter((_, i) => i !== idx));
    }

    function updateRow(setter: React.Dispatch<React.SetStateAction<PersonRow[]>>, idx: number, key: keyof PersonRow, val: string) {
        setter((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
    }
    function addRow(setter: React.Dispatch<React.SetStateAction<PersonRow[]>>) {
        setter((prev) => [...prev, { name: "", phone: "", note: "" }]);
    }
    function removeRow(setter: React.Dispatch<React.SetStateAction<PersonRow[]>>, idx: number) {
        setter((prev) => prev.filter((_, i) => i !== idx));
    }

    async function onSubmit() {
        setLoading(true);
        setErr(null);
        try {
            // Validate Master Password
            if (masterPassword.length < 4) { // User said 6+, but 0000 is 4. So if it's not 0000, must be 6+? 
                // User request: "Default 0000, but can change to 6+". 
                // So if logic: if (pw === '0000') ok. else if (pw.length < 6) fail.
                if (masterPassword !== "0000" && masterPassword.length < 6) {
                    throw new Error("1티어 관리자 비밀번호는 기본값(0000) 또는 6자리 이상으로 설정해야 합니다.");
                }
            }
            if (masterPassword.length === 0) throw new Error("1티어 관리자 비밀번호를 입력해주세요.");

            const { data: authData, error: authErr } = await supabase.auth.getUser();
            if (authErr) throw authErr;
            const user = authData.user;
            if (!user) throw new Error("로그인이 필요합니다.");

            if (!businessNumber.trim() || !companyName.trim() || !ownerName.trim()) {
                throw new Error("필수 항목(사업자번호/회사명/대표자명)을 입력해주세요.");
            }

            // Filter empty URLs
            const validHomepages = homepages.map(u => u.trim()).filter(u => u.length > 0);
            const validMalls = mallUrls.map(u => u.trim()).filter(u => u.length > 0);

            const res = await fetch("/api/admin/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_user_id: user.id,
                    business_number: businessNumber.trim(),
                    company_name: companyName.trim(),
                    // ... existing fields
                    address: address.trim() || undefined,
                    email: email.trim() || undefined,
                    fax: fax.trim() || undefined,
                    kakao: kakao.trim() || undefined,
                    youtube: youtube.trim() || undefined,
                    tiktok: tiktok.trim() || undefined,
                    instagram: instagram.trim() || undefined,
                    facebook: facebook.trim() || undefined,
                    logo_url: logoUrl || undefined,
                    homepage_urls: validHomepages.length > 0 ? validHomepages : undefined,
                    shopping_mall_urls: validMalls.length > 0 ? validMalls : undefined,
                    owner_name: ownerName.trim(),
                    owner_job_title: ownerJobTitle.trim() || undefined,
                    owner_phone: ownerPhone.trim() || undefined,
                    master_password: masterPassword, // NEW
                    measurers,
                    installers,
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.ok) throw new Error(json.error || "ONBOARDING_FAILED");

            router.replace("/admin");
            router.refresh();
        } catch (e: any) {
            setErr(e?.message || "등록 실패");
        } finally {
            setLoading(false);
        }
    }

    /* RENDER LANDING */
    if (step === "LANDING") {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                {/* ... existing landing content ... */}
                <div style={{ maxWidth: 640, width: "100%" }}>
                    <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, textAlign: "center" }}>LIMSDOOR ADMIN</h1>
                    <p style={{ textAlign: "center", opacity: 0.7, marginBottom: 40 }}>업체 사용 등록을 통해 관리자 기능을 시작하세요.</p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
                            {/* Preview Card */}
                            <button
                                onClick={handlePreview}
                                style={{
                                    flex: "1 1 280px",
                                    textAlign: "left",
                                    padding: 24, borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)",
                                    background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                                    cursor: "pointer", transition: "transform 0.2s",
                                    color: "white"
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                                <div style={{ fontSize: 32, marginBottom: 16 }}>👀</div>
                                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>미리 써보기</div>
                                <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.5 }}>
                                    등록 없이 가상 데이터로<br />관리자 기능을 체험합니다.
                                </div>
                            </button>

                            {/* Register Card */}
                            <button
                                onClick={() => setStep("FORM")}
                                style={{
                                    flex: "1 1 280px",
                                    textAlign: "left",
                                    padding: 24, borderRadius: 24, border: "1px solid rgba(91, 71, 255, 0.3)",
                                    background: "rgba(91, 71, 255, 0.15)",
                                    cursor: "pointer", transition: "transform 0.2s",
                                    color: "white"
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                                <div style={{ fontSize: 32, marginBottom: 16 }}>📝</div>
                                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#a5b4fc" }}>업체 사용 등록</div>
                                <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5, color: "#c7d2fe" }}>
                                    사업자 정보 및 직원을<br />등록하고 시작합니다.
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
            <h1 style={{ margin: "8px 0 4px", fontSize: 22 }}>업체 사용 등록</h1>
            <p style={{ margin: 0, opacity: 0.75 }}>등록 완료 후부터 해당 업체(company_id) 기준으로 데이터가 0부터 누적됩니다. (단가 테이블은 기존 그대로 유지)</p>

            {err && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,80,80,0.15)", color: "#ffb3b3" }}>
                    {err}
                </div>
            )}

            <section style={card}>
                <h2 style={h2}>회사 정보</h2>

                <div style={grid2}>
                    <Field label="사업자등록번호(필수)" value={businessNumber} onChange={setBusinessNumber} placeholder="예: 123-45-67890" />
                    <Field label="회사명(필수)" value={companyName} onChange={setCompanyName} placeholder="예: 림스도어" />
                    <Field label="주소" value={address} onChange={setAddress} placeholder="도로명 주소" />
                    <Field label="이메일" value={email} onChange={setEmail} placeholder="견적/명세서 발송용" />
                    <Field label="팩스" value={fax} onChange={setFax} placeholder="선택" />
                    <Field label="카톡(채널 링크/ID)" value={kakao} onChange={setKakao} placeholder="예: https://pf.kakao.com/..." />
                    <Field label="1티어 관리자 비밀번호 (초기값: 0000)" value={masterPassword} onChange={setMasterPassword} placeholder="6자리 이상 (기본: 0000)" type="password" />
                </div>

                {/* Social Media Inputs */}
                <div style={{ marginTop: 12 }}>
                    <h3 style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>소셜 미디어 (선택)</h3>
                    <div style={grid2}>
                        <Field label="유튜브 채널 URL" value={youtube} onChange={setYoutube} placeholder="https://youtube.com/@..." />
                        <Field label="틱톡 프로필 URL" value={tiktok} onChange={setTiktok} placeholder="https://tiktok.com/@..." />
                        <Field label="인스타그램 프로필 URL" value={instagram} onChange={setInstagram} placeholder="https://instagram.com/..." />
                        <Field label="페이스북/Meta 페이지 URL" value={facebook} onChange={setFacebook} placeholder="https://facebook.com/..." />
                    </div>
                </div>

                {/* Homepage Urls */}
                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>회사 홈페이지 (최대 5개)</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {homepages.map((url, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 8 }}>
                                <input
                                    value={url}
                                    onChange={e => updateUrl(setHomepages, idx, e.target.value)}
                                    placeholder="https://..."
                                    style={inputStyle}
                                />
                                <button onClick={() => removeUrl(setHomepages, idx)} disabled={homepages.length <= 1} style={{ ...btnGhost, color: "#ff8888" }}>✕</button>
                            </div>
                        ))}
                    </div>
                    {homepages.length < 5 && (
                        <button onClick={() => addUrl(setHomepages)} style={{ ...btnGhost, marginTop: 8, fontSize: 12 }}>+ 홈페이지 추가</button>
                    )}
                </div>

                {/* Shopping Mall Urls */}
                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>운영 쇼핑몰 (최대 5개)</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {mallUrls.map((url, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 8 }}>
                                <input
                                    value={url}
                                    onChange={e => updateUrl(setMallUrls, idx, e.target.value)}
                                    placeholder="https://smartstore.naver.com/..."
                                    style={inputStyle}
                                />
                                <button onClick={() => removeUrl(setMallUrls, idx)} disabled={mallUrls.length <= 1} style={{ ...btnGhost, color: "#ff8888" }}>✕</button>
                            </div>
                        ))}
                    </div>
                    {mallUrls.length < 5 && (
                        <button onClick={() => addUrl(setMallUrls)} style={{ ...btnGhost, marginTop: 8, fontSize: 12 }}>+ 쇼핑몰 추가</button>
                    )}
                </div>

                <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>로고 등록</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadLogo(f);
                            }}
                        />
                        <button onClick={() => { }} disabled style={{ display: "none" }} />
                        <span style={{ fontSize: 13, opacity: 0.8 }}>{logoUploading ? "업로드 중..." : logoUrl ? "업로드 완료" : "미등록"}</span>
                        {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 42, borderRadius: 10, background: "#111" }} />}
                    </div>
                </div>
            </section>

            <section style={card}>
                <h2 style={h2}>대표(OWNER) 정보</h2>
                <div style={grid2}>
                    <Field label="대표자명(필수)" value={ownerName} onChange={setOwnerName} placeholder="예: 임도경" />
                    <Field label="직위" value={ownerJobTitle} onChange={setOwnerJobTitle} placeholder="예: 대표/실장" />
                    <Field label="연락처" value={ownerPhone} onChange={setOwnerPhone} placeholder="예: 010-0000-0000" />
                </div>
            </section>

            <section style={card}>
                <h2 style={h2}>실측자 등록</h2>
                {measurers.map((r, idx) => (
                    <div key={idx} style={rowBox}>
                        <div style={grid3}>
                            <Field label="이름" value={r.name} onChange={(v) => updateRow(setMeasurers, idx, "name", v)} placeholder="예: 김실측" />
                            <Field label="연락처" value={r.phone || ""} onChange={(v) => updateRow(setMeasurers, idx, "phone", v)} placeholder="선택" />
                            <Field label="메모" value={r.note || ""} onChange={(v) => updateRow(setMeasurers, idx, "note", v)} placeholder="선택" />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => removeRow(setMeasurers, idx)} disabled={measurers.length <= 1}>삭제</button>
                        </div>
                    </div>
                ))}
                <button onClick={() => addRow(setMeasurers)} style={btnGhost}>+ 실측자 추가</button>
            </section>

            <section style={card}>
                <h2 style={h2}>시공자(설치기사) 등록</h2>
                {installers.map((r, idx) => (
                    <div key={idx} style={rowBox}>
                        <div style={grid3}>
                            <Field label="이름" value={r.name} onChange={(v) => updateRow(setInstallers, idx, "name", v)} placeholder="예: 박기사" />
                            <Field label="연락처" value={r.phone || ""} onChange={(v) => updateRow(setInstallers, idx, "phone", v)} placeholder="선택" />
                            <Field label="메모" value={r.note || ""} onChange={(v) => updateRow(setInstallers, idx, "note", v)} placeholder="선택" />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => removeRow(setInstallers, idx)} disabled={installers.length <= 1}>삭제</button>
                        </div>
                    </div>
                ))}
                <button onClick={() => addRow(setInstallers)} style={btnGhost}>+ 시공자 추가</button>
            </section>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={onSubmit} disabled={loading} style={btnPrimary}>
                    {loading ? "등록 중..." : "등록 완료하고 시작"}
                </button>
            </div>
        </div>
    );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>{props.label}</span>
            <input
                type={props.type || "text"}
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                placeholder={props.placeholder}
                style={{
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.22)",
                    color: "#fff",
                    outline: "none",
                }}
            />
        </label>
    );
}

const card: React.CSSProperties = {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
};

const h2: React.CSSProperties = { margin: "2px 0 12px", fontSize: 16 };

const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
};

const grid3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
};

const rowBox: React.CSSProperties = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
    marginBottom: 10,
};

const btnPrimary: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 12,
    border: 0,
    cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
};
