"use client";

import { useEffect, useMemo, useState } from "react";

export default function SecureAuthPage() {
    const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? location.search : ""), []);
    const initialStep = params.get("step") === "otp" ? "otp" : "pin";

    const [step, setStep] = useState<"pin" | "otp">(initialStep);
    const [pin, setPin] = useState("");
    const [otp, setOtp] = useState("");
    const [msg, setMsg] = useState<string>("");
    const [mockCode, setMockCode] = useState<string>("");

    useEffect(() => {
        setStep(initialStep);
    }, [initialStep]);

    const verifyPin = async () => {
        setMsg("");
        const res = await fetch("/api/admin/verify-super-pin", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pin }),
        });
        if (!res.ok) return setMsg("PIN이 올바르지 않습니다.");

        // PIN 성공 → OTP 단계로 이동(권장)
        setMsg("PIN 인증 완료. OTP 인증을 진행하세요.");
        setStep("otp");

        // OTP 발송
        const r = await fetch("/api/admin/otp/send", { method: "POST" });
        const j = await r.json().catch(() => ({}));
        if (j?.mock_code) setMockCode(j.mock_code); // ✅ mock일 때 코드 표시
    };

    const verifyOtp = async () => {
        setMsg("");
        const res = await fetch("/api/admin/otp/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ otp }),
        });
        if (!res.ok) return setMsg("OTP가 올바르지 않습니다.");

        location.href = "/admin/secure/costs"; // Default landing
    };

    const resendOtp = async () => {
        setMsg("");
        const res = await fetch("/api/admin/otp/send", { method: "POST" });
        const j = await res.json().catch(() => ({}));
        if (j?.mock_code) setMockCode(j.mock_code);

        setMsg(res.ok ? "OTP 재발송 완료" : "OTP 재발송 실패");
    };

    return (
        <div style={wrap}>
            <h2 style={{ margin: 0 }}>🔐 대표자 보안 인증</h2>
            <p style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                1티어 관리자 폴더는 대표만 접근 가능합니다.
            </p>

            {step === "pin" && (
                <>
                    <input
                        type="password"
                        placeholder="대표 PIN 입력"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        style={input}
                    />
                    <button onClick={verifyPin} style={btnPrimary}>PIN 인증</button>
                </>
            )}

            {step === "otp" && (
                <>
                    <input
                        inputMode="numeric"
                        placeholder="OTP 6자리"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        style={input}
                    />
                    <button onClick={verifyOtp} style={btnPrimary}>OTP 인증</button>
                    <button onClick={resendOtp} style={btnGhost}>OTP 재발송</button>

                    {mockCode && (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#111", color: "#0f0" }}>
                            테스트용 OTP 코드: <b style={{ fontSize: 18 }}>{mockCode}</b>
                        </div>
                    )}

                    <p style={{ fontSize: 12, opacity: 0.7 }}>
                        * OTP_MODE=mock이면 서버 로그/응답에 코드가 표시됩니다(테스트용).
                    </p>
                </>
            )}

            {msg && <div style={msgBox}>{msg}</div>}
        </div>
    );
}

const wrap: React.CSSProperties = {
    maxWidth: 380,
    margin: "120px auto",
    padding: 18,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#fff",
};

const input: React.CSSProperties = {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    marginTop: 10,
    fontSize: 14,
};

const btnPrimary: React.CSSProperties = {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#4f46e5",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
};

const msgBox: React.CSSProperties = {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(79,70,229,0.08)",
    border: "1px solid rgba(79,70,229,0.25)",
    fontSize: 13,
};
