"use client";

import React, { useEffect, useState } from 'react';
import { Ban, CheckCircle, RefreshCcw, Search, MoreVertical } from "lucide-react";

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const fetchCompanies = async () => {
        setLoading(true);
        const res = await fetch('/api/ops/companies');
        if (res.ok) {
            setCompanies(await res.json());
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const toggleStatus = async (id: string, currentStatus: string, name: string) => {
        const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        const msg = newStatus === 'SUSPENDED'
            ? `🛑 경고: [${name}] 업체의 서비스를 중지하시겠습니까?`
            : `✅ [${name}] 업체의 서비스를 재개하시겠습니까?`;

        if (!confirm(msg)) return;

        const reason = prompt("변경 사유를 입력하세요 (필수):");
        if (!reason) return;

        await fetch("/api/ops/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company_id: id, action: newStatus === 'SUSPENDED' ? 'SUSPEND' : 'RESUME', reason })
        });
        fetchCompanies();
    };

    const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Company Management</h1>
                    <p className="text-slate-400 text-sm">Monitor & Control Tenants</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-indigo-500 outline-none text-sm"
                            placeholder="Search..."
                        />
                    </div>
                    <button onClick={fetchCompanies} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            <div className="grid gap-4">
                {filtered.map(company => (
                    <div key={company.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                {company.status === 'SUSPENDED' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                        <Ban size={10} /> SUSPENDED
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                        <CheckCircle size={10} /> ACTIVE
                                    </span>
                                )}
                                <span className="text-slate-500 text-xs font-mono">{company.id.substring(0, 8)}...</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">{company.name}</h3>
                            <div className="text-slate-400 text-xs mt-1">
                                Members: {company.company_members?.[0]?.count || 0} | Created: {new Date(company.created_at).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                                onClick={() => toggleStatus(company.id, company.status, company.name)}
                                className={`h-[44px] px-6 rounded-xl font-bold text-sm transition border flex items-center gap-2
                                    ${company.status === 'SUSPENDED'
                                        ? "bg-emerald-600/10 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600 hover:text-white"
                                        : "bg-red-600/10 text-red-400 border-red-600/30 hover:bg-red-600 hover:text-white"
                                    }`}
                            >
                                {company.status === 'SUSPENDED' ? "RESUME SERVICE" : "SUSPEND SERVICE"}
                            </button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-slate-600 border border-slate-800 border-dashed rounded-xl">
                        No companies found.
                    </div>
                )}
            </div>
        </div>
    );
}
