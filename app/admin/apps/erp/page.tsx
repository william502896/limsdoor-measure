"use client";

import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
    LayoutGrid, Bell, Calendar, User, Camera,
    TrendingUp, AlertCircle, Fuel, ChevronRight,
    ArrowUpRight, Check, Droplet, Bot, X, Sparkles
} from "lucide-react";

export default function IntegratedErpPage() {
    const router = useRouter(); // Use Router
    const [recentInstalls, setRecentInstalls] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // Fetch Recent Installations with Photos
        const { data, error } = await supabase
            .from("sc_schedules")
            .select(`
                id, content, install_date, type, photos,
                crm_customers (name)
            `)
            .not('photos', 'is', null) // Only with photos
            .order('install_date', { ascending: false })
            .limit(10);

        if (data) {
            // Filter slightly in JS if needed, e.g. ensure photos array not empty
            const valid = data.filter((d: any) => d.photos && Array.isArray(d.photos) && d.photos.length > 0);
            setRecentInstalls(valid);
        }
    };

    // Mock State for Notifications
    const [notifications, setNotifications] = useState([
        { id: 1, type: "schedule", message: "오늘 오후 2시 '김철수 고객님' 실측 예약이 있습니다.", time: "10분 전", urgent: true },
        { id: 2, type: "as", message: "시공 1년 경과: '반포자이 이영희님' 해피콜 요망", time: "1시간 전", urgent: false },
        { id: 3, type: "stock", message: "3연동 도어 하드웨어 재고가 부족합니다 (3set 남음)", time: "3시간 전", urgent: true },
    ]);

    // Mock State for Fuel Calculator
    const [distance, setDistance] = useState<string>("");
    const [fuelCost, setFuelCost] = useState<number>(0);
    const FUEL_PRICE = 1650; // 리터당 가격
    const MPG = 10; // 연비 (km/l)

    const calculateFuel = (dist: string) => {
        setDistance(dist);
        const d = Number(dist);
        if (!d) {
            setFuelCost(0);
            return;
        }
        // 왕복 계산 가정? 일단 편도 입력시 왕복으로 계산할지 여부는 UI에 명시. 여기서는 입력된 거리 기준.
        // User Guide: "왕복 거리를 입력하세요" or multiply by 2. Let's assume user inputs round trip or just straightforward math.
        // Logic: (Distance / MPG) * Price
        setFuelCost(Math.round((d / MPG) * FUEL_PRICE));
    };

    // AI Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: string, content: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);

    const toggleChat = () => {
        setIsChatOpen(!isChatOpen);
        if (!isChatOpen && chatMessages.length === 0) {
            // Initial Greeting
            setChatMessages([
                { role: "assistant", content: "안녕하십니까, 임스도어 총괄 비서입니다. 📅 일정 브리핑이나 ⚠️ 긴급 알림 분석이 필요하신가요?" }
            ]);
        }
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim()) return;

        const newUserMsg = { role: "user", content: chatInput };
        setChatMessages(prev => [...prev, newUserMsg]);
        setChatInput("");
        setIsAiLoading(true);

        try {
            // Context Construction
            const context = {
                recentSchedules: recentInstalls.map(s => ({
                    id: s.id,
                    customer: s.crm_customers?.name || "Unknown",
                    type: s.type,
                    status: "Completed", // implicit from query
                    date: s.install_date,
                    summary: s.content
                })),
                notifications: notifications,
                kpi: {
                    monthProfit: 8450000,
                    bepRate: 125,
                    activeContracts: 14
                }
            };

            const response = await fetch("/api/ai/erp-executor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...chatMessages, newUserMsg],
                    context: context
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setChatMessages(prev => [...prev, { role: "assistant", content: data.content }]);
        } catch (error) {
            console.error("AI Chat Error:", error);
            setChatMessages(prev => [...prev, { role: "assistant", content: "죄송합니다. 시스템 오류가 발생했습니다." }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <LayoutGrid className="text-indigo-600" /> LIMS Enterprise Master
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            실측부터 정산까지, 비즈니스의 모든 흐름을 한눈에 관리하세요.
                        </p>
                    </div>
                    <div className="relative">
                        <button className="p-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 relative">
                            <Bell size={20} className="text-slate-600" />
                            {notifications.length > 0 && (
                                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Section: KPI & Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Main KPI Card (Profitability) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={18} /> 이번 달 경영 성과
                            </h3>
                            <p className="text-slate-500 text-xs">2024년 1월 1일 ~ 현재</p>
                        </div>
                        <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                            상세 리포트 <ArrowUpRight size={12} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="text-xs text-indigo-600 font-bold mb-1">월 순이익 (예상)</div>
                            <div className="text-2xl font-bold text-indigo-900">₩ 8,450,000</div>
                            <div className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                                <ArrowUpRight size={10} /> 전월 대비 12% 상승
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 font-bold mb-1">BEP 달성률</div>
                            <div className="text-2xl font-bold text-slate-800">125%</div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-green-500 h-full w-[100%]"></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 font-bold mb-1">진행 중 계약</div>
                            <div className="text-2xl font-bold text-slate-800">14 건</div>
                            <div className="text-xs text-slate-400 mt-1">상담 5 / 실측 3 / 시공 6</div>
                        </div>
                    </div>
                </div>

                {/* 2. Smart Notification Center */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Bell size={18} /> CEO 알림 센터
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {notifications.map(notif => (
                            <div key={notif.id} className={`p-3 rounded-xl border text-sm relative ${notif.urgent ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${notif.urgent ? "bg-red-200 text-red-700" : "bg-slate-200 text-slate-600"}`}>
                                        {notif.type.toUpperCase()}
                                    </span>
                                    <span className="text-slate-400 text-xs">{notif.time}</span>
                                </div>
                                <p className={`font-medium ${notif.urgent ? "text-red-900" : "text-slate-700"}`}>
                                    {notif.message}
                                </p>
                                {notif.type === "as" && (
                                    <button className="mt-2 text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm hover:bg-slate-50 text-slate-600 w-full">
                                        해피콜 걸기
                                    </button>
                                )}
                            </div>
                        ))}
                        {notifications.length === 0 && (
                            <div className="text-center text-slate-400 py-8 text-sm">
                                새로운 알림이 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 3. Quick Actions Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <LayoutGrid size={18} /> 통합 작업 실행
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ActionButton
                            icon={<Calendar size={24} />}
                            label="실측/시공 일정"
                            desc="스케줄 관리"
                            color="bg-indigo-50 text-indigo-600 hover:border-indigo-300"
                            onClick={() => router.push('/admin/schedule/all')}
                        />
                        <ActionButton
                            icon={<User size={24} />}
                            label="고객 관리 (CRM)"
                            desc="신규 등록 및 조회"
                            color="bg-emerald-50 text-emerald-600 hover:border-emerald-300"
                            onClick={() => router.push('/admin/customers/all')}
                        />
                        <ActionButton
                            icon={<Camera size={24} />}
                            label="현장 사진 아카이브"
                            desc="시공 전/후 업로드"
                            color="bg-blue-50 text-blue-600 hover:border-blue-300"
                            onClick={() => router.push('/admin/schedule/install')}
                        />
                        <ActionButton
                            icon={<Fuel size={24} />}
                            label="출장비 정산"
                            desc="거리별 자동 계산"
                            color="bg-orange-50 text-orange-600 hover:border-orange-300"
                            onClick={() => document.getElementById('fuel-calc')?.scrollIntoView({ behavior: 'smooth' })}
                        />
                    </div>

                    {/* Photo Archive Preview Section (Real Data) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Camera size={16} /> 최근 현장 아카이브 (Real-time)
                            </h3>
                            <button onClick={() => router.push('/admin/schedule/all')} className="text-slate-400 hover:text-indigo-600 transition">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                            {recentInstalls.length > 0 ? (
                                recentInstalls.map((inst, i) => (
                                    <div
                                        key={inst.id}
                                        className="min-w-[140px] h-[140px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer"
                                        onClick={() => router.push('/admin/schedule/all')}
                                    >
                                        {inst.photos && inst.photos[0] ? (
                                            <img src={inst.photos[0]} className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Camera size={24} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            <div className="text-white text-xs font-bold truncate">{inst.crm_customers?.name || "고객"}</div>
                                            <div className="text-white/70 text-[10px] truncate">{inst.content}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="w-full text-center py-8 text-slate-400 text-sm">
                                    등록된 현장 사진이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Utilities (Fuel Calculator) */}
                <div id="fuel-calc" className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Fuel size={18} /> 현장 유틸리티
                    </h3>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Droplet size={14} className="text-orange-500" /> 간편 유류비 계산기
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    이동 거리 (편도/왕복 km)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={distance}
                                        onChange={(e) => calculateFuel(e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="km 입력"
                                    />
                                    <button className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                        계산
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-orange-700">예상 유류비</span>
                                    <span className="text-[10px] text-orange-400">연비 {MPG}km/L 기준</span>
                                </div>
                                <div className="text-2xl font-bold text-orange-600">
                                    {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(fuelCost)}
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                                * 현재 오피넷 평균 휘발유가 ₩{FUEL_PRICE}/L 를 반영한 결과입니다.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* AI Assistant Floating Button */}
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center"
            >
                {isChatOpen ? <X size={24} /> : <Bot size={24} />}
            </button>

            {/* AI Chat Window */}
            {isChatOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
                    {/* Chat Header */}
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500 rounded-lg">
                                <Bot size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">AI Executive</h3>
                                <div className="text-[10px] opacity-70 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                    Online • Gemini Pro
                                </div>
                            </div>
                        </div>
                        <button onClick={toggleChat} className="text-slate-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm"
                                    }`}>
                                    {msg.role === "assistant" && (
                                        <div className="flex items-center gap-1 mb-1 text-indigo-600 font-bold text-[10px]">
                                            <Sparkles size={10} /> AI Assistant
                                        </div>
                                    )}
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !isAiLoading && sendChatMessage()}
                                placeholder="브리핑 요청, 알림 분석..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={isAiLoading}
                            />
                            <button
                                onClick={sendChatMessage}
                                disabled={isAiLoading || !chatInput.trim()}
                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <ArrowUpRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActionButton({ icon, label, desc, color, onClick }: { icon: React.ReactNode, label: string, desc: string, color: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl border border-transparent transition-all duration-200 flex flex-col items-center justify-center text-center gap-2 h-[140px] shadow-sm hover:shadow-md ${color}`}
        >
            <div className="p-3 bg-white/80 rounded-full backdrop-blur-sm">
                {icon}
            </div>
            <div>
                <div className="font-bold text-sm">{label}</div>
                <div className="text-xs opacity-70 font-medium">{desc}</div>
            </div>
        </button>
    )
}
