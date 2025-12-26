"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Terminal } from "lucide-react";
import styles from "./agent.module.css";

type Message = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: any[];
};

function AdminAgentContent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Include history (simplified)
            // Filter out 'tool' roles if complex, but here we pass full history for context
            const history = [...messages, userMsg];

            const res = await fetch("/api/admin/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history })
            });

            const data = await res.json();

            if (data.status === "ok") {
                // If the API returns a 'history', use it as it might contain tool calls/results
                if (data.history) {
                    setMessages(data.history);
                } else {
                    setMessages(prev => [...prev, data.message]);
                }
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${data.error?.message || "Unknown error"}` }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: "assistant", content: "❌ Network Error" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white font-mono">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                    <Terminal size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg flex items-center gap-2">
                        LIMS Admin Agent <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30">BETA</span>
                    </h1>
                    <p className="text-xs text-slate-500">Connected to Internal Tools & External Network</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                        <Bot size={64} className="opacity-20" />
                        <p>Ask me to analyze sales, manage orders, or search the web.</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <span className="bg-slate-900 border border-slate-800 px-3 py-2 rounded hover:bg-slate-800 cursor-pointer" onClick={() => setInput("오늘 매출 요약해줘")}>"오늘 매출 요약해줘"</span>
                            <span className="bg-slate-900 border border-slate-800 px-3 py-2 rounded hover:bg-slate-800 cursor-pointer" onClick={() => setInput("최근 3연동 도어 트렌드 검색해줘")}>"최근 3연동 도어 트렌드 검색해줘"</span>
                        </div>
                    </div>
                )}

                {messages.filter(m => m.role !== "tool" && m.role !== "system").map((m, i) => (
                    <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-700" : "bg-indigo-600"}`}>
                            {m.role === "user" ? <UserIcon size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user"
                            ? "bg-slate-800 text-slate-200 rounded-tr-none"
                            : "bg-slate-900/50 border border-slate-800 text-slate-300 rounded-tl-none shadow-sm"
                            }`}>
                            {/* If complex tool call logic exists in message, simplistic rendering might show raw JSON. 
                                Ideally, we hide raw tool calls and show final response, but debugging view is fine for Admin. */}
                            {m.tool_calls ? (
                                <div className="text-xs text-indigo-400 font-mono mb-2 border-l-2 border-indigo-500 pl-2">
                                    Executing: {m.tool_calls[0].function.name}(...)
                                </div>
                            ) : null}
                            {m.content || (m.tool_calls ? "Processing..." : "")}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 rounded-tl-none flex items-center gap-2 text-indigo-300 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="지시할 명령을 입력하세요..."
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-4 pr-12 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-2 p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AdminAgentPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}>
            <AdminAgentContent />
        </Suspense>
    );
}
