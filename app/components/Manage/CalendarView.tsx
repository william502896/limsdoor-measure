"use client";

import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Order } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

export default function CalendarView({ onSelectCustomer }: { onSelectCustomer?: (customerId: string) => void }) {
    const { orders, customers } = useGlobalStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayOrders = (date: Date) => {
        return orders.filter(o => o.installDate && isSameDay(parseISO(o.installDate), date));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "INSTALLED":
            case "시공완료": return "bg-green-100 text-green-700 border-green-200";
            case "INSTALL_SCHEDULED":
            case "시공대기": return "bg-blue-100 text-blue-700 border-blue-200";
            case "AS_REQUESTED":
            case "AS접수": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const closeDetail = () => setSelectedDate(null);

    const selectedDayOrders = selectedDate ? getDayOrders(selectedDate) : [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><CalendarIcon size={24} /></span>
                    {format(currentDate, "yyyy년 M월", { locale: ko })}
                </h2>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 mb-2 text-center text-sm text-slate-500 font-bold border-b border-slate-100 pb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                    <div key={d} className={`py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}>{d}</div>
                ))}
            </div>

            {/* Grid Days */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden flex-1">
                {days.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayOrders = getDayOrders(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => handleDayClick(day)}
                            className={`
                                min-h-[120px] p-2 bg-white transition-all cursor-pointer hover:bg-indigo-50/50
                                ${!isCurrentMonth && "bg-slate-50 text-slate-300"}
                                ${isSelected && "ring-2 ring-inset ring-indigo-500 z-10"}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`
                                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday ? "bg-red-500 text-white shadow-md scale-110" : "text-slate-600"}
                                `}>
                                    {format(day, "d")}
                                </span>
                                {dayOrders.length > 0 && (
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                                        {dayOrders.length}건
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 space-y-1">
                                {dayOrders.slice(0, 3).map(order => {
                                    const customer = customers.find(c => c.id === order.customerId);
                                    return (
                                        <div key={order.id} className={`text-[11px] px-1.5 py-1 rounded border overflow-hidden whitespace-nowrap text-ellipsis ${getStatusColor(order.status)}`}>
                                            <span className="font-bold mr-1">{customer?.name}</span>
                                            <span className="opacity-75">{order.items[0]?.category}</span>
                                        </div>
                                    );
                                })}
                                {dayOrders.length > 3 && (
                                    <div className="text-[10px] text-slate-400 text-center font-medium">
                                        + {dayOrders.length - 3}건 더보기
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeDetail}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CalendarIcon size={20} />
                                {format(selectedDate, "yyyy년 M월 d일 cccc", { locale: ko })} 일정
                            </h3>
                            <button onClick={closeDetail} className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-full transition">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                            </button>
                        </div>

                        <div className="p-0 max-h-[60vh] overflow-y-auto">
                            {selectedDayOrders.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {selectedDayOrders.map(order => {
                                        const customer = customers.find(c => c.id === order.customerId);
                                        return (
                                            <div
                                                key={order.id}
                                                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                                                onClick={() => onSelectCustomer?.(order.customerId)}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                        <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                            {customer?.name} 고객님
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono">
                                                        {order.id.split('-')[1]}
                                                    </div>
                                                </div>

                                                <div className="pl-0 space-y-1">
                                                    <div className="text-sm text-slate-600">
                                                        <span className="inline-block w-16 text-slate-400 text-xs">시공내역</span>
                                                        {order.items.map((i, idx) => (
                                                            <span key={idx}>{i.category} {i.detail} ({i.quantity}개)</span>
                                                        ))}
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        <span className="inline-block w-16 text-slate-400 text-xs">연락처</span>
                                                        {customer?.phone}
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        <span className="inline-block w-16 text-slate-400 text-xs">주소</span>
                                                        <span className="text-xs">{customer?.address}</span>
                                                    </div>
                                                </div>

                                                {order.measureDate && (
                                                    <div className="mt-2 text-xs text-slate-400 flex gap-2">
                                                        <span>📅 실측일: {order.measureDate}</span>
                                                        {order.installDate && <span>🛠 시공예정: {order.installDate}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <CalendarIcon size={32} className="opacity-20" />
                                    </div>
                                    <p>등록된 일정이 없습니다.</p>
                                    <button className="mt-4 text-sm text-indigo-600 font-bold hover:underline">
                                        + 새 일정 등록하기
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={closeDetail} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
