"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type RunRow = {
    id: string;
    framework: string;
    source_table: string;
    prompt: string;
    result: string;
    created_at: string;
};

export default function MarketingClientViewer({ runs }: { runs: RunRow[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(runs[0]?.id || null);

    const selected = runs.find((r) => r.id === selectedId);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "calc(100vh - 150px)" }}>
            {/* List */}
            <div style={{ overflowY: "auto", border: "1px solid #ddd", borderRadius: 8, background: "#fdfdfd" }}>
                {runs.map((r) => (
                    <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        style={{
                            padding: "12px 10px",
                            borderBottom: "1px solid #eee",
                            cursor: "pointer",
                            background: selectedId === r.id ? "#eef2ff" : "transparent",
                        }}
                    >
                        <div style={{ fontWeight: 700, fontSize: 14 }}>⚡ {r.framework}</div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                            {new Date(r.created_at).toLocaleString("ko-KR")}
                        </div>
                        <div style={{ fontSize: 11, color: "#666", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            ID: {r.id.slice(0, 8)}...
                        </div>
                    </div>
                ))}
                {runs.length === 0 && <div style={{ padding: 20, fontSize: 13, opacity: 0.6 }}>생성된 마케팅 전략이 없습니다.</div>}
            </div>

            {/* Detail */}
            <div style={{ overflowY: "auto", border: "1px solid #ddd", borderRadius: 8, padding: 30, background: "white", position: "relative" }}>
                {selected ? (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #333", paddingBottom: 15, marginBottom: 20 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 22 }}>{selected.framework} Strategy</h2>
                                <span style={{ fontSize: 12, color: "#888" }}>Created at {new Date(selected.created_at).toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => window.print()}
                                style={{
                                    background: "#333",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                🖨️ PDF 저장 / 인쇄
                            </button>
                        </div>

                        <div className="markdown-body" style={{ lineHeight: 1.6, fontSize: 15 }}>
                            {/* 
                 For a simple implementation without adding 'react-markdown' dependency if not present, 
                 we will use whitespace-pre-wrap. 
                 If the user wants markdown rendering, we can try, but simple text is safer for 'one-shot'.
                 Actually, the result is markdown from GPT. 
                 Let's just use white-space: pre-wrap for now to ensure no build errors with missing packages.
               */}
                            <div style={{ whiteSpace: "pre-wrap" }}>{selected.result}</div>
                        </div>

                        {/* Prompt for reference */}
                        <div style={{ marginTop: 50, paddingTop: 20, borderTop: "1px dashed #ccc", color: "#999", fontSize: 12 }}>
                            <strong>Original Prompt:</strong>
                            <div style={{ marginTop: 5, whiteSpace: "pre-wrap", background: "#f4f4f4", padding: 10, borderRadius: 6 }}>
                                {selected.prompt.slice(0, 300)}... (truncated)
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4 }}>
                        좌측 목록에서 리포트를 선택하세요.
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .markdown-body, .markdown-body * {
            visibility: visible;
          }
          .markdown-body {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
        }
      `}</style>
        </div>
    );
}
