import React, { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type ManageLayoutProps = {
    children: React.ReactNode;
    title?: string;
};

export default function ManageLayout({ children, title = "관리 시스템" }: ManageLayoutProps) {
    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar (Fixed Left) */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header (Top) */}
                <Header title={title} />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
