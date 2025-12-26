"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { TransactionInvoice, Item, Partner } from "@/app/lib/admin/types";
import { ArrowLeft, Check, AlertTriangle, Save, RefreshCw, ArrowRight } from "lucide-react";

export default function InvoiceDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<TransactionInvoice | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);

    // Mapping State: index -> itemId
    const [mapping, setMapping] = useState<Record<number, string>>({});
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        const iRes = await supabase.from("transaction_invoices").select("*").eq("id", id).single();
        const pRes = await supabase.from("partners").select("*").eq("status", "active");
        const itRes = await supabase.from("items").select("*");

        if (iRes.data) {
            setInvoice(iRes.data);
            // Auto mapping
            const raw = iRes.data.ocr_raw_data;
            if (raw) {
                // Try to find partner
                if (pRes.data) {
                    const foundP = pRes.data.find((p: Partner) => raw.partner_name?.includes(p.name));
                    if (foundP) setSelectedPartnerId(foundP.id);
                }
            }
        }
        if (pRes.data) setPartners(pRes.data);
        if (itRes.data) setItems(itRes.data);
    };

    const parsedItems = useMemo(() => {
        return invoice?.ocr_raw_data?.items || [];
    }, [invoice]);

    const handleApprove = async () => {
        if (!invoice || !selectedPartnerId) return alert("거래처를 확정해야 합니다.");

        // 1. Create Price Rules (Draft)
        const rulesToInsert = parsedItems.map((pi: any, idx: number) => {
            const itemId = mapping[idx];
            if (!itemId) return null;
            return {
                partner_id: selectedPartnerId,
                item_id: itemId,
                purchase_price: pi.unit_price,
                sales_price: 0, // Needs manual entry later? Or keep existing?
                margin_rate: 0,
                status: 'draft'
            };
        }).filter(Boolean);

        if (rulesToInsert.length > 0) {
            const { error } = await supabase.from("price_rules").insert(rulesToInsert);
            if (error) {
                alert("Error creating rules: " + error.message);
                return;
            }
        }

        // 2. Update Invoice Status
        await supabase.from("transaction_invoices")
            .update({ status: 'approved', partner_id: selectedPartnerId })
            .eq("id", invoice.id);

        alert("승인 완료! 단가표에 초안이 생성되었습니다.");
        router.push("/admin/prices");
    };

    if (!invoice) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">명세서 검토 ({invoice.ocr_raw_data?.partner_name})</h1>
                        <p className="text-xs text-slate-500">ID: {invoice.id.slice(0, 8)}</p>
                    </div>
                </div>
                {invoice.status !== 'approved' && (
                    <button
                        onClick={handleApprove}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Check size={18} />
                        승인 및 단가 반영
                    </button>
                )}
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left: Document View */}
                <div className="flex-1 bg-slate-100 rounded-xl border flex items-center justify-center overflow-hidden relative">
                    {invoice.file_url ? (
                        <img src={invoice.file_url} className="max-w-full max-h-full object-contain shadow-lg" />
                    ) : (
                        <div className="text-slate-400">이미지 없음</div>
                    )}
                </div>

                {/* Right: Data Form */}
                <div className="w-[500px] bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b">
                        <label className="block text-xs font-bold text-slate-500 mb-1">거래처 매칭</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedPartnerId}
                            onChange={(e) => setSelectedPartnerId(e.target.value)}
                        >
                            <option value="">-- 거래처 선택 --</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <h3 className="font-bold text-sm text-indigo-700 mb-2 border-b pb-2">인식된 품목 ({parsedItems.length})</h3>
                        {parsedItems.map((item: any, idx: number) => {
                            const isMapped = !!mapping[idx];
                            return (
                                <div key={idx} className={`p-3 rounded-lg border text-sm ${isMapped ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold">{item.name}</span>
                                        <span className="font-mono">{item.unit_price?.toLocaleString()}원</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <ArrowRight size={14} className="text-slate-400" />
                                        <select
                                            className="flex-1 p-1.5 border rounded text-xs bg-white"
                                            value={mapping[idx] || ""}
                                            onChange={e => setMapping(prev => ({ ...prev, [idx]: e.target.value }))}
                                        >
                                            <option value="">(품목 매핑 선택)</option>
                                            {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
