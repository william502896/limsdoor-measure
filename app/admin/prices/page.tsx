"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { Partner, Item, PriceRule } from "@/app/lib/admin/types";
import { Search, Save, CheckCircle, Archive, AlertCircle, ArrowRight, TrendingUp, DollarSign, LayoutList, Columns, X, Sparkles } from "lucide-react";

export default function PricesPage() {
    const [mode, setMode] = useState<'manage' | 'compare'>('manage');

    // Data
    const [partners, setPartners] = useState<Partner[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [rules, setRules] = useState<PriceRule[]>([]);

    // Selection
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [comparePartnerIds, setComparePartnerIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true);
    const [edits, setEdits] = useState<Record<string, Partial<PriceRule>>>({});

    // --- AI Chat Logic ---
    const [showAiChat, setShowAiChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);

    const toggleAiChat = () => {
        if (!showAiChat && chatMessages.length === 0) {
            setChatMessages([{
                role: 'assistant',
                content: `안녕하세요! 🤖\n업체별 단가 비교나 마진율 분석을 도와드릴까요?\n예: "스윙도어 가장 싼 업체 찾아줘" 또는 "미소테크 마진율 어때?"`
            }]);
        }
        setShowAiChat(!showAiChat);
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || isAiLoading) return;

        const newMessages = [...chatMessages, { role: 'user' as const, content: chatInput }];
        setChatMessages(newMessages);
        setChatInput("");
        setIsAiLoading(true);

        try {
            const res = await fetch('/api/ai/price-expert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages })
            });
            const data = await res.json();

            if (res.ok && data.status === 'ok') {
                setChatMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: `오류 발생: ${data.message || '알 수 없는 오류'}` }]);
            }
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "네트워크 오류가 발생했습니다." }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleChatKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pRes, iRes, rRes] = await Promise.all([
                supabase.from("partners").select("*").eq("status", "active").order("name"),
                supabase.from("items").select("*").order("category").order("name"),
                supabase.from("price_rules").select("*").neq("status", "archived")
            ]);

            if (pRes.data) setPartners(pRes.data);
            if (iRes.data) setItems(iRes.data);
            if (rRes.data) setRules(rRes.data);
        } catch (e) {
            console.error("Error loading price data:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Logic for Manage Mode ---
    const selectedPartner = useMemo(() => partners.find(p => p.id === selectedPartnerId), [partners, selectedPartnerId]);

    const manageGridData = useMemo(() => {
        if (!selectedPartnerId) return [];
        return items.map(item => {
            const rule = rules.find(r => r.partner_id === selectedPartnerId && r.item_id === item.id);
            return { item, rule };
        });
    }, [items, rules, selectedPartnerId]);

    const handleEdit = (itemId: string, field: keyof PriceRule, value: string) => {
        const numVal = Number(value);
        setEdits(prev => {
            const current = prev[itemId] || {};
            // If editing purchase_price, we can auto-calc margin locally later, but let's just save raw values
            return { ...prev, [itemId]: { ...current, [field]: numVal } };
        });
    };

    const saveRule = async (item: Item, currentRule?: PriceRule) => {
        if (!selectedPartnerId) return;
        const changes = edits[item.id];
        if (!changes) return;

        const purchase = changes.purchase_price ?? currentRule?.purchase_price ?? 0;
        const sales = changes.sales_price ?? currentRule?.sales_price ?? 0;
        const margin = sales > 0 ? ((sales - purchase) / sales) * 100 : 0;

        const payload = {
            partner_id: selectedPartnerId,
            item_id: item.id,
            purchase_price: purchase,
            sales_price: sales,
            // local calc for margin just in case DB generated column isn't returned immediately or for optimistic update
            // usually DB triggers update it, but we send it or let DB handle it? 
            // The table has generated column, so we might not be able to insert it directly if it's strictly generated.
            // Actually supabase generated columns are read-only. We should NOT send margin_rate.
            status: 'draft'
        };

        let savedData;
        if (currentRule) {
            const { data, error } = await supabase.from("price_rules").update(payload).eq("id", currentRule.id).select().single();
            if (data) savedData = data;
        } else {
            const { data, error } = await supabase.from("price_rules").insert([payload]).select().single();
            if (data) savedData = data;
        }

        if (savedData) {
            setRules(prev => {
                const existing = prev.findIndex(r => r.id === savedData.id);
                if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = savedData;
                    return next;
                }
                return [...prev, savedData];
            });
            setEdits(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        }
    };

    // --- Logic for Compare Mode ---
    const toggleComparePartner = (id: string) => {
        const next = new Set(comparePartnerIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setComparePartnerIds(next);
    };

    // Filter items that have at least one rule among selected partners? Or show all items?
    // Show all items is better for comparison.
    const comparePartners = useMemo(() => partners.filter(p => comparePartnerIds.has(p.id)), [partners, comparePartnerIds]);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Top Bar: Mode Switcher */}
            <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('manage')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition ${mode === 'manage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutList size={16} /> 업체별 관리
                    </button>
                    <button
                        onClick={() => setMode('compare')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition ${mode === 'compare' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Columns size={16} /> 단가 비교
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleAiChat}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm text-xs font-bold"
                    >
                        <Sparkles size={14} /> AI 단가분석
                    </button>
                    <div className="text-xs text-slate-400">
                        {mode === 'manage' ? '특정 업체의 단가를 수정합니다.' : '여러 업체의 단가를 한눈에 비교합니다.'}
                    </div>
                </div>
            </div>

            {/* AI CHAT WINDOW (Floating) */}
            {showAiChat && (
                <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in slide-in-from-bottom-5 overflow-hidden font-sans">
                    {/* Chat Header */}
                    <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <span>🤖 단가 분석 전문가</span>
                        </div>
                        <button onClick={() => setShowAiChat(false)} className="text-indigo-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-indigo-200">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-500 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="relative flex items-center">
                            <input
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner text-sm"
                                placeholder="단가나 마진율에 대해 물어보세요..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={handleChatKeyPress}
                            />
                            <button
                                onClick={sendChatMessage}
                                disabled={isAiLoading || !chatInput.trim()}
                                className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm"
                            >
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Sidebar */}
                <aside className="w-64 bg-white border rounded-xl flex flex-col overflow-hidden shadow-sm shrink-0">
                    <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">
                        {mode === 'manage' ? '거래처 선택' : '비교할 거래처 (다중)'}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {partners.map(p => (
                            <div key={p.id} className="border-b last:border-0">
                                {mode === 'manage' ? (
                                    <button
                                        onClick={() => setSelectedPartnerId(p.id)}
                                        className={`w-full text-left p-3 text-sm transition ${selectedPartnerId === p.id ? "bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-500" : "hover:bg-slate-50 text-slate-600 border-l-4 border-transparent"}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            {p.name}
                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{p.type}</span>
                                        </div>
                                    </button>
                                ) : (
                                    <label className={`flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-slate-50 transition ${comparePartnerIds.has(p.id) ? "bg-indigo-50" : ""}`}>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-indigo-600 rounded"
                                            checked={comparePartnerIds.has(p.id)}
                                            onChange={() => toggleComparePartner(p.id)}
                                        />
                                        <div className="flex-1 font-medium text-slate-700">{p.name}</div>
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-white border rounded-xl flex flex-col overflow-hidden shadow-sm">
                    {mode === 'manage' ? (
                        // MANAGE MODE UI
                        !selectedPartnerId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Search size={48} className="mb-4 opacity-20" />
                                <p>거래처를 선택하여 단가를 관리하세요.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                                    <div>
                                        <h2 className="font-bold text-lg text-slate-800">{selectedPartner?.name} <span className="text-slate-500 font-normal">단가표</span></h2>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <AlertCircle size={12} /> 값 입력 후 '저장' 버튼을 눌러주세요.
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 w-1/3">품목</th>
                                                <th className="px-4 py-3 w-1/6 text-right text-blue-800 bg-blue-50/50">매입가 (Cost)</th>
                                                <th className="px-4 py-3 w-1/6 text-right text-green-800 bg-green-50/50">판매가 (Price)</th>
                                                <th className="px-4 py-3 w-1/6 text-center">마진율</th>
                                                <th className="px-4 py-3 w-1/6 text-center">저장</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {manageGridData.map(({ item, rule }) => {
                                                const edit = edits[item.id] || {};
                                                const pPrice = edit.purchase_price ?? rule?.purchase_price ?? 0;
                                                const sPrice = edit.sales_price ?? rule?.sales_price ?? 0;
                                                // Calculate margin dynamically for display
                                                const margin = sPrice > 0 ? ((sPrice - pPrice) / sPrice) * 100 : 0;
                                                const isModified = edits[item.id] !== undefined;

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50 group">
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-slate-800">{item.name}</div>
                                                            <div className="text-xs text-slate-400">{item.category} / {item.unit}</div>
                                                        </td>
                                                        <td className="px-4 py-3 bg-blue-50/20">
                                                            <input
                                                                type="number"
                                                                className="w-full text-right bg-transparent outline-none border-b border-transparent focus:border-blue-500 font-mono transition"
                                                                value={pPrice || ''}
                                                                onChange={e => handleEdit(item.id, 'purchase_price', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 bg-green-50/20">
                                                            <input
                                                                type="number"
                                                                className="w-full text-right bg-transparent outline-none border-b border-transparent focus:border-green-500 font-mono transition font-bold"
                                                                value={sPrice || ''}
                                                                onChange={e => handleEdit(item.id, 'sales_price', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`font-mono font-bold ${margin < 15 ? 'text-red-500' : 'text-slate-600'}`}>
                                                                {margin.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {isModified && (
                                                                <button onClick={() => saveRule(item, rule)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition shadow-sm animate-pulse">
                                                                    저장
                                                                </button>
                                                            )}
                                                            {!isModified && rule?.status && (
                                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border">
                                                                    {rule.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        // COMPARE MODE UI
                        comparePartnerIds.size === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Columns size={48} className="mb-4 opacity-20" />
                                <p>비교할 거래처를 왼쪽에서 선택해주세요. (2개 이상 권장)</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                                    <h2 className="font-bold text-lg text-slate-800">단가 비교 분석</h2>
                                    <div className="flex gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div> 매입가</div>
                                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div> 판매가</div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 border-r bg-slate-100 min-w-[200px] sticky left-0 z-20 shadow-[1px_0_5px_rgba(0,0,0,0.05)]">품목</th>
                                                {comparePartners.map(p => (
                                                    <th key={p.id} className="px-4 py-3 text-center border-r min-w-[140px]">
                                                        <div className="text-slate-800">{p.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-normal">{p.type}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {items.map(item => {
                                                // Find rules for each partner
                                                const pRules = comparePartners.map(p => rules.find(r => r.partner_id === p.id && r.item_id === item.id));
                                                // Find min/max for highlighting? (Optional)
                                                // const prices = pRules.map(r => r?.purchase_price || 999999999);
                                                // const minPrice = Math.min(...prices);

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 border-r font-bold text-slate-700 bg-white sticky left-0 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                                                            {item.name}
                                                            <div className="text-[10px] text-slate-400 font-normal">{item.category} / {item.unit}</div>
                                                        </td>
                                                        {pRules.map((rule, idx) => (
                                                            <td key={comparePartners[idx].id} className="px-4 py-3 text-right border-r font-mono">
                                                                {rule ? (
                                                                    <div className="space-y-1">
                                                                        <div className="text-blue-600 bg-blue-50 px-2 rounded">{Number(rule.purchase_price).toLocaleString()}</div>
                                                                        <div className="text-green-600 bg-green-50 px-2 rounded font-bold">{Number(rule.sales_price).toLocaleString()}</div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs">-</span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    );
}
