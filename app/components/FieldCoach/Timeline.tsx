
import React from 'react';

export type TimelineEvent = {
    id: string;
    time: string; // "14:05"
    type: "info" | "risk" | "fact";
    content: string;
};

export type SentimentSegment = {
    start: number; // seconds
    end: number;
    sentiment: "positive" | "neutral" | "worry" | "negative";
};

type Props = {
    events: TimelineEvent[];
    segments: SentimentSegment[];
};

export default function Timeline({ events, segments }: Props) {
    const getColor = (s: SentimentSegment["sentiment"]) => {
        switch (s) {
            case "positive": return "#22c55e"; // green-500
            case "neutral": return "#3b82f6"; // blue-500
            case "worry": return "#eab308"; // yellow-500
            case "negative": return "#ef4444"; // red-500
        }
    };

    return (
        <div style={{ padding: 16, borderLeft: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>대화 타임라인</h3>

            {/* Sentiment Strip (Mini Visualization) */}
            <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 16, background: "#f3f4f6" }}>
                {segments.map((seg, i) => (
                    <div key={i} style={{ flex: 1, background: getColor(seg.sentiment) }} title={seg.sentiment} />
                ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {events.map((ev) => (
                    <div key={ev.id} style={{ display: "flex", gap: 8 }}>
                        <div style={{ fontSize: 11, color: "#6b7280", minWidth: 35 }}>{ev.time}</div>
                        <div style={{
                            fontSize: 13,
                            color: ev.type === "risk" ? "#d97706" : "#374151",
                            fontWeight: ev.type === "fact" ? "bold" : "normal"
                        }}>
                            {ev.type === "risk" && "⚠️ "}
                            {ev.type === "fact" && "✅ "}
                            {ev.content}
                        </div>
                    </div>
                ))}
                {events.length === 0 && <div style={{ color: "#9ca3af", fontSize: 12 }}>녹음이 시작되면 대화 내용이 분석됩니다...</div>}
            </div>
        </div>
    );
}
