"use client";

import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClosePayLanding() {
    const { funnelId } = useParams<{ funnelId: string }>();

    return (
        <div className="max-w-lg mx-auto space-y-6 py-10 px-4">
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="space-y-4 py-6">
                    <h1 className="text-xl font-bold text-slate-100">시공 일정 확정 안내</h1>
                    <p className="text-sm text-muted-foreground text-slate-400">
                        이번 주 시공 슬롯이 거의 마감되었습니다.
                    </p>

                    <ul className="list-disc ml-5 text-sm space-y-1 text-slate-300">
                        <li>실측 완료 고객 우선 배정</li>
                        <li>결제 완료 시 일정 확정</li>
                    </ul>

                    <Button className="w-full bg-pink-600 hover:bg-pink-500 text-white">
                        결제하고 일정 확정하기
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
