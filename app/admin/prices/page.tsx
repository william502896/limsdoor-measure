"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { Partner, Item, PriceRule } from "@/app/lib/admin/types";
import { Search, Save, CheckCircle, Archive, AlertCircle, ArrowRight } from "lucide-react";

export default function PricesPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [rules, setRules] = useState<PriceRule[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Editing State (Temporary changes before save)
    const [edits, setEdits] = useState<Record<string, Partial<PriceRule>>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [pRes, iRes, rRes] = await Promise.all([
            supabase.from("partners").select("*").eq("status", "active").order("name"),
            supabase.from("items").select("*").order("category").order("name"),
            supabase.from("price_rules").select("*").neq("status", "archived") // Load draft & confirmed
        ]);

        if (pRes.data) setPartners(pRes.data);
        if (iRes.data) setItems(iRes.data);
        if (rRes.data) setRules(rRes.data);
        setLoading(false);
    };

    const selectedPartner = useMemo(() => partners.find(p => p.id === selectedPartnerId), [partners, selectedPartnerId]);

    // Merge Items with their Rules for the selected partner
    const gridData = useMemo(() => {
        if (!selectedPartnerId) return [];
        return items.map(item => {
            const rule = rules.find(r => r.partner_id === selectedPartnerId && r.item_id === item.id);
            return { item, rule };
        });
    }, [items, rules, selectedPartnerId]);

    // Handle Input Change
    const handleEdit = (itemId: string, field: 'purchase_price' | 'sales_price', value: string) => {
        const numVal = Number(value);
        setEdits(prev => {
            const currentEdit = prev[itemId] || {};
            const itemRow = gridData.find(d => d.item.id === itemId);
            const baseRule = itemRow?.rule || {};

            const newEdit = { ...currentEdit, [field]: numVal };

            // Calc Margin?
            // If we have both prices, we can calc margin.
            // But let's just store the raw values first.
            return { ...prev, [itemId]: newEdit };
        });
    };

    const getDisplayValue = (itemId: string, field: 'purchase_price' | 'sales_price', fallback: number) => {
        if (edits[itemId] && edits[itemId][field] !== undefined) return edits[itemId][field];
        return fallback || 0;
    };

    const calculateMargin = (purchase: number, sales: number) => {
        if (!sales) return 0;
        return ((sales - purchase) / sales) * 100;
    };

    const saveRule = async (item: Item, currentRule?: PriceRule) => {
        if (!selectedPartnerId) return;
        const changes = edits[item.id];
        if (!changes) return; // No changes

        const purchase = changes.purchase_price ?? currentRule?.purchase_price ?? 0;
        const sales = changes.sales_price ?? currentRule?.sales_price ?? 0;
        const margin = calculateMargin(purchase, sales);

        const payload = {
            partner_id: selectedPartnerId,
            item_id: item.id,
            purchase_price: purchase,
            sales_price: sales,
            margin_rate: parseFloat(margin.toFixed(2)),
            status: 'draft' // Always save as draft first? Or keep current status? Let's say modify -> Draft.
        };

        if (currentRule) {
            // Update existing
            await supabase.from("price_rules").update({ ...payload, status: 'draft' }).eq("id", currentRule.id);
        } else {
            // Insert new
            await supabase.from("price_rules").insert([payload]);
        }

        // Reload
        const { data } = await supabase.from("price_rules").select("*").neq("status", "archived");
        if (data) setRules(data);
        setEdits(prev => {
            const next = { ...prev };
            delete next[item.id];
            return next;
        });
    };

    const confirmRule = async (ruleId: string) => {
        await supabase.from("price_rules").update({ status: 'confirmed', start_date: new Date().toISOString() }).eq("id", ruleId);
        // Reload
        const { data } = await supabase.from("price_rules").select("*").neq("status", "archived");
        if (data) setRules(data);
    }

    const handlePublish = async () => {
        const confirmedCount = rules.filter(r => r.status === 'confirmed').length;
        if (confirmedCount === 0) return alert("배포할 확정 단가가 없습니다.");

        const versionName = `v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${new Date().getHours()}`;
        if (!confirm(`${versionName} 버전으로 단가를 배포하시겠습니까?\n총 ${confirmedCount}건의 단가가 현장 앱에 적용됩니다.`)) return;

        const { error } = await supabase.from("price_releases").insert([{
            version_name: versionName,
            release_notes: "Regular update",
            released_by: null // Auth user id needed in real app
        }]);

        if (error) alert("배포 실패: " + error.message);
        else alert("성공적으로 배포되었습니다. 이제 현장 앱에서 최신 단가가 적용됩니다.");
    };

    return (
        <div className="h-full flex gap-4">
            {/* Sidebar (Partners) */}
            <aside className="w-64 bg-white border rounded-xl flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                    <span>거래처 선택</span>
                    <button onClick={handlePublish} className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded hover:bg-black">
                        🚀 배포
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {partners.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPartnerId(p.id)}
                            className={`w-full text-left p-3 text-sm border-b transition ${selectedPartnerId === p.id ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-600"}`}
                        >
                            {p.name}
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.type}</div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Grid */}
            <main className="flex-1 bg-white border rounded-xl flex flex-col overflow-hidden shadow-sm">
                {!selectedPartnerId ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        ◀ 거래처를 선택하여 단가를 관리하세요.
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-lg text-slate-800">{selectedPartner?.name} 단가표</h2>
                                <p className="text-xs text-slate-500">매입/매출 단가 및 마진율 관리</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                    <AlertCircle size={12} /> 수정 시 '초안(Draft)' 상태로 저장됩니다.
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0 z-10 border-b">
                                    <tr>
                                        <th className="px-4 py-3">품목 (단위)</th>
                                        <th className="px-4 py-3 bg-blue-50/50 text-blue-800">매입단가 (Cost)</th>
                                        <th className="px-4 py-3 bg-green-50/50 text-green-800">판매단가 (Price)</th>
                                        <th className="px-4 py-3 text-center">마진율</th>
                                        <th className="px-4 py-3 text-center">상태</th>
                                        <th className="px-4 py-3 text-center">동작</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {gridData.map(({ item, rule }) => {
                                        const pPrice = getDisplayValue(item.id, 'purchase_price', rule?.purchase_price || 0);
                                        const sPrice = getDisplayValue(item.id, 'sales_price', rule?.sales_price || 0);
                                        const margin = calculateMargin(Number(pPrice), Number(sPrice));
                                        const isEdited = edits[item.id] !== undefined;

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 group">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-800">{item.name}</div>
                                                    <div className="text-xs text-slate-400">{item.category} / {item.unit}</div>
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/30">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-right font-mono"
                                                        value={pPrice || ''}
                                                        onChange={e => handleEdit(item.id, 'purchase_price', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 bg-green-50/30">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-green-500 text-right font-mono font-bold"
                                                        value={sPrice || ''}
                                                        onChange={e => handleEdit(item.id, 'sales_price', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono">
                                                    <span className={`${margin < 15 ? 'text-red-500' : 'text-slate-600'}`}>
                                                        {margin.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {rule ? (
                                                        <span className={`text-xs px-2 py-1 rounded-full border ${rule.status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            'bg-amber-100 text-amber-700 border-amber-200'
                                                            }`}>
                                                            {rule.status === 'confirmed' ? '확정' : '초안'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isEdited ? (
                                                        <button onClick={() => saveRule(item, rule)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs flex items-center gap-1 mx-auto">
                                                            <Save size={14} /> 저장
                                                        </button>
                                                    ) : (
                                                        rule && rule.status === 'draft' && (
                                                            <button onClick={() => confirmRule(rule.id)} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1 mx-auto">
                                                                <CheckCircle size={14} /> 확정
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
