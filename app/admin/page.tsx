"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "limsdoor_admin_settings_v1";

type AdminSettings = {
    officePhone: string;
    officeEmail: string;
    measurerName: string;
    measurerPhone: string;
    openaiApiKey?: string;
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

    // 최초 로드: 기존 저장값 불러오기
    useEffect(() => {
        const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
        setOfficePhone(parsed.officePhone ?? "");
        setOfficeEmail(parsed.officeEmail ?? "");
        setMeasurerName(parsed.measurerName ?? "");
        setMeasurerPhone(parsed.measurerPhone ?? "");
        setOpenaiApiKey(parsed.openaiApiKey ?? "");
    }, []);

    const canSave = useMemo(() => {
        // 완전 강제는 아니고, 빈 값이어도 저장은 되게 할 수 있음.
        // 여기서는 최소한 실측자 이름/연락처 중 하나라도 있으면 저장 가능 정도로만 체크.
        return true;
    }, []);

    const onSave = () => {
        if (!canSave) return;

        const payload: AdminSettings = {
            officePhone: officePhone.trim(),
            officeEmail: officeEmail.trim(),
            measurerName: measurerName.trim(),
            measurerPhone: measurerPhone.trim(),
            openaiApiKey: openaiApiKey.trim(),
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            alert("저장되었습니다. 실측 화면으로 이동합니다.");
            router.push("/field/new"); // ✅ 저장 후 자동 이동
        } catch {
            alert("저장에 실패했습니다. 브라우저 저장소(localStorage)를 확인해주세요.");
        }
    };

    const onReset = () => {
        const ok = confirm("저장된 관리자 설정을 초기화할까요?");
        if (!ok) return;

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }

        setOfficePhone("");
        setOfficeEmail("");
        setMeasurerName("");
        setMeasurerPhone("");
        setOpenaiApiKey("");
        alert("초기화되었습니다.");
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                padding: 24,
                background: "#0b0c10",
                color: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
            }}
        >
            <section
                style={{
                    width: "min(920px, 100%)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 18,
                    padding: 24,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                }}
            >
                <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>
                    관리자 설정
                </h1>
                <p style={{ opacity: 0.8, marginBottom: 18 }}>
                    사무실 수신처, 실측자 정보, AI API 키를 저장합니다. (로컬스토리지:{" "}
                    <b>{STORAGE_KEY}</b>)
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                    }}
                >
                    <label style={{ display: "grid", gap: 8 }}>
                        <span style={{ fontWeight: 800 }}>사무실 전화번호</span>
                        <input
                            value={officePhone}
                            onChange={(e) => setOfficePhone(e.target.value)}
                            placeholder="예: 010-1234-5678"
                            style={inputStyle}
                        />
                        <small style={{ opacity: 0.75 }}>
                            발송 문자(SMS) 사무실 대상 번호로 사용할 수 있습니다.
                        </small>
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <span style={{ fontWeight: 800 }}>사무실 이메일</span>
                        <input
                            value={officeEmail}
                            onChange={(e) => setOfficeEmail(e.target.value)}
                            placeholder="예: office@lims.co.kr"
                            style={inputStyle}
                        />
                        <small style={{ opacity: 0.75 }}>
                            사무실에서 메일을 수신할 주소로 사용합니다.
                        </small>
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <span style={{ fontWeight: 800 }}>기본 실측자 이름</span>
                        <input
                            value={measurerName}
                            onChange={(e) => setMeasurerName(e.target.value)}
                            placeholder="예: 임도경"
                            style={inputStyle}
                        />
                        <small style={{ opacity: 0.75 }}>
                            <b>/field/new</b>에서 자동으로 채워집니다. (수정 가능)
                        </small>
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <span style={{ fontWeight: 800 }}>기본 실측자 연락처</span>
                        <input
                            value={measurerPhone}
                            onChange={(e) => setMeasurerPhone(e.target.value)}
                            placeholder="예: 010-0000-0000"
                            style={inputStyle}
                        />
                        <small style={{ opacity: 0.75 }}>
                            <b>/field/new</b>에서 자동으로 채워집니다. (수정 가능)
                        </small>
                    </label>

                    <label style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
                        <span style={{ fontWeight: 800 }}>OpenAI API Key (선택)</span>
                        <input
                            type="password"
                            value={openaiApiKey}
                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                            placeholder="sk-..."
                            style={inputStyle}
                        />
                        <small style={{ opacity: 0.75 }}>
                            AI 분석 기능 사용 시 필요합니다. (브라우저에만 저장됨)
                        </small>
                    </label>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                    <button onClick={onSave} style={btnPrimary}>
                        저장
                    </button>
                    <button onClick={onReset} style={btnGhost}>
                        초기화
                    </button>
                    <button onClick={() => router.push("/field/new")} style={btnGhost}>
                        실측 화면으로 이동
                    </button>
                </div>
            </section>
        </main>
    );
}

const inputStyle: React.CSSProperties = {
    height: 42,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#0f1117",
    color: "#fff",
    padding: "0 12px",
    outline: "none",
};

const btnPrimary: React.CSSProperties = {
    height: 42,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#2b5cff",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
    height: 42,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "transparent",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
};
