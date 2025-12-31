"use client";

import React, { useState } from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { Customer, Order } from "@/app/lib/store";
import { format, addYears, differenceInDays, parseISO, isAfter } from "date-fns";
import { MapPin, Phone, MessageSquare, Calendar, History, ShieldCheck, AlertTriangle, ImageIcon } from "lucide-react";

interface Props {
    customerId: string;
    onBack: () => void;
    onGoToConstruction?: (orderId: string) => void;
    initialCustomer?: Customer; // [NEW] Pass fresh data
    initialOrders?: Order[];    // [NEW] Pass fresh orders
}

export default function CustomerDetail({ customerId, onBack, onGoToConstruction, initialCustomer, initialOrders }: Props) {
    const { customers, orders, updateCustomer, addAsEntry } = useGlobalStore();

    // Prefer passed data (initialCustomer) over store data (which might be empty)
    const storeCustomer = customers.find(c => c.id === customerId);
    const customer = initialCustomer || storeCustomer;

    const storeOrders = orders.filter(o => o.customerId === customerId);
    const customerOrders = initialOrders || storeOrders;

    // [DEBUG]
    console.log("CustomerDetail Debug:", {
        id: customerId,
        initialLen: initialOrders?.length,
        storeLen: storeOrders.length,
        finalLen: customerOrders.length,
        firstOrder: customerOrders[0]
    });

    const [memo, setMemo] = useState(customer?.memo || "");
    const [newAsContent, setNewAsContent] = useState("");

    if (!customer) return <div>Customer not found (ID: {customerId})</div>;

    const handleSaveMemo = () => {
        updateCustomer(customerId, { memo });
        alert("메모가 저장되었습니다.");
    };

    const handleAddAs = (orderId: string) => {
        if (!newAsContent.trim()) return;
        addAsEntry(orderId, {
            id: Date.now().toString(),
            date: format(new Date(), "yyyy-MM-dd"),
            type: "기타",
            content: newAsContent,
            status: "접수"
        });
        setNewAsContent("");
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 h-full overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur border-b p-4 flex items-center justify-between z-10">
                <button onClick={onBack} className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded-lg">← 목록으로</button>
                <span className="font-bold text-lg">{customer.name} 고객님</span>
                <div className="w-20"></div> {/* spacer */}
            </div>

            <div className="p-6 space-y-8">

                {/* 1. Profile Info */}
                <section>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">기본 정보</h3>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 grid gap-4">
                        <div className="flex items-center gap-3">
                            <Phone className="text-gray-400" size={18} />
                            <span className="text-lg font-medium">{customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="text-gray-400" size={18} />
                            <span>{customer.address}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <MessageSquare className="text-gray-400 mt-1" size={18} />
                            <div className="flex-1">
                                <textarea
                                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-blue-500"
                                    rows={3}
                                    value={memo}
                                    onChange={e => setMemo(e.target.value)}
                                    placeholder="고객 특이사항 메모..."
                                />
                                <div className="text-right mt-2">
                                    <button onClick={handleSaveMemo} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">저장</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Order History & AS Tracking */}
                <section>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">주문 및 AS 내역</h3>
                    <div className="space-y-6">
                        {customerOrders.map((order, idx) => {
                            // AS Calculation
                            let asStatusNode = null;
                            if (order.installDate) {
                                const installDate = parseISO(order.installDate);
                                const warrantyEnd = addYears(installDate, 1);
                                const today = new Date();
                                const isValid = isAfter(warrantyEnd, today);
                                const daysLeft = differenceInDays(warrantyEnd, today);

                                asStatusNode = (
                                    <div className={`mt-4 p-4 rounded-xl border ${isValid ? "bg-green-50 border-green-200" : "bg-gray-100 border-gray-200"}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {isValid ? <ShieldCheck className="text-green-600" /> : <History className="text-gray-400" />}
                                                <span className={`font-bold ${isValid ? "text-green-700" : "text-gray-500"}`}>
                                                    {isValid ? "무상 AS 기간 (유효)" : "무상 AS 기간 만료"}
                                                </span>
                                            </div>
                                            {isValid && <span className="text-sm text-green-600 font-bold">D-{daysLeft}일</span>}
                                        </div>

                                        {/* Purchased Customer Details - REMOVED redundant legacy view */}
                                    </div>
                                );
                            }
                            // [CHANGED] Removed early return to ensure spec grid always renders

                            return (
                                <div key={order.id} className="border border-slate-200 rounded-2xl p-0 bg-white shadow-sm overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
                                                {order.status === 'MEASURED' ? '실측완료' : order.status}
                                            </span>
                                            <h4 className="font-bold text-slate-800">{order.title || "주문 내역"}</h4>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                                        </div>
                                    </div>

                                    {/* Detailed Grid */}
                                    <div className="p-5">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-8 text-sm">

                                            {/* Row 1: Dates & People */}
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-slate-400">실측일</div>
                                                <div className="font-medium text-slate-900">{order.measureDate || "-"}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-slate-400">시공요청일</div>
                                                <div className="font-medium text-slate-900">{order.installDate || "미정"}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-slate-400">실측자</div>
                                                <div className="font-medium text-slate-900">{(order.items[0] as any)?.measurerName || "담당자"}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-slate-400">결제상태</div>
                                                <div className={`font-bold ${order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {order.paymentStatus === 'Paid' ? '결제완료' : '미결제 (현장)'}
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="col-span-full h-px bg-slate-100 my-2"></div>

                                            {/* Row 2: Product Specs (Leading Item) */}
                                            {order.items.map((item: any, i) => (
                                                <React.Fragment key={i}>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-slate-400">문 종류</div>
                                                        <div className="font-medium text-slate-900">{item.category} ({item.detail})</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-slate-400">사이즈</div>
                                                        <div className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                                                            {item.widthMm || item.width || 0} x {item.heightMm || item.height || 0}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-slate-400">유리</div>
                                                        <div className="font-medium text-slate-900">{item.glass || "-"}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-slate-400">색상 (프레임)</div>
                                                        <div className="font-medium text-slate-900">{item.color || "-"}</div>
                                                    </div>

                                                    {/* Row 3: Extra Specs */}
                                                    <div className="space-y-1 mt-4">
                                                        <div className="text-xs font-bold text-slate-400">디자인</div>
                                                        <div className="font-medium text-slate-900">{item.design?.name || "-"}</div>
                                                    </div>
                                                    <div className="space-y-1 mt-4">
                                                        <div className="text-xs font-bold text-slate-400">열림방향</div>
                                                        <div className="font-medium text-slate-900">{item.openDirection || "-"}</div>
                                                    </div>
                                                    <div className="space-y-1 mt-4 col-span-2">
                                                        <div className="text-xs font-bold text-slate-400">특이사항 (옵션)</div>
                                                        <div className="font-medium text-slate-900">{item.slidingMode || "-"}</div>
                                                    </div>
                                                    {/* NEW: Additional Materials */}
                                                    {item.addMaterials && (
                                                        <div className="space-y-1 mt-4 col-span-full">
                                                            <div className="text-xs font-bold text-slate-400">추가 부자재</div>
                                                            <div className="font-medium text-slate-900 bg-yellow-50 p-2 rounded border border-yellow-100">
                                                                {item.addMaterials}
                                                            </div>
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>


                                        {/* Field Photos Gallery */}
                                        {/* Field Photos Gallery */}
                                        <div className="mt-4">
                                            <h5 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-1">
                                                <ImageIcon size={14} /> 현장 사진
                                            </h5>
                                            {order.items.some((item: any) => item.photos && item.photos.length > 0) ? (
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {order.items.flatMap((item: any) => item.photos || []).map((photo: any, idx: number) => (
                                                        <div key={idx} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group"
                                                            onClick={() => window.open(photo.url || photo, '_blank')}>
                                                            <img src={photo.url || photo} alt="Site" className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center text-xs text-slate-400">
                                                    등록된 현장 사진이 없습니다.
                                                </div>
                                            )}
                                        </div>

                                        {/* Memo Header */}
                                        {
                                            order.items[0] && (order.items[0] as any).memoRaw && (
                                                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                                                    <span className="font-bold text-amber-700 mr-2">[현장 메모]</span>
                                                    <span className="text-amber-900">{(order.items[0] as any).memoRaw}</span>
                                                </div>
                                            )
                                        }

                                        {/* AS Status Widget (Inserted) */}
                                        {asStatusNode}

                                        {/* Construction Management Link */}
                                        {/* Purchase Order & Construction Management Links */}
                                        <div className="mt-4 flex justify-end gap-2">
                                            <button
                                                onClick={() => window.open(`/admin/purchase-order/new?orderId=${order.id}`, '_blank')}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-bold transition text-sm border border-emerald-200"
                                            >
                                                📦 발주서 작성
                                            </button>
                                            <button
                                                onClick={() => onGoToConstruction?.(order.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-bold transition text-sm border border-indigo-200"
                                            >
                                                👷 시공 관리 작성
                                            </button>
                                        </div>

                                        {/* AS History */}
                                        <div className="mt-6 border-t pt-4">
                                            <h5 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                                <AlertTriangle size={16} /> AS 접수 및 처리 내역
                                            </h5>

                                            <div className="space-y-3 mb-4">
                                                {order.asHistory.length === 0 ? <div className="text-gray-400 text-sm italic">이력 없음</div> : null}
                                                {order.asHistory.map(as => (
                                                    <div key={as.id} className="flex gap-3 text-sm">
                                                        <div className="text-gray-400 shrink-0 font-mono">{as.date}</div>
                                                        <div className="flex-1">
                                                            <span className="font-bold mr-2">[{as.type}]</span>
                                                            {as.content}
                                                        </div>
                                                        <div className="text-blue-600 font-medium">{as.status}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add AS Note */}
                                            <div className="flex gap-2">
                                                <input
                                                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                                                    placeholder="AS 내용/특이사항 기록 (엔터로 입력)"
                                                    value={newAsContent}
                                                    onChange={e => setNewAsContent(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleAddAs(order.id); }}
                                                />
                                                <button onClick={() => handleAddAs(order.id)} className="bg-gray-800 text-white px-4 rounded-lg text-sm hover:bg-black transition-colors">등록</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div >
        </div >
    );
}
