"use client";

import React, { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { AlertCircle, CheckCircle, Copy, UploadCloud } from "lucide-react";
import PricingPayload from "@/app/lib/misotech-pricing-full.json";

export default function PricingImportPage() {
    const [payloadStr, setPayloadStr] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; msg: string; summary?: any } | null>(null);

    const handleImport = async () => {
        try {
            setLoading(true);
            setStatus(null);

            let payload;
            try {
                payload = JSON.parse(payloadStr);
            } catch (e) {
                throw new Error("Invalid JSON format");
            }

            // Get Company ID (assuming single company or current user company)
            // For now, hardcode or fetch. Let's fetch current user and use their company_id if available,
            // or ask user to input it. The prompt assumes "YOUR_COMPANY_UUID".
            // I will default to a known ID or fetch from DB if possible.
            // Actually, usually admin page implies logged in user context.
            // I'll grab the first partner or company ID found in DB for demo, or prompt user.
            // Better: use a default placeholder if none found.
            const supabase = createSupabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();
            // In this app 'partners' table acts as companies? Or just use a fixed ID for the 'Misotech' company.
            // I'll try to find a company_id from `price_products` if exists, or generate one.
            const company_id = "00000000-0000-0000-0000-000000000000"; // Fixed for now as per seed script

            const res = await fetch("/api/pricing/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ company_id, payload, mode: "upsert" })
            });

            const match = await res.json();
            if (!res.ok) throw new Error(match.error || "Import failed");

            setStatus({ ok: true, msg: "Import Successful", summary: match.summary });
        } catch (e: any) {
            setStatus({ ok: false, msg: e.message });
        } finally {
            setLoading(false);
        }
    };

    const copyExample = () => {
        setPayloadStr(JSON.stringify(PricingPayload, null, 2));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <header className="max-w-4xl mx-auto mb-8">
                <h1 className="text-3xl font-bold mb-2 text-slate-900">단가 데이터 일괄 업로드</h1>
                <p className="text-slate-500">JSON 포맷의 단가 데이터를 붙여넣어 완제품/옵션 단가를 일괄 등록/수정합니다.</p>
            </header>

            <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

                {/* Status Box */}
                {status && (
                    <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${status.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                        {status.ok ? <CheckCircle className="shrink-0 mt-0.5" /> : <AlertCircle className="shrink-0 mt-0.5" />}
                        <div>
                            <h3 className="font-bold">{status.ok ? "성공" : "오류 발생"}</h3>
                            <p className="text-sm mt-1 mb-2">{status.msg}</p>
                            {status.summary && (
                                <ul className="text-xs list-disc ml-4 space-y-1 opacity-80">
                                    <li>Products: {status.summary.products}</li>
                                    <li>Variants: {status.summary.variants}</li>
                                    <li>Size Prices: {status.summary.size_prices}</li>
                                    <li>Addons: {status.summary.addons}</li>
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-2">
                    <label className="font-bold text-slate-700">Payload JSON</label>
                    <button onClick={copyExample} className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                        <Copy size={16} /> 예제(Full) 붙여넣기
                    </button>
                </div>

                <textarea
                    value={payloadStr}
                    onChange={e => setPayloadStr(e.target.value)}
                    className="w-full h-[500px] p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl focus:outline-none resize-none mb-6"
                    placeholder='{"products": [...], "price_addons": [...]}'
                />

                <div className="flex justify-end">
                    <button
                        onClick={handleImport}
                        disabled={loading || !payloadStr.trim()}
                        className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all
                            ${loading || !payloadStr.trim() ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-indigo-200"}`}
                    >
                        {loading ? "처리 중..." : <><UploadCloud /> 업로드 실행</>}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 text-slate-400 text-xs">
                    <p className="mb-2 font-bold text-slate-500">⛔ 주의사항:</p>
                    <ul className="list-disc ml-5 space-y-1">
                        <li>"시공", "넉다운" 관련 키워드가 포함되면 보안 정책상 업로드가 거부됩니다.</li>
                        <li>기존 데이터가 존재하면 덮어쓰기(Upsert) 됩니다.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
