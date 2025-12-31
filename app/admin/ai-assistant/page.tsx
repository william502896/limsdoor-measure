"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Bot, Sparkles, Database, ShieldAlert, Lock,
    Send, User, BarChart4, FileText, Zap,
    CheckCircle, Server, Activity, Globe, Target, TrendingUp, Newspaper
} from "lucide-react";

interface Message {
    role: "user" | "ai";
    text: string;
    type?: "text" | "analysis" | "news" | "strategy";
    data?: any;
}

export default function AiAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", text: "반갑습니다. 최고 관리자님.\n민감 정보를 포함한 모든 사내 데이터 베이스 및 글로벌 마켓 데이터에 연결되었습니다.\n무엇을 도와드릴까요?", type: "text" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Mock Data Connections
    const connections = [
        { name: "인사 정보 (Personnel)", status: "connected", icon: User },
        { name: "재무/회계 (Finance)", status: "connected", icon: BarChart4 },
        { name: "계약/견적 (Contracts)", status: "connected", icon: FileText },
        { name: "시공/일정 (Operations)", status: "connected", icon: Zap },
        { name: "Global Market Data", status: "connected", icon: Globe, isExternal: true },
    ];

    const [processingStatus, setProcessingStatus] = useState("");

    const streamText = (fullText: string, role: "user" | "ai", type: any = "text", data: any = undefined) => {
        setIsTyping(false);
        setProcessingStatus("");

        // Add empty message first
        setMessages(prev => [...prev, { role, text: "", type, data }]);

        let i = 0;
        const intervalId = setInterval(() => {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                lastMsg.text = fullText.substring(0, i + 1);
                return newMessages;
            });
            i++;
            if (i === fullText.length) clearInterval(intervalId);
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 30); // Typing speed
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setInput("");
        setIsTyping(true);
        setProcessingStatus("보안 채널 암호화 연결 중...");

        // Simulation Step 1
        setTimeout(() => {
            setProcessingStatus("민감 데이터베이스 스캔 중...");
        }, 1000);

        // Simulation Step 2
        setTimeout(() => {
            setProcessingStatus("데이터 상관관계 분석 및 추론 중...");
        }, 2200);

        // Final Response
        setTimeout(() => {
            let response = "명령을 확인했습니다.";
            let type: any = "text";
            let data: any = undefined;

            if (userMsg.includes("뉴스") || userMsg.includes("동향") || userMsg.includes("시장")) {
                response = "주요 업계 뉴스 및 시장 동향 브리핑입니다.";
                type = "news";
                data = [
                    { title: "2025년 상반기 인테리어 자재 가격 동향", source: "건설경제", date: "2024.12.30", summary: "알루미늄 및 유리 자재 가격이 전분기 대비 3.5% 상승할 전망입니다. 환율 변동과 원자재 수급 불안정이 주요 원인으로..." },
                    { title: "수도권 리모델링 수요 급증", source: "부동산라이브", date: "2024.12.29", summary: "노후 주택 리모델링 지원 사업 확대로 인해 수도권 내 중문 및 창호 교체 수요가 전년 대비 20% 이상 증가하고 있습니다." },
                    { title: "스마트 홈 연동 도어 시장 확대", source: "Tech Daily", date: "2024.12.28", summary: "IoT 기술이 접목된 자동 중문 및 스마트 잠금장치 시장이 매년 15% 성장하고 있습니다. 프리미엄 라인업 강화가 필요합니다." }
                ];
            } else if (userMsg.includes("전략") || userMsg.includes("계획") || userMsg.includes("분석")) {
                response = "내부 데이터와 시장 상황을 종합 분석하여 수립한 전략 초안입니다.";
                type = "strategy";
                data = {
                    title: "2025년 1분기 성장을 위한 전략 제안",
                    swot: {
                        strength: ["높은 시공 품질 및 AS 만족도", "자체 제작을 통한 가격 경쟁력"],
                        weakness: ["수도권 외 지역 대응력 부족", "마케팅 채널의 다양성 부족"],
                        opportunity: ["리모델링 시장 확대", "프리미엄 라인업 수요 증가"],
                        threat: ["원자재 가격 상승", "대형 경쟁사의 저가 공세"]
                    },
                    roadmap: [
                        { phase: "Phase 1 (1월)", task: "프리미엄 자재 확보 및 신규 라인업 런칭" },
                        { phase: "Phase 2 (2월)", task: "경기 남부권 시공팀 추가 채용 (인사팀 협업)" },
                        { phase: "Phase 3 (3월)", task: "유튜브 마케팅 예산 200% 증액 및 공격적 프로모션" }
                    ]
                };
            } else if ((userMsg.includes("판매가") || userMsg.includes("가격")) && (userMsg.includes("50%") || userMsg.includes("반값"))) {
                response = "가상 시나리오 분석 결과 (매입가 대비 판매가 50% 설정 시):\n\n" +
                    "1. [치명적 손실 경고] 마진율이 -50%로 급락합니다. 이는 기업 존속에 위협이 되는 수치입니다.\n" +
                    "2. [재무적 타격] 판매할수록 적자가 누적됩니다. (예: 1억 매출 시 5천만원 순손실 발생)\n" +
                    "3. [시장 교란] 경쟁사의 반발 및 브랜드 가치 하락 우려가 있습니다.\n\n" +
                    "결론: 특별한 재고 청산 목적이 아니라면 절대 권장하지 않는 전략입니다.";
                type = "analysis";
            } else if (userMsg.includes("단가") || userMsg.includes("매출")) {
                response = "재무 데이터베이스(Finance.db) 및 단가표(Price_List_2024.xlsx) 접근 중...\n" +
                    "현재 이번 달 전체 마진율은 28.4%이며, 전월 대비 3.2% 상승했습니다. \n" +
                    "특이사항: '강남구 삼성동' 현장의 자재비가 예상보다 15% 초과 발생했습니다.";
            } else if (userMsg.includes("인사") || userMsg.includes("직원")) {
                response = "인사 DB(Personnel_Secure.enc) 조회 완료.\n" +
                    "현재 '시공 3팀'의 업무 로드가 120%로 과부하 상태입니다.\n" +
                    "다음 주 일정 재조정이 필요할 것으로 분석됩니다.";
            } else {
                response = `[전체 시스템 검색 완료]\n` +
                    `검색 경로:\n` +
                    `> /admin/secure/finance\n` +
                    `> /admin/secure/personnel\n` +
                    `> /public/market_data\n\n` +
                    `요청하신 "${userMsg}"에 대한 구체적인 위험 요소를 발견하지 못했습니다.\n` +
                    `더 구체적인 수치나 조건을 입력하시면 정밀 분석이 가능합니다.`;
            }

            streamText(response, "ai", type, data);
        }, 3500); // Longer wait for realism
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
            {/* Left Panel: Status & Connections */}
            <div className="w-[320px] bg-slate-950 border-r border-slate-800 p-6 flex flex-col hidden lg:flex">
                <div className="mb-8">
                    <div className="flex items-center gap-3 text-indigo-400 mb-2">
                        <Bot size={32} />
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            Tier 1 AI
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                        SYSTEM: SECURITY LEVEL MAX<br />
                        ACCESS: UNRESTRICTED
                    </p>
                </div>

                <div className="space-y-6 flex-1">
                    <div>
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Database size={12} /> Active Connections
                        </h3>
                        <div className="space-y-3">
                            {connections.map((conn) => (
                                <div key={conn.name} className={`flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border hover:border-indigo-500/30 transition group ${conn.isExternal ? "border-indigo-500/20 bg-indigo-900/10" : "border-slate-800"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition ${conn.isExternal ? "bg-indigo-900/30 text-indigo-400" : "bg-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-950/30"}`}>
                                            <conn.icon size={14} />
                                        </div>
                                        <div>
                                            <div className={`text-sm font-medium ${conn.isExternal ? "text-indigo-300" : "text-slate-300"}`}>{conn.name}</div>
                                            <div className="text-[10px] text-green-500 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Live Connected
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-20">
                            <ShieldAlert size={60} />
                        </div>
                        <h4 className="text-indigo-300 font-bold mb-1 flex items-center gap-2">
                            <Lock size={14} /> Security Audit
                        </h4>
                        <p className="text-xs text-indigo-200/60 leading-relaxed">
                            모든 대화 내용은 암호화되어 저장됩니다.<br />
                            민감 정보 접근 시 로그가 자동 기록됩니다.<br />
                            현재 세션은 안전합니다.
                        </p>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Activity size={12} />
                        <span>System Latency: 12ms</span>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900 relative">
                {/* Header (Mobile Only / Compact) */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center lg:hidden bg-slate-950/50 backdrop-blur">
                    <span className="font-bold text-indigo-400 flex items-center gap-2">
                        <Bot size={20} /> AI Assistant
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                        Tier 1
                    </span>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`
                                max-w-3xl p-5 rounded-2xl shadow-lg
                                ${msg.role === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"}
                            `}>
                                {msg.role === "ai" && (
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-400">
                                        <Sparkles size={12} />
                                        TIER 1 INTELLIGENCE
                                    </div>
                                )}

                                <div className="leading-relaxed whitespace-pre-wrap text-sm min-h-[20px]">
                                    {msg.text}
                                    {msg.text.length === 0 && <span className="animate-pulse">_</span>}
                                </div>

                                {/* NEWS RENDERER */}
                                {msg.type === "news" && msg.data && msg.text.length > 5 && (
                                    <div className="mt-4 grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {msg.data.map((item: any, i: number) => (
                                            <div key={i} className="bg-slate-900 border border-slate-700 p-4 rounded-xl hover:border-indigo-500/50 transition cursor-pointer">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-indigo-200 text-sm">{item.title}</h4>
                                                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{item.date}</span>
                                                </div>
                                                <div className="text-xs text-indigo-400 mb-2 flex items-center gap-1">
                                                    <Newspaper size={10} /> {item.source}
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed">{item.summary}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* STRATEGY RENDERER */}
                                {msg.type === "strategy" && msg.data && msg.text.length > 5 && (
                                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-slate-900/50 border border-indigo-500/20 p-4 rounded-xl">
                                            <h4 className="flex items-center gap-2 text-indigo-300 font-bold mb-3">
                                                <Target size={16} /> SWOT 분석
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-green-400 font-bold mb-1">Strength (강점)</div>
                                                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                                        {msg.data.swot.strength.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-red-400 font-bold mb-1">Weakness (약점)</div>
                                                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                                        {msg.data.swot.weakness.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-blue-400 font-bold mb-1">Opportunity (기회)</div>
                                                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                                        {msg.data.swot.opportunity.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-orange-400 font-bold mb-1">Threat (위협)</div>
                                                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                                        {msg.data.swot.threat.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                                            <h4 className="flex items-center gap-2 text-indigo-300 font-bold mb-3">
                                                <TrendingUp size={16} /> 추진 로드맵
                                            </h4>
                                            <div className="space-y-3">
                                                {msg.data.roadmap.map((step: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <div className="bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                                            {step.phase}
                                                        </div>
                                                        <div className="h-px bg-slate-700 flex-1" />
                                                        <div className="text-sm text-slate-300 text-right">
                                                            {step.task}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/80 border border-indigo-500/30 p-4 rounded-2xl rounded-tl-none flex flex-col gap-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                                    <Server size={14} className="animate-pulse" />
                                    <span>{processingStatus || "데이터 처리 중..."}</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent blur-xl pointer-events-none" />
                        <div className="relative flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition shadow-2xl">
                            <button className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition">
                                <PlusIcon />
                            </button>
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 px-2"
                                placeholder="최고 관리자 권한 (예: 건설 뉴스 브리핑, 내년도 전략 수립)"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                className={`p-3 rounded-lg transition-all ${input.trim() ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/50" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
                                disabled={!input.trim()}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <div className="text-center mt-3 text-xs text-slate-600">
                            Tier 1 AI can access Personnel (HR), Finance, Strategy Documents & Global Market Data.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlusIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    )
}
