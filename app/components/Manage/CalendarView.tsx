"use client";

import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Order } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Plus, Trash2, Pencil } from "lucide-react";
import AddressSearchModal from "@/app/components/AddressSearchModal";

export default function CalendarView({ onSelectCustomer, filterType = "all" }: { onSelectCustomer?: (customerId: string) => void, filterType?: string }) {
    const { orders, customers, addOrder, addCustomer, deleteOrder, updateOrder, createOrderWithCustomer } = useGlobalStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);

    // Form state
    const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
    const [formCustomerId, setFormCustomerId] = useState("");
    const [newCustomerData, setNewCustomerData] = useState({
        name: "",
        phone: "",
        address: "",
        memo: ""
    });
    // Updated Form Types
    const initialFormType: "measure" | "install" | "reform" | "as" =
        filterType === "measure" ? "measure" :
            filterType === "install" ? "install" :
                filterType === "reform" ? "reform" :
                    filterType === "as" ? "as" :
                        "install"; // Default fallback

    const [formType, setFormType] = useState<"measure" | "install" | "reform" | "as">(initialFormType);
    const [asDefectType, setAsDefectType] = useState<"PRODUCT" | "INSTALL">("PRODUCT"); // Default

    const [formItems, setFormItems] = useState<Order["items"]>([{ category: "블라인드", detail: "콤비", location: "", glass: "", color: "", width: 0, height: 0, quantity: 1 }]);

    // New States
    const [workContent, setWorkContent] = useState("");
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    // Detailed Item States
    const [itemDetail, setItemDetail] = useState("");
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemWidth, setItemWidth] = useState("");
    const [itemHeight, setItemHeight] = useState("");
    const [itemGlass, setItemGlass] = useState("");
    const [itemColor, setItemColor] = useState("");

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayOrders = (date: Date) => {
        return orders.filter(o => {
            if (!o.installDate || !isSameDay(parseISO(o.installDate), date)) return false;

            // Filter Logic
            if (filterType === "all") return true;

            // Map filterType to order status/serviceType
            if (filterType === "consulting") return false; // TODO: Add consulting logic if exists

            if (filterType === "measure") {
                // "MEASURE_REQUESTED" and then "MEASURED"
                return o.status === "MEASURE_REQUESTED" || o.status === "MEASURED";
            }
            if (filterType === "install") {
                // "INSTALL_SCHEDULED", "INSTALLED"
                return o.serviceType === "NEW_INSTALL" || o.status === "INSTALL_SCHEDULED" || o.status === "INSTALLED";
            }
            if (filterType === "reform") return o.serviceType === "REFORM";
            if (filterType === "as") return o.serviceType === "AS";

            return true;
        });
    };

    const getStatusText = (status: string, serviceType?: string, defect?: string) => {
        if (status === "CANCELLED") return "취소됨";
        if (status === "POSTPONED") return "연기됨";

        switch (serviceType) {
            case "REFORM": return "리폼/수리";
            case "AS": return `AS (${defect === "PRODUCT" ? "제품" : "시공"})`;
            case "NEW_INSTALL": return "시공 (신규)";
            default:
                if (status === "MEASURE_REQUESTED") return "실측";
                return "일정";
        }
    };

    const getStatusColor = (status: string, serviceType?: string) => {
        if (status === "CANCELLED") return "bg-gray-200 text-gray-400 border-gray-300 line-through";
        if (status === "POSTPONED") return "bg-orange-50 text-orange-600 border-orange-200";

        if (serviceType === "REFORM") return "bg-purple-100 text-purple-700 border-purple-200";
        if (serviceType === "AS") return "bg-yellow-100 text-yellow-800 border-yellow-200";

        switch (status) {
            case "INSTALLED":
            case "시공완료": return "bg-green-100 text-green-700 border-green-200";
            case "REFORM_COMPLETED": return "bg-purple-100 text-purple-800 border-purple-200";
            case "INSTALL_SCHEDULED":
            case "시공대기": return "bg-blue-100 text-blue-700 border-blue-200";
            case "REFORM_SCHEDULED": return "bg-purple-50 text-purple-700 border-purple-200";
            case "AS_REQUESTED":
            case "AS_SCHEDULED":
            case "AS접수": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const closeDetail = () => {
        setSelectedDate(null);
        setShowNewScheduleForm(false);
        setEditingOrderId(null);
        // Reset Item Fields
        setWorkContent("");
        setItemDetail("");
        setItemQuantity(1);
        setItemWidth("");
        setItemHeight("");
        setItemGlass("");
        setItemColor("");

        setFormCustomerId("");
        setNewCustomerData({ name: "", phone: "", address: "", memo: "" });
    };

    const handleNewSchedule = () => {
        setEditingOrderId(null);
        setFormCustomerId("");
        // Reset Item Fields
        setWorkContent("");
        setItemDetail("");
        setItemQuantity(1);
        setItemWidth("");
        setItemHeight("");
        setItemGlass("");
        setItemColor("");

        setFormType("install");
        setCustomerMode("existing");
        setShowNewScheduleForm(true);
    };

    const handleEditSchedule = (order: Order) => {
        setEditingOrderId(order.id);
        setFormCustomerId(order.customerId);
        setCustomerMode("existing");

        // Restore Type
        if (order.serviceType === "REFORM") setFormType("reform");
        else if (order.serviceType === "AS") {
            setFormType("as");
            if (order.asDefect) setAsDefectType(order.asDefect);
        } else if (order.status === "MEASURE_REQUESTED") setFormType("measure");
        else setFormType("install");

        // Restore Content
        const content = order.items.map(i => i.category).filter(c => c !== "미지정").join(", ");
        setWorkContent(content);

        setShowNewScheduleForm(true);
    };

    const handleSubmitSchedule = () => {
        if (!selectedDate) {
            alert("날짜를 선택해주세요.");
            return;
        }

        let finalCustomerId = formCustomerId;
        let newCustomerObj = undefined;

        // Handle new customer creation
        if (customerMode === "new") {
            if (!newCustomerData.name || !newCustomerData.phone) {
                alert("고객 이름과 전화번호는 필수입니다.");
                return;
            }

            const newId = `customer-${Date.now()}`;
            newCustomerObj = {
                id: newId,
                name: newCustomerData.name,
                phone: newCustomerData.phone,
                address: newCustomerData.address,
                memo: newCustomerData.memo,
                createdAt: new Date().toISOString(),
            };
            finalCustomerId = newId;
        } else {
            // Existing customer mode
            if (!formCustomerId) {
                alert("고객을 선택해주세요.");
                return;
            }
        }

        // Determine Status & Service Type
        let initialStatus: any = "INSTALL_SCHEDULED";
        let serviceType: any = "NEW_INSTALL";
        let asDefect: any = undefined;

        if (formType === "measure") {
            initialStatus = "MEASURE_REQUESTED";
            serviceType = undefined; // Measure isn't service type per se, but part of flow. Keep undefined or make logic consistent?
            // Actually store types say serviceType is optional.
        } else if (formType === "reform") {
            initialStatus = "REFORM_SCHEDULED";
            serviceType = "REFORM";
        } else if (formType === "as") {
            initialStatus = "AS_SCHEDULED";
            serviceType = "AS";
            asDefect = asDefectType;
        } else {
            // Install
            initialStatus = "INSTALL_SCHEDULED";
            serviceType = "NEW_INSTALL";
        }

        // Construct Items based on input
        const finalItems: Order["items"] = [
            {
                category: workContent || "미지정",
                detail: itemDetail,
                location: "",
                glass: itemGlass,
                color: itemColor,
                width: Number(itemWidth) || 0,
                height: Number(itemHeight) || 0,
                quantity: itemQuantity
            }
        ];

        if (editingOrderId) {
            updateOrder(editingOrderId, {
                customerId: finalCustomerId,
                items: finalItems,
                status: initialStatus,
                serviceType: serviceType,
                asDefect: asDefect,
                installDate: formType !== "measure" ? format(selectedDate, "yyyy-MM-dd") : undefined,
                measureDate: formType === "measure" ? format(selectedDate, "yyyy-MM-dd") : undefined,
            });
            alert("일정이 수정되었습니다.");
        } else {
            const newOrder: Order = {
                id: `order-${Date.now()}`,
                customerId: finalCustomerId,
                tenantId: "t_head",
                items: finalItems,
                status: initialStatus,
                serviceType: serviceType,
                asDefect: asDefect,
                measureDate: formType === "measure" ? format(selectedDate, "yyyy-MM-dd") : undefined,
                installDate: formType !== "measure" ? format(selectedDate, "yyyy-MM-dd") : undefined,
                createdAt: new Date().toISOString(),
                estPrice: 0,
                finalPrice: 0,
                deposit: 0,
                balance: 0,
                paymentStatus: "Unpaid",
                measureFiles: [],
                installFiles: [],
                asHistory: [],
            };
            createOrderWithCustomer(newOrder, newCustomerObj);
            alert("일정이 등록되었습니다!");
        }

        closeDetail();
    };

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
                {days.map((day) => {
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
            {selectedDate && !showNewScheduleForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeDetail}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CalendarIcon size={20} />
                                {format(selectedDate, "yyyy년 M월 d일 cccc", { locale: ko })} 일정
                            </h3>
                            <button onClick={closeDetail} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition">
                                <X size={24} />
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
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(order.status, order.serviceType)}`}>
                                                            {getStatusText(order.status, order.serviceType, order.asDefect)}
                                                        </span>
                                                        <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                            {customer?.name} 고객님
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            {order.id.split('-')[1]}
                                                        </div>
                                                        <div className="flex bg-slate-100 rounded-md overflow-hidden border border-slate-200">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditSchedule(order);
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition border-r border-slate-200"
                                                                title="일정 수정"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newDate = prompt("변경할 날짜를 입력하세요 (YYYY-MM-DD)", order.installDate);
                                                                    if (newDate) {
                                                                        updateOrder(order.id, {
                                                                            installDate: newDate,
                                                                            // Reset status to active equivalent if it was cancelled/postponed
                                                                            status: order.serviceType === "REFORM" ? "REFORM_SCHEDULED" : order.serviceType === "AS" ? "AS_SCHEDULED" : "INSTALL_SCHEDULED",
                                                                            postponeReason: "사용자 변경"
                                                                        });
                                                                        alert("일정이 변경되었습니다.");
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition border-r border-slate-200"
                                                                title="일정 변경/연기"
                                                            >
                                                                <CalendarIcon size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const reason = prompt("취소 사유를 입력하세요");
                                                                    if (reason !== null) {
                                                                        updateOrder(order.id, { status: "CANCELLED", cancelReason: reason });
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition border-r border-slate-200"
                                                                title="일정 취소"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("정말 이 일정을 삭제하시겠습니까? (복구 불가)")) {
                                                                        deleteOrder(order.id);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                                                                title="데이터 삭제"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
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
                                    <button
                                        onClick={handleNewSchedule}
                                        className="mt-4 text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={16} />
                                        새 일정 등록하기
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <button
                                onClick={handleNewSchedule}
                                className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 flex items-center gap-1"
                            >
                                <Plus size={16} />
                                일정 추가
                            </button>

                            <button onClick={closeDetail} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Schedule Form Modal */}
            {showNewScheduleForm && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Plus size={20} />
                                {format(selectedDate, "M월 d일", { locale: ko })} 일정 등록
                            </h3>
                            <button onClick={closeDetail} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Customer Mode Toggle */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">고객 정보</label>
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setCustomerMode("existing")}
                                        className={`flex-1 p-3 rounded-lg border-2 font-bold transition ${customerMode === "existing" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600"}`}
                                    >
                                        기존 고객
                                    </button>
                                    <button
                                        onClick={() => setCustomerMode("new")}
                                        className={`flex-1 p-3 rounded-lg border-2 font-bold transition ${customerMode === "new" ? "bg-green-50 border-green-500 text-green-700" : "border-slate-200 text-slate-600"}`}
                                    >
                                        신규 고객
                                    </button>
                                </div>

                                {/* Existing Customer Mode */}
                                {customerMode === "existing" && (
                                    <select
                                        value={formCustomerId}
                                        onChange={(e) => setFormCustomerId(e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">고객을 선택하세요</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                        ))}
                                    </select>
                                )}

                                {/* New Customer Mode */}

                                {customerMode === "new" && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">이름 <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={newCustomerData.name}
                                                onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                placeholder="홍길동"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">전화번호 <span className="text-red-500">*</span></label>
                                            <input
                                                type="tel"
                                                value={newCustomerData.phone}
                                                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                placeholder="010-1234-5678"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">주소 <span className="text-red-500">*</span></label>
                                            <div className="flex gap-1.5">
                                                <input
                                                    type="text"
                                                    value={newCustomerData.address}
                                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                                    className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder="서울시 강남구 ..."
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
                                            <label className="block text-xs font-bold text-slate-600 mb-1">메모 (문 종류, 요구사항 등)</label>
                                            <textarea
                                                value={newCustomerData.memo}
                                                onChange={(e) => setNewCustomerData({ ...newCustomerData, memo: e.target.value })}
                                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                                rows={3}
                                                placeholder="3연동 블라인드 화이트, 유리 모루 등"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Work Content Inputs (Detailed) */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                <label className="block text-sm font-bold text-slate-700">시공 상세 내용</label>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">종류 (Category)</label>
                                        <input
                                            type="text"
                                            value={workContent}
                                            onChange={(e) => setWorkContent(e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="예: 3연동 중문, 콤비 블라인드"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">상세 (Detail)</label>
                                        <input
                                            type="text"
                                            value={itemDetail}
                                            onChange={(e) => setItemDetail(e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="예: 초슬림, 화이트 프레임"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">가로 (mm)</label>
                                        <input
                                            type="number"
                                            value={itemWidth}
                                            onChange={(e) => setItemWidth(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">세로 (mm)</label>
                                        <input
                                            type="number"
                                            value={itemHeight}
                                            onChange={(e) => setItemHeight(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">수량</label>
                                        <input
                                            type="number"
                                            value={itemQuantity}
                                            onChange={(e) => setItemQuantity(Number(e.target.value))}
                                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            min={1}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">유리 (Glass)</label>
                                        <input
                                            type="text"
                                            value={itemGlass}
                                            onChange={(e) => setItemGlass(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="예: 모루, 투명"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">색상 (Color)</label>
                                        <input
                                            type="text"
                                            value={itemColor}
                                            onChange={(e) => setItemColor(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="예: 화이트, 블랙"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">일정 유형</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                        onClick={() => setFormType("measure")}
                                        className={`p-3 rounded-lg border-2 font-bold transition ${formType === "measure" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-200 text-slate-600"}`}
                                    >
                                        📏 실측
                                    </button>
                                    <button
                                        onClick={() => setFormType("install")}
                                        className={`p-3 rounded-lg border-2 font-bold transition ${formType === "install" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600"}`}
                                    >
                                        🛠 시공 (신규)
                                    </button>
                                    <button
                                        onClick={() => setFormType("reform")}
                                        className={`p-3 rounded-lg border-2 font-bold transition ${formType === "reform" ? "bg-purple-50 border-purple-500 text-purple-700" : "border-slate-200 text-slate-600"}`}
                                    >
                                        🚪 리폼/수리
                                    </button>
                                    <button
                                        onClick={() => setFormType("as")}
                                        className={`p-3 rounded-lg border-2 font-bold transition ${formType === "as" ? "bg-yellow-50 border-yellow-500 text-yellow-700" : "border-slate-200 text-slate-600"}`}
                                    >
                                        🚑 A/S
                                    </button>
                                </div>

                                {/* AS Defect Type Selection */}
                                {formType === "as" && (
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-yellow-800 mb-2">A/S 사유 (필수)</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAsDefectType("PRODUCT")}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition border ${asDefectType === "PRODUCT" ? "bg-white border-yellow-500 text-yellow-700 shadow-sm" : "border-transparent text-yellow-600 hover:bg-white/50"}`}
                                            >
                                                📦 제품 불량
                                            </button>
                                            <button
                                                onClick={() => setAsDefectType("INSTALL")}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition border ${asDefectType === "INSTALL" ? "bg-white border-yellow-500 text-yellow-700 shadow-sm" : "border-transparent text-yellow-600 hover:bg-white/50"}`}
                                            >
                                                👷‍♂️ 시공 불량
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                                onClick={() => setShowNewScheduleForm(false)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmitSchedule}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                            >
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setNewCustomerData({ ...newCustomerData, address: data.address })}
            />
        </div>
    );
}
