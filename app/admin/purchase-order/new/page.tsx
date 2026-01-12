"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { ArrowLeft, Save, Building2, Calculator, Truck, Calendar, CheckCircle2 } from "lucide-react";
import { calculateMisotechPrice, mapToPricingInput } from "@/app/lib/misotech-pricing";
import { format } from "date-fns";

import { Suspense } from "react";

function NewPurchaseOrderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderIdParam = searchParams.get("orderId");
    const measurementIdParam = searchParams.get("measurementId");
    const purchaseOrderIdParam = searchParams.get("purchaseOrderId");

    const orderId = (orderIdParam && orderIdParam !== "null") ? orderIdParam : null;
    const measurementId = (measurementIdParam && measurementIdParam !== "null") ? measurementIdParam : null;
    const purchaseOrderId = (purchaseOrderIdParam && purchaseOrderIdParam !== "null") ? purchaseOrderIdParam : null;

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [partners, setPartners] = useState<any[]>([]);
    const [measData, setMeasData] = useState<any>(null); // Captured measurement data
    const [companyId, setCompanyId] = useState<string | null>(null);

    // Form State
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

    // Detailed PO Items
    const [poItems, setPoItems] = useState<any[]>([]);

    // Logistics & Dates
    const [deliveryMethod, setDeliveryMethod] = useState("PICKUP");
    const [arrivalExpectedDate, setArrivalExpectedDate] = useState("");
    const [memo, setMemo] = useState("");

    const supabase = createSupabaseBrowser();

    // Init Data
    useEffect(() => {
        if (!orderId && !measurementId && !purchaseOrderId) {
            setLoading(false); // Stop loading if no IDs
            return;
        }

        const init = async () => {
            setLoading(true);

            let orderData: any = null;
            let measData: any = null;
            let poData: any = null;

            if (purchaseOrderId) {
                const { data, error } = await supabase.from("sc_purchase_orders")
                    .select("*, sc_schedules(*, crm_customers(*)), partners(*)")
                    .eq("id", purchaseOrderId)
                    .single();

                if (error || !data) {
                    alert("발주서 정보를 불러오지 못했습니다.");
                    setLoading(false);
                    return;
                }
                poData = data;
                orderData = data.sc_schedules;

                setSelectedPartnerId(data.partner_id);
                setDeliveryMethod(data.delivery_method || "PICKUP");
                setArrivalExpectedDate(data.arrival_expected_date || "");
                setMemo(data.memo || "");
                setPoItems(data.items_json || []);

            } else if (measurementId) {
                const { data, error } = await supabase.from("measurements").select("*").eq("id", measurementId).single();
                if (error || !data) {
                    alert("실측 정보를 불러오지 못했습니다.");
                    return;
                }
                measData = data;
                setMeasData(data); // Store in state for save handler

                // Pre-fill date if available
                if (data.install_date) {
                    setArrivalExpectedDate(data.install_date);
                }

                orderData = {
                    id: data.id,
                    crm_customers: { name: data.customer_name, phone: data.customer_phone, address: data.customer_address },
                    items_json: [] // Processed below
                };
            } else if (orderId) {
                const { data, error } = await supabase.from("sc_schedules").select("*, crm_customers(*)").eq("id", orderId).single();
                if (error) { alert("주문 정보 로드 실패"); return; }
                orderData = data;
                // Try to fetch linked measurement for details if available?
            }

            if (!orderData && !poData) return;
            setOrder(orderData);

            // Fetch Company ID
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log("Fetching Company ID for user:", user.id);
                // 1. Try company_members (Primary source per auth.ts)
                const { data: member } = await supabase
                    .from('company_members')
                    .select('company_id')
                    .eq('user_id', user.id)
                    .eq('approved', true)
                    .single();

                if (member?.company_id) {
                    console.log("Found Company ID from Members:", member.company_id);
                    setCompanyId(member.company_id);
                } else {
                    // 2. Try profiles (Fallback)
                    console.log("Fallback to profiles for Company ID...");
                    let foundId = null;

                    // Try English table
                    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
                    if (profile?.company_id) foundId = profile.company_id;

                    // Try Korean table if not found
                    if (!foundId) {
                        const { data: profileKo } = await supabase.from('프로필').select('company_id').eq('id', user.id).single();
                        if (profileKo?.company_id) foundId = profileKo.company_id;
                    }

                    // 3. Last Resort: Fetch ANY company (Dev/Single Tenant SafetyNet)
                    if (!foundId) {
                        console.warn("User has no company linked. Fetching first available company as fallback.");
                        const { data: firstCompany } = await supabase.from('companies').select('id').limit(1).single();
                        if (firstCompany?.id) foundId = firstCompany.id;
                        else {
                            // 4. Absolute Final Fallback (matches supabase_force_company.sql)
                            foundId = '11111111-1111-1111-1111-111111111111';
                        }
                    }

                    if (foundId) {
                        setCompanyId(foundId);
                        console.log("Found Company ID:", foundId);
                    } else {
                        console.error("FATAL: No Company ID found for user! (Check DB)");
                        // Allow proceeding with fallback even if potentially invalid, to trigger DB error instead of JS blocking
                        setCompanyId('11111111-1111-1111-1111-111111111111');
                    }
                }
            }

            const { data: partnerData } = await supabase.from("partners").select("*").order("name");
            setPartners(partnerData || []);
            if (!purchaseOrderId && !selectedPartnerId) {
                const misotech = partnerData?.find((p: any) => p.name.includes("미소테크"));
                if (misotech) setSelectedPartnerId(misotech.id);
            }

            // Item Logic
            // If measurementId, we allow building from raw measurement data
            if (measData && (!poItems || poItems.length === 0)) {
                // Parse Logic for Measurement
                const KOREAN_MAP: Record<string, string> = {
                    "3T_MANUAL": "3연동 수동", "JT_MANUAL": "3연동 수동",
                    "ONE_SLIDE_MANUAL": "원슬라이딩", "1W_SLIDING": "1S_MANUAL", // Map to pricing code
                    "SWING": "스윙도어", "FLUORO": "FLUORO", "ANOD": "ANOD",
                    "WHITE": "화이트", "BLACK": "블랙", "CHAMPAGNE_GOLD": "샴페인골드"
                };

                const doorDetail = measData.door_detail ? (typeof measData.door_detail === 'string' ? JSON.parse(measData.door_detail) : measData.door_detail) : {};

                // Map Measurement to PricingInput
                // We assume 1 item for now, or loop if array
                // Measurement DB usually has 1 main door type per record, but could be extended.

                // Helper to detect code
                const mappingSource = {
                    ...measData,
                    color: doorDetail.frameColor,
                    door_type: measData.door_type // Ensure this is explicitly passed if needed, though ...measData covers it
                };
                console.log("Mapping Source:", mappingSource);
                const mappedInput = mapToPricingInput(mappingSource);
                const productType = mappedInput.productType;

                console.log("Mapped Product Type Result:", productType);

                // Coating
                const colorStr = (doorDetail.frameColor || "").toUpperCase();
                const coating = (colorStr.includes("아노") || colorStr.includes("샴페인")) ? "ANOD" : "FLUORO";

                // Glass
                const glass = doorDetail.glassType || measData.glass || "투명";
                // Need to map "투명" -> "CLEAR" etc.
                const GLASS_MAP: Record<string, string> = {
                    "투명": "CLEAR", "브론즈": "BRONZE", "아쿠아": "AQUA", "샤틴": "SATIN", "망입": "WIRE_MESH",
                    "CLEAR": "CLEAR", "BRONZE": "BRONZE", "AQUA": "AQUA", "SATIN": "SATIN", "WIRE_MESH": "WIRE_MESH"
                };
                const DISPLAY_GLASS_MAP: Record<string, string> = {
                    "CLEAR": "투명", "BRONZE": "브론즈", "AQUA": "아쿠아", "SATIN": "샤틴", "WIRE_MESH": "망입"
                };
                const glassCode = GLASS_MAP[glass] || "CLEAR";

                // If the incoming glass type wasn't in our map (e.g. DARKGRAY_CLEAR), 
                // we defaulted to CLEAR code, so we should also normalize the display label to "투명"
                // to ensure what the user sees (dropdown default) matches what is saved.
                const glassLabel = DISPLAY_GLASS_MAP[glassCode] || "투명";

                // Design
                const designStr = renderDesign(doorDetail.glassDesign || measData.design);

                // Map Category and Color to Korean
                const categoryKr = KOREAN_MAP[productType] || productType;
                const colorRaw = doorDetail.frameColor || "";
                const colorKr = KOREAN_MAP[colorRaw.toUpperCase()] || colorRaw;

                const itemData = {
                    // Core
                    category: categoryKr, // Switched to Korean name for display
                    width: measData.width_mm || 0,
                    height: measData.height_mm || 0,
                    glass: glassLabel,
                    glassCode: glassCode,
                    color: colorKr, // Switched to Korean name for display
                    coating: coating,
                    design: designStr,
                    openDirection: measData.open_direction || "",

                    // Pricing Options
                    heightOver2400: (measData.height_mm || 0) > 2400,
                    verticalDivision: false,
                    // Auto
                    tduAdd: false,
                    topSensorAddQty: 0,
                    wirelessSwitchAddQty: 0,
                    // Sliding
                    includeSlidingHardware: false,
                    pivotQty: 0,
                    extraOver1900Mm: 0,

                    // Result placeholder
                    qty: 1,
                    unit_price: 0,
                    supply_price: 0,
                    vat: 0,

                    // Messages
                    messages: { customer: "", office: "" }
                };

                // Initial calc
                recalcItem(itemData, measData);

                setPoItems([itemData]);
            } else if (orderData?.items_json) {
                // Existing Order Loaded from Schedule
                // Map Korean text to product codes

                const CATEGORY_MAP: Record<string, string> = {
                    "일슬라이딩": "1S_MANUAL",
                    "ONE_SLIDE_MANUAL": "1S_MANUAL",
                    "1W_SLIDING": "1S_MANUAL",
                    "3연동": "3T_MANUAL",
                    "3연동 수동": "3T_MANUAL",
                    "JT_MANUAL": "3T_MANUAL",
                    "3T_MANUAL": "3T_MANUAL",
                    "스윙도어": "SWING",
                    "SWING": "SWING",
                    "창호": "1S_MANUAL", // Default for generic "window"
                    "WINDOW": "1S_MANUAL"
                };

                const GLASS_MAP: Record<string, string> = {
                    "투명": "CLEAR",
                    "CLEAR": "CLEAR",
                    "클리어": "CLEAR",
                    "모루": "FROSTED",
                    "FROSTED": "FROSTED",
                    "서리": "FROSTED",
                    "브론즈": "BRONZE",
                    "BRONZE": "BRONZE",
                    "그레이": "GRAY",
                    "GRAY": "GRAY"
                };

                const COLOR_MAP: Record<string, string> = {
                    "화이트": "WHITE",
                    "WHITE": "WHITE",
                    "흰색": "WHITE",
                    "블랙": "BLACK",
                    "BLACK": "BLACK",
                    "검정": "BLACK",
                    "샴페인골드": "CHAMPAGNE_GOLD",
                    "CHAMPAGNE_GOLD": "CHAMPAGNE_GOLD",
                    "샴페인": "CHAMPAGNE_GOLD",
                    "실버": "SILVER",
                    "SILVER": "SILVER",
                    "은색": "SILVER"
                };

                setPoItems(orderData.items_json.map((i: any) => {
                    // Extract product type from category
                    let productType = i.category || "1S_MANUAL";

                    // Try to find mapping
                    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
                        if (productType.includes(key)) {
                            productType = value;
                            break;
                        }
                    }

                    // Extract glass code
                    let glassCode = i.glass || i.glassCode || "CLEAR";
                    for (const [key, value] of Object.entries(GLASS_MAP)) {
                        if (glassCode.includes(key)) {
                            glassCode = value;
                            break;
                        }
                    }

                    // Extract color and coating
                    let colorText = i.color || "WHITE";
                    let coating = "FLUORO"; // Default

                    // Detect coating from color text
                    if (colorText.includes("아노") || colorText.includes("ANOD") || colorText.includes("샴페인")) {
                        coating = "ANOD";
                    }

                    // Map color
                    let colorCode = "WHITE";
                    for (const [key, value] of Object.entries(COLOR_MAP)) {
                        if (colorText.includes(key)) {
                            colorCode = value;
                            break;
                        }
                    }

                    // Extract design/detail
                    const design = i.design || i.detail || "";

                    return {
                        category: productType,
                        glass: glassCode,
                        glassCode: glassCode,
                        color: colorCode,
                        coating: coating,
                        design: design,
                        width: Number(i.width) || 0,
                        height: Number(i.height) || 0,
                        qty: i.qty || i.quantity || 1,

                        // Pricing options with defaults
                        heightOver2400: (Number(i.height) || 0) > 2400,
                        verticalDivision: false,
                        tduAdd: false,
                        topSensorAddQty: 0,
                        wirelessSwitchAddQty: 0,
                        includeSlidingHardware: false,
                        pivotQty: 0,
                        extraOver1900Mm: 0,

                        // Pricing results
                        unit_price: i.unit_price || 0,
                        supply_price: i.supply_price || 0,
                        vat: i.vat || 0,

                        // Messages
                        messages: { customer: "", office: "" }
                    };
                }));
            }

            setLoading(false);
        };
        init();
    }, [orderId, measurementId, purchaseOrderIdParam]);

    // Helper: Convert English codes to Korean labels
    const getKoreanLabel = (code: string, type: 'category' | 'coating' | 'glass' | 'color'): string => {
        const CATEGORY_LABELS: Record<string, string> = {
            "1S_MANUAL": "일슬라이딩",
            "3T_MANUAL": "3연동 수동",
            "SWING": "스윙도어",
            "AUTO": "자동문"
        };

        const COATING_LABELS: Record<string, string> = {
            "FLUORO": "불소 도장",
            "ANOD": "아노다이징"
        };

        const GLASS_LABELS: Record<string, string> = {
            "CLEAR": "투명",
            "FROSTED": "모루",
            "BRONZE": "브론즈",
            "GRAY": "그레이",
            "AQUA": "아쿠아",
            "SATIN": "샤틴",
            "WIRE_MESH": "망입"
        };

        const COLOR_LABELS: Record<string, string> = {
            "WHITE": "화이트",
            "BLACK": "블랙",
            "CHAMPAGNE_GOLD": "샴페인골드",
            "SILVER": "실버"
        };

        const maps = {
            category: CATEGORY_LABELS,
            coating: COATING_LABELS,
            glass: GLASS_LABELS,
            color: COLOR_LABELS
        };

        return maps[type][code] || code; // Return original if not found
    };

    // Recalculate Logic
    const recalcItem = (item: any, context?: any) => {
        // Prepare Input
        const input = {
            productType: item.category, // e.g. "1S_MANUAL"
            coating: item.coating || "FLUORO", // Need to ensure this is set
            widthMm: Number(item.width),
            heightMm: Number(item.height),
            glassCode: item.glassCode || "CLEAR",
            openDirection: item.openDirection,
            colorSpec: item.color || "",

            // Options
            heightOver2400: item.heightOver2400,
            verticalDivision: item.verticalDivision,
            tduAdd: item.tduAdd,
            topSensorAddQty: Number(item.topSensorAddQty),
            wirelessSwitchAddQty: Number(item.wirelessSwitchAddQty),
            includeSlidingHardware: item.includeSlidingHardware,
            pivotQty: Number(item.pivotQty),
            extraOver1900Mm: Number(item.extraOver1900Mm),

            materialsSelected: item.materialsSelected || [],
            handlesSelected: item.handlesSelected || [],
            pomaxSelected: item.pomaxSelected || [],

            // Context for messages
            // Context for messages
            customerName: context?.customer_name || order?.crm_customers?.name || measData?.customer_name || "미지정",
            customerPhone: context?.customer_phone || order?.crm_customers?.phone || measData?.customer_phone || "-",
            address: context?.customer_address || order?.crm_customers?.address || measData?.customer_address || "-",
            measureDate: order?.measure_date ? format(new Date(order.measure_date), "yyyy-MM-dd") : context?.created_at?.substring(0, 10),
            installRequestDate: arrivalExpectedDate,
            memo: memo
        };

        const result = calculateMisotechPrice(input);

        item.unit_price = result.totalPrice;
        item.supply_price = result.totalPrice * item.qty;
        item.vat = Math.floor(item.supply_price * 0.1); // Add VAT? User said VAT excluded in prompt messages, so usually PO total amount is Supply + VAT?
        // Prompt Check: "Total Price = Base + Addons". "Output: ... VAT 별도".
        // Use supply_price = calculated price. VAT = 10% on top.
        // My code does this.

        item.messages = result.messages;
        item.pricingBreakdown = result.breakdown;
        item.includedList = result.included;
        item.addonsList = result.addons;

        return item;
    };

    const updateItem = (index: number, field: string, value: any) => {
        setPoItems(prev => {
            const next = [...prev];
            const item = { ...next[index], [field]: value };

            // Auto-update coating if color changes (heuristic)
            if (field === 'color') {
                if (String(value).includes("아노") || String(value).includes("샴페인")) item.coating = "ANOD";
                else item.coating = "FLUORO";
            }
            // Auto update Glass Code if glass changes
            if (field === 'glass') {
                const GLASS_MAP: Record<string, string> = {
                    "투명": "CLEAR", "브론즈": "BRONZE", "아쿠아": "AQUA", "샤틴": "SATIN", "망입": "WIRE_MESH",
                    "CLEAR": "CLEAR", "BRONZE": "BRONZE", "AQUA": "AQUA", "SATIN": "SATIN", "WIRE_MESH": "WIRE_MESH"
                };
                item.glassCode = GLASS_MAP[value] || "CLEAR";
            }

            // Recalculate
            recalcItem(item);

            next[index] = item;
            return next;
        });
    };

    // Design Parser helper
    function parseGlassDesign(gd: any): string {
        if (!gd || typeof gd !== "object") return "";
        const parts: string[] = [];
        if (gd.archBasic) parts.push("아치형");
        if (gd.archCorner) parts.push("모서리 아치");
        if (gd.bottomPanel) parts.push("하부고시");
        if (gd.bigArchVertical) parts.push("세로 큰아치");
        if (gd.muntinSet2LinesCount > 0) parts.push(`간살 2줄세트 ${gd.muntinSet2LinesCount}개`);
        if (gd.muntinExtraBarCount > 0) parts.push(`추가 간살 ${gd.muntinExtraBarCount}줄`);
        return parts.length > 0 ? parts.join(", ") : "기본";
    }
    const renderDesign = (v: any) => {
        if (typeof v === 'string') {
            const MAP: Record<string, string> = { "3square_04": "3분할 사각", "basic": "기본" }; // Add more if needed
            return MAP[v] || v;
        }
        if (v?.selectedDesign) return v.selectedDesign;
        return parseGlassDesign(v);
    };


    const totalSupply = useMemo(() => poItems.reduce((acc, cur) => acc + (cur.supply_price || 0), 0), [poItems]);
    const totalVat = useMemo(() => poItems.reduce((acc, cur) => acc + (cur.vat || 0), 0), [poItems]);
    const totalAmount = totalSupply + totalVat;

    const handleSave = async () => {
        if (!selectedPartnerId) return alert("발주처를 선택해주세요.");
        if (!companyId) return alert("회사 정보를 찾을 수 없습니다. 다시 로그인하거나 관리자에게 문의하세요.");

        // Auto-create Schedule logic if missing
        let validScheduleId = orderId;
        const purchaseOrderDate = arrivalExpectedDate || new Date().toISOString().split("T")[0];

        if (!validScheduleId && measurementId && measData) {
            // 1. Find or Create Customer
            const { data: existingCustomer } = await supabase
                .from("crm_customers")
                .select("id")
                .eq("phone", measData.customer_phone)
                .single();

            let customerId = existingCustomer?.id;

            if (!customerId) {
                const { data: newCustomer, error: custError } = await supabase
                    .from("crm_customers")
                    .insert({
                        name: measData.customer_name,
                        phone: measData.customer_phone,
                        address: measData.customer_address,
                        company_id: companyId
                    })
                    .select("id")
                    .single();

                if (custError) {
                    console.error("Customer creation failed", custError);
                    alert("고객 정보 생성 실패: " + custError.message);
                    return;
                }
                customerId = newCustomer.id;
            }

            // 2. Create Schedule
            const doorType = poItems[0]?.category || "도어";
            const { data: newSchedule, error: schError } = await supabase
                .from("sc_schedules")
                .insert({
                    title: `${measData.customer_name} - ${doorType}`,
                    customer_id: customerId,
                    scheduled_date: purchaseOrderDate, // Set initial date to arrival date
                    status: 'PENDING',
                    notes: memo,
                    company_id: companyId
                })
                .select("id")
                .single();

            if (schError) {
                console.error("Schedule creation failed", schError);
                console.error("Error Details:", JSON.stringify(schError, null, 2));
                alert("일정 생성 실패: " + (schError.message || JSON.stringify(schError)));
                return;
            }
            validScheduleId = newSchedule.id;
        }

        const payload = {
            schedule_id: validScheduleId || null,
            measurement_id: measurementId || null,
            partner_id: selectedPartnerId,
            total_amount: totalAmount,
            vat_amount: totalVat,
            status: 'ORDERED',
            delivery_method: deliveryMethod,
            arrival_expected_date: arrivalExpectedDate ? new Date(arrivalExpectedDate).toISOString() : null,
            order_date: new Date().toISOString(),
            items_json: poItems,
            memo: memo
        };
        let result;
        if (purchaseOrderId) {
            // Update
            result = await supabase.from("sc_purchase_orders").update(payload).eq("id", purchaseOrderId);
        } else {
            // Insert
            result = await supabase.from("sc_purchase_orders").insert(payload);
        }

        const { error } = result;
        if (error) alert("저장 실패: " + error.message);
        else {
            alert("완료되었습니다. 시공일정으로 이동합니다.");
            if (validScheduleId) {
                router.push(`/admin/schedule?openScheduleId=${validScheduleId}`);
            } else {
                router.push("/admin/schedule");
            }
        }
    };

    if (loading) return <div className="p-10 text-center">로딩 중...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft size={24} /></button>
                    <h1 className="text-2xl font-bold">📦 발주서 작성 ({order?.crm_customers?.name})</h1>
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700">
                    <CheckCircle2 size={20} /> 발주 처리
                </button>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <h3 className="font-bold mb-4 flex gap-2"><Building2 size={20} className="text-indigo-600" /> 발주처</h3>
                        <select value={selectedPartnerId} onChange={e => setSelectedPartnerId(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">선택</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <h3 className="font-bold mb-4 flex gap-2"><Truck size={20} className="text-indigo-600" /> 물류</h3>
                        <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)} className="w-full p-2 border rounded mb-2">
                            {['PICKUP', 'FREIGHT', 'CHARTER', 'PARCEL', 'ETC'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <input type="date" value={arrivalExpectedDate} onChange={e => setArrivalExpectedDate(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                </div>

                {/* Items */}
                <div className="lg:col-span-3 space-y-8">
                    {poItems.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-lg mb-4 flex justify-between items-center text-indigo-700">
                                <span>#{idx + 1}. {getKoreanLabel(item.category, 'category')}</span>
                                <span className="text-sm bg-indigo-50 px-2 py-1 rounded text-indigo-600">{getKoreanLabel(item.coating, 'coating')}</span>
                            </h3>

                            {/* Main Specs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500">규격 (W x H)</label>
                                    <div className="flex items-center gap-1 mt-1">
                                        <input type="number" value={item.width} onChange={e => updateItem(idx, 'width', e.target.value)} className="w-20 p-1 border rounded text-center" />
                                        <span>x</span>
                                        <input type="number" value={item.height} onChange={e => updateItem(idx, 'height', e.target.value)} className="w-20 p-1 border rounded text-center" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500">유리</label>
                                    <select value={item.glassCode} onChange={e => {
                                        const code = e.target.value;
                                        const labelMap: any = { "CLEAR": "투명", "BRONZE": "브론즈", "AQUA": "아쿠아", "SATIN": "샤틴", "WIRE_MESH": "망입" };
                                        updateItem(idx, 'glass', labelMap[code] || code);
                                        updateItem(idx, 'glassCode', code);
                                    }} className="w-full p-1 border rounded mt-1">
                                        <option value="CLEAR">투명</option>
                                        <option value="BRONZE">브론즈</option>
                                        <option value="AQUA">아쿠아</option>
                                        <option value="SATIN">샤틴</option>
                                        <option value="WIRE_MESH">망입</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500">색상</label>
                                    <input type="text" value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} className="w-full p-1 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500">디자인</label>
                                    <input type="text" value={item.design} onChange={e => updateItem(idx, 'design', e.target.value)} className="w-full p-1 border rounded mt-1" />
                                </div>
                            </div>

                            {/* Options Grid */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                <h4 className="font-bold text-sm mb-3">🛠 추가 옵션 설정</h4>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={item.heightOver2400} onChange={e => updateItem(idx, 'heightOver2400', e.target.checked)} />
                                        높이 2400 초과
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={item.verticalDivision} onChange={e => updateItem(idx, 'verticalDivision', e.target.checked)} />
                                        세로 분할 (+1만)
                                    </label>

                                    {(item.category.includes("3T") || item.category.includes("3연동")) && (
                                        <div className="flex gap-4 border-l pl-4 border-slate-300">
                                            <label className="flex items-center gap-1 cursor-pointer font-medium text-indigo-700">
                                                <input type="checkbox" checked={item.includeSlidingHardware} onChange={e => updateItem(idx, 'includeSlidingHardware', e.target.checked)} />
                                                ⚙️ 연동철물 포함
                                            </label>
                                            {item.includeSlidingHardware && (
                                                <>
                                                    <label className="flex items-center gap-1">
                                                        피봇 <input type="number" min="0" className="w-12 p-0.5 border" value={item.pivotQty} onChange={e => updateItem(idx, 'pivotQty', e.target.value)} />개
                                                    </label>
                                                    <label className="flex items-center gap-1">
                                                        1900초과 <input type="number" min="0" className="w-12 p-0.5 border" value={item.extraOver1900Mm} onChange={e => updateItem(idx, 'extraOver1900Mm', e.target.value)} />mm
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {(item.category.includes("AUTO") || item.category.includes("자동")) && (
                                        <div className="flex gap-4 border-l pl-4 border-slate-300 items-center">
                                            <span className="font-bold text-indigo-600">⚡ 자동문: </span>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" checked={item.tduAdd} onChange={e => updateItem(idx, 'tduAdd', e.target.checked)} />
                                                TDU 추가
                                            </label>
                                            <label className="flex items-center gap-1">
                                                센서+ <input type="number" min="0" className="w-10 p-0.5 border" value={item.topSensorAddQty} onChange={e => updateItem(idx, 'topSensorAddQty', e.target.value)} />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                스위치+ <input type="number" min="0" className="w-10 p-0.5 border" value={item.wirelessSwitchAddQty} onChange={e => updateItem(idx, 'wirelessSwitchAddQty', e.target.value)} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Analysis & Messages */}


                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 mb-2">포함 구성 (0원)</h4>
                                    <ul className="text-sm bg-green-50/50 p-3 rounded text-green-800 list-disc ml-4 mb-4">
                                        {(item.includedList || []).map((inc: any, i: number) => (
                                            <li key={i}>{inc.label} ({inc.qty}개)</li>
                                        ))}
                                        {(!item.includedList || item.includedList.length === 0) && <li className="text-slate-400 text-xs list-none ml-0">해당사항 없음</li>}
                                    </ul>

                                    <h4 className="text-xs font-bold text-slate-500 mb-2">단가 산출 내역</h4>
                                    <div className="text-sm space-y-1 bg-slate-50 p-3 rounded">
                                        <div className="flex justify-between">
                                            <span>기본단가 ({item.category})</span>
                                            <span className="font-bold">{item.pricingBreakdown?.basePrice?.toLocaleString()}</span>
                                        </div>
                                        <div className="border-t my-1"></div>
                                        {(item.addonsList || []).map((add: any, i: number) => (
                                            <div key={i} className="flex justify-between text-slate-600">
                                                <span>+ {add.label}</span>
                                                <span>{add.price?.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="border-t my-1 border-slate-300"></div>
                                        <div className="flex justify-between font-bold text-indigo-700">
                                            <span>합계 (Unit Price)</span>
                                            <span>{item.unit_price?.toLocaleString()} 원</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 mb-2">전송용 메시지 (고객용/사무실용)</h4>
                                    <div className="space-y-2">
                                        <textarea
                                            readOnly
                                            className="w-full h-24 text-xs p-2 border rounded bg-slate-50 font-mono"
                                            value={item.messages?.customer || "..."}
                                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                        />
                                        <textarea
                                            readOnly
                                            className="w-full h-24 text-xs p-2 border rounded bg-slate-50 font-mono"
                                            value={item.messages?.office || "..."}
                                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}

                    {/* Footer Total */}
                    <div className="flex justify-end bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="text-right">
                            <div className="text-slate-500 mb-1">총 발주 금액 (VAT 포함)</div>
                            <div className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                                {totalAmount.toLocaleString()} <span className="text-lg text-slate-400 font-normal">KRW</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function NewPurchaseOrderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading PO...</div>}>
            <NewPurchaseOrderContent />
        </Suspense>
    );
}
