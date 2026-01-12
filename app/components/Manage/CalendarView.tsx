"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { useSearchParams } from "next/navigation";
import { ko } from "date-fns/locale";
import { Order } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Plus, Trash2, Pencil, CheckCircle } from "lucide-react";
import AddressSearchModal from "@/app/components/AddressSearchModal";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";


export default function CalendarView({ onSelectCustomer, filterType = "all" }: { onSelectCustomer?: (customerId: string) => void, filterType?: string }) {
    const searchParams = useSearchParams();
    const openScheduleId = searchParams.get("openScheduleId");

    const { orders, customers, addOrder, addCustomer, deleteOrder, updateOrder, createOrderWithCustomer } = useGlobalStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);

    const supabase = createSupabaseBrowser();

    // Prevent re-opening infinite loop: track processed ID
    const hasHandledDeepLink = React.useRef<string | null>(null);

    // Deep Link Logic
    useEffect(() => {
        const fetchAndOpen = async () => {
            if (openScheduleId && hasHandledDeepLink.current !== openScheduleId) {
                // Mark as handled immediately to prevent double-fire
                // Note: If fetch fails, we might want to reset, but for now prevent loop is priority.

                // 1. Try to find in Store first
                let targetOrder = orders.find(o => o.id === openScheduleId);

                // 2. If not in store, or missing date, fetch from DB specific record
                // (Robustness for redirection workflow, also ensures hidden measurement_id is fetched)
                // We force fetch if store order lacks measurementId (store type lacks it)
                if (!targetOrder || !targetOrder.installDate || true) {
                    const { data: fetchOrder, error } = await supabase
                        .from("sc_schedules")
                        .select("*, crm_customers(*)") // 'measurement_id' is in '*'
                        .eq("id", openScheduleId)
                        .single();

                    if (fetchOrder) {
                        // 2.1 Fetch related Purchase Order for details
                        const { data: poData } = await supabase
                            .from("sc_purchase_orders")
                            .select("items_json")
                            .eq("schedule_id", fetchOrder.id)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .single();

                        const mappedItems = poData?.items_json?.map((i: any) => ({
                            category: i.category,
                            detail: `${i.glass} ${i.color} ${i.design} `,
                            glass: i.glass,
                            color: i.color,
                            width: Number(i.width),
                            height: Number(i.height),
                            quantity: Number(i.qty || 1),
                            glassCode: i.glassCode
                        })) || [];

                        // 2.2 Fetch Measurement Info if linked
                        let measurementCustomer = null;
                        if (fetchOrder.measurement_id) {
                            const { data: measData } = await supabase
                                .from("measurements")
                                .select("customer_name, customer_phone, customer_address")
                                .eq("id", fetchOrder.measurement_id)
                                .single();

                            if (measData) {
                                measurementCustomer = {
                                    name: measData.customer_name,
                                    phone: measData.customer_phone,
                                    address: measData.customer_address
                                };
                            }
                        }

                        // Determine Customer Data: Priority Measurement > CRM > Fallback
                        // (Changed to prioritize Measurement because CRM data may be incorrect/stale)
                        let finalCustomer = measurementCustomer ? {
                            name: measurementCustomer.name,
                            phone: measurementCustomer.phone,
                            address: measurementCustomer.address,
                            id: "temp-meas",
                            memo: ""
                        } : fetchOrder.crm_customers;


                        targetOrder = {
                            id: fetchOrder.id,
                            title: fetchOrder.title,
                            customerName: finalCustomer?.name || fetchOrder.customer_name || "미지정",
                            customerId: fetchOrder.customer_id,
                            installDate: fetchOrder.scheduled_date, // Map scheduled_date to installDate
                            status: fetchOrder.status,
                            items: mappedItems, // Populated from PO
                            measureDate: fetchOrder.created_at, // Fallback
                            crm_customers: finalCustomer
                        } as any;
                    }
                }

                if (targetOrder) {
                    hasHandledDeepLink.current = openScheduleId; // Mark successfully handled

                    // Determine date to show
                    const targetDateStr = targetOrder.installDate || targetOrder.measureDate;
                    if (targetDateStr) {
                        const targetDate = parseISO(targetDateStr);
                        setCurrentDate(targetDate); // Move calendar to that month
                        setSelectedDate(targetDate); // Select the day
                        handleEditSchedule(targetOrder); // Open Modal
                    } else {
                        // If still no date, just open modal
                        handleEditSchedule(targetOrder);
                    }
                }
            }
        };
        fetchAndOpen();
    }, [openScheduleId, orders]);

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
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // For Bulk Delete

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
            const targetDate = o.installDate ? parseISO(o.installDate) : (o.measureDate ? parseISO(o.measureDate) : null);
            if (!targetDate || !isSameDay(targetDate, date)) return false;

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
            case "AS": return `AS(${defect === "PRODUCT" ? "제품" : "시공"})`;
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

        // Ensure customer data is populated even if "Existing" mode logic relies on store lookup
        setFormCustomerId(order.customerId);
        setCustomerMode("existing");

        // Manually Populate "New" fields as fallback for display (or if user switches to New)
        // AND this helps if the UI uses these fields for "Existing" customer display if getting from store fails
        if (order.crm_customers) {
            setNewCustomerData({
                name: order.crm_customers.name,
                phone: order.crm_customers.phone,
                address: order.crm_customers.address || "",
                memo: ""
            });
            // If the ID is our synthetic one, switch to NEW mode so user can save it properly
            if (order.crm_customers.id === "temp-meas") {
                setCustomerMode("new");
                setFormCustomerId(""); // Clear existing selection to avoid confusion
            }
        } else if (order.customerName) {
            // Fallback to flat props if object missing
            setNewCustomerData(prev => ({ ...prev, name: order.customerName }));
        }

        // Restore Type
        if (order.serviceType === "REFORM") setFormType("reform");
        else if (order.serviceType === "AS") {
            setFormType("as");
            if (order.asDefect) setAsDefectType(order.asDefect);
        } else if (order.status === "MEASURE_REQUESTED") setFormType("measure");
        else setFormType("install");

        // Restore Content
        // Map English codes to Korean for display if needed
        const KOREAN_DISPLAY_MAP: Record<string, string> = {
            "1S_MANUAL": "원슬라이딩", "3T_MANUAL": "3연동 수동", "JT_MANUAL": "3연동 수동",
            "SWING": "스윙도어", "FLUORO": "FLUORO", "ANOD": "ANOD",
            "WHITE": "화이트", "BLACK": "블랙", "CHAMPAGNE_GOLD": "샴페인골드",
            "DARKGRAY_CLEAR": "다크그레이 투명", "DEEP_GRAY": "딥그레이"
        };
        const content = order.items.map(i => {
            const rawCat = i.category;
            const translatedCat = KOREAN_DISPLAY_MAP[rawCat] || rawCat;
            return translatedCat;
        }).filter(c => c !== "미지정").join(", ");
        setWorkContent(content);

        // Restore First Item Details (for Form)
        if (order.items && order.items.length > 0) {
            const first = order.items[0];

            const transGlass = KOREAN_DISPLAY_MAP[first.glass || ""] || first.glass || "";
            const transColor = KOREAN_DISPLAY_MAP[first.color || ""] || first.color || "";

            // Reconstruct detail for display if possible, or fallback to straight translation of the whole string if it matches a key (unlikely for detail)
            // But better: reconstruct it from translated components like "Glass Color Design"
            // The design might need translation too, but it's often user input or mapped elsewhere. 
            // Let's assume design is simple or already Korean if manual.
            // If the original detail was constructed as "Glass Color Design", we can reconstruct it.
            // But first.detail might be legacy. Let's try to preserve design part if we can't extract it.
            // Simplified approach: Reconstruct "Glass Color" part, append Design.

            // Actually, best effort:
            setItemGlass(transGlass);
            setItemColor(transColor);

            // Reconstruct detail string to ensure it looks Korean
            // remove English parts from the original detail if they match, or just use translatedGlass + translatedColor + Design
            // We don't have separate design field easily available in 'first' object logic above (it was in i.design in useEffect but mapped to only a few fields).
            // Wait, mappedItems in useEffect has properties: category, detail, glass, color, width, height, quantity, glassCode.
            // It does NOT have 'design' explicitly in the OrderItem interface? 
            // I need to check the OrderItem interface in store.ts?
            // Assuming 'detail' state is just a text string for the user to edit.

            // Let's set itemDetail to constructed string:
            // "Glass Color (Details...)"
            setItemDetail(`${transGlass} ${transColor} ${first.detail.replace(first.glass || "", "").replace(first.color || "", "").trim()} `.trim());

            setItemQuantity(first.quantity);
            setItemWidth(String(first.width || ""));
            setItemHeight(String(first.height || ""));
        }

        setShowNewScheduleForm(true);
    };


    const handleSubmitSchedule = async () => {
        if (!selectedDate) {
            alert("날짜를 선택해주세요.");
            return;
        }

        let finalCustomerId = formCustomerId;
        let newCustomerObj = undefined;

        // 1. Handle Customer Creation / Selection
        if (customerMode === "new") {
            if (!newCustomerData.name || !newCustomerData.phone) {
                alert("고객 이름과 전화번호는 필수입니다.");
                return;
            }
            // Ideally we insert into DB and get ID back.
            try {
                // Check if customer exists first to avoid duplicate errors
                const { data: existingCus } = await supabase
                    .from("crm_customers")
                    .select("*")
                    .eq("phone", newCustomerData.phone)
                    .maybeSingle();

                if (existingCus) {
                    // Use existing customer
                    finalCustomerId = existingCus.id;
                    newCustomerObj = {
                        id: existingCus.id,
                        name: existingCus.name,
                        phone: existingCus.phone,
                        address: existingCus.address,
                        memo: existingCus.memo,
                        createdAt: existingCus.created_at,
                    };
                    // Optional: Update address/name if changed? For now, we trust existing record to be "primary".
                } else {
                    // Create new
                    const { data: insertedCustomer, error: customerError } = await supabase
                        .from("crm_customers")
                        .insert({
                            name: newCustomerData.name,
                            phone: newCustomerData.phone,
                            address: newCustomerData.address,
                            memo: newCustomerData.memo,
                            // created_at is auto
                        })
                        .select()
                        .single();

                    if (customerError) throw customerError;
                    if (insertedCustomer) {
                        finalCustomerId = insertedCustomer.id;
                        newCustomerObj = {
                            id: insertedCustomer.id,
                            name: insertedCustomer.name,
                            phone: insertedCustomer.phone,
                            address: insertedCustomer.address,
                            memo: insertedCustomer.memo,
                            createdAt: insertedCustomer.created_at,
                        };
                    }
                }
            } catch (e: any) {
                console.error("Customer creation/search failed", e);
                const msg = e.message || e.details || e.hint || JSON.stringify(e);
                alert(`고객 등록 실패: ${msg} `);
                return;
            }
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

        // 2. Handle Schedule & Order
        if (editingOrderId) {
            // UPDATE
            try {
                // Update Schedule
                const { error: scheduleError } = await supabase
                    .from("sc_schedules")
                    .update({
                        customer_id: finalCustomerId,
                        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
                        status: initialStatus,
                        title: workContent // Sync title with category/workContent
                    })
                    .eq("id", editingOrderId);

                if (scheduleError) throw scheduleError;

                // Update PO (Items)
                // We assume 1:1 relationship for simplicity in this view, 
                // or we update the most recent one linked to this schedule.
                // For robustness, let's find the PO linked to this schedule.
                const { data: po, error: poFetchError } = await supabase
                    .from("sc_purchase_orders")
                    .select("id")
                    .eq("schedule_id", editingOrderId)
                    .limit(1)
                    .maybeSingle();

                const dbItems = finalItems.map(i => ({
                    category: i.category,
                    glass: i.glass,
                    color: i.color,
                    design: i.detail, // mapping detail to design or strictly detail? 'detail' in store, 'design' in DB sometimes.
                    width: i.width,
                    height: i.height,
                    qty: i.quantity,
                    glassCode: i.glass // fallback
                }));

                if (po) {
                    await supabase
                        .from("sc_purchase_orders")
                        .update({ items_json: dbItems })
                        .eq("id", po.id);
                } else {
                    // Create PO if missing
                    await supabase
                        .from("sc_purchase_orders")
                        .insert({
                            schedule_id: editingOrderId,
                            customer_id: finalCustomerId,
                            items_json: dbItems,
                            status: "SAVED"
                        });
                }

                // Local Store Update
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

            } catch (e: any) {
                console.error("Update failed", e);
                alert(`수정 실패: ${e.message} `);
                return;
            }

        } else {
            // CREATE
            try {
                // Insert Schedule
                const { data: newSchedule, error: scheduleError } = await supabase
                    .from("sc_schedules")
                    .insert({
                        customer_id: finalCustomerId,
                        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
                        status: initialStatus,
                        title: workContent,
                        // created_at auto
                    })
                    .select()
                    .single();

                if (scheduleError) throw scheduleError;

                // Insert PO
                const dbItems = finalItems.map(i => ({
                    category: i.category,
                    glass: i.glass,
                    color: i.color,
                    design: i.detail,
                    width: i.width,
                    height: i.height,
                    qty: i.quantity
                }));

                await supabase
                    .from("sc_purchase_orders")
                    .insert({
                        schedule_id: newSchedule.id,
                        customer_id: finalCustomerId,
                        items_json: dbItems,
                        status: "SAVED"
                    });

                // Local Store Update
                const newOrder: Order = {
                    id: newSchedule.id,
                    customerId: finalCustomerId,
                    tenantId: "t_head",
                    items: finalItems,
                    status: initialStatus,
                    serviceType: serviceType,
                    asDefect: asDefect,
                    measureDate: formType === "measure" ? format(selectedDate, "yyyy-MM-dd") : undefined,
                    installDate: formType !== "measure" ? format(selectedDate, "yyyy-MM-dd") : undefined,
                    createdAt: new Date().toISOString(), // or newSchedule.created_at
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

            } catch (e: any) {
                console.error("Create failed", e);
                alert(`등록 실패: ${e.message} `);
                return;
            }
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
            <div className="grid grid-cols-7 mb-2 text-center font-bold border-b-2 border-slate-300 pb-3">
                {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                    <div key={d} className={`py-2 text-base ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-slate-700"}`}>{d}</div>
                ))}
            </div>

            {/* Grid Days */}
            <div className="grid grid-cols-7 gap-1 flex-1">
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
                                min-h-[140px] p-3 transition-all cursor-pointer border-2 rounded-lg
                                ${isCurrentMonth
                                    ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                                    : "bg-slate-50/50 border-slate-100 text-slate-400"}
                                ${isSelected && "ring-4 ring-indigo-400 border-indigo-500 shadow-lg z-10"}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`
                                    text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full
                                    ${isToday
                                        ? "bg-red-500 text-white shadow-lg scale-110"
                                        : isCurrentMonth
                                            ? "text-slate-800"
                                            : "text-slate-400"}
                                `}>
                                    {format(day, "d")}
                                </span>
                                {dayOrders.length > 0 && (
                                    <span className="text-xs font-bold bg-indigo-500 text-white px-2 py-1 rounded-full shadow-sm">
                                        {dayOrders.length}건
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {dayOrders.slice(0, 3).map(order => {
                                    const customer = customers.find(c => c.id === order.customerId);
                                    return (
                                        <div key={order.id} className={`text-xs px-2 py-1.5 rounded-md border-l-4 font-medium overflow-hidden whitespace-nowrap text-ellipsis ${getStatusColor(order.status)}`}>
                                            <span className="font-bold mr-1">{customer?.name}</span>
                                            <span className="opacity-80">{order.items[0]?.category}</span>
                                        </div>
                                    );
                                })}
                                {dayOrders.length > 3 && (
                                    <div className="text-xs text-slate-500 text-center font-semibold py-1">
                                        + {dayOrders.length - 3}건 더보기
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedDate && !showNewScheduleForm && (() => {
                const selectedDayOrders = getDayOrders(selectedDate);
                return (
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

                            {/* Bulk Actions Toolbar */}
                            <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={selectedDayOrders.length > 0 && selectedIds.length === selectedDayOrders.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds(selectedDayOrders.map(o => o.id));
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                    />
                                    <span className="text-sm text-slate-600 font-medium">전체 선택</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (selectedIds.length === 0) return;
                                            if (confirm(`선택한 ${selectedIds.length}개의 일정을 삭제하시겠습니까?`)) {
                                                try {
                                                    // First delete related purchase orders
                                                    const { error: poError } = await supabase
                                                        .from("sc_purchase_orders")
                                                        .delete()
                                                        .in("schedule_id", selectedIds);

                                                    if (poError) throw poError;

                                                    // Then delete schedules
                                                    const { error } = await supabase
                                                        .from("sc_schedules")
                                                        .delete()
                                                        .in("id", selectedIds);

                                                    if (error) throw error;

                                                    // Update Local Store
                                                    selectedIds.forEach(id => deleteOrder(id));
                                                    setSelectedIds([]);
                                                    alert("삭제되었습니다.");
                                                } catch (e: any) {
                                                    console.error("Delete failed:", {
                                                        message: e.message,
                                                        hint: e.hint,
                                                        details: e.details,
                                                        code: e.code,
                                                        fullError: e
                                                    });
                                                    const errorMsg = e.message || e.hint || e.details || JSON.stringify(e);
                                                    alert(`삭제 실패: ${errorMsg}`);
                                                }
                                            }
                                        }}
                                        disabled={selectedIds.length === 0}
                                        className={`px - 3 py - 1.5 rounded text - xs font - bold transition flex items - center gap - 1
                                        ${selectedIds.length > 0
                                                ? "bg-red-100 text-red-600 hover:bg-red-200"
                                                : "bg-slate-100 text-slate-300 cursor-not-allowed"
                                            }
`}
                                    >
                                        <Trash2 size={14} />
                                        선택 삭제 ({selectedIds.length})
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (selectedDayOrders.length === 0) return;
                                            if (confirm("이 날짜의 모든 일정을 삭제하시겠습니까? (복구 불가)")) {
                                                try {
                                                    const allIds = selectedDayOrders.map(o => o.id);

                                                    // First delete related purchase orders
                                                    const { error: poError } = await supabase
                                                        .from("sc_purchase_orders")
                                                        .delete()
                                                        .in("schedule_id", allIds);

                                                    if (poError) throw poError;

                                                    // Then delete schedules
                                                    const { error } = await supabase
                                                        .from("sc_schedules")
                                                        .delete()
                                                        .in("id", allIds);

                                                    if (error) throw error;

                                                    // Update Local Store
                                                    allIds.forEach(id => deleteOrder(id));
                                                    setSelectedIds([]);
                                                    alert("전체 삭제되었습니다.");
                                                } catch (e: any) {
                                                    console.error("Delete All failed:", {
                                                        message: e.message,
                                                        hint: e.hint,
                                                        details: e.details,
                                                        code: e.code,
                                                        fullError: e
                                                    });
                                                    const errorMsg = e.message || e.hint || e.details || JSON.stringify(e);
                                                    alert(`삭제 실패: ${errorMsg}`);
                                                }
                                            }
                                        }}
                                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50 transition"
                                    >
                                        전체 삭제
                                    </button>
                                </div>
                            </div>

                            <div className="p-0 max-h-[60vh] overflow-y-auto">
                                {selectedDayOrders.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {selectedDayOrders.map(order => {
                                            const customer = customers.find(c => c.id === order.customerId);
                                            const isSelected = selectedIds.includes(order.id);
                                            return (
                                                <div
                                                    key={order.id}
                                                    className={`p - 4 transition - colors cursor - pointer group flex gap - 3 ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"} `}
                                                    onClick={() => {
                                                        // Toggle selection on content click if needed, or keeping explicit?
                                                        // Let's make content click toggle selection for UX, but right side buttons specific.
                                                        if (isSelected) {
                                                            setSelectedIds(prev => prev.filter(id => id !== order.id));
                                                        } else {
                                                            setSelectedIds(prev => [...prev, order.id]);
                                                        }
                                                    }}
                                                >
                                                    {/* Checkbox */}
                                                    <div className="pt-1" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedIds(prev => [...prev, order.id]);
                                                                } else {
                                                                    setSelectedIds(prev => prev.filter(id => id !== order.id));
                                                                }
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px - 2 py - 0.5 rounded text - xs font - bold border ${getStatusColor(order.status, order.serviceType)} `}>
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
                                                                            if (confirm("시공(작업) 완료 처리하시겠습니까?")) {
                                                                                let newStatus: any = "INSTALLED";
                                                                                if (order.serviceType === "REFORM") newStatus = "REFORM_COMPLETED";
                                                                                if (order.serviceType === "AS") newStatus = "AS_COMPLETED";

                                                                                updateOrder(order.id, { status: newStatus });
                                                                            }
                                                                        }}
                                                                        className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 transition border-r border-slate-200"
                                                                        title="시공/작업 완료"
                                                                    >
                                                                        <CheckCircle size={14} />
                                                                    </button>
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
                );
            })()}


            {/* New Schedule Form Modal */}
            {
                showNewScheduleForm && selectedDate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Plus size={20} />
                                    {format(selectedDate, "M월 d일", { locale: ko })} 일정 {editingOrderId ? "수정" : "등록"}
                                </h3>
                                <button onClick={closeDetail} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {/* Customer Mode Toggle */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">고객 정보</label>
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => setCustomerMode("existing")}
                                            className={`flex - 1 p - 3 rounded - lg border - 2 font - bold transition ${customerMode === "existing" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600"} `}
                                        >
                                            기존 고객
                                        </button>
                                        <button
                                            onClick={() => setCustomerMode("new")}
                                            className={`flex - 1 p - 3 rounded - lg border - 2 font - bold transition ${customerMode === "new" ? "bg-green-50 border-green-500 text-green-700" : "border-slate-200 text-slate-600"} `}
                                        >
                                            신규 고객
                                        </button>
                                    </div>

                                    {/* Existing Customer Mode */}
                                    {customerMode === "existing" && (
                                        <select
                                            value={formCustomerId || ""}
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
                                                <label className="block text-xs font-bold text-slate-600 mb-1">고객명 <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={newCustomerData.name}
                                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder="고객명 입력"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">연락처 <span className="text-red-500">*</span></label>
                                                <input
                                                    type="tel"
                                                    value={newCustomerData.phone}
                                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder="010-0000-0000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">주소/현장명 <span className="text-red-500">*</span></label>
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={newCustomerData.address}
                                                        onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                                        className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                        placeholder="주소 입력"
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
                                            className={`p - 3 rounded - lg border - 2 font - bold transition ${formType === "measure" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-200 text-slate-600"} `}
                                        >
                                            📏 실측
                                        </button>
                                        <button
                                            onClick={() => setFormType("install")}
                                            className={`p - 3 rounded - lg border - 2 font - bold transition ${formType === "install" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600"} `}
                                        >
                                            🛠 시공 (신규)
                                        </button>
                                        <button
                                            onClick={() => setFormType("reform")}
                                            className={`p - 3 rounded - lg border - 2 font - bold transition ${formType === "reform" ? "bg-purple-50 border-purple-500 text-purple-700" : "border-slate-200 text-slate-600"} `}
                                        >
                                            🚪 리폼/수리
                                        </button>
                                        <button
                                            onClick={() => setFormType("as")}
                                            className={`p - 3 rounded - lg border - 2 font - bold transition ${formType === "as" ? "bg-yellow-50 border-yellow-500 text-yellow-700" : "border-slate-200 text-slate-600"} `}
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
                                                    className={`flex - 1 py - 2 px - 3 rounded - md text - sm font - bold transition border ${asDefectType === "PRODUCT" ? "bg-white border-yellow-500 text-yellow-700 shadow-sm" : "border-transparent text-yellow-600 hover:bg-white/50"} `}
                                                >
                                                    📦 제품 불량
                                                </button>
                                                <button
                                                    onClick={() => setAsDefectType("INSTALL")}
                                                    className={`flex - 1 py - 2 px - 3 rounded - md text - sm font - bold transition border ${asDefectType === "INSTALL" ? "bg-white border-yellow-500 text-yellow-700 shadow-sm" : "border-transparent text-yellow-600 hover:bg-white/50"} `}
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
                                    {editingOrderId ? "수정" : "등록"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setNewCustomerData({ ...newCustomerData, address: data.address })}
            />
        </div >
    );
}
