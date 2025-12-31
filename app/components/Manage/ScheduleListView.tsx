"use client";

import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useGlobalStore } from "@/app/lib/store-context";
import { Order } from "@/app/lib/store";
import { Search, Filter, Calendar as CalendarIcon, Phone, MapPin, User, ChevronRight, MoreHorizontal, Plus, Pencil } from "lucide-react";
import ScheduleFormModal from "@/app/components/Manage/ScheduleFormModal";

export default function ScheduleListView({ filterType = "all" }: { filterType?: string }) {
    const { orders, customers } = useGlobalStore();
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    // --- Filter Logic (Mirrors CalendarView) ---
    const filteredOrders = orders.filter(o => {
        const customer = customers.find(c => c.id === o.customerId);

        // 1. Type Filter
        if (filterType !== "all") {
            if (filterType === "consulting") return false; // Placeholder
            if (filterType === "measure") {
                if (o.status !== "MEASURE_REQUESTED" && o.status !== "MEASURED") return false;
            }
            if (filterType === "install") {
                if (o.serviceType !== "NEW_INSTALL" && o.status !== "INSTALL_SCHEDULED" && o.status !== "INSTALLED") return false;
            }
            if (filterType === "reform") {
                if (o.serviceType !== "REFORM") return false;
            }
            if (filterType === "as") {
                if (o.serviceType !== "AS") return false;
            }
        }

        // 2. Search Filter (Name, Phone, Address)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const cName = customer?.name?.toLowerCase() || "";
            const cPhone = customer?.phone || "";
            const cAddr = customer?.address?.toLowerCase() || "";

            return (
                cName.includes(term) ||
                cPhone.includes(term) ||
                cAddr.includes(term)
            );
        }

        return true;
    }).sort((a, b) => {
        // Sort by date descending
        const dateA = a.installDate ? new Date(a.installDate).getTime() : 0;
        const dateB = b.installDate ? new Date(b.installDate).getTime() : 0;
        return dateB - dateA;
    });

    const getStatusBadge = (status: string, serviceType?: string) => {
        let color = "bg-gray-100 text-gray-600";
        let label = status;

        if (status === "MEASURE_REQUESTED") { color = "bg-blue-100 text-blue-700"; label = "실측요청"; }
        if (status === "MEASURED") { color = "bg-indigo-100 text-indigo-700"; label = "실측완료"; }
        if (status === "INSTALL_SCHEDULED") { color = "bg-orange-100 text-orange-700"; label = "시공예정"; }
        if (status === "INSTALLED") { color = "bg-green-100 text-green-700"; label = "시공완료"; }
        if (serviceType === "AS") { color = "bg-red-100 text-red-700"; label = "A/S"; }
        if (serviceType === "REFORM") { color = "bg-purple-100 text-purple-700"; label = "리폼"; }

        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{label}</span>;
    };

    const getTitle = () => {
        switch (filterType) {
            case "consulting": return "상담 일정 목록";
            case "measure": return "실측/견적 일정 목록";
            case "install": return "시공 일정 목록";
            case "reform": return "리폼/수리 일정 목록";
            case "as": return "AS 일정 목록";
            default: return "전체 일정 목록";
        }
    };

    const handleAdd = () => {
        setEditingOrder(null);
        setIsFormOpen(true);
    };

    const handleEdit = (order: Order) => {
        setEditingOrder(order);
        setIsFormOpen(true);
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{getTitle()}</h2>
                    <p className="text-xs text-slate-500">총 {filteredOrders.length}건의 일정이 있습니다.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="고객명, 전화번호, 주소 검색"
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:border-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition flex items-center gap-1"
                    >
                        <Plus size={16} />
                        일정 등록
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">일정 날짜</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">상태</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">고객 정보</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">주소</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">담당자</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <CalendarIcon size={40} className="opacity-20" />
                                        <span>조회된 일정이 없습니다.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const customer = customers.find(c => c.id === order.customerId);
                                return (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleEdit(order)}>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-700">
                                                {order.installDate ? format(parseISO(order.installDate), "M월 d일 (EEE)", { locale: ko }) : "-"}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {order.installDate ? format(parseISO(order.installDate), "a h:mm", { locale: ko }) : "미정"}
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            {getStatusBadge(order.status, order.serviceType)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {customer?.name?.slice(0, 1) || "?"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-sm">{customer?.name || "미지정"}</div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Phone size={10} /> {customer?.phone || "-"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-[300px]">
                                            <div className="flex items-start gap-1 text-slate-600 text-sm truncate">
                                                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                                <span className="truncate">{customer?.address || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-600 flex items-center gap-1">
                                                <User size={14} className="text-slate-400" />
                                                {order.items?.[0]?.location || "미지정"} {/* Using location as placeholder for assignee or we can add assignee field */}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                                                className="p-2 hover:bg-indigo-50 rounded-full text-slate-400 hover:text-indigo-600 transition"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ScheduleFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                selectedDate={new Date()} // Default to today for list view additions
                editingOrder={editingOrder}
            />
        </div>
    );
}
