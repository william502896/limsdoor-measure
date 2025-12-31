"use client";

import React, { useEffect, useState, useRef } from "react";
import { useDemoLimit } from "@/app/hooks/useDemoLimit";
import Link from "next/link";
import { Lock } from "lucide-react";

interface Props {
    children: React.ReactNode;
}

export default function DemoGuard({ children }: Props) {
    const { isReady, isDevMode, launchCount, recordLaunch } = useDemoLimit();
    const [blocked, setBlocked] = useState(false);
    const checkedRef = useRef(false);

    useEffect(() => {
        if (!isReady) return;
        if (checkedRef.current) return;
        checkedRef.current = true;

        // Logic: If already >= 5, BLOCK.
        // If < 5, ALLOW and Increment.
        // (Usage limit is "5 times". So 0,1,2,3,4 allowed. 5th time entering is blocked? 
        //  Wait, "Use 5 times" usually means I can do it 5 times. 
        //  Launch 1 (0->1), Launch 5 (4->5). Launch 6 (5 blocking).
        //  So check should be: if count >= 5 ? Block : Record.

        if (!isDevMode && launchCount >= 5) {
            setBlocked(true);
        } else {
            recordLaunch();
        }
    }, [isReady, isDevMode, launchCount, recordLaunch]);

    if (!isReady) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse">Loading...</div>;
    }

    if (blocked) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">일일 체험 한도 초과</h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        데모 버전은 하루 5회까지만 실행 가능합니다.<br />
                        내일 다시 이용해주시거나<br />
                        관리자 모드에서 <strong>개발자 모드</strong>를 켜주세요.
                    </p>
                    <div className="space-y-3">
                        <Link
                            href="/admin/onboarding"
                            className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            관리자 페이지로 이동
                        </Link>
                        <Link
                            href="/"
                            className="block w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                            홈으로 돌아가기
                        </Link>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-xs text-slate-400">
                            현재 사용량: {launchCount}회 / 5회
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
