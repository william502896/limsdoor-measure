"use client";

import dynamic from "next/dynamic";
import React from "react";

const ARClientMeasure = dynamic(() => import("./components/ARClientMeasure"), {
    ssr: false,
    loading: () => <div className="flex h-screen items-center justify-center bg-black text-white">로딩 중...</div>
});

export default function FieldArPage() {
    return <ARClientMeasure />;
}
