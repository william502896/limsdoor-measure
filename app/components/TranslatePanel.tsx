"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
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

    // Refs for Uncontrolled Input (Solves IME/Keyboard issues)
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // State only for UI updates (button enabling, results)
    const [hasInput, setHasInput] = useState(false);
    const [output, setOutput] = useState("");

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string>("");

    const [history, setHistory] = useState<HistoryItem[]>([]);

    // --- Conversation Mode Logic ---
    const [isConversationMode, setIsConversationMode] = useState(false);

    // --- Voice Logic (Speech-to-Text) ---
    const [listening, setListening] = useState(false);
    const [listeningLang, setListeningLang] = useState<Lang | null>(null); // Track which voice is active

    const toggleVoice = (overrideLang?: Lang) => {
        if (listening) {
            stopListening();
        } else {
            startListening(overrideLang);
        }
    };

    const startListening = (overrideLang?: Lang) => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome/Edge/Safari 권장)");
            return;
        }

        // Determine language: Override (Conversational) > Default (Source)
        const targetLang = overrideLang || source;
        setListeningLang(targetLang);

        const recognition = new SpeechRecognition();
        // Map Lang to Speech Lang
        const speechLangMap: Record<Lang, string> = {
            ko: "ko-KR",
            en: "en-US",
            ja: "ja-JP",
            "zh-CN": "zh-CN",
        };
        recognition.lang = speechLangMap[targetLang] || "ko-KR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setListening(true);
            setErr("");
        };

        recognition.onend = () => {
            setListening(false);
            setListeningLang(null);
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;

            if (isConversationMode && overrideLang) {
                // In Conversation Mode: diverse flow
                // 1. Set Input (to show what was said)
                if (inputRef.current) inputRef.current.value = transcript;
                setHasInput(true);

                // 2. Identify Source/Target for this turn
                const currentSource = overrideLang;
                const currentTarget = overrideLang === source ? target : source; // Swap if the speaker is the 'target' side

                // 3. Auto Translate
                try {
                    setBusy(true);
                    const translated = await apiTranslate(transcript, currentSource, currentTarget);
                    setOutput(translated);

                    // 4. Auto Speak Result
                    speak(translated, currentTarget);

                    // 5. Save History
                    saveHistory({
                        id: crypto.randomUUID(),
                        at: Date.now(),
                        source: currentSource,
                        target: currentTarget,
                        input: transcript,
                        output: translated,
                    });
                } catch (e: any) {
                    setErr(e.message);
                } finally {
                    setBusy(false);
                }
            } else {
                // Standard Mode
                if (inputRef.current) {
                    const current = inputRef.current.value;
                    inputRef.current.value = current ? current + " " + transcript : transcript;
                    setHasInput(!!inputRef.current.value.trim());
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error", event.error);
            setListening(false);
            setListeningLang(null);
            if (event.error === 'not-allowed') {
                alert("마이크 권한이 허용되지 않았습니다.");
            }
        };

        recognition.start();
    };

    const stopListening = () => {
        setListening(false);
        setListeningLang(null);
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
        return hasInput && source !== target && !busy;
    }, [hasInput, source, target, busy]);

    const saveHistory = (item: HistoryItem) => {
        const next = [item, ...history].slice(0, 10);
        setHistory(next);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    };

    const onSwap = () => {
        setErr("");
        setSource(target);
        setTarget(source);

        // Swap values manually
        if (inputRef.current) {
            const currentInput = inputRef.current.value;
            inputRef.current.value = output || currentInput;
            setOutput(currentInput ? output : ""); // Logic slightly ambiguous on what output becomes, preserving original logic
            setHasInput(!!inputRef.current.value.trim());
        }
    };

    const onTranslate = async () => {
        setErr("");
        const rawInput = inputRef.current?.value || ""; // Read from Ref
        const text = clampText(rawInput.trim(), 2000);
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

    const speak = (text: string, lang: Lang) => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        // Map Lang to Speech Lang
        const speechLangMap: Record<Lang, string> = {
            ko: "ko-KR",
            en: "en-US",
            ja: "ja-JP",
            "zh-CN": "zh-CN",
        };
        utterance.lang = speechLangMap[lang] || "en-US";
        window.speechSynthesis.speak(utterance);
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
                display: "inline-flex",
                alignItems: "center",
                gap: 6
            }}
        >
            {children}
        </button>
    );

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <Card title="현장 번역">
                {/* Mode Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
                    <div className="text-sm text-slate-500 font-bold">
                        {isConversationMode ? "🗣️ 대화 모드 (자동 통역)" : "📝 텍스트/음성 입력 모드"}
                    </div>
                    <button
                        onClick={() => setIsConversationMode(!isConversationMode)}
                        style={{
                            fontSize: 12,
                            padding: "4px 10px",
                            borderRadius: 20,
                            background: isConversationMode ? "#2563EB" : "#E2E8F0",
                            color: isConversationMode ? "#fff" : "#475569",
                            fontWeight: 800,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        {isConversationMode ? "대화 모드 끄기" : "대화 모드 켜기"}
                    </button>
                </div>

                {isConversationMode ? (
                    // --- Conversation UI ---
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <button
                            onClick={() => toggleVoice(source)}
                            disabled={busy || (listening && listeningLang !== source)}
                            style={{
                                height: 120,
                                borderRadius: 20,
                                border: "2px solid #2563EB",
                                background: listening && listeningLang === source ? "#EFF6FF" : "#fff",
                                color: "#2563EB",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                                transform: listening && listeningLang === source ? "scale(0.98)" : "scale(1)",
                                transition: "all 0.2s",
                                cursor: "pointer",
                                opacity: busy || (listening && listeningLang !== source) ? 0.5 : 1
                            }}
                        >
                            <div style={{
                                width: 50, height: 50, borderRadius: "50%", background: "#2563EB",
                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                {listening && listeningLang === source ? <MicOff size={24} /> : <Mic size={24} />}
                            </div>
                            <div style={{ fontWeight: 800 }}>{LANG_LABEL[source]}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>누르고 말하기</div>
                        </button>

                        <button
                            onClick={() => toggleVoice(target)}
                            disabled={busy || (listening && listeningLang !== target)}
                            style={{
                                height: 120,
                                borderRadius: 20,
                                border: "2px solid #F97316",
                                background: listening && listeningLang === target ? "#FFF7ED" : "#fff",
                                color: "#F97316",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                                transform: listening && listeningLang === target ? "scale(0.98)" : "scale(1)",
                                transition: "all 0.2s",
                                cursor: "pointer",
                                opacity: busy || (listening && listeningLang === target) ? 0.5 : 1
                            }}
                        >
                            <div style={{
                                width: 50, height: 50, borderRadius: "50%", background: "#F97316",
                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                {listening && listeningLang === target ? <MicOff size={24} /> : <Mic size={24} />}
                            </div>
                            <div style={{ fontWeight: 800 }}>{LANG_LABEL[target]}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Click & Speak</div>
                        </button>
                    </div>
                ) : (
                    // --- Standard UI ---
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                            {/* Selectors and Swap (Existing) */}
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
                                ref={inputRef}
                                defaultValue="" // Uncontrolled component
                                onChange={() => setHasInput(!!inputRef.current?.value.trim())} // Only update valid state
                                onKeyDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
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
                                    transition: "border 0.2s",
                                    userSelect: "text",
                                    WebkitUserSelect: "text",
                                    zIndex: 10,
                                    position: "relative"
                                }}
                            />
                            <button
                                onClick={() => toggleVoice()}
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
                    </>
                )}

                {/* Common Action Buttons (Show only if not conversation mode, or maybe show always?) */}
                {!isConversationMode && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <Btn onClick={onTranslate} disabled={!canTranslate}>
                            {busy ? "번역 중..." : "번역하기"}
                        </Btn>
                        <Btn variant="ghost" onClick={() => copy(inputRef.current?.value || "")} disabled={!hasInput}>
                            입력 복사
                        </Btn>
                        <Btn variant="ghost" onClick={() => copy(output)} disabled={!output.trim()}>
                            결과 복사
                        </Btn>
                        <Btn variant="ghost" onClick={() => speak(output, target)} disabled={!output.trim()}>
                            <Volume2 size={18} /> 듣기
                        </Btn>
                        {props.onInsertToMemo && (
                            <Btn variant="ghost" onClick={() => props.onInsertToMemo && props.onInsertToMemo(output)} disabled={!output.trim()}>
                                메모에 넣기
                            </Btn>
                        )}
                    </div>
                )}

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
                    {/* In conversation mode, show speak button for output if available */}
                    {isConversationMode && output && (
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                            <Btn variant="ghost" onClick={() => speak(output, source === listeningLang ? target : source)}>
                                <Volume2 size={18} /> 다시 듣기
                            </Btn>
                        </div>
                    )}
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
                                            onClick={() => speak(h.output, h.target)}
                                            style={{
                                                height: 30,
                                                padding: "0 8px",
                                                borderRadius: 10,
                                                border: "1px solid rgba(0,0,0,0.12)",
                                                background: "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <Volume2 size={14} />
                                        </button>
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
