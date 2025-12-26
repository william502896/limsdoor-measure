"use client";

import React, { useState, useEffect, Suspense } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useDevice } from "@/app/_hooks/useDevice";
import { Menu } from "lucide-react";

type ManageLayoutProps = {
    children: React.ReactNode;
    title?: string;
};

export default function ManageLayout({ children, title = "관리 시스템" }: ManageLayoutProps) {
    const { device, orientation } = useDevice();
    const [sidebarOpen, setSidebarOpen] = useState(false); // For Mobile Drawer
    const [collapsed, setCollapsed] = useState(false); // For Tablet/Desktop

    // Smart default state based on device
    useEffect(() => {
        if (device === "mobile") {
            setCollapsed(false);
            setSidebarOpen(false);
        } else if (device === "tablet") {
            // Auto collapse on portrait tablet
            setCollapsed(orientation === "portrait");
            setSidebarOpen(false);
        } else {
            // Desktop usually expanded
            setCollapsed(false);
            setSidebarOpen(false);
        }
    }, [device, orientation]);

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Desktop/Tablet Sidebar (Hidden on Mobile) */}
            {device !== "mobile" && (
                <Suspense fallback={<div className="w-20 bg-slate-900 h-full" />}>
                    <Sidebar collapsed={collapsed} />
                </Suspense>
            )}

            {/* Mobile Drawer Overlay */}
            {device === "mobile" && (
                <>
                    {/* Backdrop */}
                    <div
                        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Drawer */}
                    <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                        <Suspense fallback={null}>
                            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
                        </Suspense>
                    </div>
                </>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Header (Top) */}
                <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        {/* Toggle Button */}
                        {(device === "mobile" || device === "tablet") && (
                            <button
                                onClick={() => device === "mobile" ? setSidebarOpen(true) : setCollapsed(!collapsed)}
                                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        <h1 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{title}</h1>
                    </div>
                    <div className="text-xs md:text-sm text-slate-400 hidden sm:block">
                        {device === "mobile" ? "Mobile" : device === "tablet" ? `Tablet` : "Desktop"}
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative safe-bottom">
                    {children}
                </main>
            </div>
        </div>
    );
}
