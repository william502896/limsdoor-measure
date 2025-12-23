
import React, { useEffect, useState } from 'react';
import { RecorderStatus } from '../../hooks/useAudioRecorder';

type Props = {
    status: RecorderStatus;
    onStart: () => void;
    onStop: () => void;
    onPause: () => void;
    onResume: () => void;
    analyzerStatus?: string; // e.g. "대화 분석 중..."
};

export default function RecordingWidget({ status, onStart, onStop, onPause, onResume, analyzerStatus }: Props) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === "recording") {
            interval = setInterval(() => setSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const ss = s % 60;
        return `${m}:${ss.toString().padStart(2, '0')}`;
    };

    if (status === "idle") {
        return (
            <button
                onClick={onStart}
                style={{
                    position: "fixed", bottom: 100, right: 16, zIndex: 900,
                    width: 56, height: 56, borderRadius: "50%",
                    background: "#ef4444", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                    border: "none", color: "#fff", fontSize: 24, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}
                title="녹음 시작"
            >
                🎙️
            </button>
        );
    }

    return (
        <div style={{
            position: "fixed", bottom: 100, right: 16, zIndex: 900,
            background: "#1f2937", borderRadius: 28, padding: "8px 16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", gap: 12, color: "#fff"
        }}>
            {/* Status Indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: status === "recording" ? "#ef4444" : "#fbbf24",
                    animation: status === "recording" ? "pulse 1.5s infinite" : "none"
                }} />
                <span style={{ fontSize: 14, fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
                    {status === "analyzing" ? "분석중" : formatTime(seconds)}
                </span>
            </div>

            {/* Controls */}
            {status === "recording" && (
                <>
                    <button onClick={onPause} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>⏸</button>
                    <button onClick={onStop} style={{ background: "#ef4444", border: "none", borderRadius: 4, width: 24, height: 24, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>■</button>
                </>
            )}

            {status === "paused" && (
                <>
                    <button onClick={onResume} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>▶</button>
                    <button onClick={onStop} style={{ background: "#ef4444", border: "none", borderRadius: 4, width: 24, height: 24, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>■</button>
                </>
            )}

            {status === "analyzing" && (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>AI 정리 중...</span>
            )}

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { opacity: 1; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}
