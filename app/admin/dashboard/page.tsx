"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase"; // Assuming client auth

export default function IntegratedControlPage() {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Mock data for demonstration if DB is empty
    const MOCK_DATA = [
        {
            id: "m_101",
            created_at: new Date().toISOString(),
            customer_name: "홍길동",
            address: "서울 강남구 역삼동 123-45",
            industry: "WINDOW",
            width_mm: 2400,
            height_mm: 2300,
            risk_level: "WARNING",
            surcharge: 50000,
            memo: "벽면 평탄도 8mm 오차. 보강 프레임 적용.",
            status: "견적완료"
        },
        {
            id: "m_102",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            customer_name: "김철수",
            address: "경기도 성남시 분당구",
            industry: "INTERIOR",
            width_mm: 0,
            height_mm: 2400,
            risk_level: "DANGER",
            surcharge: 150000,
            memo: "습기 감지됨. 방수 공사 필수.",
            status: "상담중"
        }
    ];

    useEffect(() => {
        // 실제 데이터 연동 시:
        // const { data } = await supabase.from('measurements').select('*').order('created_at', { ascending: false });
        // setList(data || []);
        setList(MOCK_DATA);
    }, []);

    return (
        <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>🎛️ 통합 관제실 (Integrated Control)</h1>
                        <p style={{ color: "#666", marginTop: 4 }}>
                            실시간 현장 진단 및 견적 현황을 모니터링합니다.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button style={{ padding: "10px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, fontWeight: "bold" }}>엑셀 다운로드</button>
                    </div>
                </header>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                    <StatCard title="오늘 접수" value="12건" color="#2b5cff" />
                    <StatCard title="고위험(Danger)" value="3건" color="#ff0000" />
                    <StatCard title="추가공사 매출" value="₩450,000" color="#111" />
                    <StatCard title="계약 전환율" value="68%" color="#00aa00" />
                </div>

                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eee", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eee" }}>
                                <th style={th}>시간</th>
                                <th style={th}>고객/현장</th>
                                <th style={th}>업종</th>
                                <th style={th}>규격/정보</th>
                                <th style={th}>진단결과</th>
                                <th style={th}>추가견적</th>
                                <th style={th}>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((item) => (
                                <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                    <td style={td}>{item.created_at.substring(11, 16)}</td>
                                    <td style={td}>
                                        <div style={{ fontWeight: "bold" }}>{item.customer_name}</div>
                                        <div style={{ fontSize: 12, color: "#888" }}>{item.address}</div>
                                    </td>
                                    <td style={td}>
                                        <span style={{
                                            padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: "bold",
                                            background: item.industry === "WINDOW" ? "#e0f2fe" : "#fef3c7",
                                            color: item.industry === "WINDOW" ? "#0369a1" : "#d97706"
                                        }}>
                                            {item.industry}
                                        </span>
                                    </td>
                                    <td style={td}>
                                        {item.width_mm > 0 ? `${item.width_mm} x ${item.height_mm}` : `H: ${item.height_mm}`}
                                    </td>
                                    <td style={td}>
                                        <span style={{
                                            color: item.risk_level === "DANGER" ? "red" : item.risk_level === "WARNING" ? "orange" : "green",
                                            fontWeight: "bold", display: "flex", alignItems: "center", gap: 4
                                        }}>
                                            {item.risk_level === "DANGER" ? "🚨 " : "⚠️ "}{item.risk_level}
                                        </span>
                                        <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{item.memo}</div>
                                    </td>
                                    <td style={td}>
                                        {item.surcharge > 0 ? `+${item.surcharge.toLocaleString()}원` : "-"}
                                    </td>
                                    <td style={td}>
                                        <span style={{ fontWeight: "bold", color: "#2b5cff" }}>{item.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const th: React.CSSProperties = { padding: "14px 16px", textAlign: "left", color: "#666", fontWeight: "600" };
const td: React.CSSProperties = { padding: "14px 16px", verticalAlign: "top" };

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
    return (
        <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #eee" }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
        </div>
    );
}
