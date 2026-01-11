"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { ArrowLeft, Save, Building2, Calculator, Truck, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { Suspense } from "react";

function NewPurchaseOrderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get("orderId");

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [partners, setPartners] = useState<any[]>([]);

    // Form State
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

    // Detailed PO Items
    const [poItems, setPoItems] = useState<any[]>([]);

    // Logistics & Dates
    const [deliveryMethod, setDeliveryMethod] = useState("PICKUP"); // PICKUP, FREIGHT, CHARTER, PARCEL, ETC
    const [arrivalExpectedDate, setArrivalExpectedDate] = useState("");

    const [memo, setMemo] = useState("");

    const supabase = createSupabaseBrowser();

    // 1. Fetch Order & Partners
    useEffect(() => {
        if (!orderId) return;

        const init = async () => {
            setLoading(true);

            // Fetch Order
            const { data: orderData, error: orderErr } = await supabase
                .from("sc_schedules")
                .select("*, crm_customers(*)")
                .eq("id", orderId)
                .single();

            if (orderErr) {
                alert("주문 정보를 불러오지 못했습니다.");
                return;
            }
            setOrder(orderData);

            // Fetch Partners
            const { data: partnerData } = await supabase
                .from("partners")
                .select("*")
                .order("name");
            setPartners(partnerData || []);

            // Initial Items Build
            if (orderData?.items_json) {
                const rawItems = Array.isArray(orderData.items_json) ? orderData.items_json : [orderData.items_json];
                const mappedItems = rawItems.map((item: any) => {
                    let d = item.design?.name || item.design || "";
                    let c = item.color || "";

                    // Heuristic: If Design looks like a color and Color is empty, move it.
                    if (!c && (d.includes("Black") || d.includes("White") || d.includes("Gold") || d.includes("Champagne") || d.includes("Grey") || d.includes("Navy") || d.includes("블랙") || d.includes("화이트") || d.includes("골드"))) {
                        c = d;
                        d = "";
                    }

                    return {
                        // Detailed Specs
                        category: item.category || "",
                        width: item.widthMm || item.width || 0,
                        height: item.heightMm || item.height || 0,
                        glass: item.glass || "",
                        color: c,
                        design: d,
                        openDirection: item.openDirection || "",

                        // PO Fields
                        qty: 1,
                        unit_price: 0,
                        supply_price: 0,
                        vat: 0,
                        note: ""
                    };
                });
                setPoItems(mappedItems);
            }

            setLoading(false);
        };

        init();
    }, [orderId]);

    // Update Item
    const updateItem = (index: number, field: string, value: any) => {
        setPoItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };

            // Recalc
            if (field === 'unit_price' || field === 'qty') {
                const u = parseFloat(next[index].unit_price) || 0;
                const q = parseFloat(next[index].qty) || 0;
                next[index].supply_price = u * q;
                next[index].vat = Math.floor(next[index].supply_price * 0.1);
            }
            return next;
        });
    };

    // Totals
    const totalSupply = useMemo(() => poItems.reduce((acc, cur) => acc + (cur.supply_price || 0), 0), [poItems]);
    const totalVat = useMemo(() => poItems.reduce((acc, cur) => acc + (cur.vat || 0), 0), [poItems]);
    const totalAmount = totalSupply + totalVat;

    // Save
    const handleSave = async () => {
        if (!selectedPartnerId) {
            alert("발주처를 선택해주세요.");
            return;
        }

        const payload = {
            schedule_id: orderId,
            partner_id: selectedPartnerId,

            total_amount: totalSupply,
            vat_amount: totalVat,

            status: 'ORDERED', // 발주처리

            delivery_method: deliveryMethod,
            arrival_expected_date: arrivalExpectedDate ? new Date(arrivalExpectedDate).toISOString() : null,
            order_date: new Date().toISOString(), // 발주신청일 = Now

            items_json: poItems,
            memo: memo
        };

        const { error } = await supabase.from("sc_purchase_orders").insert(payload);
        if (error) {
            alert("발주서 저장 실패: " + error.message);
        } else {
            alert("발주처리가 완료되었습니다.");
            router.push("/admin/purchase-order"); // Go to List View
        }
    };

    if (loading) return <div className="p-10 text-center">로딩 중...</div>;
    if (!order) return <div className="p-10 text-center text-red-500">주문을 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {/* Header */}
            <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full transition">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            📦 발주서 작성
                            <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                {order.crm_customers?.name} 고객님
                            </span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            상세 규격과 물류/일정을 입력하여 발주를 진행합니다.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition active:scale-95"
                >
                    <CheckCircle2 size={20} />
                    발주 처리
                </button>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left: Settings (Partner & Logistics) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Partner Select */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-indigo-600" />
                            발주처
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">협력업체 선택 *</label>
                                <select
                                    value={selectedPartnerId}
                                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                                >
                                    <option value="">선택해주세요</option>
                                    {partners.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Logistics & Dates */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Truck size={20} className="text-indigo-600" />
                            물류 / 일정
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">물류 방법</label>
                                <select
                                    value={deliveryMethod}
                                    onChange={(e) => setDeliveryMethod(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="PICKUP">직접 방문</option>
                                    <option value="FREIGHT">화물 배송</option>
                                    <option value="CHARTER">용차 (독차)</option>
                                    <option value="PARCEL">택배 / 화물택배</option>
                                    <option value="ETC">기타</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">입고 예정일</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={arrivalExpectedDate}
                                        onChange={(e) => setArrivalExpectedDate(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 text-slate-400" size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Memo */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <textarea
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="발주 비고 사항"
                            className="w-full h-24 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Right: Detailed Items */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-x-auto">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-indigo-600" />
                            발주 상세 품목
                        </h3>

                        <table className="w-full table-auto text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3 whitespace-nowrap">품명/종류</th>
                                    <th className="p-3 w-32">규격 (W넓이 / H 높이)</th>
                                    <th className="p-3 w-24">유리</th>
                                    <th className="p-3 w-24">색상</th>
                                    <th className="p-3 w-24">디자인</th>
                                    <th className="p-3 w-20">방향</th>
                                    <th className="p-3 w-16 text-center">수량</th>
                                    <th className="p-3 w-28 text-right">단가</th>
                                    <th className="p-3 w-28 text-right">공급가액</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {poItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="p-2">
                                            <input type="text" value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)}
                                                className="w-full bg-transparent border-none outline-none font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 rounded px-1" />
                                        </td>
                                        <td className="p-2 flex items-center gap-1">
                                            <input type="number" value={item.width} onChange={e => updateItem(idx, 'width', e.target.value)}
                                                className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center outline-none" />
                                            <span className="text-slate-400 font-sans mx-1">x</span>
                                            <input type="number" value={item.height} onChange={e => updateItem(idx, 'height', e.target.value)}
                                                className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center outline-none" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" value={item.glass} onChange={e => updateItem(idx, 'glass', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded p-1 outline-none text-xs" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded p-1 outline-none text-xs" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" value={item.design} onChange={e => updateItem(idx, 'design', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded p-1 outline-none text-xs" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" value={item.openDirection} onChange={e => updateItem(idx, 'openDirection', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded p-1 outline-none text-center text-xs" />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                className="w-full bg-white border border-indigo-200 rounded p-1 text-center font-bold text-indigo-600 outline-none" />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded p-1 text-right outline-none" placeholder="0" />
                                        </td>
                                        <td className="p-2 text-right font-bold text-slate-700">
                                            {item.supply_price?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Total Summary */}
                        <div className="mt-6 flex justify-end gap-6 text-sm">
                            <div className="text-right">
                                <div className="text-slate-500">공급가액 합계</div>
                                <div className="font-bold text-lg">{totalSupply.toLocaleString()} 원</div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-500">부가세 (10%)</div>
                                <div className="font-bold text-lg">{totalVat.toLocaleString()} 원</div>
                            </div>
                            <div className="text-right pl-6 border-l border-slate-200">
                                <div className="text-indigo-600 font-bold">총 발주금액</div>
                                <div className="font-bold text-2xl text-indigo-800">{totalAmount.toLocaleString()} 원</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function NewPurchaseOrderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading PO...</div>}>
            <NewPurchaseOrderContent />
        </Suspense>
    );
}
