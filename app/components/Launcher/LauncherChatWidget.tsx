"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Calendar, Mic, Bot, X } from 'lucide-react';
import { Order } from '@/app/lib/store';
import { useGlobalStore } from '@/app/lib/StoreContext';

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    type?: 'text' | 'schedule-card';
    scheduleData?: any;
}

export default function LauncherChatWidget() {
    const { addOrder } = useGlobalStore();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'welcome', sender: 'ai', text: '안녕하세요! 일정 등록이나 궁금한 점을 말씀해주세요.\n예: "내일 오후 2시 홍길동 실측 일정 잡아줘"' }
    ]);
    const [mode, setMode] = useState<'schedule' | 'ai'>('schedule');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");

        // Mock AI Processing
        setTimeout(() => {
            processMessage(input);
        }, 800);
    };

    const processMessage = (text: string) => {
        if (mode === 'schedule') {
            // Simple Parse Logic (Mock)
            // Detect keywords: "내일", "오전/오후", time, name, type (실측/시공)
            const isTomorrow = text.includes("내일");
            const isToday = text.includes("오늘");
            const targetDate = new Date();
            if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);

            // Extract time (simple regex for "N시")
            const timeMatch = text.match(/(\d+)시/);
            const timeStr = timeMatch ? `${timeMatch[1]}:00` : "10:00";

            // Extract name (assume 3-char name or specific pattern in real NLP, here just mock)
            const nameMatch = text.match(/([가-힣]{3})/);
            const name = nameMatch ? nameMatch[1] : "고객";

            // Extract type
            const type = text.includes("시공") ? "시공" : "실측";

            const scheduleData = {
                title: `${name} ${type} 일정`,
                date: targetDate.toISOString().split('T')[0],
                time: timeStr,
                type: type
            };

            const aiResponse: ChatMessage = {
                id: Date.now().toString(),
                sender: 'ai',
                text: '요청하신 일정을 파악했습니다. 등록하시겠습니까?',
                type: 'schedule-card',
                scheduleData: scheduleData
            };
            setMessages(prev => [...prev, aiResponse]);
        } else {
            // AI Mode
            const aiResponse: ChatMessage = {
                id: Date.now().toString(),
                sender: 'ai',
                text: `"${text}"에 대한 답변입니다. (AI 상담 기능 준비중)\n현재는 일정 등록 모드를 주로 사용해주세요!`
            };
            setMessages(prev => [...prev, aiResponse]);
        }
    };

    const handleConfirmSchedule = (data: any) => {
        // Mock saving to store (simplified, usually needs Customer ID etc)
        // For MVP, we just show success
        const newMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            text: `✅ [${data.date} ${data.time}] ${data.title} 일정이 등록되었습니다.`
        };
        setMessages(prev => [...prev, newMsg]);

        // Actually add to store if needed, but Order needs Customer ID. 
        // We will just simulate success for the launcher demo.
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[400px] w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2 font-bold">
                    <Sparkles size={18} className="text-yellow-400" />
                    빠른 입력 (AI)
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 text-xs font-bold">
                    <button
                        onClick={() => setMode('schedule')}
                        className={`px-3 py-1 rounded-md transition-all ${mode === 'schedule' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
                    >
                        일정
                    </button>
                    <button
                        onClick={() => setMode('ai')}
                        className={`px-3 py-1 rounded-md transition-all ${mode === 'ai' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
                    >
                        상담
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm
                            ${msg.sender === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}>
                            {msg.text}

                            {/* Schedule Confirmation Card */}
                            {msg.type === 'schedule-card' && msg.scheduleData && (
                                <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="text-indigo-600" size={16} />
                                        <span className="font-bold text-slate-900">{msg.scheduleData.title}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-3 ml-6">
                                        {msg.scheduleData.date} {msg.scheduleData.time} ({msg.scheduleData.type})
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleConfirmSchedule(msg.scheduleData)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-xs font-bold transition"
                                        >
                                            등록
                                        </button>
                                        <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 py-1.5 rounded-lg text-xs font-bold transition">
                                            취소
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-200">
                {/* Quick Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
                    {["내일 실측 일정", "입금 확인", "시공 일정 변경", "오늘 미팅"].map(chip => (
                        <button
                            key={chip}
                            onClick={() => setInput(chip)}
                            className="shrink-0 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition"
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'schedule' ? "예: 내일 오후 2시 김철수 실측" : "무엇이든 물어보세요..."}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
