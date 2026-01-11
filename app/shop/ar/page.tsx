"use client";

import dynamic from "next/dynamic";
import React from "react";

const ARClientConsumer = dynamic(() => import("./components/ARClientConsumer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-black text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>소비자 AR 로딩 중...</p>
            </div>
        </div>
    )
});

export default function ShopArPage() {
    return <ARClientConsumer />;
}
