"use client";

import React, { useState } from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { ArrowLeft, ExternalLink, Image as ImageIcon, Grid, Layout } from "lucide-react";
import Link from "next/link";

export default function PortfolioPage() {
    const { orders, currentTenant } = useGlobalStore();
    const [tab, setTab] = useState<"INTERNAL" | "DRIVE">("INTERNAL");

    // 1. Filter Internal Installed Photos
    // Only show orders that are INSTALLED or COMPLETED and have installFiles
    const installedOrders = orders.filter(o =>
        (o.status === "INSTALLED" || o.status === "COMPLETED") &&
        o.installFiles && o.installFiles.length > 0
    );

    // 2. Google Drive Link (Mock or from Tenant Settings)
    const driveLink = currentTenant?.googleDriveLink || "https://drive.google.com/drive/folders/primary-portfolio-id";

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 p-4 flex items-center gap-4">
                <Link href="/shop" className="p-2 rounded-full hover:bg-white/10">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-lg font-bold">시공 사례 (Portfolio)</h1>
            </header>

            {/* Tabs */}
            <div className="p-4">
                <div className="bg-slate-800 p-1 rounded-xl flex">
                    <button
                        onClick={() => setTab("INTERNAL")}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${tab === "INTERNAL" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            }`}
                    >
                        <ImageIcon size={16} />
                        최근 시공 현장
                    </button>
                    <button
                        onClick={() => setTab("DRIVE")}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${tab === "DRIVE" ? "bg-green-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            }`}
                    >
                        <Grid size={16} />
                        디자인 컬렉션
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-4">
                {tab === "INTERNAL" ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-slate-400 text-sm">총 {installedOrders.length}개의 현장</span>
                        </div>

                        {installedOrders.length === 0 ? (
                            <div className="bg-slate-800 rounded-2xl p-10 text-center text-slate-500 border border-slate-700 border-dashed">
                                <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p>등록된 시공 완료 사진이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {installedOrders.map(order => (
                                    <div key={order.id} className="bg-slate-800/50 rounded-2xl overflow-hidden border border-white/5">
                                        {/* Main Photo */}
                                        <div className="aspect-video bg-slate-800 relative">
                                            {order.installFiles && order.installFiles[0] ? (
                                                <img
                                                    src={order.installFiles[0]}
                                                    alt="Construction"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                                                <h3 className="font-bold text-lg">{order.items[0]?.category} 시공</h3>
                                                <p className="text-sm text-slate-300">
                                                    {order.installDate} 완료 • {order.items[0]?.detail}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 text-center pt-10">
                        <div className="w-20 h-20 bg-green-100/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo_%282020%29.svg" alt="Drive" className="w-10 h-10" />
                        </div>

                        <h2 className="text-2xl font-bold">Google Drive 갤러리</h2>
                        <p className="text-slate-400 max-w-xs mx-auto mb-8">
                            더 많은 다양한 시공 디자인과 고화질 사례를 구글 드라이브에서 확인해보세요.
                        </p>

                        <a
                            href={driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-white text-black px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            브랜드 갤러리 바로가기
                            <ExternalLink size={18} />
                        </a>

                        <div className="mt-8 p-4 bg-slate-800 rounded-xl text-xs text-slate-500 text-left mx-4 border border-slate-700">
                            * 관리자가 설정한 공식 구글 드라이브 폴더로 연결됩니다.<br />
                            * 일부 이미지는 로딩에 시간이 걸릴 수 있습니다.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
