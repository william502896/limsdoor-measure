"use client";

import React, { useState } from "react";
import { useGlobalStore } from "../lib/store-context";
import {
    Calendar as CalendarIcon, List, MapPin, Phone,
    CheckCircle, Camera, AlertTriangle, ChevronRight,
    ArrowLeft, Clock, Info, Settings, Navigation, User as UserIcon
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";

// --- AR Visual Constants ---
const FRAME_COLORS: any = {
    "화이트": "#ffffff",
    "블랙": "#1f2937",
    "샴페인골드": "#d4af37",
    "네이비": "#1e3a8a"
};

const GLASS_STYLES: any = {
    "투명": { background: "rgba(0, 0, 0, 0.05)" },
    "브론즈": { background: "rgba(120, 80, 40, 0.2)" },
    "워터큐브": { background: "rgba(200, 230, 255, 0.3)", backgroundImage: "radial-gradient(#fff 10%, transparent 10%)", backgroundSize: "10px 10px" },
    "미스트": { background: "rgba(0, 0, 0, 0.1)", backdropFilter: "blur(4px)" }
};

export default function InstallPage() {
    // 1. All Hooks First
    const { user, orders, customers, updateOrder, addOrder, addCustomer, updateUser, addNotification } = useGlobalStore();
    const router = useRouter(); // Use router for Admin Link

    const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR" | "REVENUE">("LIST");
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [mapApp, setMapApp] = useState<"TMAP" | "KAKAO">("TMAP");
    const [showMapSettings, setShowMapSettings] = useState(false);
    const [detailTab, setDetailTab] = useState<"INFO" | "AR" | "PHOTO">("INFO");
    const [isTrialMode, setIsTrialMode] = useState(false); // Trial Mode

    // Photos State (Moved to top)
    const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
    const [afterPhotos, setAfterPhotos] = useState<string[]>([]);

    // Onboarding Form State
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [regForm, setRegForm] = useState({
        name: "", address: "", phone: "", email: "",
        businessNum: "", career: "", region: "",
        businessLicense: "", idCard: "", residentRegister: ""
    });

    const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "businessLicense" | "idCard" | "residentRegister") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setRegForm(prev => ({ ...prev, [field]: ev.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // 2. Helper Functions
    const openDetail = (id: string) => {
        setSelectedOrderId(id);
        setDetailTab("INFO");
    };

    const handleRegister = () => {
        // Basic Validation
        if (!regForm.name || !regForm.businessNum || !regForm.phone) {
            alert("필수 정보를 모두 입력해주세요.");
            return;
        }

        if (user) {
            updateUser(user.id, {
                status: "PENDING",
                installerProfile: {
                    name: regForm.name,
                    address: regForm.address,
                    phone: regForm.phone,
                    email: regForm.email,
                    businessNumber: regForm.businessNum,
                    careerSummary: regForm.career,
                    region: regForm.region,
                    specialties: [],
                    businessLicenseFile: regForm.businessLicense,
                    idCardFile: regForm.idCard,
                    residentRegisterFile: regForm.residentRegister
                }
            });

            // Send Notification to Admin
            addNotification({
                id: `notif-${Date.now()}`,
                type: "REGISTER_REQUEST",
                message: `[파트너 신청] ${regForm.name} 님이 승인을 요청했습니다.`,
                subText: `${regForm.region} | ${regForm.phone}`,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: "/admin/dispatch?tab=personnel"
            });

            alert("파트너 승인 요청이 완료되었습니다.\n관리자 승인 후 이용 가능합니다.");
        } else {
            // No user session (Guest)
            alert("승인 요청이 완료되었습니다. (게스트 모드)\n실제 서비스에서는 로그인이 필요합니다.");
        }
        setShowRegisterForm(false);
    };

    const generateMockData = () => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Ensure mock customer exists (Hong Gil-dong)
        const mockCustId = "cust-mock-hong";

        // Add or Update the customer
        addCustomer({
            id: mockCustId,
            name: "홍길동",
            phone: "010-1111-2222",
            address: "양구군청",
            memo: "", // Added default
            createdAt: new Date().toISOString()
        });

        const mocks = [
            {
                id: `ord-test-ar-${Date.now()}`, status: "INSTALL_SCHEDULED", date: today, item: "3연동 중문", detail: "초슬림 3연동",
                arScene: {
                    doorType: "3연동" as const,
                    frameColor: "네이비",
                    glassType: "브론즈",
                    width: 1200,
                    height: 2100,
                    openDirection: "Right" as const
                }
            },
            { id: `ord-test-2-${Date.now()}`, status: "INSTALLED", date: yesterday, item: "원슬라이딩", detail: "프리미엄 원슬라이딩" },
        ];

        mocks.forEach((m, i) => {
            addOrder({
                id: m.id,
                customerId: mockCustId, // Link to Hong Gil-dong
                tenantId: user?.currentTenantId || "t_head",
                status: m.status as any,
                createdAt: new Date().toISOString(),
                installDate: m.date,
                estPrice: 1500000,
                finalPrice: 1500000,
                deposit: 100000,
                balance: 1400000,
                paymentStatus: "Partial",
                items: [{
                    category: m.item,
                    detail: m.detail,
                    location: "현관",
                    glass: m.arScene ? m.arScene.glassType : "투명",
                    color: m.arScene ? m.arScene.frameColor : "화이트",
                    width: 1200,
                    height: 2300,
                    quantity: 1,
                    arScene: m.arScene // Attach AR data
                }],
                measureFiles: [],
                installFiles: [],
                beforeInstallFiles: [],
                afterInstallFiles: [],
                installMemo: i === 0 ? "고객님이 AR로 직접 선택하신 디자인입니다. 확인 후 시공 바랍니다." : "",
                asHistory: []
            });
        });
        alert("AR 정보가 포함된 테스트 일정이 생성되었습니다.");
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "BEFORE" | "AFTER") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    const url = ev.target.result as string;
                    if (type === "BEFORE") setBeforePhotos(prev => [...prev, url]);
                    else setAfterPhotos(prev => [...prev, url]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleComplete = () => {
        if (!selectedOrder) return;
        if (afterPhotos.length === 0) {
            alert("시공 후 사진을 최소 1장 등록해야 완료할 수 있습니다.");
            return;
        }

        const confirmFinish = confirm("시공을 완료 처리하시겠습니까?");
        if (!confirmFinish) return;

        updateOrder(selectedOrder.id, {
            status: "INSTALLED",
            beforeInstallFiles: beforePhotos,
            afterInstallFiles: afterPhotos,
            installFiles: afterPhotos, // Legacy support
            installDate: new Date().toISOString().split("T")[0]
        });

        // Send Notification to Admin
        addNotification({
            id: `notif-${Date.now()}`,
            type: "INSTALL_COMPLETE",
            message: `[시공 완료] ${user?.name || "시공기사"} 님이 시공을 완료했습니다.`,
            subText: `${selectedOrder.items[0]?.category} | ${selectedCustomer?.address || "주소 정보 없음"}`,
            timestamp: new Date().toISOString(),
            isRead: false,
            link: "/admin/dispatch?tab=dispatch" // Go to Dispatch (Order List)
        });

        alert("시공 완료 처리되었습니다.");
        setSelectedOrderId(null);
        setBeforePhotos([]);
        setAfterPhotos([]);
    };

    const handleOpenMap = (address: string) => {
        if (!address) return;
        const query = encodeURIComponent(address);
        if (mapApp === "TMAP") {
            window.location.href = `https://surl.tmap.co.kr/search/${query}`;
        } else {
            window.location.href = `https://map.kakao.com/link/search/${query}`;
        }
    };

    // --- Onboarding / Access Control ---
    if ((!user || user.status !== "ACTIVE") && !isTrialMode) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar">

                    {!showRegisterForm ? (
                        user?.status === "PENDING" ? (
                            // Pending Approval Screen
                            <div className="flex flex-col items-center py-10">
                                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-6 text-yellow-600 animate-pulse">
                                    <Clock size={48} />
                                </div>
                                <h1 className="text-2xl font-extrabold mb-3 text-slate-900">승인 심사 중입니다</h1>
                                <p className="text-slate-600 mb-8 font-medium text-sm leading-relaxed max-w-xs">
                                    파트너 신청이 성공적으로 접수되었습니다.<br />
                                    관리자 승인 후 모든 기능을 이용하실 수 있습니다.<br />
                                    <span className="text-xs text-slate-400 mt-2 block">(영업일 기준 1~2일 소요)</span>
                                </p>
                                <button
                                    onClick={() => alert("관리자에게 승인 독촉 알림을 보냈습니다.")} // Placeholder functionality
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition text-sm"
                                >
                                    문의하기
                                </button>
                                <div className="mt-8 pt-8 border-t border-slate-100 w-full">
                                    <button
                                        onClick={() => {
                                            setIsTrialMode(true);
                                            generateMockData();
                                        }}
                                        className="text-indigo-600 font-bold text-sm hover:underline"
                                    >
                                        기다리는 동안 체험해보기 &rarr;
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Landing View (Guest)
                            <>
                                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
                                    <UserIcon size={48} />
                                </div>
                                <h1 className="text-2xl font-extrabold mb-3 text-slate-900">시공자 파트너 등록</h1>
                                <p className="text-slate-600 mb-10 font-medium text-sm leading-relaxed">
                                    림스도어의 전문 시공 파트너가 되어<br />
                                    체계적인 일정 관리와 정산 시스템을 경험하세요.
                                </p>

                                <button
                                    onClick={() => setShowRegisterForm(true)}
                                    className="w-full py-4 rounded-xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95 mb-4"
                                >
                                    파트너 승인 요청하기
                                </button>

                                <div className="flex gap-3 justify-center mt-6">
                                    <button
                                        onClick={() => {
                                            setIsTrialMode(true);
                                            generateMockData();
                                        }}
                                        className="bg-green-50 text-green-700 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-100 transition border border-green-100"
                                    >
                                        <CheckCircle size={18} /> 프로그램 체험
                                    </button>
                                    <button
                                        onClick={() => router.push('/manage')}
                                        className="bg-slate-50 text-slate-600 px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-100 transition border border-slate-200"
                                    >
                                        관리자 로그인
                                    </button>
                                </div>
                            </>
                        )
                    ) : (
                        <>
                            {/* Form View */}
                            <div className="text-left mb-6">
                                <button onClick={() => setShowRegisterForm(false)} className="text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 text-sm font-bold">
                                    <ArrowLeft size={16} /> 뒤로가기
                                </button>
                                <h1 className="text-xl font-bold text-slate-900">파트너 정보 입력</h1>
                                <p className="text-slate-500 text-xs mt-1">
                                    정확한 심사를 위해 정보를 상세히 입력해주세요.
                                </p>
                            </div>

                            <div className="space-y-6 mb-8 text-left">
                                {/* 1. Personal Info */}
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">1</span>
                                        개인 신상 정보
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">이름</label>
                                            <input type="text" placeholder="홍길동" className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">주소</label>
                                            <input type="text" placeholder="서울시 강남구..." className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" value={regForm.address} onChange={e => setRegForm({ ...regForm, address: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">전화번호</label>
                                            <input type="tel" placeholder="010-0000-0000" className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">이메일</label>
                                            <input type="email" placeholder="example@email.com" className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Professional Info */}
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">2</span>
                                        경력 및 활동 정보
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">사업자 등록번호</label>
                                            <input type="text" placeholder="000-00-00000" className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" value={regForm.businessNum} onChange={e => setRegForm({ ...regForm, businessNum: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">활동 지역</label>
                                            <input type="text" placeholder="예: 서울 전역, 경기 남부" className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" value={regForm.region} onChange={e => setRegForm({ ...regForm, region: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">경력 상세</label>
                                            <textarea
                                                placeholder="최근 5년 내 주요 경력을 상세히 적어주세요."
                                                className="w-full text-base bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm h-32 resize-none"
                                                value={regForm.career}
                                                onChange={e => setRegForm({ ...regForm, career: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Documents */}
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">3</span>
                                        필수 서류 제출 (사진)
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { k: "businessLicense", l: "사업자등록증" },
                                            { k: "idCard", l: "신분증" },
                                            { k: "residentRegister", l: "주민등록등본" }
                                        ].map((item) => (
                                            <label key={item.k} className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 relative overflow-hidden transition group">
                                                {(regForm as any)[item.k] ? (
                                                    <img src={(regForm as any)[item.k]} className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <Camera size={24} className="text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors" />
                                                        <span className="text-[11px] text-slate-500 font-bold text-center leading-tight px-1 group-hover:text-indigo-600 break-keep">{item.l}</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleDocUpload(e, item.k as any)} />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleRegister}
                                className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95 mb-4 text-lg"
                            >
                                신청 제출하기
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // --- Main Logic (for Active Users) ---

    // Filter relevant orders
    const myTasks = orders.filter(o =>
        ["MEASURED", "INSTALL_SCHEDULED", "INSTALLED", "COMPLETED"].includes(o.status)
    );

    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const selectedCustomer = selectedOrder ? customers.find(c => c.id === selectedOrder.customerId) : null;

    // Calendar Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // --- Detail View Component ---
    if (selectedOrder) {
        // Use real customer data or fallback
        const custName = selectedCustomer?.name || "알 수 없음";
        const custAddr = selectedCustomer?.address || "주소 미입력";
        const custPhone = selectedCustomer?.phone || "";

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
                {/* Header */}
                <header className="bg-white px-4 py-3 flex items-center gap-3 border-b shadow-sm sticky top-0 z-20">
                    <button
                        onClick={() => setSelectedOrderId(null)}
                        className="flex items-center gap-1 text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg transition"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold text-sm">목록으로</span>
                    </button>
                    <h1 className="font-bold text-lg flex-1 text-center pr-10">시공 상세</h1>
                </header>

                {/* Tabs */}
                <div className="bg-white flex border-b sticky top-[60px] z-20 shadow-sm">
                    <button
                        onClick={() => setDetailTab("INFO")}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${detailTab === "INFO" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
                    >
                        설치 정보
                    </button>
                    <button
                        onClick={() => setDetailTab("AR")}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${detailTab === "AR" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
                    >
                        AR 가상시공
                    </button>
                    <button
                        onClick={() => setDetailTab("PHOTO")}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${detailTab === "PHOTO" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
                    >
                        현장 사진
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* INFO TAB */}
                    {detailTab === "INFO" && (
                        <>
                            {/* Customer Card */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{custName} 고객님</h2>
                                        <div
                                            className="flex items-center gap-1 text-slate-500 text-sm cursor-pointer hover:text-indigo-600 transition"
                                            onClick={() => handleOpenMap(custAddr)}
                                        >
                                            <MapPin size={14} />
                                            <span className="underline decoration-slate-300 underline-offset-2">{custAddr}</span>
                                            <Navigation size={12} className="ml-1 text-indigo-500" />
                                        </div>
                                    </div>
                                    <a
                                        href={custPhone ? `tel:${custPhone}` : "#"}
                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition shadow-lg ${custPhone ? "bg-green-500 text-white hover:bg-green-600" : "bg-slate-200 text-slate-400"}`}
                                    >
                                        <Phone size={20} />
                                    </a>
                                </div>

                                {/* Map Settings */}
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs mb-3">
                                    <span className="font-bold text-slate-500 flex items-center gap-1">
                                        <Settings size={12} /> 내비게이션 설정
                                    </span>
                                    <div className="flex bg-white rounded border border-slate-200 p-0.5">
                                        <button
                                            onClick={() => setMapApp("TMAP")}
                                            className={`px-2 py-0.5 rounded ${mapApp === "TMAP" ? "bg-indigo-600 text-white font-bold" : "text-slate-400"}`}
                                        >
                                            T맵
                                        </button>
                                        <button
                                            onClick={() => setMapApp("KAKAO")}
                                            className={`px-2 py-0.5 rounded ${mapApp === "KAKAO" ? "bg-yellow-400 text-black font-bold" : "text-slate-400"}`}
                                        >
                                            카카오
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm flex items-start gap-2 border border-yellow-100">
                                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold">주의사항/특이사항:</span>
                                        <p className="mt-1 text-yellow-900">
                                            {selectedOrder.installMemo || "특이사항 없습니다."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Product Specs List */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold mb-3 text-sm text-slate-500 uppercase flex items-center gap-2">
                                    <Info size={16} /> 시공 품목 정보
                                </h3>
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-lg text-sm mb-3 border border-slate-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-lg">{item.category}</span>
                                            <span className="bg-slate-200 px-2 py-0.5 rounded text-xs font-mono">{idx + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-2 text-slate-600">
                                            <div><span className="block text-xs text-slate-400">상세타입</span>{item.detail}</div>
                                            <div><span className="block text-xs text-slate-400">수량</span>{item.quantity}조</div>
                                            <div className="col-span-2"><span className="block text-xs text-slate-400">사이즈 (W x H)</span>
                                                <span className="font-bold text-slate-900">{item.width} x {item.height} mm</span>
                                            </div>
                                            <div><span className="block text-xs text-slate-400">유리</span>{item.glass}</div>
                                            <div><span className="block text-xs text-slate-400">색상</span>{item.color}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* AR TAB */}
                    {detailTab === "AR" && (
                        <div className="space-y-4">
                            {selectedOrder.items.some(i => i.arScene) ? (
                                selectedOrder.items.map((item, idx) => item.arScene ? (
                                    <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded text-xs">품목 {idx + 1}</span>
                                            <span className="font-bold">{item.category} AR 시뮬레이션</span>
                                        </div>

                                        {/* Visual */}
                                        <div className="w-full aspect-[4/5] bg-slate-100 rounded-lg relative overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner">
                                            <div
                                                className="relative shadow-2xl transition-transform hover:scale-105"
                                                style={{
                                                    width: "180px",
                                                    height: "300px",
                                                    border: `12px solid ${FRAME_COLORS[item.arScene.frameColor] || '#000'}`,
                                                    ...GLASS_STYLES[item.arScene.glassType]
                                                }}
                                            >
                                                {/* Mini Door Lines */}
                                                {item.arScene.doorType === "3연동" && (
                                                    <div className="flex h-full w-full">
                                                        <div className="flex-1 border-r border-slate-400/50"></div>
                                                        <div className="flex-1 border-r border-slate-400/50"></div>
                                                        <div className="flex-1"></div>
                                                    </div>
                                                )}
                                                {item.arScene.doorType === "원슬라이딩" && (
                                                    <div className="absolute top-1/2 left-2 w-1.5 h-16 bg-slate-400/50 rounded-full"></div>
                                                )}
                                            </div>

                                            {/* Dimensions Overlay */}
                                            <div className="absolute top-4 left-0 w-full text-center">
                                                <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">{item.arScene.width}mm</span>
                                            </div>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 origin-center">
                                                <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">{item.arScene.height}mm</span>
                                            </div>
                                        </div>

                                        {/* Specs Table */}
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-lg">
                                            <div className="text-slate-500">도어타입</div>
                                            <div className="font-bold">{item.arScene.doorType}</div>
                                            <div className="text-slate-500">프레임</div>
                                            <div className="font-bold flex items-center gap-1">
                                                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: FRAME_COLORS[item.arScene.frameColor] }}></div>
                                                {item.arScene.frameColor}
                                            </div>
                                            <div className="text-slate-500">유리</div>
                                            <div className="font-bold">{item.arScene.glassType}</div>
                                        </div>
                                    </div>
                                ) : null)
                            ) : (
                                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Camera size={32} className="text-slate-300" />
                                    </div>
                                    <p className="font-bold text-slate-500">저장된 AR 가상시공 데이터가 없습니다.</p>
                                    <p className="text-xs text-slate-400 mt-1">고객이 AR 견적을 진행하지 않았거나 기본 주문입니다.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PHOTO TAB */}
                    {detailTab === "PHOTO" && (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold mb-4 text-sm text-slate-500 uppercase flex items-center gap-2">
                                <Camera size={16} /> 현장 사진 등록
                            </h3>

                            {/* Before */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold mb-2 text-slate-700">① 시공 전 (Before)</label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {/* Upload Button */}
                                    <label className="w-20 h-20 bg-slate-100 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-300 cursor-pointer hover:bg-slate-200 flex-shrink-0">
                                        <Camera size={20} className="text-slate-400 mb-1" />
                                        <span className="text-[10px] text-slate-500">추가</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, "BEFORE")} />
                                    </label>
                                    {/* Images */}
                                    {(selectedOrder.beforeInstallFiles || []).concat(beforePhotos).map((src, i) => (
                                        <div key={i} className="w-20 h-20 rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                                            <img src={src} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* After */}
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-700">② 시공 후 (After)</label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    <label className="w-20 h-20 bg-slate-100 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-300 cursor-pointer hover:bg-slate-200 flex-shrink-0">
                                        <Camera size={20} className="text-slate-400 mb-1" />
                                        <span className="text-[10px] text-slate-500">추가</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, "AFTER")} />
                                    </label>
                                    {(selectedOrder.afterInstallFiles || []).concat(afterPhotos).map((src, i) => (
                                        <div key={i} className="w-20 h-20 rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                                            <img src={src} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t safe-area-bottom">
                    <button
                        onClick={handleComplete}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all ${(afterPhotos.length > 0 || selectedOrder.status === "INSTALLED")
                            ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
                            : "bg-slate-300 cursor-not-allowed"
                            }`}
                        disabled={selectedOrder.status === "INSTALLED" || selectedOrder.status === "COMPLETED"}
                    >
                        {selectedOrder.status === "INSTALLED" || selectedOrder.status === "COMPLETED"
                            ? "시공 완료됨"
                            : "시공 완료 처리"}
                    </button>
                    {selectedOrder.status !== "INSTALLED" && selectedOrder.status !== "COMPLETED" && (
                        <p className="text-center text-xs text-slate-400 mt-2">
                            * 시공 후 사진을 등록해야 완료 처리가 가능합니다.
                        </p>
                    )}
                </div>
            </div>
        );
    }


    // --- List / Calendar View ---
    return (
        <div className="min-h-screen bg-slate-100 p-4">
            {/* Header / Nav */}
            <div className="bg-white sticky top-0 z-20 border-b shadow-sm mb-4">
                <header className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                                {user?.name || "시공자님"}
                                <span className="text-indigo-600 block text-xs font-medium mt-0.5">LIMSDOOR INSTALLER</span>
                            </h1>
                        </div>
                    </div>
                    {/* Top Right Actions (if any) */}
                </header>

                {/* Main Navigation Tabs */}
                <div className="flex px-4 pb-0">
                    <button
                        onClick={() => setViewMode("LIST")}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${viewMode === "LIST" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
                    >
                        <List size={16} /> 목록
                    </button>
                    <button
                        onClick={() => setViewMode("CALENDAR")}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${viewMode === "CALENDAR" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
                    >
                        <CalendarIcon size={16} /> 월별 일정
                    </button>
                    <button
                        onClick={() => setViewMode("REVENUE")}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${viewMode === "REVENUE" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
                    >
                        <div className="relative">
                            <span className="text-sm">매출·통계</span>
                            {viewMode !== "REVENUE" && <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                        </div>
                    </button>
                </div>
            </div>

            {/* REVENUE VIEW */}
            {viewMode === "REVENUE" && (
                <div className="space-y-4 pb-20">
                    {/* Yearly / Monthly Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 bg-gradient-to-br from-indigo-900 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
                            <div className="text-indigo-200 text-xs font-bold mb-1">2023년 누적 매출</div>
                            <div className="text-3xl font-extrabold mb-4">￦ 142,500,000</div>

                            <div className="flex gap-2">
                                <div className="bg-white/10 p-3 rounded-lg flex-1 backdrop-blur-sm">
                                    <div className="text-xs text-indigo-200 mb-1">이번 달 확정</div>
                                    <div className="font-bold text-lg">￦ 3,450,000</div>
                                </div>
                                <div className="bg-white/10 p-3 rounded-lg flex-1 backdrop-blur-sm">
                                    <div className="text-xs text-indigo-200 mb-1">정산 대기</div>
                                    <div className="font-bold text-lg text-orange-300">￦ 1,200,000</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-6 flex items-center justify-between">
                            월별 매출 추이
                            <span className="text-xs font-normal text-slate-400">최근 6개월</span>
                        </h3>

                        {/* CSS Bar Chart */}
                        <div className="flex items-end justify-between h-40 gap-2">
                            {[
                                { m: '7월', v: 850, h: '60%' },
                                { m: '8월', v: 920, h: '70%' },
                                { m: '9월', v: 1200, h: '85%' },
                                { m: '10월', v: 1100, h: '78%' },
                                { m: '11월', v: 800, h: '55%' },
                                { m: '12월', v: 1450, h: '95%', curr: true },
                            ].map((d, i) => (
                                <div key={i} className="flex flex-col items-center flex-1 group">
                                    <div className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 mb-1 transition-opacity">
                                        {d.v / 100}
                                    </div>
                                    <div
                                        className={`w-full max-w-[30px] rounded-t-lg transition-all hover:opacity-90 relative ${d.curr ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        style={{ height: d.h }}
                                    ></div>
                                    <div className={`text-xs mt-2 font-bold ${d.curr ? 'text-indigo-600' : 'text-slate-400'}`}>{d.m}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-center">
                            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                지난 달 대비 <span className="text-indigo-600 font-bold">12% 증가 📈</span> 했습니다.
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                            최근 시공 내역
                            <button className="text-xs text-indigo-600">전체보기</button>
                        </h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-slate-50">
                                    <div>
                                        <div className="font-bold text-slate-800">3연동 중문 외 1건</div>
                                        <div className="text-xs text-slate-400">2023.12.{20 + i} | 홍길동 고객</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-indigo-600">+ 150,000</div>
                                        <div className="text-[10px] text-slate-400">정산예정</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === "CALENDAR" ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg">{format(currentDate, "yyyy년 M월")}</h2>
                    </div>

                    {/* Week Header */}
                    <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-slate-500">
                        <div className="text-red-500">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div className="text-blue-500">토</div>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {daysInMonth.map((day, i) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            // Find orders for this day
                            const dayTasks = myTasks.filter(o => o.installDate === dateStr);
                            const isSelected = isSameDay(day, new Date());

                            return (
                                <div key={i} className={`min-h-[60px] border border-slate-50 rounded-lg p-1 flex flex-col items-center ${isToday(day) ? "bg-blue-50/50" : ""}`}>
                                    <span className={`text-xs mb-1 ${isToday(day) ? "bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-slate-700"}`}>
                                        {format(day, "d")}
                                    </span>

                                    {/* Dots for tasks */}
                                    <div className="flex flex-col gap-1 w-full">
                                        {dayTasks.map(task => (
                                            <button
                                                key={task.id}
                                                onClick={() => setSelectedOrderId(task.id)}
                                                className={`text-[10px] w-full text-left truncate px-1 rounded ${task.status === "INSTALLED" ? "bg-slate-200 text-slate-500 line-through" : "bg-indigo-100 text-indigo-700 font-bold"
                                                    }`}
                                            >
                                                {task.items[0]?.category}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* List View */}
                    {myTasks.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">일정이 없습니다.</div>
                    ) : (
                        myTasks.map(order => {
                            const customer = customers.find(c => c.id === order.customerId);
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => openDetail(order.id)}
                                    className="w-full text-left bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all active:scale-[0.99] cursor-pointer mb-3"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-bold text-lg text-slate-900 block">{order.items[0]?.category} 시공</span>
                                            <span className="text-sm font-bold text-indigo-600">
                                                ￦ {(order.finalPrice || order.estPrice || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        {order.installDate && (
                                            <span className={`text-xs px-2 py-1 rounded font-mono ${order.installDate === format(new Date(), "yyyy-MM-dd")
                                                ? "bg-red-100 text-red-600 font-bold animate-pulse"
                                                : "bg-slate-100 text-slate-600"
                                                }`}>
                                                {order.installDate}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-600 mb-3">
                                        {order.items.length}개 품목 • {order.items[0]?.detail}
                                    </div>

                                    {/* Action Footer */}
                                    <div className="grid grid-cols-[1fr_auto] gap-3 mt-2 pt-3 border-t border-slate-50 items-center">
                                        {/* Address (Clickable) */}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenMap(customer?.address || "");
                                            }}
                                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition truncate"
                                        >
                                            <MapPin size={16} className="flex-shrink-0" />
                                            <span className="truncate underline decoration-dashed underline-offset-2">
                                                {customer?.address || "주소 정보 없음"}
                                            </span>
                                        </div>

                                        {/* Phone (Clickable) */}
                                        {customer?.phone && (
                                            <a
                                                href={`tel:${customer.phone}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center justify-center w-10 h-10 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition shadow-sm"
                                            >
                                                <Phone size={18} />
                                            </a>
                                        )}
                                    </div>

                                    {/* Name & Detail Hint */}
                                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                                        <span>고객: {customer?.name || "정보 없음"}</span>
                                        <span className="flex items-center text-indigo-400 font-bold">
                                            상세보기 <ChevronRight size={12} />
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
