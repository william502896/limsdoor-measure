"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Package, Truck, Calendar, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export default function PurchaseOrderListPage() {
    const router = useRouter();
    const supabase = createSupabaseBrowser();

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, ORDERED, EXPECTED, COMPLETED

    const fetchOrders = async () => {
        setLoading(true);
        let query = supabase
            .from("sc_purchase_orders")
            .select("*, partners(name), sc_schedules(title, crm_customers(name))")
            .order("created_at", { ascending: false });

        if (filterStatus !== "ALL") {
            if (filterStatus === 'EXPECTED') {
                query = query.eq('status', 'ARRIVAL_EXPECTED');
            } else if (filterStatus === 'COMPLETED') {
                query = query.eq('status', 'COMPLETED');
            } else {
                query = query.eq('status', filterStatus);
            }
        }

        const { data, error } = await query;
        if (error) console.error(error);
        setOrders(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, [filterStatus]);

    const updateStatus = async (id: string, newStatus: string) => {
        const updates: any = { status: newStatus };
        if (newStatus === 'COMPLETED') {
            updates.arrival_completed_date = new Date().toISOString();
        }

        const { error } = await supabase.from("sc_purchase_orders").update(updates).eq('id', id);
        if (error) alert("상태 업데이트 실패");
        else fetchOrders();
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Package size={32} className="text-indigo-600" />
                        자재 발주 관리
                    </h1>
                    <p className="text-slate-500 mt-2">
                        협력업체 발주 내역, 입고 일정 및 정산을 관리합니다.
                    </p>
                </div>
                <div className="flex gap-2">
                    {['ALL', 'ORDERED', 'COMPLETED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${filterStatus === status ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            {status === 'ALL' ? '전체' : status === 'ORDERED' ? '발주중/입고대기' : '입고완료/마감'}
                        </button>
                    ))}
                </div>
            </header>

            <div className="max-w-7xl mx-auto space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">로딩 중...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">발주 내역이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {orders.map(po => (
                            <div key={po.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-indigo-300 transition group">
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    {/* Status Badge */}
                                    <div className="w-32 shrink-0">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold 
                                            ${po.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                                            {po.status === 'COMPLETED' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                            {po.status === 'ORDERED' ? '발주완료(입고대기)' : po.status === 'COMPLETED' ? '입고완료' : po.status}
                                        </span>
                                        <div className="mt-2 text-xs text-slate-400">
                                            {format(new Date(po.created_at), 'yyyy.MM.dd HH:mm')}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg text-slate-900 truncate">
                                                {po.partners?.name || "알수없음"}
                                            </span>
                                            <span className="text-slate-400 text-sm">|</span>
                                            <span className="text-slate-600 font-medium truncate">
                                                {po.sc_schedules?.crm_customers?.name} 고객님 ({po.sc_schedules?.title})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Truck size={12} />
                                                {po.delivery_method === 'PICKUP' ? '직접수령' : po.delivery_method === 'FREIGHT' ? '화물' : po.delivery_method}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                입고예정: {po.arrival_expected_date ? format(new Date(po.arrival_expected_date), 'yyyy-MM-dd') : '-'}
                                            </div>
                                            <div>
                                                품목 {po.items_json?.length || 0}건
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right shrink-0">
                                        <div className="font-bold text-xl text-indigo-900">
                                            {po.total_amount?.toLocaleString() || 0} 원
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            (VAT 포함)
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 shrink-0">
                                        {po.status !== 'COMPLETED' && (
                                            <button
                                                onClick={() => updateStatus(po.id, 'COMPLETED')}
                                                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-bold text-sm transition"
                                            >
                                                입고 완료
                                            </button>
                                        )}
                                        <button
                                            onClick={() => window.open(`/admin/purchase-order/new?purchaseOrderId=${po.id}`, '_blank')}
                                            className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 font-medium text-sm transition"
                                        >
                                            상세/수정
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
