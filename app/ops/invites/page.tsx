"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Power, RefreshCcw, UserPlus } from "lucide-react";

export default function InvitesPage() {
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form
    const [note, setNote] = useState("");
    const [code, setCode] = useState("");
    const [maxUses, setMaxUses] = useState(1);

    const fetchInvites = async () => {
        setLoading(true);
        const res = await fetch('/api/ops/invites');
        if (res.ok) setInvites(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchInvites();
    }, []);

    const createInvite = async () => {
        if (!maxUses) return;
        await fetch('/api/ops/invites', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, note, max_uses: maxUses })
        });
        setNote(""); setCode(""); setMaxUses(1);
        fetchInvites();
    };

    const toggleActive = async (id: string, current: boolean) => {
        await fetch(`/api/ops/invites/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !current })
        });
        fetchInvites();
    };

    const deleteInvite = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        await fetch(`/api/ops/invites/${id}`, { method: "DELETE" });
        fetchInvites();
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Invite Codes</h1>
                    <p className="text-slate-400 text-sm">Manage Access & Distribution</p>
                </div>
            </header>

            {/* CREATE CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Plus size={18} className="text-indigo-500" /> Create New Invite</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold ml-1">CODE (Optional)</label>
                        <input
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                            placeholder="Auto-generate"
                            className="w-full h-12 bg-black/30 border border-slate-700 rounded-xl px-4 text-white focus:border-indigo-500 outline-none font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold ml-1">MAX USES</label>
                        <input
                            type="number"
                            value={maxUses}
                            onChange={e => setMaxUses(Number(e.target.value))}
                            className="w-full h-12 bg-black/30 border border-slate-700 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2 flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs text-slate-500 font-bold ml-1">NOTE</label>
                            <input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. VIP Partner"
                                className="w-full h-12 bg-black/30 border border-slate-700 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={createInvite}
                            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center gap-2 mt-auto shrink-0"
                        >
                            <Plus size={18} /> CREATE
                        </button>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="space-y-4">
                {invites.map(inv => (
                    <div key={inv.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${inv.is_active ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500"}`}>
                                {inv.is_active ? <UserPlus size={18} /> : <Ban size={18} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xl font-mono font-bold ${inv.is_active ? "text-white" : "text-slate-500 line-through"}`}>{inv.code}</span>
                                    {inv.note && <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{inv.note}</span>}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Used: <strong className="text-slate-300">{inv.used_count}</strong> / {inv.max_uses}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => toggleActive(inv.id, inv.is_active)}
                                className={`p-2 rounded-lg transition ${inv.is_active ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-slate-600 hover:text-white"}`}
                                title="Toggle Active"
                            >
                                <Power size={20} />
                            </button>
                            <button
                                onClick={() => deleteInvite(inv.id)}
                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-500 transition"
                                title="Delete"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Ban({ size }: any) { return <span style={{ fontSize: size }}>🚫</span> }
