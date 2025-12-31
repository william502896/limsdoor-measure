"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useGlobalStore } from "@/app/lib/store-context";
import { Order } from "@/app/lib/store";
import { X, Plus, Calendar as CalendarIcon } from "lucide-react";
import AddressSearchModal from "@/app/components/AddressSearchModal";

interface ScheduleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    editingOrder: Order | null;
}

export default function ScheduleFormModal({ isOpen, onClose, selectedDate, editingOrder }: ScheduleFormModalProps) {
    const { customers, createOrderWithCustomer, updateOrder } = useGlobalStore();
    const effectiveDate = selectedDate || new Date();

    // --- State ---
    const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
    const [formCustomerId, setFormCustomerId] = useState("");
    const [newCustomerData, setNewCustomerData] = useState({
        name: "",
        phone: "",
        address: "",
        memo: ""
    });

    const [formType, setFormType] = useState<"measure" | "install" | "reform" | "as">("install");
    const [asDefectType, setAsDefectType] = useState<"PRODUCT" | "INSTALL">("PRODUCT");

    // Item Fields
    const [workContent, setWorkContent] = useState("");
    const [itemDetail, setItemDetail] = useState("");
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemWidth, setItemWidth] = useState("");
    const [itemHeight, setItemHeight] = useState("");
    const [itemGlass, setItemGlass] = useState("");
    const [itemColor, setItemColor] = useState("");

    const [addressModalOpen, setAddressModalOpen] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (isOpen) {
            if (editingOrder) {
                // Edit Mode Setup
                setFormCustomerId(editingOrder.customerId);
                setCustomerMode("existing");

                // Restore Type
                if (editingOrder.serviceType === "REFORM") setFormType("reform");
                else if (editingOrder.serviceType === "AS") {
                    setFormType("as");
                    if (editingOrder.asDefect) setAsDefectType(editingOrder.asDefect);
                } else if (editingOrder.status === "MEASURE_REQUESTED") setFormType("measure");
                else setFormType("install");

                // Restore Content
                const item = editingOrder.items[0];
                if (item) {
                    setWorkContent(item.category);
                    setItemDetail(item.detail);
                    setItemQuantity(item.quantity);
                    setItemWidth(String(item.width || ""));
                    setItemHeight(String(item.height || ""));
                    setItemGlass(item.glass);
                    setItemColor(item.color);
                }
            } else {
                // New Mode Reset
                resetForm();
            }
        }
    }, [isOpen, editingOrder]);

    const resetForm = () => {
        setCustomerMode("existing");
        setFormCustomerId("");
        setNewCustomerData({ name: "", phone: "", address: "", memo: "" });
        setFormType("install");
        setAsDefectType("PRODUCT");

        setWorkContent("");
        setItemDetail("");
        setItemQuantity(1);
        setItemWidth("");
        setItemHeight("");
        setItemGlass("");
        setItemColor("");
    };

    const handleSave = () => {
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
            serviceType = undefined;
        } else if (formType === "reform") {
            initialStatus = "REFORM_SCHEDULED";
            serviceType = "REFORM";
        } else if (formType === "as") {
            initialStatus = "AS_SCHEDULED";
            serviceType = "AS";
            asDefect = asDefectType;
        } else {
            initialStatus = "INSTALL_SCHEDULED";
            serviceType = "NEW_INSTALL";
        }

        // Construct Items
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

        if (editingOrder) {
            updateOrder(editingOrder.id, {
                customerId: finalCustomerId,
                items: finalItems,
                status: initialStatus,
                serviceType: serviceType,
                asDefect: asDefect,
                installDate: formType !== "measure" ? format(effectiveDate, "yyyy-MM-dd") : undefined,
                measureDate: formType === "measure" ? format(effectiveDate, "yyyy-MM-dd") : undefined,
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
                measureDate: formType === "measure" ? format(effectiveDate, "yyyy-MM-dd") : undefined,
                installDate: formType !== "measure" ? format(effectiveDate, "yyyy-MM-dd") : undefined,
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

        onClose();
        resetForm();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Plus size={20} />
                        {editingOrder ? "일정 수정" : `${format(effectiveDate, "M월 d일", { locale: ko })} 일정 등록`}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition">
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
                                    <label className="block text-xs font-bold text-slate-600 mb-1">메모</label>
                                    <textarea
                                        value={newCustomerData.memo}
                                        onChange={(e) => setNewCustomerData({ ...newCustomerData, memo: e.target.value })}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                        rows={3}
                                        placeholder="특이사항 입력"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detailed Inputs */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">시공 상세 내용</label>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">종류</label>
                                <input
                                    type="text"
                                    value={workContent}
                                    onChange={(e) => setWorkContent(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="예: 3연동 중문"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">상세</label>
                                <input
                                    type="text"
                                    value={itemDetail}
                                    onChange={(e) => setItemDetail(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="예: 초슬림, 화이트"
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
                                <label className="block text-xs font-bold text-slate-500 mb-1">유리</label>
                                <input
                                    type="text"
                                    value={itemGlass}
                                    onChange={(e) => setItemGlass(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="모루, 투명 등"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">색상</label>
                                <input
                                    type="text"
                                    value={itemColor}
                                    onChange={(e) => setItemColor(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="화이트, 블랙 등"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">일정 유형</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button onClick={() => setFormType("measure")} className={`p-3 rounded-lg border-2 font-bold transition ${formType === "measure" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-200 text-slate-600"}`}>📏 실측</button>
                            <button onClick={() => setFormType("install")} className={`p-3 rounded-lg border-2 font-bold transition ${formType === "install" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600"}`}>🛠 시공</button>
                            <button onClick={() => setFormType("reform")} className={`p-3 rounded-lg border-2 font-bold transition ${formType === "reform" ? "bg-purple-50 border-purple-500 text-purple-700" : "border-slate-200 text-slate-600"}`}>🚪 리폼</button>
                            <button onClick={() => setFormType("as")} className={`p-3 rounded-lg border-2 font-bold transition ${formType === "as" ? "bg-yellow-50 border-yellow-500 text-yellow-700" : "border-slate-200 text-slate-600"}`}>🚑 A/S</button>
                        </div>

                        {formType === "as" && (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 animate-in fade-in">
                                <label className="block text-xs font-bold text-yellow-800 mb-2">A/S 사유</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setAsDefectType("PRODUCT")} className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition border ${asDefectType === "PRODUCT" ? "bg-white border-yellow-500 text-yellow-700 shadow-sm" : "border-transparent text-yellow-600 hover:bg-white/50"}`}>📦 제품 불량</button>
                                    <button onClick={() => setAsDefectType("INSTALL")} className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition border ${asDefectType === "INSTALL" ? "bg-white border-yellow-500 text-yellow-700 shadow-sm" : "border-transparent text-yellow-600 hover:bg-white/50"}`}>👷‍♂️ 시공 불량</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end sticky bottom-0">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">취소</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">저장</button>
                </div>
            </div>

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data: any) => {
                    setNewCustomerData(prev => ({ ...prev, address: data.address || "" }));
                    setAddressModalOpen(false);
                }}
            />
        </div>
    );
}
