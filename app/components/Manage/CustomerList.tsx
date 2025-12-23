"use client";

import React, { useState } from "react";
import { Customer } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { Search, MapPin, Phone } from "lucide-react";
import Link from "next/link"; // Assumes we will route to detail page

interface Props {
    onSelectCustomer: (id: string) => void;
}

export default function CustomerList({ onSelectCustomer }: Props) {
    const { customers, orders } = useGlobalStore();
    const [term, setTerm] = useState("");

    const filtered = customers.filter(c =>
        c.name.includes(term) || c.phone.includes(term) || c.address.includes(term)
    );

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 flex flex-col h-[600px]">

            {/* Search Bar */}
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">고객 목록</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="이름, 전화번호, 주소 검색..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                            className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
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
                                <span className="truncate">{customer.address}</span>
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
        </div>
    );
}
