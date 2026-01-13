"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { Order, OrderStatus, Customer } from "@/app/lib/store";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Search, ChevronRight, FileText, CheckCircle2, Clock, DollarSign, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CustomerDetail from "./CustomerDetail";

type TabType = "estimate" | "contract" | "completed";

export default function ContractList() {
    const router = useRouter();
    const { orders, customers } = useGlobalStore();
    const [activeTab, setActiveTab] = useState<TabType>("estimate");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // [NEW] Real DB State
    const [dbOrders, setDbOrders] = useState<Order[]>([]);
    const [dbCustomers, setDbCustomers] = useState<Customer[]>([]);

    // Debug logging
    useEffect(() => {
        console.log("📊 Contract List - dbOrders:", dbOrders.length);
        console.log("📊 Contract List - orders:", orders.length);
        console.log("📊 Active Tab:", activeTab);
    }, [dbOrders, orders, activeTab]);

    // Fetch Real Data
    const fetchRealEstimates = useCallback(async () => {
        const { supabase } = await import("@/app/lib/supabase");

        // 1. Fetch Schedules (Estimates)
        const { data: schedules, error } = await supabase
            .from("sc_schedules")
            .select("*")
            .eq("type", "measure")
            .neq("status", "cancelled")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to fetch schedules:", error);
        }

        // 2. Fetch Measurements with Contracts
        const { data: measurements, error: measError } = await supabase
            .from("measurements")
            .select("*")
            .in("contract_status", ["QUOTE", "CONTRACT_CONFIRMED", "PRODUCING", "COMPLETED"])
            .order("created_at", { ascending: false });

        if (measError) {
            console.error("Failed to fetch measurements:", measError);
        }

        console.log("✅ Fetched measurements with contracts:", measurements?.length || 0);
        if (measurements && measurements.length > 0) {
            console.log("📋 Sample measurement:", measurements[0]);
        }

        // 3. Combine customer IDs from both sources
        const scheduleCustomerIds = (schedules || []).map((s: any) => s.customer_id).filter(Boolean);
        const measurementCustomerNames = (measurements || []).map((m: any) => m.customer_name).filter(Boolean);
        const allCustomerIds = Array.from(new Set([...scheduleCustomerIds]));

        // 4. Fetch Related Customers from crm_customers
        const customerMap: Record<string, any> = {};
        if (allCustomerIds.length > 0) {
            const { data: customersData, error: custError } = await supabase
                .from("crm_customers")
                .select("*")
                .in("id", allCustomerIds);

            if (custError) console.error("Customer Fetch Error:", custError);

            if (customersData) {
                customersData.forEach((c: any) => {
                    customerMap[c.id] = c;
                });
            }
        }

        // 5. Map to Order/Customer Type
        const mappedOrders: Order[] = [];
        const mappedCustomers: Customer[] = [];

        // Process schedules
        for (const s of schedules || []) {
            const c = s.customer_id ? customerMap[s.customer_id] : null;

            if (c) {
                const custObj: Customer = {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    memo: c.memo,
                    createdAt: c.created_at
                };
                if (!mappedCustomers.some(mc => mc.id === custObj.id)) {
                    mappedCustomers.push(custObj);
                }
            }

            let parsedItems: any[] = [];
            try {
                if (typeof s.items_json === 'string') {
                    const parsed = JSON.parse(s.items_json);
                    parsedItems = Array.isArray(parsed) ? parsed : [parsed];
                } else if (Array.isArray(s.items_json)) {
                    parsedItems = s.items_json;
                } else if (s.items_json && typeof s.items_json === 'object') {
                    parsedItems = [s.items_json];
                }
            } catch (e) {
                parsedItems = [];
            }

            mappedOrders.push({
                id: s.id,
                customerId: s.customer_id || "unknown",
                status: (s.status?.toUpperCase() === 'MEASURED') ? 'MEASURED' : ((s.status?.toUpperCase() === 'SCHEDULED') ? 'INSTALL_SCHEDULED' : 'MEASURE_REQUESTED'),
                title: s.title || "견적 문의",
                items: parsedItems,
                estPrice: s.est_amount || 0,
                finalPrice: 0,
                createdAt: s.created_at,
                measureDate: s.visit_date,
                installDate: s.install_date,
                measureFiles: s.photos || [],
                installFiles: [],
                asHistory: [],
                tenantId: "t_head",
                deposit: 0,
                balance: 0,
                paymentStatus: "Unpaid"
            });
        }

        // Process measurements with contracts
        for (const m of measurements || []) {
            // Create virtual customer from measurement data
            const custId = `meas_${m.id}`;
            const custObj: Customer = {
                id: custId,
                name: m.customer_name || "고객",
                phone: m.customer_phone || "",
                address: m.customer_address || "",
                memo: m.memo || "",
                createdAt: m.created_at
            };
            if (!mappedCustomers.some(mc => mc.id === custObj.id)) {
                mappedCustomers.push(custObj);
            }

            // Map payment_status to OrderStatus
            let orderStatus: OrderStatus = "MEASURED";
            if (m.contract_status === "PRODUCING") {
                orderStatus = "PRODUCING";
            } else if (m.contract_status === "CONTRACT_CONFIRMED") {
                orderStatus = "CONTRACT_CONFIRMED";
            } else if (m.contract_status === "COMPLETED") {
                orderStatus = "COMPLETED";
            }

            console.log(`📌 Measurement ${m.id}: contract_status="${m.contract_status}" → orderStatus="${orderStatus}"`);

            mappedOrders.push({
                id: m.id,
                customerId: custId,
                status: orderStatus,
                title: `${m.door_type || "도어"} 계약`,
                items: [],
                estPrice: m.total_price || m.material_price || 0,
                finalPrice: m.total_price || 0,
                createdAt: m.created_at,
                measureDate: m.created_at,
                installDate: m.install_date || null,
                measureFiles: [],
                installFiles: [],
                asHistory: [],
                tenantId: "t_head",
                deposit: m.deposit_amount || 0,
                balance: m.balance_amount || 0,
                paymentStatus: m.payment_status === "FULLY_PAID" ? "Paid" : (m.payment_status === "DEPOSIT_PAID" ? "Partial" : "Unpaid")
            });
        }

        setDbOrders(mappedOrders);
        setDbCustomers(mappedCustomers);
    }, []);

    useEffect(() => {
        fetchRealEstimates(); // Load data for all tabs
    }, [activeTab, fetchRealEstimates]);

    const handleArchiveOrder = async (orderId: string, currentMemo: string = "") => {
        const reason = window.prompt("삭제(취소) 사유를 입력해주세요:", "데이터 오류/중복");
        if (!reason) return;

        const { supabase } = await import("@/app/lib/supabase");

        const { error } = await supabase
            .from("sc_schedules")
            .update({
                status: "cancelled",
                memo: `${currentMemo || ''}\n[Deleted ${new Date().toLocaleDateString()}] ${reason}`
            })
            .eq("id", orderId);

        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            alert("삭제되었습니다.");
            fetchRealEstimates();
        }
    };

    // Derived State
    const selectedCustomerId = useMemo(() => {
        if (!selectedOrderId) return null;
        const allOrders = [...orders, ...dbOrders];
        const order = allOrders.find(o => o.id === selectedOrderId);
        return order ? order.customerId : null;
    }, [selectedOrderId, orders, dbOrders]);

    const filteredOrders = useMemo(() => {
        const allOrders = [...dbOrders, ...orders];
        const allCustomers = [...dbCustomers, ...customers];

        console.log("🔍 Filtering - Total orders:", allOrders.length);
        console.log("🔍 Active Tab:", activeTab);

        const filtered = allOrders.filter(order => {
            let matchesTab = false;
            if (activeTab === "estimate") {
                matchesTab = ["AR_SELECTED", "MEASURE_REQUESTED", "MEASURED"].includes(order.status);
            } else if (activeTab === "contract") {
                matchesTab = ["CONTRACT_CONFIRMED", "PRODUCING", "INSTALL_SCHEDULED", "REFORM_SCHEDULED"].includes(order.status);
            } else if (activeTab === "completed") {
                matchesTab = ["INSTALLED", "REFORM_COMPLETED", "COMPLETED", "AS_COMPLETED"].includes(order.status);
            }

            console.log(`  Order ${order.id}: status="${order.status}", matchesTab=${matchesTab}`);

            if (!matchesTab) return false;

            if (searchTerm) {
                const customer = allCustomers.find(c => c.id === order.customerId);
                const searchLower = searchTerm.toLowerCase();
                const nameMatch = customer?.name.toLowerCase().includes(searchLower);
                const phoneMatch = customer?.phone.includes(searchTerm);
                const addrMatch = customer?.address.includes(searchTerm);
                return nameMatch || phoneMatch || addrMatch;
            }

            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        console.log("✅ Filtered result:", filtered.length);
        return filtered;
    }, [orders, customers, dbOrders, dbCustomers, activeTab, searchTerm]);

    //  Debug: Monitor filteredOrders
    useEffect(() => {
        console.log("🎨 UI Update - filteredOrders.length:", filteredOrders.length);
        if (filteredOrders.length > 0) {
            console.log("🎨 First order:", filteredOrders[0]);
        }
    }, [filteredOrders]);

    const getStatusBadge = (status: OrderStatus) => {
        switch (status) {
            case "AR_SELECTED": return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">가견적(AR)</span>;
            case "MEASURE_REQUESTED": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">실측요청</span>;
            case "MEASURED": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">실측완료</span>;
            case "CONTRACT_CONFIRMED": return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">계약확정</span>;
            case "PRODUCING": return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">생산중</span>;
            case "INSTALL_SCHEDULED": return <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs font-bold">시공예약</span>;
            case "INSTALLED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">시공완료</span>;
            case "COMPLETED": return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">최종마감</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-bold">{status}</span>;
        }
    };

    // Toggle Selection
    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Toggle All
    const toggleAll = () => {
        if (selectedIds.size === filteredOrders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredOrders.map(o => o.id)));
        }
    };

    // Process Single Order
    const handleProcessOrder = useCallback((e: React.MouseEvent, orderId: string) => {
        e.stopPropagation();
        // Check if this is a measurement-based contract (ID starts with meas_ customer ID or is direct measurement ID)
        const isMeasurement = orderId.length === 36; // UUID format = measurement
        if (isMeasurement) {
            router.push(`/admin/purchase-order/new?measurementId=${orderId}`);
        } else {
            router.push(`/admin/purchase-order/new?orderId=${orderId}`);
        }
    }, [router]);

    // Batch Process
    const handleBatchProcess = () => {
        if (selectedIds.size === 0) return;
        alert(`선택된 ${selectedIds.size}건에 대해 일괄 발주를 진행합니다. (기능 준비중)`);
    };

    if (selectedCustomerId) {
        const foundCustomer = dbCustomers.find(c => c.id === selectedCustomerId) || customers.find(c => c.id === selectedCustomerId);
        const allOrders = [...dbOrders, ...orders];
        const uniqueOrders = Array.from(new Map(allOrders.map(item => [item.id, item])).values());
        const foundOrders = uniqueOrders.filter(o => o.customerId === selectedCustomerId);

        return (
            <div className="h-full">
                <CustomerDetail
                    customerId={selectedCustomerId}
                    initialCustomer={foundCustomer}
                    initialOrders={foundOrders}
                    onBack={() => setSelectedOrderId(null)}
                    onGoToConstruction={(orderId) => router.push(`/admin/schedule?orderId=${orderId}`)}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        계약 / 견적 관리
                        {selectedIds.size > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                {selectedIds.size}개 선택됨
                            </span>
                        )}
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBatchProcess}
                            disabled={selectedIds.size === 0}
                            className={`
                                px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2
                                ${selectedIds.size > 0
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"}
                            `}
                        >
                            <CheckCircle2 size={16} />
                            일괄 발주
                        </button>

                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="고객명, 전화번호 검색"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                        {(["estimate", "contract", "completed"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                                className={`
                                    px-4 py-2 rounded-md text-sm font-bold transition-all
                                    ${activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}
                                `}
                            >
                                {tab === "estimate" && "견적 (진행중)"}
                                {tab === "contract" && "계약 (확정/생산)"}
                                {tab === "completed" && "완료 (시공/마감)"}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700" onClick={toggleAll}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.size > 0 && selectedIds.size === filteredOrders.length ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"}`}>
                            {selectedIds.size > 0 && selectedIds.size === filteredOrders.length && <CheckCircle2 size={12} />}
                        </div>
                        <span className="font-bold">전체 선택</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {filteredOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">해당 단계의 내역이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map(order => {
                            const allCustomers = [...dbCustomers, ...customers];
                            const customer = allCustomers.find(c => c.id === order.customerId);
                            const isSelected = selectedIds.has(order.id);

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className={`
                                        bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative
                                        ${isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:border-indigo-200"}
                                    `}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="mt-1"
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(order.id); }}
                                            >
                                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white hover:border-indigo-400"}`}>
                                                    {isSelected && <CheckCircle2 size={14} />}
                                                </div>
                                            </div>

                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${activeTab === 'contract' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {customer?.name.slice(0, 1) || "?"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-800 text-lg" title={`ID: ${order.customerId}`}>
                                                        {customer?.name || "고객 정보 없음"}
                                                    </span>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <p className="text-slate-500 text-sm mb-1">{customer?.address || "주소 미입력"}</p>
                                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {format(new Date(order.createdAt), "yyyy.MM.dd", { locale: ko })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign size={12} />
                                                        예상: {order.estPrice?.toLocaleString() || 0}원
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-between items-end h-full min-h-[50px]">
                                            {order.finalPrice > 0 && (
                                                <div className="text-lg font-bold text-indigo-600 mb-1">
                                                    {order.finalPrice.toLocaleString()}원
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-auto">
                                                {/* 입금 기록 버튼 */}
                                                {order.paymentStatus !== "Paid" && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const paymentType = confirm("자재비를 입금하셨나요?\n\n예 = 자재비\n아니오 = 잔금") ? "material" : "balance";
                                                            const label = paymentType === "material" ? "자재비" : "잔금";
                                                            const amountStr = prompt(`${label} 입금액을 입력하세요:`);
                                                            if (!amountStr) return;

                                                            const amount = Number(amountStr);
                                                            if (isNaN(amount) || amount <= 0) {
                                                                alert("올바른 금액을 입력하세요.");
                                                                return;
                                                            }

                                                            try {
                                                                const payload: any = {
                                                                    id: order.id,
                                                                    payment_type: paymentType === "material" ? "deposit" : "balance"
                                                                };

                                                                if (paymentType === "material") {
                                                                    payload.deposit_amount = (order.deposit || 0) + amount;
                                                                } else {
                                                                    payload.balance_amount = amount;
                                                                }

                                                                const res = await fetch('/api/measurements/update-payment', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify(payload)
                                                                });

                                                                if (!res.ok) throw new Error('입금 기록 실패');

                                                                const result = await res.json();
                                                                alert(`✅ 입금이 기록되었습니다!\n상태: ${result.payment_status}\n계약: ${result.contract_status}`);
                                                                fetchRealEstimates();
                                                            } catch (e: any) {
                                                                alert(`❌ 오류: ${e.message}`);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                                    >
                                                        💰 입금 기록
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => handleProcessOrder(e, order.id)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                                >
                                                    발주처리
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleArchiveOrder(order.id);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                    title="목록에서 삭제(취소 처리)"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <ChevronRight className="text-slate-300 group-hover:text-indigo-400 transition" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
