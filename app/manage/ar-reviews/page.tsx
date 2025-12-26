"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Search, Filter, Ruler } from "lucide-react";
import { useGlobalStore } from "@/app/lib/store-context";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";

export default function ArReviewsPage() {
    const router = useRouter();
    const { orders, updateOrder } = useGlobalStore();

    // Filter Logic
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "REVIEW_NEEDED" | "APPROVED">("ALL");

    // Get Orders that have AR Data
    const reviewOrders = orders
        .filter(o => o.arData)
        .filter(o => {
            if (filter === "ALL") return true;
            return o.arData?.status === filter;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleApprove = (orderId: string) => {
        if (!confirm("현장 실측값을 최종 기준으로 승인하시겠습니까?")) return;
        updateOrder(orderId, {
            arData: {
                ...orders.find(o => o.id === orderId)?.arData!,
                status: "APPROVED"
            },
            status: "CONTRACT_CONFIRMED" // Move to next stage
        });
        alert("승인되었습니다.");
    };

    const handleReject = (orderId: string) => {
        const reason = prompt("반려 사유를 입력하세요 (재실측 요청):");
        if (!reason) return;

        updateOrder(orderId, {
            arData: {
                ...orders.find(o => o.id === orderId)?.arData!,
                status: "REJECTED"
            },
            // status: "MEASURE_REQUESTED" // Revert to measure request?
        });
        alert("반려 처리되었습니다.");
    };

    return (
        <ManageLayout>
            <div className="p-6 max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">AR 시공 승인 (Admin)</h1>
                        <p className="text-slate-500 text-sm">소비자 AR 기준값과 현장 실측값의 오차를 검증하고 승인합니다.</p>
                    </div>

                    {/* Filters */}
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        {(["ALL", "PENDING", "REVIEW_NEEDED", "APPROVED"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === f ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                {f === "REVIEW_NEEDED" ? "⚠️ 검토 필요" : f}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Dashboard Grid */}
                <div className="grid gap-6">
                    {reviewOrders.length === 0 && (
                        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                            검토할 내용이 없습니다.
                        </div>
                    )}

                    {reviewOrders.map(order => {
                        const ar = order.arData!;
                        const consumer = ar.consumer;
                        const field = ar.field;

                        if (!field) return null; // Should not happen if strictly managed, but safety check

                        const isRisk = ar.status === "REVIEW_NEEDED";
                        const isApproved = ar.status === "APPROVED";

                        return (
                            <div key={order.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isRisk ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"}`}>
                                {/* Header Bar */}
                                <div className={`px-6 py-3 flex justify-between items-center ${isRisk ? "bg-red-50" : isApproved ? "bg-green-50" : "bg-slate-50"}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-slate-500">{order.id}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isRisk ? "bg-red-200 text-red-700" : isApproved ? "bg-green-200 text-green-700" : "bg-indigo-100 text-indigo-700"}`}>
                                            {ar.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        실측자: {field.measurerName} ({new Date(field.measuredAt).toLocaleDateString()})
                                    </div>
                                </div>

                                {/* Comparison Body */}
                                <div className="p-6 grid md:grid-cols-2 gap-8">
                                    {/* Left: Consumer */}
                                    <div className="opacity-70">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Consumer AR (기준)</h4>
                                        <div className="bg-slate-50 p-4 rounded-lg border">
                                            <div className="flex justify-between mb-1">
                                                <span>가로</span>
                                                <span className="font-mono font-bold">{consumer.width}mm</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>세로</span>
                                                <span className="font-mono font-bold">{consumer.height}mm</span>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-400 pt-2 border-t">
                                                {consumer.doorType} / {consumer.frameColor}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Field Data */}
                                    <div>
                                        <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2">현장 실측값</h4>
                                        <div className={`p-4 rounded-lg border relative ${isRisk ? "bg-red-50 border-red-200" : "bg-white border-indigo-200"}`}>
                                            <div className="flex justify-between mb-1 items-center">
                                                <span>가로</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-lg">{field.width}mm</span>
                                                    {field.diffW !== 0 && <span className={`text-xs px-1.5 py-0.5 rounded ${Math.abs(field.diffW) >= 5 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>{field.diffW > 0 ? "+" : ""}{field.diffW}</span>}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>세로</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-lg">{field.height}mm</span>
                                                    {field.diffH !== 0 && <span className={`text-xs px-1.5 py-0.5 rounded ${Math.abs(field.diffH) >= 5 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>{field.diffH > 0 ? "+" : ""}{field.diffH}</span>}
                                                </div>
                                            </div>

                                            {/* Note */}
                                            {field.memo && (
                                                <div className="mt-3 text-sm text-slate-600 bg-white/50 p-2 rounded italic">
                                                    " {field.memo} "
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {!isApproved && (
                                    <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50/50">
                                        <button
                                            onClick={() => handleReject(order.id)}
                                            className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold flex items-center gap-2"
                                        >
                                            <XCircle size={16} />
                                            반려 / 재실측
                                        </button>
                                        <button
                                            onClick={() => handleApprove(order.id)}
                                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold flex items-center gap-2 shadow-sm"
                                        >
                                            <CheckCircle size={16} />
                                            현장값으로 최종 승인
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </ManageLayout>
    );
}
