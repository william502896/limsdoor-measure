"use client";

import React from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Calendar, CheckSquare, Share2, Activity, Link as LinkIcon, ExternalLink, Bot } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import DashboardChatWidget from "./DashboardChatWidget";
import LiveClock from "./LiveClock";
import LiveWeather from "./LiveWeather";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
    const { orders } = useGlobalStore();

    // 1. KPI Calculation
    const totalRevenue = orders.reduce((sum, o) => sum + o.finalPrice, 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === "COMPLETED" || o.status === "INSTALLED").length;
    const asRate = (orders.filter(o => o.asHistory.length > 0).length / totalOrders * 100) || 0;

    // Helper to find relative time of last action
    const getLastActivity = (statuses: string[]) => {
        const filtered = orders.filter(o => statuses.includes(o.status));
        if (filtered.length === 0) return "기록 없음";
        // Sort by id (assuming time based) or createdAt? orders usually sorted by creation.
        // Let's rely on array order or sort by date string if needed.
        // Assuming recently added are at the end? orders are appended.
        const last = filtered[filtered.length - 1];
        // Which date to check? modify timestamps based on status? use createdAt as fallback.
        const dateStr = last.installDate || last.measureDate || last.createdAt;
        try {
            return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ko });
        } catch { return "최근"; }
    };

    const shopActivity = getLastActivity(["AR_SELECTED"]);
    const fieldActivity = getLastActivity(["MEASURED", "MEASURE_REQUESTED"]);
    const installActivity = getLastActivity(["INSTALLED", "INSTALL_SCHEDULED"]);

    const copyLink = (path: string) => {
        const url = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(url);
        alert(`링크가 복사되었습니다:\n${url}`);
    };

    // 2. Monthly Revenue Data
    const monthlyDataMap = new Map<string, number>();
    orders.forEach(o => {
        if (!o.measureDate) return;
        const key = o.measureDate.substring(0, 7); // "2024-01"
        monthlyDataMap.set(key, (monthlyDataMap.get(key) || 0) + o.finalPrice);
    });
    const monthlyData = Array.from(monthlyDataMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // 3. Category Distribution Data
    const categoryMap = new Map<string, number>();
    orders.forEach(o => {
        o.items.forEach(item => {
            categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
        });
    });
    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

    // 4. Mock Monitoring Data (Real-time Simulation)
    const activeUsers = [
        { name: "김철수", role: "Field", status: "online", location: "강남구 현장" },
        { name: "이영희", role: "Office", status: "online", location: "본사" },
        { name: "박민수", role: "Install", status: "busy", location: "분당구 시공중" },
        { name: "Unknown", role: "Shop", status: "viewing", location: "AR 체험중" },
        { name: "Unknown", role: "Shop", status: "viewing", location: "견적 확인중" },
    ];

    const aiUsageData = [
        { time: "09:00", calls: 12 },
        { time: "10:00", calls: 28 },
        { time: "11:00", calls: 45 },
        { time: "12:00", calls: 30 },
        { time: "13:00", calls: 55 },
        { time: "14:00", calls: 80 },
        { time: "15:00", calls: 65 },
    ];

    return (
        <div className="space-y-6 relative pb-20">
            {/* Header Section with Live Status */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">통합 관제 모니터링</h2>
                    <p className="text-sm text-slate-500">실시간 앱/현장 사용자 현황 및 AI 분석 지표</p>
                </div>
                <div className="flex gap-2 items-center">
                    <LiveWeather />
                    <LiveClock />
                    <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        System Normal
                    </div>
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Users size={12} />
                        Active: {activeUsers.length}
                    </div>
                </div>
            </div>

            {/* LIVE USER MONITORING BOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Traffic Source / App Launcher */}
                <div className="lg:col-span-2 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-sm border border-indigo-100">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">App Traffic & Control</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Shop App */}
                        <div className="border border-gray-200 rounded-xl p-4 hover:border-pink-300 transition-all bg-pink-50/20 group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-bold text-pink-700 flex items-center gap-1">Consumer Shop</span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border">
                                    <Activity size={10} /> {shopActivity}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex -space-x-2">
                                    {[1, 2].map(i => <div key={i} className="w-6 h-6 rounded-full bg-pink-200 border-2 border-white flex items-center justify-center text-[10px]">Guest</div>)}
                                </div>
                                <span className="text-xs text-gray-500">+3 viewing</span>
                            </div>
                            <button onClick={() => window.open("/shop", "_blank")} className="w-full py-1.5 bg-white border border-pink-200 text-pink-600 rounded text-xs font-bold hover:bg-pink-50">Launch App</button>
                        </div>

                        {/* Field App */}
                        <div className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all bg-blue-50/20 group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-bold text-blue-700 flex items-center gap-1">Field Partner</span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border">
                                    <Activity size={10} /> {fieldActivity}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-3">
                                <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-green-500" /> 김철수 (강남)</div>
                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-300" /> 이민호 (휴무)</div>
                            </div>
                            <button onClick={() => window.open("/field/new", "_blank")} className="w-full py-1.5 bg-white border border-blue-200 text-blue-600 rounded text-xs font-bold hover:bg-blue-50">Launch App</button>
                        </div>

                        {/* Install App */}
                        <div className="border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-all bg-orange-50/20 group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-bold text-orange-700 flex items-center gap-1">Install Pro</span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border">
                                    <Activity size={10} /> {installActivity}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-3">
                                <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> 박민수 (시공중)</div>
                            </div>
                            <button onClick={() => window.open("/install", "_blank")} className="w-full py-1.5 bg-white border border-orange-200 text-orange-600 rounded text-xs font-bold hover:bg-orange-50">Launch App</button>
                        </div>
                    </div>
                </div>

                {/* 2. AI Usage Stats (Real-time Chart) */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={100} /></div>
                    <h3 className="text-sm font-bold text-indigo-300 mb-1 uppercase tracking-wider z-10 relative">AI Agent Usage</h3>
                    <div className="text-3xl font-black mb-4 z-10 relative">315 <span className="text-sm font-medium text-emerald-400">Calls Today</span></div>

                    <div className="h-[120px] w-full z-10 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={aiUsageData}>
                                <Bar dataKey="calls" fill="#6366f1" radius={[2, 2, 0, 0]} opacity={0.8} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#818cf8' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "총 매출액", value: `${(totalRevenue / 10000).toLocaleString()}만원`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
                    { label: "총 수주 건수", value: `${totalOrders}건`, icon: CheckSquare, color: "text-green-600 bg-green-50" },
                    { label: "시공 완료", value: `${completedOrders}건`, icon: Users, color: "text-purple-600 bg-purple-50" },
                    { label: "AS 발생률", value: `${asRate.toFixed(1)}%`, icon: Calendar, color: "text-red-600 bg-red-50" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-white/50 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div className="text-gray-500 text-sm font-medium">{stat.label}</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-white/50 h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">월별 매출 추이</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 10000}만`} />
                            <Tooltip formatter={(val: any) => `${val.toLocaleString()}원`} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Chart */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-white/50 h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">제품군별 비중</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* INTEGRATED AI CHAT WIDGET */}
            <DashboardChatWidget />
        </div>
    );
}
