"use client";

import { useEffect, useState } from "react";

type U = {
    id: string;
    phone: string;
    name: string;
    role: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
    created_at: string;
};

export default function AdminRadioUsersPage() {
    const [adminKey, setAdminKey] = useState("");
    const [users, setUsers] = useState<U[]>([]);
    const [msg, setMsg] = useState("");

    async function load() {
        setMsg("불러오는 중...");
        const res = await fetch("/api/admin/radio-users", {
            headers: { "x-admin-key": adminKey },
        });
        const json = await res.json();
        if (!json.ok) return setMsg("실패: " + json.error);
        setUsers(json.users);
        setMsg("");
    }

    async function setStatus(id: string, status: U["status"]) {
        const res = await fetch("/api/admin/radio-users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
            body: JSON.stringify({ id, status }),
        });
        const json = await res.json();
        if (!json.ok) return alert("실패: " + json.error);
        await load();
    }

    useEffect(() => { /* 최초엔 키 입력 후 load */ }, []);

    return (
        <div style={{ padding: 16 }}>
            <h2>무전기 사용자 승인(관리자)</h2>

            <div style={{ display: "flex", gap: 8, maxWidth: 520 }}>
                <input
                    placeholder="관리자 키(ADMIN_MASTER_KEY)"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    style={{ flex: 1, padding: 10 }}
                />
                <button onClick={load} style={{ padding: "10px 12px" }}>불러오기</button>
            </div>

            {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {users.map((u) => (
                    <div key={u.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
                        <div><b>{u.name}</b> ({u.phone})</div>
                        <div>role: {u.role} / status: <b>{u.status}</b></div>

                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button onClick={() => setStatus(u.id, "APPROVED")}>승인</button>
                            <button onClick={() => setStatus(u.id, "REJECTED")}>거절</button>
                            <button onClick={() => setStatus(u.id, "BLOCKED")}>차단</button>
                            <button onClick={() => setStatus(u.id, "PENDING")}>대기 복귀</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
