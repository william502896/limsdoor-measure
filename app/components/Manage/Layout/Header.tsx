import React from "react";
import { Bell, Search, HelpCircle, LogOut } from "lucide-react"; // Added LogOut
import { useGlobalStore } from "@/app/lib/store-context"; // Added Context

type HeaderProps = {
    title: string;
};

export default function Header({ title }: HeaderProps) {
    const { logout } = useGlobalStore();
    const today = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
    });

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
            {/* Left: Page Title & Date */}
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                <div className="hidden md:block h-4 w-px bg-slate-300"></div>
                <div className="hidden md:block text-sm text-slate-500 font-medium">
                    {today}
                </div>
            </div>

            {/* Center: Search (Optional) */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 w-96 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <Search size={16} className="text-slate-400 mr-2" />
                <input
                    type="text"
                    placeholder="고객명, 전화번호, 일정 검색..."
                    className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
                />
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-4">
                {/* System Status Indicators */}
                <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-slate-600">시스템 정상</span>
                    </div>
                    <div className="w-px h-3 bg-slate-300"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">API 연결됨</span>
                    </div>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors mr-2">
                    <HelpCircle size={20} />
                </button>

                <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-bold transition-colors border border-slate-200 hover:border-red-200">
                    <LogOut size={14} />
                    로그아웃
                </button>
            </div>
        </header>
    );
}
