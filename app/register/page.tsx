"use client";

import { useState } from "react";

export default function RegisterPage() {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [msg, setMsg] = useState<string>("");

    async function submit() {
        setMsg("등록 중...");
        const res = await fetch("/api/radio/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, name, role: "field" }),
        });
        const json = await res.json();
        if (!json.ok) return setMsg("등록 실패: " + json.error);

        // 폰번호를 로컬에 저장(간단 MVP)
        localStorage.setItem("radio_phone", phone);
        setMsg("등록 완료! 관리자 승인 대기 중입니다.");
    }

    return (
        <div style={{ padding: 16, maxWidth: 420 }}>
            <h2>무전기 사용자 등록</h2>
            <input placeholder="전화번호" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 8 }} />
            <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 8 }} />
            <button onClick={submit} style={{ width: "100%", padding: 12, marginTop: 10 }}>등록하기</button>
            <p style={{ marginTop: 10 }}>{msg}</p>
        </div>
    );
}
