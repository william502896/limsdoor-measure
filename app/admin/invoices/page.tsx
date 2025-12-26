"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { TransactionInvoice } from "@/app/lib/admin/types";
import { Upload, FileText, ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<TransactionInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchInvoices = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("transaction_invoices")
            .select("*, partner:partners(name)")
            .order("created_at", { ascending: false });

        if (data) setInvoices(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleMockUpload = async () => {
        // Simulation of Upload + OCR
        setUploading(true);

        // 1. Simulate OCR Delay
        await new Promise(r => setTimeout(r, 1500));

        // 2. Mock Data
        const mockOcrData = {
            partner_name: "한글라스", // Should match a partner if exists
            items: [
                { name: "5mm 투명 유리", quantity: 10, unit_price: 15000, total: 150000 },
                { name: "8mm 강화 유리", quantity: 5, unit_price: 25000, total: 125000 },
                { name: "시공 부자재", quantity: 1, unit_price: 5000, total: 5000 }
            ]
        };

        // 3. Insert into DB
        const { data, error } = await supabase.from("transaction_invoices").insert([{
            file_url: "https://placehold.co/600x800/png?text=Invoice+Scan",
            status: 'review_needed',
            ocr_raw_data: mockOcrData
        }]).select().single();

        setUploading(false);

        if (error) {
            alert("Upload Failed: " + error.message);
        } else if (data) {
            // Refresh
            fetchInvoices();
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">전자명세서 (OCR Analysis)</h1>
                    <p className="text-sm text-slate-500">거래명세표 자동 분석 및 단가 반영</p>
                </div>
                <button
                    onClick={handleMockUpload}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    {uploading ? "문서 분석 중..." : "명세표 업로드"}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-3">문서 ID</th>
                                <th className="px-6 py-3">거래처 (자동감지)</th>
                                <th className="px-6 py-3">업로드 일시</th>
                                <th className="px-6 py-3">상태</th>
                                <th className="px-6 py-3 text-right">검토</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">명세표 내역이 없습니다.</td></tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/admin/invoices/${inv.id}`)}>
                                        <td className="px-6 py-4 font-mono text-xs">{inv.id.slice(0, 8)}...</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {inv.partner?.name || inv.ocr_raw_data?.partner_name || <span className="text-slate-400 italic">미확인</span>}
                                        </td>
                                        <td className="px-6 py-4">{new Date(inv.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${inv.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                                                    inv.status === 'review_needed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {inv.status === 'approved' ? '승인완료' :
                                                    inv.status === 'review_needed' ? '검토필요' : '처리중'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ArrowRight size={16} className="ml-auto text-slate-400" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
