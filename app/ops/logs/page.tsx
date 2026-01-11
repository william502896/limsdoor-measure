"use client";

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/app/lib/supabaseClient';
import { RefreshCcw, Search } from "lucide-react";

export default function LogsPage() {
    const supabase = createSupabaseBrowser();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
        if (data) setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Audit Logs</h1>
                    <p className="text-slate-400 text-sm">System History (Last 100)</p>
                </div>
                <button onClick={fetchLogs} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                    <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </header>

            <div className="bg-black/50 rounded-xl border border-slate-800 overflow-hidden font-mono text-xs">
                {logs.map((log) => (
                    <div key={log.id} className="border-b border-slate-800 p-3 hover:bg-slate-900/50 flex flex-col md:flex-row gap-2">
                        <span className="text-slate-500 w-40 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
                        <span className="text-indigo-400 font-bold w-40 shrink-0">{log.action}</span>
                        <div className="flex-1 text-slate-300 break-all">
                            <span className="text-slate-500 mr-2">[{log.target_type}:{log.target_id}]</span>
                            {JSON.stringify(log.meta)}
                        </div>
                    </div>
                ))}
                {logs.length === 0 && <div className="p-8 text-center text-slate-600">No logs found.</div>}
            </div>
        </div>
    );
}
