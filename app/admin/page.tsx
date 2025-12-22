"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "limsdoor_admin_settings_v1";

export type ReferenceObject = {
    id: string;
    name: string;
    sizeMm: number;
};

type AdminSettings = {
    officePhone: string;
    officeEmail: string;
    measurerName: string;
    measurerPhone: string;
    openaiApiKey?: string;
    businessCardImage?: string; // Base64 data URI
    // v2: List of objects
    referenceObjects?: ReferenceObject[];
};

function safeParse(raw: string | null): Partial<AdminSettings> {
    if (!raw) return {};
    try {
        const obj = JSON.parse(raw);
        return {
            officePhone: String(obj.officePhone ?? ""),
            officeEmail: String(obj.officeEmail ?? ""),
            measurerName: String(obj.measurerName ?? ""),
            measurerPhone: String(obj.measurerPhone ?? ""),
            openaiApiKey: String(obj.openaiApiKey ?? ""),
            businessCardImage: String(obj.businessCardImage ?? ""),
            referenceObjects: Array.isArray(obj.referenceObjects) ? obj.referenceObjects : [],
        };
    } catch {
        return {};
    }
}

export default function AdminPage() {
    const router = useRouter();

    const [officePhone, setOfficePhone] = useState("");
    const [officeEmail, setOfficeEmail] = useState("");
    const [measurerName, setMeasurerName] = useState("");
    const [measurerPhone, setMeasurerPhone] = useState("");
    const [openaiApiKey, setOpenaiApiKey] = useState("");
    const [businessCard, setBusinessCard] = useState("");

    // v2 Reference Objects
    const [refObjects, setRefObjects] = useState<ReferenceObject[]>([]);

    // Inputs for adding new object
    const [newRefName, setNewRefName] = useState("");
    const [newRefSize, setNewRefSize] = useState("");

    // 최초 로드: 기존 저장값 불러오기
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = safeParse(raw);
        setOfficePhone(parsed.officePhone ?? "");
        setOfficeEmail(parsed.officeEmail ?? "");
        setMeasurerName(parsed.measurerName ?? "");
        setMeasurerPhone(parsed.measurerPhone ?? "");
        setOpenaiApiKey(parsed.openaiApiKey ?? "");
        setBusinessCard(parsed.businessCardImage ?? "");

        // Migration: If old single object exists but no list, add it to list
        if (raw) {
            try {
                const old = JSON.parse(raw);
                if (old.referenceObjectName && old.referenceObjectSize && (!parsed.referenceObjects || parsed.referenceObjects.length === 0)) {
                    const migrated: ReferenceObject = {
                        id: Date.now().toString(),
                        name: old.referenceObjectName,
                        sizeMm: Number(old.referenceObjectSize)
                    };
                    setRefObjects([migrated]);
                    return;
                }
            } catch { }
        }

        setRefObjects(parsed.referenceObjects ?? []);
    }, []);

    const onAddRefObject = () => {
        if (!newRefName.trim() || !newRefSize.trim()) {
            alert("이름과 길이를 모두 입력해주세요.");
            return;
        }
        const size = Number(newRefSize);
        if (isNaN(size) || size <= 0) {
            alert("길이는 0보다 큰 숫자여야 합니다.");
            return;
        }

        const newObj: ReferenceObject = {
            id: Date.now().toString(),
            name: newRefName.trim(),
            sizeMm: size,
        };

        setRefObjects([...refObjects, newObj]);
        setNewRefName("");
        setNewRefSize("");
    };

    const onDeleteRefObject = (id: string) => {
        if (!confirm("삭제하시겠습니까?")) return;
        setRefObjects(refObjects.filter(o => o.id !== id));
    };

    // ✨ 명함 생성 (간편 제작)
    const generateBusinessCard = () => {
        if (!measurerName || !measurerPhone) {
            alert("먼저 실측자 이름과 연락처를 입력해주세요.");
            return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Card Size: 500x300 (Roughly credit card aspect ratio)
        canvas.width = 500;
        canvas.height = 300;

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 500, 300);

        // Border
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#333333";
        ctx.strokeRect(10, 10, 480, 280);

        // Logo / Title
        ctx.fillStyle = "#333333";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LIMS DOOR", 250, 80);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText("Premium Door Measurement", 250, 110);

        // Divider
        ctx.beginPath();
        ctx.moveTo(100, 130);
        ctx.lineTo(400, 130);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#dddddd";
        ctx.stroke();

        // Info
        ctx.textAlign = "left";
        ctx.fillStyle = "#000000";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`실측담당: ${measurerName}`, 80, 180);

        ctx.font = "20px sans-serif";
        ctx.fillText(`Tel: ${measurerPhone}`, 80, 220);

        if (officeEmail) {
            ctx.font = "16px sans-serif";
            ctx.fillStyle = "#555555";
            ctx.fillText(officeEmail, 80, 250);
        }

        // Save
        const dataUrl = canvas.toDataURL("image/png");
        setBusinessCard(dataUrl);
        alert("간편 명함이 생성되었습니다. 저장 버튼을 눌러 확정하세요.");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (evt.target?.result) {
                setBusinessCard(evt.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const onSave = () => {
        const payload: AdminSettings = {
            officePhone: officePhone.trim(),
            officeEmail: officeEmail.trim(),
            measurerName: measurerName.trim(),
            measurerPhone: measurerPhone.trim(),
            openaiApiKey: openaiApiKey.trim(),
            businessCardImage: businessCard,
            referenceObjects: refObjects,
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            alert("저장되었습니다.");
            router.push("/field/new");
        } catch {
            alert("저장에 실패했습니다. 로컬스토리지 확인 필요.");
        }
    };

    const onReset = () => {
        if (!confirm("모든 설정을 초기화할까요?")) return;
        localStorage.removeItem(STORAGE_KEY);
        setOfficePhone("");
        setOfficeEmail("");
        setMeasurerName("");
        setMeasurerPhone("");
        setOpenaiApiKey("");
        setRefObjects([]);
        alert("초기화되었습니다.");
    };

    return (
        <main style={{ minHeight: "100vh", padding: 24, background: "#0b0c10", color: "#fff", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <section style={{ width: "min(920px, 100%)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>관리자 설정 (v2)</h1>
                <p style={{ opacity: 0.8, marginBottom: 24 }}>
                    사무실 정보, 실측자, AI 키, 그리고 <b>AR 기준 물체</b>를 관리합니다.
                </p>

                {/* Basic Settings */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
                    <label style={labelStyle}>
                        <span>사무실 전화번호</span>
                        <input value={officePhone} onChange={e => setOfficePhone(e.target.value)} style={inputStyle} placeholder="010-1234-5678" />
                    </label>
                    <label style={labelStyle}>
                        <span>사무실 이메일</span>
                        <input value={officeEmail} onChange={e => setOfficeEmail(e.target.value)} style={inputStyle} placeholder="office@lims.co.kr" />
                    </label>
                    <label style={labelStyle}>
                        <span>실측자 이름</span>
                        <input value={measurerName} onChange={e => setMeasurerName(e.target.value)} style={inputStyle} placeholder="임도경" />
                    </label>
                    <label style={labelStyle}>
                        <span>실측자 연락처</span>
                        <input value={measurerPhone} onChange={e => setMeasurerPhone(e.target.value)} style={inputStyle} placeholder="010-0000-0000" />
                    </label>
                    <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                        <span>OpenAI API Key (선택)</span>
                        <input type="password" value={openaiApiKey} onChange={e => setOpenaiApiKey(e.target.value)} style={inputStyle} placeholder="sk-..." />
                    </label>
                </div>

                {/* Reference Objects List */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24 }}>
                    <h2 style={{ fontSize: 18, marginBottom: 12 }}>📏 AR 기준 물체 목록</h2>
                    <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
                        AR 실측 시 오차를 줄이기 위해 사용할 기준 물건들을 등록해주세요.<br />
                        예: 아이폰15(147mm), A4용지(297mm), 신용카드(85mm) 등
                    </p>

                    {/* List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        {refObjects.length === 0 && (
                            <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, color: "#888", textAlign: "center" }}>
                                등록된 기준 물체가 없습니다. 아래에서 추가해주세요.
                            </div>
                        )}
                        {refObjects.map((obj) => (
                            <div key={obj.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1f222e", padding: "12px 16px", borderRadius: 10, border: "1px solid #333" }}>
                                <div>
                                    <span style={{ fontWeight: "bold", fontSize: 16, marginRight: 8 }}>{obj.name}</span>
                                    <span style={{ color: "#4ade80", fontSize: 14 }}>{obj.sizeMm}mm</span>
                                </div>
                                <button onClick={() => onDeleteRefObject(obj.id)} style={{ background: "#ff4444", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New */}
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12 }}>
                        <label style={{ flex: 2, display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: "bold" }}>물건 이름</span>
                            <input value={newRefName} onChange={e => setNewRefName(e.target.value)} style={inputStyleSmall} placeholder="예: 갤럭시S24" />
                        </label>
                        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: "bold" }}>길이(mm)</span>
                            <input type="number" value={newRefSize} onChange={e => setNewRefSize(e.target.value)} style={inputStyleSmall} placeholder="147" />
                        </label>
                        <button onClick={onAddRefObject} style={{ height: 38, padding: "0 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>
                            추가
                        </button>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
                    <button onClick={onSave} style={btnPrimary}>설정 저장</button>
                    <button onClick={onReset} style={btnGhost}>초기화</button>
                    <button onClick={() => router.push("/field/new")} style={btnGhost}>돌아가기</button>
                </div>
            </section>
        </main>
    );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 8 };
const inputStyle: React.CSSProperties = { height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "#0f1117", color: "#fff", padding: "0 12px", outline: "none" };
const inputStyleSmall: React.CSSProperties = { ...inputStyle, height: 38, fontSize: 14 };
const btnPrimary: React.CSSProperties = { height: 42, padding: "0 24px", borderRadius: 10, border: "none", background: "#2b5cff", color: "#fff", fontWeight: 900, cursor: "pointer" };
const btnGhost: React.CSSProperties = { ...btnPrimary, background: "transparent", border: "1px solid rgba(255,255,255,0.14)" };
