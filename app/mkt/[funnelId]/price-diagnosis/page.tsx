"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLead } from "../../_lib/createLead";

export default function PriceDiagnosisLanding() {
    const { funnelId } = useParams<{ funnelId: string }>();
    const [phone, setPhone] = useState("");
    const [step, setStep] = useState<1 | 2 | 3>(1);

    async function finish() {
        await createLead({
            funnelId,
            phone,
            source: "price-diagnosis",
            tags: ["가격진단"],
        });
        setStep(3);
    }

    return (
        <div className="max-w-lg mx-auto space-y-6 py-10 px-4">
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="space-y-4 py-6">
                    <h1 className="text-xl font-bold text-slate-100">중문 견적 가격 진단</h1>

                    {step === 1 && (
                        <>
                            <p className="text-sm text-slate-300">문 폭이 1300mm 이상인가요?</p>
                            <div className="flex gap-2">
                                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => setStep(2)}>예</Button>
                                <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => setStep(2)}>아니오</Button>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <p className="text-sm text-slate-300">휴대폰 번호를 입력하면 결과를 안내합니다.</p>
                            <Input placeholder="휴대폰 번호" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500" />
                            <Button onClick={finish} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">결과 보기</Button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="font-semibold text-slate-100">📊 진단 결과</div>
                            <p className="text-sm text-slate-400">
                                추가 자재 가능성이 있어 정확한 실측이 필요합니다.
                            </p>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">실측 예약하기</Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
