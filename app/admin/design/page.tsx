"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    UiSettings,
    ThemePreset,
    ButtonRadius,
    getDefaultSettings,
    readUiSettings,
    writeUiSettings,
    applyCssVarsFromSettings,
    mergePreset,
    MultiAppUiConfig,
    resolveUiSettings,
    getInitialMultiAppConfig,
    AppScope
} from "@/app/lib/uiSettings";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { Monitor, Smartphone, Tablet } from "lucide-react";

/**
 * Shared Components for Admin UI
 */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 14, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(6px)", color: "#1f2937" }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center", marginBottom: 10, color: "#1f2937" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
            <div>{children}</div>
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            style={{
                width: "100%",
                height: 38,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                padding: "0 12px",
                outline: "none",
                color: "#1f2937",
                background: "#fff",
            }}
        />
    );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            style={{
                width: "100%",
                height: 38,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                padding: "0 12px",
                outline: "none",
                background: "#fff",
                color: "#1f2937",
            }}
        />
    );
}

function MiniBtn({ onClick, children, active }: { onClick?: () => void; children: React.ReactNode; active?: boolean }) {
    return (
        <button
            onClick={onClick}
            style={{
                height: 38,
                padding: "0 12px",
                borderRadius: 12,
                border: active ? "1px solid #2563EB" : "1px solid rgba(0,0,0,0.12)",
                background: active ? "#EFF6FF" : "#fff",
                color: active ? "#2563EB" : "#1f2937",
                cursor: "pointer",
                fontWeight: 700,
                transition: "all 0.2s"
            }}
        >
            {children}
        </button>
    );
}

// Helper to visualize "Scope" in Preview
function ScopeMockContent({ scope, settings }: { scope: AppScope, settings: UiSettings }) {
    if (scope === "SHOP") {
        return (
            <div style={{ padding: 16, flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontFamily: "var(--ui-font-heading)", fontWeight: 900, fontSize: 24, textAlign: "center", marginBottom: 10 }}>
                    {settings.brandName.toUpperCase()}
                </div>
                <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "var(--ui-btn-radius)", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 40 }}>🏠</span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                    <div style={{ background: "var(--ui-primary)", color: "#fff", padding: "16px", borderRadius: "var(--ui-btn-radius)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "var(--ui-btn-shadow)" }}>
                        <span>📷 AR 촬영하기</span>
                        <span>→</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.8)", color: "var(--ui-text)", padding: "16px", borderRadius: "var(--ui-btn-radius)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>🛍️ 쇼핑하기</span>
                        <span>→</span>
                    </div>
                </div>
            </div>
        )
    }

    if (scope === "GLOBAL") {
        return (
            <div style={{ padding: 16, flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ textAlign: "center", fontStyle: "italic", opacity: 0.6 }}>글로벌 설정은 모든 앱의 기본값입니다.</div>
                <div style={{ background: "#fff", padding: 20, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: 0, marginBottom: 10 }}>Dashboard Preview</h3>
                    <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ width: 40, height: 40, background: "var(--ui-primary)", borderRadius: 8 }}></div>
                        <div style={{ width: 40, height: 40, background: "var(--ui-secondary)", borderRadius: 8 }}></div>
                        <div style={{ width: 40, height: 40, background: "var(--ui-accent)", borderRadius: 8 }}></div>
                    </div>
                </div>
            </div>
        )
    }

    // Default FIELD
    return (
        <div style={{ padding: 16, flex: 1, overflow: "auto" }}>
            <div style={{ fontFamily: "var(--ui-font-heading)", fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
                현장 입력 예시
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Input placeholder="고객명" />
                    <Input placeholder="연락처" />
                </div>
                <Input placeholder="주소" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Input placeholder="가로(mm)" />
                    <Input placeholder="세로(mm)" />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button style={{ height: "var(--ui-btn-height)", flex: 1, borderRadius: "var(--ui-btn-radius)", background: "var(--ui-primary)", color: "#fff", border: "none", fontWeight: 900, boxShadow: "var(--ui-btn-shadow)" }}>
                        사무실 전송
                    </button>
                    <button style={{ height: "var(--ui-btn-height)", flex: 1, borderRadius: "var(--ui-btn-radius)", background: "rgba(255,255,255,0.8)", color: "var(--ui-text)", border: "1px solid rgba(0,0,0,0.12)", fontWeight: 900 }}>
                        고객 전송
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(255,255,255,0.72)" }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>상태 배지</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)" }}>Primary</span>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>Accent</span>
                </div>
            </div>
        </div>
    );
}

function PreviewShell({ settings, device, scope }: { settings: UiSettings; device: "MOBILE" | "TABLET" | "DESKTOP", scope: AppScope }) {
    const size = useMemo(() => {
        if (device === "MOBILE") return { w: 390, h: 780 };
        if (device === "TABLET") return { w: 820, h: 780 };
        return { w: 1080, h: 780 };
    }, [device]);

    return (
        <div style={{ width: size.w, height: size.h, borderRadius: 24, border: "1px solid rgba(0,0,0,0.12)", overflow: "hidden", position: "relative", background: "var(--ui-bg)", color: "var(--ui-text)", fontFamily: "var(--ui-font-body)", transition: "width 0.3s ease" }}>
            {/* 배경 이미지 + 딤 + 블러 */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "var(--ui-page-bg-image)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "var(--ui-bg-repeat)", backgroundAttachment: "var(--ui-bg-fixed)", filter: `blur(var(--ui-bg-blur))`, transform: "scale(1.05)", zIndex: 0 }} />
            <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,var(--ui-bg-dim))`, zIndex: 0 }} />

            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Top bar */}
                <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.65)", borderBottom: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(10px)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--ui-primary)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900 }}>L</div>
                        <div style={{ lineHeight: 1.1 }}>
                            <div style={{ fontFamily: "var(--ui-font-heading)", fontWeight: "var(--ui-font-heading-weight)", fontSize: 14 }}>{settings.brandName}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{scope} Preview</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <ScopeMockContent scope={scope} settings={settings} />
            </div>
        </div>
    );
}

function AdminDesignPageContent() {
    const [multiConfig, setMultiConfig] = useState<MultiAppUiConfig>(getInitialMultiAppConfig());
    const [scope, setScope] = useState<AppScope>("GLOBAL");
    const [device, setDevice] = useState<"MOBILE" | "TABLET" | "DESKTOP">("MOBILE");
    const [saving, setSaving] = useState(false);

    const searchParams = useSearchParams();
    const supabase = useMemo(() => createSupabaseBrowser(), []);

    // Set Initial Scope from URL
    useEffect(() => {
        const target = searchParams.get('target');
        if (target === 'shop') setScope("SHOP");
        else if (target === 'field') setScope("FIELD");
    }, [searchParams]);

    // load
    useEffect(() => {
        const load = async () => {
            // 1. Try Local
            const local = readUiSettings();
            if (local) setMultiConfig(local);

            // 2. Try DB
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
                if (profile?.company_id) {
                    const { data: companyData } = await supabase.from('회사들').select('design_config').eq('id', profile.company_id).single();
                    if (companyData?.design_config) {
                        const dbRaw = companyData.design_config;
                        if (dbRaw.colors && !dbRaw.global) {
                            setMultiConfig({ global: dbRaw, field: undefined, shop: undefined });
                        } else {
                            setMultiConfig(dbRaw);
                        }
                    }
                }
            }
        };
        load();
    }, [supabase]);

    // Derived Settings for current scope
    // Note: If Specific Scope is undefined, we initialize it with Global logic for EDITING
    // But visualized, we use resolveUiSettings.
    const currentSettings = useMemo(() => {
        return resolveUiSettings(multiConfig, scope);
    }, [multiConfig, scope]);

    // apply live
    useEffect(() => {
        applyCssVarsFromSettings(currentSettings);
    }, [currentSettings]);

    const updateSettings = (newSettings: UiSettings) => {
        setMultiConfig(prev => ({
            ...prev,
            [scope === "GLOBAL" ? "global" : scope.toLowerCase()]: newSettings
        }));
    };

    const updateField = (section: keyof UiSettings, key: string, value: any) => {
        const next = { ...currentSettings };
        if (section === "brandName" || section === "headerTitle" || section === "preset") {
            (next as any)[section] = value;
        } else {
            (next as any)[section] = { ...next[section], [key]: value };
        }
        updateSettings(next);
    };

    const onSave = async () => {
        writeUiSettings(multiConfig);
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
                if (profile?.company_id) {
                    await supabase.from('회사들').update({ design_config: multiConfig }).eq('id', profile.company_id);
                }
            }
            alert("저장되었습니다.");
        } catch (e) {
            console.error(e);
            alert("DB 저장 실패.");
        } finally {
            setSaving(false);
        }
    };

    const applyPreset = (p: Exclude<ThemePreset, "CUSTOM">) => {
        const merged = mergePreset(currentSettings, p);
        merged.preset = p;
        updateSettings(merged);
    };

    // Fork logic: If editing Shop/Field, and it's undefined, we are implicitly creating it.
    // The resolveUiSettings handles the fallback. When we call updateSettings, we write to the key.

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>UI 커스터마이징</div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <MiniBtn onClick={() => setDevice("MOBILE")} active={device === "MOBILE"}><Smartphone size={16} /></MiniBtn>
                    <MiniBtn onClick={() => setDevice("TABLET")} active={device === "TABLET"}><Tablet size={16} /></MiniBtn>
                    <MiniBtn onClick={() => setDevice("DESKTOP")} active={device === "DESKTOP"}><Monitor size={16} /></MiniBtn>

                    <button onClick={onSave} style={{ height: 38, padding: "0 20px", borderRadius: 12, border: "none", background: "#111827", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                        {saving ? "저장 중..." : "저장"}
                    </button>
                    {/* <MiniBtn onClick={onReset}>초기화</MiniBtn> */}
                </div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* Editor Panel */}
                <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 100px)", overflowY: "auto", paddingBottom: 100 }}>

                    {/* Scope Selector */}
                    <div style={{ display: 'flex', background: '#e5e7eb', padding: 4, borderRadius: 14 }}>
                        {['GLOBAL', 'FIELD', 'SHOP'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setScope(s as AppScope)}
                                style={{
                                    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13,
                                    background: scope === s ? '#fff' : 'transparent',
                                    color: scope === s ? '#000' : '#6b7280',
                                    cursor: 'pointer', boxShadow: scope === s ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <Card title="프리셋 (테마)">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {(["LIGHT", "DARK", "PRO", "PREMIUM"] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => applyPreset(p)}
                                    style={{
                                        padding: 10,
                                        borderRadius: 8,
                                        border: currentSettings.preset === p ? "2px solid var(--ui-primary)" : "1px solid rgba(0,0,0,0.1)",
                                        background: "#fff",
                                        color: "#1f2937",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card title="브랜드 설정">
                        <Row label="서비스 명">
                            <Input value={currentSettings.brandName} onChange={(e) => updateField("brandName", "", e.target.value)} />
                        </Row>
                        <Row label="헤더 타이틀">
                            <Input value={currentSettings.headerTitle} onChange={(e) => updateField("headerTitle", "", e.target.value)} />
                        </Row>
                    </Card>

                    <Card title="색상 (Colors)">
                        <Row label="Primary (메인)">
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="color" value={currentSettings.colors.primary} onChange={(e) => updateField("colors", "primary", e.target.value)} style={{ borderRadius: 8, width: 40, height: 38, border: "none", background: "none" }} />
                                <Input value={currentSettings.colors.primary} onChange={(e) => updateField("colors", "primary", e.target.value)} />
                            </div>
                        </Row>
                        <Row label="Secondary">
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="color" value={currentSettings.colors.secondary} onChange={(e) => updateField("colors", "secondary", e.target.value)} style={{ borderRadius: 8, width: 40, height: 38, border: "none", background: "none" }} />
                                <Input value={currentSettings.colors.secondary} onChange={(e) => updateField("colors", "secondary", e.target.value)} />
                            </div>
                        </Row>
                        <Row label="Accent (강조)">
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="color" value={currentSettings.colors.accent} onChange={(e) => updateField("colors", "accent", e.target.value)} style={{ borderRadius: 8, width: 40, height: 38, border: "none", background: "none" }} />
                                <Input value={currentSettings.colors.accent} onChange={(e) => updateField("colors", "accent", e.target.value)} />
                            </div>
                        </Row>
                        <Row label="Background">
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="color" value={currentSettings.colors.background} onChange={(e) => updateField("colors", "background", e.target.value)} style={{ borderRadius: 8, width: 40, height: 38, border: "none", background: "none" }} />
                                <Input value={currentSettings.colors.background} onChange={(e) => updateField("colors", "background", e.target.value)} />
                            </div>
                        </Row>
                        <Row label="Text Color">
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="color" value={currentSettings.colors.text} onChange={(e) => updateField("colors", "text", e.target.value)} style={{ borderRadius: 8, width: 40, height: 38, border: "none", background: "none" }} />
                                <Input value={currentSettings.colors.text} onChange={(e) => updateField("colors", "text", e.target.value)} />
                            </div>
                        </Row>
                    </Card>

                    <Card title="배경 이미지">
                        <Row label="App BG URL">
                            <Input placeholder="https://..." value={currentSettings.background.appBgImageUrl} onChange={(e) => updateField("background", "appBgImageUrl", e.target.value)} />
                        </Row>
                        <Row label="Blur (px)">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="range" min="0" max="20" value={currentSettings.background.blurPx} onChange={(e) => updateField("background", "blurPx", Number(e.target.value))} />
                                <span style={{ width: 20 }}>{currentSettings.background.blurPx}</span>
                            </div>
                        </Row>
                        <Row label="Dim Opacity">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="range" min="0" max="0.8" step="0.05" value={currentSettings.background.dimOpacity} onChange={(e) => updateField("background", "dimOpacity", Number(e.target.value))} />
                                <span style={{ width: 24 }}>{currentSettings.background.dimOpacity}</span>
                            </div>
                        </Row>
                    </Card>

                    <Card title="폰트 & 버튼">
                        <Row label="Heading Font">
                            <Select value={currentSettings.fonts.heading} onChange={(e) => updateField("fonts", "heading", e.target.value)}>
                                <option value="Pretendard">Pretendard</option>
                                <option value="NotoSansKR">Noto Sans KR</option>
                                <option value="System">System UI</option>
                            </Select>
                        </Row>
                        <Row label="Button Shape">
                            <Select value={currentSettings.buttons.radius} onChange={(e) => updateField("buttons", "radius", e.target.value)}>
                                <option value="SHARP">Sharp (각지게)</option>
                                <option value="ROUNDED">Rounded (둥글게)</option>
                                <option value="PILL">Pill (알약)</option>
                            </Select>
                        </Row>
                    </Card>
                </div>

                {/* Live Preview - Sticky */}
                <div style={{ position: "sticky", top: 20, flex: 1, display: "flex", justifyContent: "center" }}>
                    <PreviewShell settings={currentSettings} device={device} scope={scope} />
                </div>
            </div>
        </div>
    );
}

export default function AdminDesignPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminDesignPageContent />
        </Suspense>
    );
}
