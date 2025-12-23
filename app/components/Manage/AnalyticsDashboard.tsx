"use client";

import React from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Calendar, CheckSquare, Share2, Activity, Link as LinkIcon, ExternalLink } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

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

    return (
        <div className="space-y-6">
            {/* Module Launcher / Controls */}
            {/* Module Launcher / Controls */}
            <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-sm border border-indigo-100 mb-6 transition-all hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs">🚀</span>
                    앱 제어 및 모니터링 (App Control)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Shop App */}
                    <div className="border border-gray-200 rounded-xl p-4 hover:border-pink-300 transition-all bg-pink-50/30 group">
                        <div className="flex justify-between items-start mb-3">
                            <span className="font-bold text-pink-700 flex items-center gap-1">Consumer Shop <ExternalLink size={12} /></span>
                            <div className="flex flex-col items-end">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live
                                </span>
                                <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                    <Activity size={10} /> {shopActivity}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 h-10">고객용 AR 견적 및 상담 앱</p>
                        <div className="flex gap-2">
                            <button onClick={() => window.open("/shop", "_blank")} className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-sm font-bold hover:bg-pink-50 text-gray-700 hover:text-pink-600 transition-colors">앱 실행</button>
                            <button onClick={() => copyLink("/shop")} className="px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500" title="링크 복사"><Share2 size={16} /></button>
                        </div>
                    </div>

                    {/* Field App */}
                    <div className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all bg-blue-50/30 group">
                        <div className="flex justify-between items-start mb-3">
                            <span className="font-bold text-blue-700 flex items-center gap-1">Field Partner <ExternalLink size={12} /></span>
                            <div className="flex flex-col items-end">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Active
                                </span>
                                <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                    <Activity size={10} /> {fieldActivity}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 h-10">실측 기사용 현장 코칭 앱</p>
                        <div className="flex gap-2">
                            <button onClick={() => window.open("/field/new", "_blank")} className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors">앱 실행</button>
                            <button onClick={() => copyLink("/field/new")} className="px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500" title="링크 복사"><Share2 size={16} /></button>
                        </div>
                    </div>

                    {/* Install App */}
                    <div className="border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-all bg-orange-50/30 group">
                        <div className="flex justify-between items-start mb-3">
                            <span className="font-bold text-orange-700 flex items-center gap-1">Install Pro <ExternalLink size={12} /></span>
                            <div className="flex flex-col items-end">
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span> On Site
                                </span>
                                <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                    <Activity size={10} /> {installActivity}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 h-10">시공 기사용 일정/마감 앱</p>
                        <div className="flex gap-2">
                            <button onClick={() => window.open("/install", "_blank")} className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-sm font-bold hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors">앱 실행</button>
                            <button onClick={() => copyLink("/install")} className="px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500" title="링크 복사"><Share2 size={16} /></button>
                        </div>
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
        </div>
    );
}
