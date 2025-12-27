"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, X, Maximize2, Minimize2, Terminal } from "lucide-react";

type Message = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: any[];
};

export default function DashboardChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/admin/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, userMsg] })
            });
            const data = await res.json();
            if (data.status === "ok") {
                if (data.history) {
                    setMessages(data.history);
                } else {
                    setMessages(prev => [...prev, data.message]);
                }
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Error: " + data.error?.message }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: "assistant", content: "Network Failed" }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/40 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-110 transition-all z-50 group"
            >
                <Bot size={28} className="group-hover:animate-bounce" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[500px] bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 border border-slate-700 flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 rounded-lg">
                        <Terminal size={14} />
                    </div>
                    <span className="font-bold text-sm">LIMS AI Assistant</span>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => window.open("/admin/agent", "_blank")} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white" title="Expand">
                        <Maximize2 size={14} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2">
                        <Bot size={32} className="opacity-20" />
                        <p>무엇을 도와드릴까요?<br />매출 조회, 주문 관리, 웹 검색 가능</p>
                    </div>
                )}
                {messages.filter(m => m.role !== "system" && m.role !== "tool").map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-700" : "bg-indigo-600"}`}>
                            {m.role === "user" ? <span className="text-[10px]">U</span> : <Bot size={12} className="text-white" />}
                        </div>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role === "user"
                            ? "bg-slate-800 text-slate-200"
                            : "bg-indigo-900/40 border border-indigo-500/30 text-indigo-100"
                            }`}>
                            {m.tool_calls ? (
                                <span className="text-indigo-400 italic">Executing tools...</span>
                            ) : m.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
                            <Bot size={12} className="text-white" />
                        </div>
                        <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-indigo-300 animate-pulse">
                            답변 생성 중...
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-900 border-t border-slate-800">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
                    <textarea
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-none"
                        placeholder="메시지 입력 (Shift+Enter 줄바꿈)..."
                        rows={2}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-1.5 bottom-2.5 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
}
