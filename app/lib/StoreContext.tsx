"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useStoreHook, GlobalState, TenantState, Order, Customer, Permission, AsEntry, Tenant, User } from "./store";

// Define the shape of the Context
interface StoreContextType {
    loaded: boolean;
    global: GlobalState;
    tenants: Tenant[];
    users: User[]; // All Users
    user: any; // User type (or User)
    currentTenant: any; // Tenant type

    // Tenant Data
    settings: any;
    orders: Order[];
    customers: Customer[];

    // Actions
    login: (userId: string) => void;
    logout: () => void;
    switchTenant: (tId: string) => void;
    addOrder: (o: Order) => void;
    updateOrder: (id: string, p: Partial<Order>) => void;
    addCustomer: (c: Customer) => void;
    updateCustomer: (id: string, p: Partial<Customer>) => void;
    addAsEntry: (orderId: string, entry: AsEntry) => void;
    updateUser: (id: string, p: Partial<User>) => void; // New
    addNotification: (n: any) => void;
    markNotificationRead: (id: string) => void;
    can: (p: Permission) => boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    // Use the hook we created in store.ts (which manages the localized state + storage)
    // By invoking it here ONE time, we create the "Single Source of Truth".
    const store = useStoreHook();

    // Prevent rendering children until loaded to avoid Hydration Mismatch or Flash of Logged Out
    // if (!store.loaded) return <div className="min-h-screen flex items-center justify-center">Loading Limsdoor...</div>;

    return (
        <StoreContext.Provider value={store}>
            {children}
        </StoreContext.Provider>
    );
}

export function useGlobalStore() {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error("useGlobalStore must be used within a StoreProvider");
    }
    return context;
}
