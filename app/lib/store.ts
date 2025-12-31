"use client";

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// GLOBAL TYPES (Platform)
// =============================================================================

export type Role = "OWNER" | "ADMIN" | "OFFICE" | "MEASURER" | "INSTALLER" | "VIEWER" | "CONSUMER";

export type Permission =
    | "VIEW_ALL" | "MANAGE_TENANT" | "MANAGE_STAFF" // Admin High Level
    | "VIEW_DASHBOARD" | "VIEW_CUSTOMERS" | "EDIT_CUSTOMERS"
    | "VIEW_MEASURE" | "EDIT_MEASURE" | "SEND_MEASURE"
    | "VIEW_INSTALL" | "EDIT_INSTALL"
    | "VIEW_SCHEDULE" | "EDIT_SCHEDULE"
    | "DELETE_SCHEDULE" // New: Explicit delete permission
    | "USE_RADIO" | "USE_CHAT"
    | "DISPATCH"; // New: Dispatch Console

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";

export interface Notification {
    id: string;
    type: "REGISTER_REQUEST" | "INSTALL_COMPLETE" | "INFO";
    message: string;
    subText?: string; // e.g. "서울시 강남구 삼성동..."
    timestamp: string;
    isRead: boolean;
    link?: string; // Action link e.g. "/admin/dispatch?tab=personnel"
}

export interface InstallerProfile {
    // Professional Info
    businessNumber: string;
    careerSummary: string; // Detail (5 years)
    region: string;
    specialties: string[];
    bankAccount?: string; // "Bank Account Holder"

    // Personal Info
    name: string;
    address: string;
    phone: string;
    email: string;

    // Documents (Image URLs)
    businessLicenseFile?: string; // 사업자등록증
    idCardFile?: string;          // 신분증
    residentRegisterFile?: string; // 주민등록등본
}

export interface InstallRevenue {
    baseFee: number;
    extraLabors: { type: "DEMOLITION" | "ELECTRICAL" | "WOOD" | "TRAVEL" | "OTHER", amount: number, memo: string }[];
    deductions: { type: "AS_PENALTY" | "OTHER", amount: number, reason: string }[];
    totalAmount: number;
    settlementStatus: "PENDING" | "PAID";
    paidAt?: string;
}

export interface Tenant {
    id: string;         // e.g., "headquarters", "yanggu_branch"
    name: string;       // "림스도어 본사", "양구점"
    brandName: string;  // "LIMSDOOR"
    theme: "light" | "dark";
    defaultUiMode: "OFFICE" | "FIELD";
    googleDriveLink?: string; // URL for Portfolio
}

export interface User {
    id: string;
    name: string;
    phone: string;
    // Multi-tenant: A user can belong to multiple tenants with different roles
    roles: Record<string, Role>; // { "yanggu": "ADMIN", "chuncheon": "MEASURER" }
    currentTenantId?: string;    // Last active tenant
    status: UserStatus;          // Account Status
    installerProfile?: InstallerProfile; // New: Installer Details
}

// =============================================================================
// DOMAIN TYPES (Business Logic)
// =============================================================================

export type OrderStatus =
    | "AR_SELECTED"       // 소비자 AR 선택 완료 (가견적)
    | "MEASURE_REQUESTED" // 실측 요청 (계약금 입금 전/후)
    | "MEASURED"          // 실측 완료 (확정 견적)
    | "CONTRACT_CONFIRMED"// 최종 계약 (발주 대기)
    | "PRODUCING"         // 생산 중
    | "INSTALL_SCHEDULED" // 시공 예약 (신규)
    | "REFORM_SCHEDULED"  // 리폼/수리 예약
    | "INSTALLED"         // 시공 완료 (신규)
    | "REFORM_COMPLETED"  // 리폼/수리 완료
    | "COMPLETED"         // 최종 마감 (해피콜 등)
    | "AS_REQUESTED"      // AS 접수
    | "AS_SCHEDULED"      // AS 방문 예약
    | "AS_COMPLETED"      // AS 완료
    | "CANCELLED"         // 취소됨
    | "POSTPONED";        // 연기됨

export type ServiceType = "NEW_INSTALL" | "REFORM" | "AS";
export type AsDefectType = "PRODUCT" | "INSTALL"; // 제품불량 | 시공불량

// AR Scene Data (Consumer <-> Field Sync)
export interface ArScene {
    doorType: "3연동" | "원슬라이딩" | "스윙" | "여닫이" | "파티션";
    frameColor: string; // "화이트", "블랙", "샴페인골드" ...
    glassType: string;  // "투명", "브론즈", "모루" ...
    openDirection: "Left" | "Right" | "Both";
    width: number;
    height: number;
    capturedImage?: string; // DataURL of the AR capture
}

export interface ArFieldData {
    width: number;
    height: number;
    diffW: number;
    diffH: number;
    memo: string;
    photoUrl?: string;
    measurerName: string;
    measuredAt: string;
}

export interface ArData {
    consumer: ArScene;
    field?: ArFieldData;
    status: "PENDING" | "REVIEW_NEEDED" | "APPROVED" | "REJECTED";
}

export interface MeasureItem {
    category: string;
    detail: string;
    location: string;
    glass: string;
    color: string;
    width: number;
    height: number;
    quantity: number;

    // New: Link to AR Scene
    arScene?: ArScene;
}

export interface AsEntry {
    id: string;
    date: string;
    type: string;
    content: string;
    status: "접수" | "처리중" | "완료";
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    address: string;
    memo: string;
    createdAt: string;
}

export type AssignmentStatus = "UNASSIGNED" | "ASSIGNED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REASSIGN_REQUIRED";

export interface AssignmentLog {
    scheduleId: string;
    assignedTo: string; // Installer ID
    assignedBy: string; // Admin ID
    assignedAt: string; // ISO String
    action: "ASSIGN" | "REASSIGN" | "CANCEL" | "ACCEPT" | "REJECT" | "COMPLETE";
    reason?: string;
}

export interface Order {
    id: string;
    customerId: string;
    title?: string; // [NEW] Allow title
    tenantId: string; // Partition key

    // Workflow
    status: OrderStatus;

    // New: Service Categorization
    serviceType?: ServiceType;
    asDefect?: AsDefectType; // if serviceType === 'AS'

    // Status Tracking
    cancelReason?: string;
    postponeReason?: string;

    // Dates
    createdAt: string;
    measureDate?: string;
    installDate?: string;

    // Financials
    estPrice: number;      // AR 예상 견적
    finalPrice: number;    // 최종 확정 견적
    deposit: number;       // 계약금
    balance: number;       // 잔금
    paymentStatus: "Unpaid" | "Partial" | "Paid";

    // Data
    items: MeasureItem[];

    // Docs
    measureFiles: string[]; // Photos, Drawings
    installFiles: string[]; // (Legacy) Construction photos
    beforeInstallFiles?: string[]; // 시공 전
    afterInstallFiles?: string[]; // 시공 후
    installMemo?: string; // 시공 특이사항
    customerSign?: string;
    asHistory: AsEntry[];

    // Dispatch & Assignment (New)
    assignedToId?: string; // Installer ID
    assignmentStatus?: AssignmentStatus;
    assignmentLogs?: AssignmentLog[];

    // Financials (Installer)
    installerRevenue?: InstallRevenue;

    // AR Verification (New)
    arData?: ArData;
}

export interface TenantSettings {
    company: {
        name: string;
        contact: string;
        address?: string;
        logoUrl?: string; // For Branded App
    };
    homeLayout: {
        presets: Record<Role, string[]>; // { "MEASURER": ["measure", "schedule"] }
        showLogo: boolean;
    };
    members: User[]; // List of members in this tenant
}

// =============================================================================
// STORAGE ENGINE
// =============================================================================

export interface GlobalState {
    users: User[];         // All registered users (in the platform)
    tenants: Tenant[];     // All registered tenants
    currentUser: User | null;
    notifications: Notification[]; // New
}

export interface TenantState {
    settings: TenantSettings;
    customers: Customer[];
    orders: Order[];
}

const GLOBAL_KEY = "limsdoor_v2_global";
const TENANT_PREFIX = "limsdoor_v2_tenant_";

// Mock Data Seeder
const seedGlobal = (): GlobalState => ({
    users: [
        { id: "u_master", name: "최고관리자", phone: "010-0000-0000", roles: { "t_head": "OWNER" }, currentTenantId: "t_head", status: "ACTIVE" },
        { id: "u_field", name: "박실장(실측)", phone: "010-1111-1111", roles: { "t_head": "MEASURER" }, currentTenantId: "t_head", status: "ACTIVE" },
        { id: "u_install", name: "김반장(시공)", phone: "010-2222-2222", roles: { "t_head": "INSTALLER" }, currentTenantId: "t_head", status: "ACTIVE" },
        { id: "u_consumer", name: "소비자(데모)", phone: "010-9999-9999", roles: { "t_head": "CONSUMER" }, currentTenantId: "t_head", status: "ACTIVE" },
        // New: Pending Installer for testing
        { id: "u_new_install", name: "신규시공자", phone: "010-3333-3333", roles: { "t_head": "INSTALLER" }, currentTenantId: "t_head", status: "PENDING" }
    ],
    tenants: [
        { id: "t_head", name: "림스도어 본사", brandName: "LIMSDOOR", theme: "light", defaultUiMode: "OFFICE" },
        { id: "t_yanggu", name: "양구점", brandName: "LIMSDOOR 양구", theme: "dark", defaultUiMode: "FIELD" }
    ],
    currentUser: null, // Initially logged out (or will auto-login mock)
    notifications: []
});

const seedTenant = (tId: string): TenantState => ({
    settings: {
        company: { name: tId === "t_head" ? "림스도어 본사" : "양구점", contact: "1588-0000" },
        homeLayout: {
            presets: {
                OWNER: ["manage", "schedule", "field", "install", "portfolio"],
                ADMIN: ["manage", "schedule", "field"],
                OFFICE: ["manage", "schedule"],
                MEASURER: ["field", "schedule", "radio"],
                INSTALLER: ["install", "radio"],
                VIEWER: [],
                CONSUMER: []
            },
            showLogo: true
        },
        members: []
    },
    customers: [],
    orders: []
});

export function useStoreHook() {
    // Global State
    const [global, setGlobal] = useState<GlobalState>(seedGlobal());

    // Tenant State (Active)
    const [tenantData, setTenantData] = useState<TenantState>(seedTenant("t_head"));

    const [loaded, setLoaded] = useState(false);

    // 1. Load Global
    useEffect(() => {
        try {
            const raw = localStorage.getItem(GLOBAL_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (!parsed.notifications) {
                    parsed.notifications = [];
                }
                setGlobal(parsed);
            } else {
                // Initial Save
                const init = seedGlobal();
                localStorage.setItem(GLOBAL_KEY, JSON.stringify(init));
                setGlobal(init);
            }
        } catch (e) {
            console.error("Global Load Error", e);
        }
    }, []);

    // 2. Load Tenant (Whenever Global CurrentTenant changes)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === GLOBAL_KEY && e.newValue) {
                console.log("Syncing global state from another tab...");
                try {
                    setGlobal(JSON.parse(e.newValue));
                } catch (err) {
                    console.error("Sync Error", err);
                }
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    useEffect(() => {
        if (!global.currentUser) {
            // Logic to auto-login as Master for DEMO purposes if no user
            // In real app, we'd wait for login. Here we auto-select u_master.
            // But let's respect if raw was null.
            const raw = localStorage.getItem(GLOBAL_KEY);
            if (!raw) {
                // First run auto login
                login("u_master");
            } else {
                // Logged out state, but loaded
                setLoaded(true);
            }
            return;
        }

        const tId = global.currentUser.currentTenantId || "t_head";
        const key = `${TENANT_PREFIX}${tId}`;

        try {
            const rawT = localStorage.getItem(key);
            if (rawT) {
                setTenantData(JSON.parse(rawT));
            } else {
                const initT = seedTenant(tId);
                localStorage.setItem(key, JSON.stringify(initT));
                setTenantData(initT);
            }
        } catch (e) {
            console.error("Tenant Load Error", e);
        } finally {
            setLoaded(true);
        }

    }, [global.currentUser?.id, global.currentUser?.currentTenantId]); // Reload when user or tenant context changes

    // ACTIONS =================================================================

    const saveGlobal = (newState: GlobalState) => {
        localStorage.setItem(GLOBAL_KEY, JSON.stringify(newState));
        setGlobal(newState);
    };

    // Helper for safe atomic updates + persistence
    const setTenantState = (updater: (prev: TenantState) => TenantState) => {
        setTenantData(prev => {
            const next = updater(prev);
            // Persistence Side-effect
            if (global.currentUser?.currentTenantId) {
                const key = `${TENANT_PREFIX}${global.currentUser.currentTenantId}`;
                localStorage.setItem(key, JSON.stringify(next));
            }
            return next;
        });
    };

    // Tenant Data Actions
    const addOrder = (order: Order) => {
        setTenantState(prev => ({ ...prev, orders: [...prev.orders, order] }));
    };

    const updateOrder = (id: string, patch: Partial<Order>) => {
        setTenantState(prev => ({
            ...prev,
            orders: prev.orders.map(o => o.id === id ? { ...o, ...patch } : o)
        }));
    };

    const deleteOrder = (id: string) => {
        setTenantState(prev => ({
            ...prev,
            orders: prev.orders.filter(o => o.id !== id)
        }));
    };

    const addCustomer = (customer: Customer) => {
        setTenantState(prev => ({ ...prev, customers: [...prev.customers, customer] }));
    };

    const updateCustomer = (id: string, patch: Partial<Customer>) => {
        setTenantState(prev => ({
            ...prev,
            customers: prev.customers.map(c => c.id === id ? { ...c, ...patch } : c)
        }));
    };

    const createOrderWithCustomer = (order: Order, customer?: Customer) => {
        setTenantState(prev => ({
            ...prev,
            customers: customer ? [...prev.customers, customer] : prev.customers,
            orders: [...prev.orders, order]
        }));
    };

    const addAsEntry = (orderId: string, entry: AsEntry) => {
        setTenantState(prev => ({
            ...prev,
            orders: prev.orders.map(o => o.id === orderId ? { ...o, asHistory: [...(o.asHistory || []), entry] } : o)
        }));
    };

    const updateUser = (id: string, p: Partial<User>) => {
        setGlobal(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === id ? { ...u, ...p } : u),
            // Update current user if it's the same person
            currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...p } : prev.currentUser
        }));
    };

    const addNotification = (n: Notification) => {
        setGlobal(prev => ({
            ...prev,
            notifications: [n, ...prev.notifications]
        }));
    };

    const markNotificationRead = (id: string) => {
        setGlobal(prev => ({
            ...prev,
            notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
        }));
    };

    const login = (userId: string) => {
        const user = global.users.find(u => u.id === userId);
        if (user) {
            const next = { ...global, currentUser: user };
            saveGlobal(next);
        }
    };

    const logout = () => {
        const next = { ...global, currentUser: null };
        saveGlobal(next);
    };

    const switchTenant = (tenantId: string) => {
        if (!global.currentUser) return;
        const updatedUser = { ...global.currentUser, currentTenantId: tenantId };
        const nextGlobal = {
            ...global,
            currentUser: updatedUser,
            users: global.users.map(u => u.id === updatedUser.id ? updatedUser : u)
        };
        saveGlobal(nextGlobal);
        setLoaded(false);
    };

    return {
        loaded,
        // Global Context
        global,
        users: global.users,
        tenants: global.tenants,
        user: global.currentUser,
        currentTenant: global.tenants.find(t => t.id === global.currentUser?.currentTenantId),

        // Tenant Data
        settings: tenantData.settings,
        orders: tenantData.orders,
        customers: tenantData.customers,

        // Actions
        login,
        logout,
        switchTenant,
        addOrder,
        updateOrder,
        addCustomer,
        updateCustomer,
        deleteOrder,
        createOrderWithCustomer, // EXPOSED
        addAsEntry,
        updateUser,
        addNotification,
        markNotificationRead,

        can: (permission: Permission) => {
            const u = global.currentUser;
            if (!u || !u.currentTenantId) return false;

            if (u.status !== "ACTIVE") return false;

            const role = u.roles[u.currentTenantId];
            if (!role) return false;

            switch (role) {
                case "OWNER": return true;
                case "MEASURER":
                    return ["VIEW_Schedule", "EDIT_Schedule", "VIEW_Measurement", "EDIT_Measurement", "VIEW_Consultation", "EDIT_Consultation", "USE_RADIO", "USE_CHAT"].includes(permission);
                case "INSTALLER":
                    return ["VIEW_INSTALL", "EDIT_INSTALL", "VIEW_SCHEDULE", "USE_RADIO", "USE_CHAT"].includes(permission);
                case "CONSUMER": return false;
                default: return false;
            }
        }
    };
}
