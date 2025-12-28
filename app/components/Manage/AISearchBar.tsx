"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Mic, MicOff, Sparkles, X, Loader2 } from "lucide-react";

type Message = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: any[];
};

export default function AISearchBar() {
    const [query, setQuery] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const recognitionRef = useRef<any>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.lang = "ko-KR";
                recognitionRef.current.interimResults = false;

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setQuery(transcript);
                    setIsListening(false);
                    // Auto-submit after voice input
                    submitQuery(transcript);
                };
                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech Error", event.error);
                    setIsListening(false);
                };
                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    const toggleVoice = () => {
        if (!recognitionRef.current) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const submitQuery = async (q?: string) => {
        const searchQuery = q || query;
        if (!searchQuery.trim() || loading) return;

        setLoading(true);
        setShowResult(true);

        try {
            const res = await fetch("/api/admin/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: searchQuery }]
                })
            });
            const data = await res.json();

            if (data.status === "ok") {
                const lastMessage = data.history ? data.history[data.history.length - 1] : data.message;
                setResult(lastMessage?.content || "응답을 받을 수 없습니다.");
            } else {
                setResult("오류: " + (data.error?.message || "알 수 없는 오류"));
            }
        } catch (e) {
            setResult("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitQuery();
    };

    const clearResult = () => {
        setShowResult(false);
        setResult(null);
        setQuery("");
    };

    return (
        <div className="relative w-full max-w-3xl">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 text-slate-400" size={20} />

                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="AI에게 질문하거나 검색하세요... (음성 입력 가능)"
                        className="w-full pl-12 pr-28 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm"
                    />

                    {/* Voice Button */}
                    <button
                        type="button"
                        onClick={toggleVoice}
                        className={`absolute right-16 p-2 rounded-lg transition-all ${isListening
                                ? "bg-red-500 text-white animate-pulse"
                                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            }`}
                        title={isListening ? "음성 인식 중지" : "음성 입력 시작"}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!query.trim() || loading}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
                        title="AI 검색"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Sparkles size={18} />
                        )}
                    </button>
                </div>
            </form>

            {/* Result Popup */}
            {showResult && (
                <div
                    ref={resultRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-indigo-200 rounded-xl shadow-xl p-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                            <Sparkles size={16} />
                            <span>AI 응답</span>
                        </div>
                        <button
                            onClick={clearResult}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Loader2 size={16} className="animate-spin" />
                                <span>AI가 답변을 생성하고 있습니다...</span>
                            </div>
                        ) : (
                            result || "결과 없음"
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
