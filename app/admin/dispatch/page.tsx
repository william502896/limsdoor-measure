"use client";

import { useState, useEffect, Suspense } from "react";
import { Order, User, AssignmentLog, AssignmentStatus, UserStatus } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import {
    ArrowLeft, User as UserIcon, Calendar, CheckCircle, AlertCircle,
    Clock, Truck, ChevronRight, UserCheck, UserX, BarChart3, CreditCard, ShieldCheck, ShieldAlert
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

function DispatchContent() {
    const { orders, users, updateOrder, updateUser, user: currentUser, currentTenant } = useGlobalStore();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Tabs: "DISPATCH" | "PERSONNEL" | "SETTLEMENT"
    const [activeTab, setActiveTab] = useState<"DISPATCH" | "PERSONNEL" | "SETTLEMENT">("DISPATCH");

    useEffect(() => {
        const t = searchParams.get("tab");
        if (t === "personnel") setActiveTab("PERSONNEL");
        if (t === "settlement") setActiveTab("SETTLEMENT");
    }, [searchParams]);

    const handleTabChange = (tab: "DISPATCH" | "PERSONNEL" | "SETTLEMENT") => {
        setActiveTab(tab);
        // Optional: Update URL without reload?
        // router.push(`/admin/dispatch?tab=${tab.toLowerCase()}`);
    };

    // --- SHARED DATA ---
    const tenantId = currentTenant?.id || "t_head";
    const installers = (users || []).filter(u => u.roles[tenantId] === "INSTALLER");

    // =========================================================================
    // RENDER: DISPATCH TAB
    // =========================================================================
    const RenderDispatchTab = () => {
        const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

        // Filters
        const unassignedOrders = orders.filter(o =>
            !o.assignmentStatus ||
            o.assignmentStatus === "UNASSIGNED" ||
            o.assignmentStatus === "REASSIGN_REQUIRED"
        );
        const activeOrders = orders.filter(o =>
            ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(o.assignmentStatus || "")
        );
        const completedOrders = orders.filter(o =>
            ["COMPLETED", "CANCELLED"].includes(o.assignmentStatus || "")
        ).slice(0, 5);

        // Action
        const handleAssign = (installerId: string) => {
            if (!selectedOrderId || !currentUser) return;
            const log: AssignmentLog = {
                scheduleId: selectedOrderId,
                assignedTo: installerId,
                assignedBy: currentUser.id,
                assignedAt: new Date().toISOString(),
                action: "ASSIGN"
            };
            const order = orders.find(o => o.id === selectedOrderId);
            updateOrder(selectedOrderId, {
                assignedToId: installerId,
                assignmentStatus: "ASSIGNED",
                assignmentLogs: [...(order?.assignmentLogs || []), log]
            });
            setSelectedOrderId(null);
        };

        return (
            <div className="flex h-full overflow-hidden">
                {/* LEFT: Pool */}
                <div className="w-1/3 border-r bg-white flex flex-col min-w-[320px]">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <Calendar size={16} /> 배정 대기 (Pool)
                        </h2>
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">{unassignedOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {unassignedOrders.map(order => (
                            <div key={order.id} onClick={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                                className={`p-4 rounded-xl border transition cursor-pointer hover:shadow-md ${selectedOrderId === order.id ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200 bg-white"
                                    }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.assignmentStatus === "REASSIGN_REQUIRED" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                                        }`}>{order.assignmentStatus === "REASSIGN_REQUIRED" ? "재배정 필요" : "미배정"}</span>
                                    <span className="text-xs text-slate-400">{order.installDate || "날짜미정"}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 mb-1">{order.id}</h3>
                                <div className="text-sm text-slate-600 mb-2">{order.items.map(i => i.category).join(", ")}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MIDDLE: Installers */}
                <div className="w-1/3 border-r bg-slate-50 flex flex-col min-w-[320px]">
                    <div className="p-4 border-b bg-slate-100">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2"><UserIcon size={16} /> 시공팀 선택</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {installers.filter(i => i.status === "ACTIVE").map(installer => {
                            const workload = activeOrders.filter(o => o.assignedToId === installer.id).length;
                            return (
                                <button key={installer.id} disabled={!selectedOrderId} onClick={() => handleAssign(installer.id)}
                                    className={`w-full text-left p-4 rounded-xl border bg-white shadow-sm flex items-center gap-4 transition-all ${selectedOrderId ? "hover:border-indigo-500 hover:shadow-md active:scale-95" : "opacity-70 cursor-not-allowed"
                                        }`}>
                                    <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                                        {installer.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800">{installer.name}</div>
                                        <div className="text-xs text-slate-500">진행중: {workload}건</div>
                                    </div>
                                    {selectedOrderId && <ChevronRight className="text-indigo-400" size={20} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Monitoring */}
                <div className="flex-1 bg-white flex flex-col min-w-[320px]">
                    <div className="p-4 border-b bg-slate-50"><h2 className="font-bold text-slate-700 flex items-center gap-2"><BarChart3 size={16} /> 진행 현황</h2></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeOrders.map(order => {
                            const assignee = installers.find(i => i.id === order.assignedToId);
                            return (
                                <div key={order.id} className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">{order.assignmentStatus}</span>
                                        <span className="text-xs font-mono text-slate-400">{order.id}</span>
                                    </div>
                                    <div className="text-sm font-bold mb-1">{assignee?.name || "Unknown"}</div>
                                    <div className="text-xs text-slate-500">고객: 홍길동</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // =========================================================================
    // RENDER: PERSONNEL TAB (Approvals)
    // =========================================================================
    const RenderPersonnelTab = () => {
        // Filter: Anyone PENDING is a candidate, OR Installers who are missing status
        // We include 'installers' (role=INSTALLER) AND anyone with 'PENDING' status (e.g. Consumer upgrading)
        const pendingInstallers = users.filter(u => u.status === "PENDING" || (u.roles[tenantId] === "INSTALLER" && !u.status));

        const activeInstallers = installers.filter(u => u.status === "ACTIVE");
        const inactiveInstallers = installers.filter(u => ["SUSPENDED", "REVOKED"].includes(u.status));

        const handleStatus = (uid: string, status: UserStatus) => {
            const targetUser = users.find(u => u.id === uid);
            const isApprove = status === "ACTIVE";

            if (confirm(`사용자 상태를 ${status} 로 변경하시겠습니까?${isApprove ? " (시공자 권한이 부여됩니다)" : ""}`)) {
                const updates: Partial<User> = { status };

                // If Approving, grant INSTALLER role (unless Owner/Admin)
                if (isApprove && targetUser) {
                    const currentRole = targetUser.roles[tenantId];
                    // Don't downgrade Admin/Owner
                    if (currentRole !== "OWNER" && currentRole !== "ADMIN") {
                        updates.roles = { ...targetUser.roles, [tenantId]: "INSTALLER" };
                    }
                }

                updateUser(uid, updates);
            }
        };

        return (
            <div className="flex h-full bg-slate-50 p-6 gap-6 overflow-hidden">
                {/* Pending List (Approvals) */}
                <div className="flex-1 flex flex-col min-w-[320px] max-w-md bg-white rounded-xl shadow border border-slate-200">
                    <div className="p-4 border-b bg-yellow-50 flex justify-between items-center rounded-t-xl">
                        <h2 className="font-bold text-yellow-800 flex items-center gap-2">
                            <ShieldCheck size={18} /> 승인 요청 (Pending)
                        </h2>
                        <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">{pendingInstallers.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {pendingInstallers.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">승인 대기 중인 인원이 없습니다.</div>
                        ) : (
                            pendingInstallers.map(u => (
                                <div key={u.id} className="border border-yellow-200 bg-yellow-50/30 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-lg">{u.name}</div>
                                        <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">신규 요청</div>
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1 mb-4">
                                        <div>📞 {u.phone}</div>
                                        {u.installerProfile && (
                                            <>
                                                <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-yellow-100">📋 {u.installerProfile.businessNumber || "사업자 미입력"}</div>
                                                <div className="text-xs text-slate-400">📍 {u.installerProfile.region} | 🔨 경력 {u.installerProfile.careerSummary}</div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStatus(u.id, "ACTIVE")} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition">
                                            승인 (Approve)
                                        </button>
                                        <button onClick={() => handleStatus(u.id, "REVOKED")} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 py-2 rounded-lg text-sm font-bold transition">
                                            반려 (Reject)
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Active List (Management) */}
                <div className="flex-[2] flex flex-col bg-white rounded-xl shadow border border-slate-200">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <UserCheck size={18} /> 활동 중인 시공팀 (Active)
                        </h2>
                        <span className="text-sm text-slate-500">총 {activeInstallers.length}팀</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeInstallers.map(u => (
                            <div key={u.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition bg-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                        {u.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{u.name}</div>
                                        <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Active
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 space-y-1 mb-3">
                                    <div>ID: {u.id}</div>
                                    <div>Phone: {u.phone}</div>
                                    {u.installerProfile && (
                                        <div className="text-indigo-500">{u.installerProfile.region} / {u.installerProfile.specialties?.join(", ")}</div>
                                    )}
                                </div>
                                <div className="pt-3 border-t border-slate-100 flex justify-end">
                                    <button onClick={() => handleStatus(u.id, "REVOKED")} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                                        <UserX size={12} /> 퇴사/권한박탈
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            {/* Header */}
            <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/manage')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Truck className="text-indigo-600" /> 통합 관제 센터
                        </h1>
                    </div>
                </div>
                {/* TABS */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => handleTabChange("DISPATCH")}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === "DISPATCH" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                        배차 관제
                    </button>
                    <button onClick={() => handleTabChange("PERSONNEL")}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === "PERSONNEL" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                        시공/기사 관리 {installers.some(u => u.status === "PENDING") && <span className="inline-block w-2 h-2 bg-red-500 rounded-full ml-1"></span>}
                    </button>
                    <button onClick={() => handleTabChange("SETTLEMENT")}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === "SETTLEMENT" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                        정산 관리
                    </button>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === "DISPATCH" && <RenderDispatchTab />}
                {activeTab === "PERSONNEL" && <RenderPersonnelTab />}
                {activeTab === "SETTLEMENT" && (
                    <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50">
                        <div className="text-center">
                            <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                            <h2 className="text-xl font-bold">정산 시스템 준비중</h2>
                            <p className="text-sm mt-2">시공비 입금일 지정 및 정산 내역 조회 기능이 곧 제공됩니다.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DispatchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Dispatch Console...</div>}>
            <DispatchContent />
        </Suspense>
    );
}
