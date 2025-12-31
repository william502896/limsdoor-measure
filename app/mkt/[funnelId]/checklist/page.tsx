"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLead } from "../../_lib/createLead";

export default function ChecklistLanding() {
    const { funnelId } = useParams<{ funnelId: string }>();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [done, setDone] = useState(false);

    async function submit() {
        await createLead({
            funnelId,
            name,
            phone,
            source: "checklist",
            tags: ["체크리스트"],
        });
        setDone(true);
    }

    return (
        <div className="max-w-lg mx-auto space-y-6 py-10 px-4">
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="space-y-4 py-6">
                    <h1 className="text-xl font-bold text-slate-100">현관 중문 설치 전 10분 체크리스트</h1>
                    <p className="text-sm text-slate-400">
                        견적이 흔들리는 포인트를 미리 점검하세요.
                    </p>

                    {!done ? (
                        <>
                            <Input placeholder="이름(선택)" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500" />
                            <Input placeholder="휴대폰 번호(필수)" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500" />
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" onClick={submit}>무료로 받기</Button>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="font-semibold text-green-400">✅ 전송 완료</div>
                            <p className="text-sm text-slate-300">체크리스트 링크를 문자로 보내드렸습니다.</p>
                            <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                                상담/실측 예약하기
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
