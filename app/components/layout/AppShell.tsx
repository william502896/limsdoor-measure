"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/app/lib/utils";
import { Menu, X, Home, User } from "lucide-react";

interface NavItem {
    label: string;
    href: string;
    icon?: React.ElementType;
}

interface AppShellProps {
    children: React.ReactNode;
    navItems?: NavItem[];
    brandName?: string;
    sidebarHeader?: React.ReactNode;
    sidebarFooter?: React.ReactNode;
    userProfile?: React.ReactNode;
    sidebarContent?: React.ReactNode;
}

export function AppShell({
    children,
    navItems = [],
    brandName = "FieldX",
    sidebarHeader,
    sidebarFooter,
    userProfile,
    sidebarContent
}: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Close drawer on navigation
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">

            {/* 1. Desktop Sidebar (LG+) */}
            <aside className="hidden lg:flex w-[280px] flex-col border-r border-slate-200 bg-white sticky top-0 h-screen overflow-y-auto">
                {/* Brand */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/admin/onboarding?mode=edit')}
                        className="text-xl font-extrabold text-slate-900 tracking-tight hover:opacity-70 transition-opacity text-left"
                    >
                        {brandName}
                    </button>
                </div>

                {/* Header Slot (e.g. User Profile or Team Switcher) */}
                {sidebarHeader && <div className="p-4 border-b border-slate-50">{sidebarHeader}</div>}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {sidebarContent ? sidebarContent : navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        const Icon = item.icon || Home;
                        return (
                            <button
                                key={item.href}
                                onClick={() => router.push(item.href)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon size={20} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                {sidebarFooter && <div className="p-4 border-t border-slate-100">{sidebarFooter}</div>}
            </aside>

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Mobile Header (MD/SM) */}
                <header className="lg:hidden h-14 bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-slate-200 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-lg text-slate-800">{brandName}</span>
                    </div>
                    {userProfile && <div className="scale-90">{userProfile}</div>}
                </header>

                {/* Content */}
                <main className="flex-1">
                    {children}
                </main>
            </div>

            {/* 3. Mobile Drawer Overlay */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-lg">{brandName}</span>
                            <button onClick={() => setDrawerOpen(false)} className="text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        {sidebarHeader && <div className="p-4 bg-slate-50">{sidebarHeader}</div>}

                        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                            {sidebarContent ? sidebarContent : navItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon || Home;
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700"
                                                : "text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon size={20} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {sidebarFooter && <div className="p-4 border-t border-slate-100">{sidebarFooter}</div>}
                    </div>
                </div>
            )}

        </div>
    );
}
