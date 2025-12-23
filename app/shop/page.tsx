"use client";

import React from "react";
import Link from "next/link";
import { Camera, ChevronRight } from "lucide-react";

export default function ShopLandingPage() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?q=80&w=2576&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

            <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
                <h1 className="text-5xl font-black tracking-tighter mb-2">LIMSDOOR</h1>
                <p className="text-lg text-slate-300 font-medium mb-12">내 집 현관을 눈으로 보고 쇼핑하세요</p>

                <div className="w-full space-y-4">
                    <Link href="/shop/ar" className="group w-full flex items-center justify-between bg-white text-black p-5 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                                <Camera size={24} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm text-slate-500 font-bold">BEST</div>
                                <div className="text-xl font-bold">AR로 우리집 꾸며보기</div>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-400 group-hover:text-black transition-colors" />
                    </Link>

                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/shop/portfolio" className="p-4 bg-slate-800/80 backdrop-blur rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition flex items-center justify-center">
                            시공 사례
                        </Link>
                        <Link href="/shop/my" className="p-4 bg-slate-800/80 backdrop-blur rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition flex items-center justify-center">
                            내 견적 확인
                        </Link>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-xs text-slate-500">
                ⓒ 2025 LIMSDOOR Corp.
            </div>
        </div>
    );
}
