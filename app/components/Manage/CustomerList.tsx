"use client";

import React, { useState } from "react";
import { Customer } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { Search, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import AddressSearchModal from "@/app/components/AddressSearchModal";

interface Props {
    onSelectCustomer: (id: string) => void;
    filterType?: string;
}

export default function CustomerList({ onSelectCustomer, filterType = "all" }: Props) {
    const { customers, orders, addCustomer } = useGlobalStore();
    const [term, setTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", memo: "" });

    const handleConfirmAdd = () => {
        if (!newCustomer.name || !newCustomer.phone) {
            alert("이름과 전화번호는 필수입니다.");
            return;
        }

        const id = Date.now().toString();
        addCustomer({
            id,
            name: newCustomer.name,
            phone: newCustomer.phone,
            address: newCustomer.address,
            memo: newCustomer.memo,
            createdAt: new Date().toISOString()
        });

        setIsAddModalOpen(false);
        setNewCustomer({ name: "", phone: "", address: "", memo: "" });
    };

    const filtered = customers.filter(c => {
        // 1. Search Term Filter
        const matchesTerm = c.name.includes(term) || c.phone.includes(term) || c.address.includes(term);
        if (!matchesTerm) return false;

        // 2. Lifecycle Stage Filter
        if (filterType === "all") return true;

        // Get latest order status
        const customerOrders = orders.filter(o => o.customerId === c.id);
        const lastOrder = customerOrders[customerOrders.length - 1]; // Assumes chronological order or sort

        if (filterType === "prospective") {
            // No orders OR last order is AR_SELECTED
            return !lastOrder || lastOrder.status === "AR_SELECTED";
        }
        if (filterType === "consulting") {
            return lastOrder && ["MEASURE_REQUESTED", "MEASURED"].includes(lastOrder.status);
        }
        if (filterType === "contract") {
            return lastOrder && ["CONTRACT_CONFIRMED", "PRODUCING", "INSTALL_SCHEDULED", "REFORM_SCHEDULED"].includes(lastOrder.status);
        }
        if (filterType === "purchased") {
            return lastOrder && ["INSTALLED", "REFORM_COMPLETED", "COMPLETED", "AS_COMPLETED"].includes(lastOrder.status);
        }

        return true;
    });

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 flex flex-col h-[600px] relative">

            {/* Search Bar & Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">고객 목록</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {filterType === "all" && "전체 고객"}
                        {filterType === "prospective" && "가망 고객 (문의/AR)"}
                        {filterType === "consulting" && "상담 고객 (실측)"}
                        {filterType === "contract" && "계약 고객 (시공대기)"}
                        {filterType === "purchased" && "구매 고객 (시공완료)"}
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-lg shadow-indigo-200"
                >
                    + 고객 등록
                </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="이름, 전화번호, 주소 검색..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={term}
                        onChange={e => setTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filtered.map(customer => {
                    // Find latest order for summary
                    const customerOrders = orders.filter(o => o.customerId === customer.id);
                    const lastOrder = customerOrders[customerOrders.length - 1];

                    return (
                        <div
                            key={customer.id}
                            onClick={() => onSelectCustomer(customer.id)}
                            className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer bg-white"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{customer.name}</div>
                                    <div className="flex items-center text-gray-500 text-sm mt-1">
                                        <Phone size={14} className="mr-1" /> {customer.phone}
                                    </div>
                                </div>
                                {lastOrder && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                                        {lastOrder.status}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-start text-gray-500 text-sm">
                                <MapPin size={14} className="mr-1 mt-0.5 shrink-0" />
                                <span className="truncate">{customer.address || "주소 미입력"}</span>
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="text-center text-gray-400 py-10">
                        검색 결과가 없습니다.
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {isAddModalOpen && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
                    <div className="bg-white w-[90%] max-w-md p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">새 고객 등록</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">고객명 <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    placeholder="홍길동"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">연락처 <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                    placeholder="010-0000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">주소</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border p-2 rounded-lg"
                                        value={newCustomer.address}
                                        onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                        placeholder="서울시 ..."
                                    />
                                    <button
                                        onClick={() => setAddressModalOpen(true)}
                                        className="px-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 text-sm font-bold whitespace-nowrap"
                                    >
                                        🔍 검색
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">메모</label>
                                <textarea
                                    className="w-full border p-2 rounded-lg"
                                    value={newCustomer.memo}
                                    onChange={e => setNewCustomer({ ...newCustomer, memo: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleConfirmAdd}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                                >
                                    등록하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setNewCustomer({ ...newCustomer, address: data.address })}
            />

        </div>
    );
}
