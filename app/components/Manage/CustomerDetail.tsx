"use client";

import React, { useState } from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { Customer, Order } from "@/app/lib/store";
import { format, addYears, differenceInDays, parseISO, isAfter } from "date-fns";
import { MapPin, Phone, MessageSquare, Calendar, History, ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
    customerId: string;
    onBack: () => void;
    onGoToConstruction?: (orderId: string) => void;
}

export default function CustomerDetail({ customerId, onBack, onGoToConstruction }: Props) {
    const { customers, orders, updateCustomer, addAsEntry } = useGlobalStore();
    const customer = customers.find(c => c.id === customerId);
    const customerOrders = orders.filter(o => o.customerId === customerId);

    const [memo, setMemo] = useState(customer?.memo || "");
    const [newAsContent, setNewAsContent] = useState("");

    if (!customer) return <div>Customer not found</div>;

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
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isValid ? <ShieldCheck className="text-green-600" /> : <History className="text-gray-400" />}
                                                <span className={`font-bold ${isValid ? "text-green-700" : "text-gray-500"}`}>
                                                    {isValid ? "무상 AS 기간 (유효)" : "무상 AS 기간 만료"}
                                                </span>
                                            </div>
                                            {isValid && <span className="text-sm text-green-600 font-bold">D-{daysLeft}일</span>}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            시공일: {order.installDate} ~ 만료일: {format(warrantyEnd, "yyyy-MM-dd")}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={order.id} className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-2">{order.status}</span>
                                            <h4 className="font-bold text-lg">{order.items[0]?.category} 외 {order.items.length}건</h4>
                                            <div className="text-gray-500 text-sm mt-1">총 금액: {order.finalPrice.toLocaleString()}원</div>
                                        </div>
                                        <div className="text-right text-sm text-gray-500">
                                            <div>계약일: {order.measureDate}</div>
                                            {order.installDate && <div>시공일: {order.installDate}</div>}
                                        </div>
                                    </div>

                                    {/* Order Items Detail */}
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 space-y-1 mb-4">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>- {item.detail} ({item.width}x{item.height})</span>
                                                <span>{item.quantity}개</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AS Widget */}
                                    {asStatusNode}

                                    {/* Construction Management Link */}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => onGoToConstruction?.(order.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold transition text-sm"
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
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
