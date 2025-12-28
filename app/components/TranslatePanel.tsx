"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

type Lang = "ko" | "en" | "ja" | "zh-CN";

const LANG_LABEL: Record<Lang, string> = {
    ko: "한국어",
    en: "English",
    ja: "日本語",
    "zh-CN": "中文(简体)",
};

type HistoryItem = {
    id: string;
    at: number; // ms
    source: Lang;
    target: Lang;
    input: string;
    output: string;
};

const HISTORY_KEY = "limsdoor_translate_history_v1";

async function apiTranslate(text: string, source: Lang, target: Lang) {
    const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source, target }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "translate error");
    return data.translated as string;
}

function clampText(s: string, max = 1200) {
    if (!s) return "";
    return s.length > max ? s.slice(0, max) : s;
}

export default function TranslatePanel(props: {
    /** 번역 결과를 실측앱 메모/입력란에 꽂고 싶으면 이 콜백을 넘기세요 */
    onInsertToMemo?: (text: string) => void;
}) {
    const [source, setSource] = useState<Lang>("ko");
    const [target, setTarget] = useState<Lang>("en");

    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string>("");

    const [history, setHistory] = useState<HistoryItem[]>([]);

    // --- Voice Logic (Speech-to-Text) ---
    const [listening, setListening] = useState(false);

    const toggleVoice = () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome/Edge/Safari 권장)");
            return;
        }

        const recognition = new SpeechRecognition();
        // Map Lang to Speech Lang
        const speechLangMap: Record<Lang, string> = {
            ko: "ko-KR",
            en: "en-US",
            ja: "ja-JP",
            "zh-CN": "zh-CN",
        };
        recognition.lang = speechLangMap[source] || "ko-KR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setListening(true);
            setErr("");
        };

        recognition.onend = () => {
            setListening(false);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput((prev) => (prev ? prev + " " + transcript : transcript));
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error", event.error);
            setListening(false);
            if (event.error === 'not-allowed') {
                alert("마이크 권한이 허용되지 않았습니다.");
            }
        };

        recognition.start();
    };

    const stopListening = () => {
        setListening(false);
        // Note: SpeechRecognition instances are usually single-use or need ref to stop manually.
        // Ideally we keep a ref to 'recognition' if we want to abort mid-stream reliably.
        // For this simple implementation, toggling UI state is enough as it auto-stops on silence.
        // If explicit stop is needed, we would need a useRef<SpeechRecognition>.
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as HistoryItem[];
            setHistory(Array.isArray(parsed) ? parsed : []);
        } catch {
            // ignore
        }
    }, []);

    const canTranslate = useMemo(() => {
        return input.trim().length > 0 && source !== target && !busy;
    }, [input, source, target, busy]);

    const saveHistory = (item: HistoryItem) => {
        const next = [item, ...history].slice(0, 10);
        setHistory(next);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    };

    const onSwap = () => {
        setErr("");
        setSource(target);
        setTarget(source);
        // 입력/출력도 스왑하면 현장에 더 편함
        setInput(output || input);
        setOutput(input ? output : "");
    };

    const onTranslate = async () => {
        setErr("");
        const text = clampText(input.trim(), 2000);
        if (!text) return;

        try {
            setBusy(true);
            const translated = await apiTranslate(text, source, target);
            setOutput(translated);

            saveHistory({
                id: crypto.randomUUID(),
                at: Date.now(),
                source,
                target,
                input: text,
                output: translated,
            });
        } catch (e: any) {
            setErr(e?.message || "번역 실패");
        } finally {
            setBusy(false);
        }
    };

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // fallback
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
    };

    const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div
            style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 16,
                padding: 12,
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(8px)",
            }}
        >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );

    const Btn = ({
        children,
        onClick,
        disabled,
        variant = "primary",
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        variant?: "primary" | "ghost";
    }) => (
        <button
            disabled={disabled}
            onClick={onClick}
            style={{
                height: "44px",
                padding: "0 14px",
                borderRadius: 14,
                border: variant === "ghost" ? "1px solid rgba(0,0,0,0.12)" : "none",
                background: variant === "ghost" ? "rgba(255,255,255,0.85)" : "var(--ui-primary, #2563EB)",
                color: variant === "ghost" ? "var(--ui-text, #0F172A)" : "#fff",
                fontWeight: 900,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                boxShadow: variant === "primary" ? "var(--ui-btn-shadow, 0 10px 20px rgba(0,0,0,0.18))" : "none",
            }}
        >
            {children}
        </button>
    );

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <Card title="현장 번역">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                    <select
                        value={source}
                        onChange={(e) => setSource(e.target.value as Lang)}
                        style={{ height: 42, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", padding: "0 12px", background: "#fff" }}
                    >
                        {Object.keys(LANG_LABEL).map((k) => (
                            <option key={k} value={k}>
                                {LANG_LABEL[k as Lang]} (입력)
                            </option>
                        ))}
                    </select>

                    <select
                        value={target}
                        onChange={(e) => setTarget(e.target.value as Lang)}
                        style={{ height: 42, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", padding: "0 12px", background: "#fff" }}
                    >
                        {Object.keys(LANG_LABEL).map((k) => (
                            <option key={k} value={k}>
                                {LANG_LABEL[k as Lang]} (결과)
                            </option>
                        ))}
                    </select>

                    <Btn variant="ghost" onClick={onSwap}>
                        ⇄
                    </Btn>
                </div>

                <div style={{ marginTop: 10, position: 'relative' }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={listening ? "듣고 있습니다... (말씀하세요)" : "여기에 입력하거나 마이크를 눌러 말하세요."}
                        rows={4}
                        style={{
                            width: "100%",
                            borderRadius: 16,
                            border: listening ? "2px solid #ef4444" : "1px solid rgba(0,0,0,0.12)",
                            padding: 12,
                            paddingRight: 50, // space for mic button
                            resize: "vertical",
                            outline: "none",
                            transition: "border 0.2s"
                        }}
                    />
                    <button
                        onClick={toggleVoice}
                        className="flex items-center justify-center shadow-sm"
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: listening ? '#fee2e2' : '#f8fafc',
                            border: '1px solid rgba(0,0,0,0.1)',
                            color: listening ? '#ef4444' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {listening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Btn onClick={onTranslate} disabled={!canTranslate}>
                        {busy ? "번역 중..." : "번역하기"}
                    </Btn>
                    <Btn variant="ghost" onClick={() => copy(input)} disabled={!input.trim()}>
                        입력 복사
                    </Btn>
                    <Btn variant="ghost" onClick={() => copy(output)} disabled={!output.trim()}>
                        결과 복사
                    </Btn>
                    {props.onInsertToMemo && (
                        <Btn variant="ghost" onClick={() => props.onInsertToMemo && props.onInsertToMemo(output)} disabled={!output.trim()}>
                            메모에 넣기
                        </Btn>
                    )}
                </div>

                {err && (
                    <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" }}>
                        <div style={{ fontWeight: 900, marginBottom: 4 }}>번역 오류</div>
                        <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{err}</div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                            ※ Google API 키가 없으면 오류가 납니다. 환경변수(GOOGLE_TRANSLATE_API_KEY)를 설정해주세요.
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 10 }}>
                    <textarea
                        value={output}
                        readOnly
                        placeholder="번역 결과가 여기에 표시됩니다."
                        rows={4}
                        style={{
                            width: "100%",
                            borderRadius: 16,
                            border: "1px solid rgba(0,0,0,0.12)",
                            padding: 12,
                            resize: "vertical",
                            outline: "none",
                            background: "rgba(255,255,255,0.85)",
                        }}
                    />
                </div>
            </Card>

            <Card title="최근 번역(10개)">
                {history.length === 0 ? (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>아직 기록이 없습니다.</div>
                ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                        {history.map((h) => (
                            <div
                                key={h.id}
                                style={{
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    borderRadius: 14,
                                    padding: 10,
                                    background: "rgba(255,255,255,0.85)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                                        {LANG_LABEL[h.source]} → {LANG_LABEL[h.target]}
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                            onClick={() => copy(h.output)}
                                            style={{
                                                height: 30,
                                                padding: "0 10px",
                                                borderRadius: 10,
                                                border: "1px solid rgba(0,0,0,0.12)",
                                                background: "#fff",
                                                cursor: "pointer",
                                                fontWeight: 800,
                                                fontSize: 12,
                                            }}
                                        >
                                            결과 복사
                                        </button>
                                        {props.onInsertToMemo && (
                                            <button
                                                onClick={() => props.onInsertToMemo && props.onInsertToMemo(h.output)}
                                                style={{
                                                    height: 30,
                                                    padding: "0 10px",
                                                    borderRadius: 10,
                                                    border: "1px solid rgba(0,0,0,0.12)",
                                                    background: "#fff",
                                                    cursor: "pointer",
                                                    fontWeight: 800,
                                                    fontSize: 12,
                                                }}
                                            >
                                                메모 넣기
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ marginTop: 6, fontSize: 13, whiteSpace: "pre-wrap" }}>
                                    <div style={{ opacity: 0.75, marginBottom: 4 }}>입력</div>
                                    <div>{h.input}</div>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>
                                    <div style={{ opacity: 0.75, marginBottom: 4 }}>결과</div>
                                    <div>{h.output}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {history.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <button
                            onClick={() => {
                                setHistory([]);
                                localStorage.removeItem(HISTORY_KEY);
                            }}
                            style={{
                                height: 38,
                                padding: "0 12px",
                                borderRadius: 12,
                                border: "1px solid rgba(0,0,0,0.12)",
                                background: "#fff",
                                cursor: "pointer",
                                fontWeight: 900,
                            }}
                        >
                            기록 삭제
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
}
