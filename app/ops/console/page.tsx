"use client";

import React, { useEffect, useState } from 'react';
import { RefreshCcw, Power, AlertTriangle, Activity, Users, Store } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function ConsolePage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/ops/overview');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            } else {
                const text = await res.text();
                setError(`API Error: ${res.status} - ${text}`);
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const toggleGlobalStop = async () => {
        if (!stats) return;
        const newState = !stats.kpi.globalStop;
        const msg = newState ? "⚠️ EMERGENCY: 전 시스템을 중지하시겠습니까?" : "✅ 시스템을 다시 가동하시겠습니까?";
        if (!confirm(msg)) return;

        const reason = prompt("변경 사유를 입력하세요 (필수):");
        if (!reason) return;

        await fetch('/api/ops/flags', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scope: "GLOBAL", key: "APP_GLOBAL_STOP", enabled: newState, reason })
        });
        fetchStats();
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (error) return (
        <div className="p-8 text-center">
            <div className="text-red-500 font-bold mb-4">{error}</div>
            <button
                onClick={fetchStats}
                className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 text-white transition"
            >
                Retry
            </button>
        </div>
    );

    if (!stats) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Ops Console...</div>;

    const { kpi, logs } = stats;

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">System Overview</h1>
                    <p className="text-slate-400 text-sm">Platform Health & Global Controls</p>
                </div>
                <button onClick={fetchStats} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition">
                    <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </header>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard label="Total Companies" value={kpi.totalCompanies} icon={<Store size={20} />} color="text-slate-200" />
                <KPICard label="Active" value={kpi.activeCompanies} icon={<Activity size={20} />} color="text-emerald-400" />
                <KPICard label="Suspended" value={kpi.suspendedCompanies} icon={<AlertTriangle size={20} />} color="text-amber-400" />

                {/* GLOBAL STOP */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between h-32 transition-all cursor-pointer
                    ${kpi.globalStop
                        ? "bg-red-900/20 border-red-500/50 hover:bg-red-900/30"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}
                    onClick={toggleGlobalStop}
                >
                    <div className="flex justify-between items-start">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">GLOBAL STOP</span>
                        <Power size={20} className={kpi.globalStop ? "text-red-500" : "text-slate-600"} />
                    </div>
                    <div>
                        <div className={`text-2xl font-black ${kpi.globalStop ? "text-red-500" : "text-slate-500"}`}>
                            {kpi.globalStop ? "ON" : "OFF"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                            {kpi.globalStop ? "System Halted" : "System Running"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Logs (Mini) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    {logs.map((log: any) => (
                        <div key={log.id} className="p-4 border-b border-slate-800 flex items-center justify-between text-sm last:border-0 hover:bg-slate-800/50 transition">
                            <div className="flex items-center gap-4">
                                <span className="text-slate-500 font-mono text-xs">{new Date(log.created_at).toLocaleTimeString()}</span>
                                <span className="text-indigo-400 font-bold">{log.action}</span>
                                <span className="text-slate-300 truncate max-w-[200px]">{log.target_type} : {log.target_id || '-'}</span>
                            </div>
                            <div className="text-slate-600 text-xs">
                                {log.meta?.reason || JSON.stringify(log.meta)}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="p-4 text-center text-slate-600">No logs yet.</div>}
                </div>
            </div>
        </div>
    );
}

function KPICard({ label, value, icon, color }: any) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between h-32 hover:border-slate-700 transition">
            <div className="flex justify-between items-start">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
                <span className={color}>{icon}</span>
            </div>
            <div className={`text-3xl font-black ${color}`}>{value}</div>
        </div>
    );
}
