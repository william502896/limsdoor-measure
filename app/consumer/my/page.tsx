"use client";

import React, { useState } from "react";
import { useGlobalStore } from "@/app/lib/store-context";
import { ArrowLeft, MessageCircle, Phone, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function MyQuotePage() {
    const { orders } = useGlobalStore();

    // In a real app, we filter by currentUser.id.
    // Here, showing all orders or simple filter for demo.
    const myOrders = orders.filter(o => o.status !== "COMPLETED"); // Show active orders

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white p-4 flex items-center gap-4 border-b shadow-sm sticky top-0 z-10">
                <Link href="/shop" className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-lg font-bold text-slate-800">내 견적 확인</h1>
            </header>

            {/* Content */}
            <div className="p-4 space-y-4">
                {myOrders.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <p>아직 신청한 견적이 없습니다.</p>
                        <Link href="/shop/ar" className="inline-block mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">
                            AR로 견적 내러 가기
                        </Link>
                    </div>
                ) : (
                    myOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            {/* Status Badge */}
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                                    {order.status === "AR_SELECTED" ? "견적 검토 중" : order.status}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {order.createdAt?.split("T")[0] || "날짜 미정"}
                                </span>
                            </div>

                            {/* Main Info */}
                            <div className="flex gap-4 mb-4">
                                {/* Thumbnail (If captured) */}
                                <div className="w-20 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                                    {order.items[0]?.arScene?.capturedImage ? (
                                        <img src={order.items[0].arScene.capturedImage} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Img</div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{order.items[0]?.category}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2">
                                        {order.items[0]?.detail} / {order.items[0]?.glass} / {order.items[0]?.color}
                                    </p>
                                    <div className="mt-2 font-bold text-indigo-600">
                                        {order.finalPrice ? order.finalPrice.toLocaleString() + "원" : "가격 산정 중"}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-4">
                                <button
                                    onClick={() => alert("상담 채팅 연결 (준비중)")}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-50 text-yellow-700 font-bold hover:bg-yellow-100 transition"
                                >
                                    <MessageCircle size={18} />
                                    1:1 상담
                                </button>
                                <button
                                    onClick={() => alert("전화 연결: 1588-0000")}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition"
                                >
                                    <Phone size={18} />
                                    전화 문의
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Info */}
            <div className="p-6 text-center text-xs text-slate-400">
                <p>견적 유효기간은 14일입니다.</p>
                <p>문의사항은 고객센터로 연락주세요.</p>
            </div>
        </div>
    );
}
