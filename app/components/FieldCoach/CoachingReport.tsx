
import React from 'react';

export type CoachingData = {
    leadershipScore: number;
    tone: string;
    missedChecklist: string[];
    goodPoints: string[];
    badPoints: string[];
    nextAction: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    data: CoachingData | null;
};

export default function CoachingReport({ isOpen, onClose, data }: Props) {
    if (!isOpen || !data) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
            <div style={{
                background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }}>
                <header style={{ padding: 16, borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: "bold", margin: 0 }}>📊 영업 코칭 리포트</h2>
                    <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer" }}>&times;</button>
                </header>

                <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: data.leadershipScore > 70 ? "#22c55e" : "#eab308" }}>{data.leadershipScore}점</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>주도권 점수</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <div style={{ fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{data.tone}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>전반적 분위기</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>✅ 좋았던 점</h3>
                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151" }}>
                            {data.goodPoints.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8, color: "#ef4444" }}>⚠️ 개선 필요 (불필요 대화)</h3>
                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151" }}>
                            {data.badPoints.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8, color: "#f59e0b" }}>📝 놓친 체크리스트</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {data.missedChecklist.length > 0 ? data.missedChecklist.map((item, i) => (
                                <span key={i} style={{ padding: "4px 8px", background: "#fef3c7", color: "#d97706", borderRadius: 4, fontSize: 12 }}>{item}</span>
                            )) : <span style={{ fontSize: 12, color: "#9ca3af" }}>완벽합니다!</span>}
                        </div>
                    </div>

                    <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8, border: "1px solid #bbf7d0" }}>
                        <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 4px 0", color: "#166534" }}>💡 Next Action</h3>
                        <p style={{ margin: 0, fontSize: 13, color: "#15803d" }}>{data.nextAction}</p>
                    </div>
                </div>

                <footer style={{ padding: 16, borderTop: "1px solid #f3f4f6", textAlign: "right" }}>
                    <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer" }}>닫기</button>
                </footer>
            </div>
        </div>
    );
}
