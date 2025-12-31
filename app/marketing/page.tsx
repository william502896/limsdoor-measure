"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Megaphone, Users, TrendingUp } from "lucide-react";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";

function MarketingHomeContent() {
    const router = useRouter();

    const handleActionRequired = () => {
        router.push("/admin/marketing/leads");
    };

    const handleCreateLanding = (mode: string) => {
        router.push(`/admin/marketing/landings/create?mode=${mode}`);
    };

    const handleContentGen = (type: string) => {
        alert(`${type} 생성 기능은 준비 중입니다.`);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-8">
            {/* 타이틀 */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">마케팅</h1>
                <p className="text-slate-500 mt-1 text-lg">
                    고객을 만들고, 실측과 계약을 발생시키는 공간
                </p>
            </div>

            {/* 1. 오늘의 마케팅 액션 */}
            <Card className="border-l-4 border-indigo-600 bg-white shadow-md border-y-slate-200 border-r-slate-200">
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-8 gap-6">
                    <div>
                        <p className="text-indigo-600 font-bold mb-2 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">Action Required</span>
                            오늘의 마케팅 액션
                        </p>
                        <p className="font-extrabold text-2xl text-slate-900 flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            미응답 리드 3건이 있습니다
                        </p>
                    </div>
                    <Button onClick={handleActionRequired} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto h-12 px-8 text-lg shadow-lg shadow-indigo-200">
                        바로 처리하기 <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </CardContent>
            </Card>

            {/* 2. 퍼널 빠른 시작 */}
            <div>
                <h2 className="font-bold mb-5 text-xl text-slate-900">퍼널 빠른 시작</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group cursor-pointer" onClick={() => handleCreateLanding("LEAD")}>
                        <CardContent className="py-8 space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                <Megaphone size={26} />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">신규 고객 유입</p>
                                <p className="text-slate-500 font-medium">
                                    무료 콘텐츠 / 체크리스트 배포
                                </p>
                            </div>
                            <Button variant="outline" className="w-full border-slate-200 bg-slate-50 text-slate-600 font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                                시작하기
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all duration-300 group cursor-pointer" onClick={() => handleCreateLanding("CONSULT")}>
                        <CardContent className="py-8 space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors shadow-sm">
                                <Users size={26} />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900 mb-1 group-hover:text-violet-700 transition-colors">상담·실측 전환</p>
                                <p className="text-slate-500 font-medium">
                                    상담 예약 유도 · 실측 연결
                                </p>
                            </div>
                            <Button variant="outline" className="w-full border-slate-200 bg-slate-50 text-slate-600 font-bold hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all">
                                시작하기
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-pink-300 transition-all duration-300 group cursor-pointer" onClick={() => handleCreateLanding("CLOSE")}>
                        <CardContent className="py-8 space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors shadow-sm">
                                <TrendingUp size={26} />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900 mb-1 group-hover:text-pink-700 transition-colors">계약·결제 마무리</p>
                                <p className="text-slate-500 font-medium">
                                    결정 유도 메시지 · 마감 임박
                                </p>
                            </div>
                            <Button variant="outline" className="w-full border-slate-200 bg-slate-50 text-slate-600 font-bold hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-all">
                                시작하기
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 3. 콘텐츠 즉시 생성 */}
            <div>
                <h2 className="font-bold mb-5 text-xl text-slate-900">콘텐츠 즉시 생성</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button onClick={() => handleContentGen("당근마켓 글")} variant="outline" className="h-16 bg-white border-slate-200 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 text-slate-600 font-bold text-base shadow-sm hover:shadow transition-all">
                        🥕 당근마켓 글
                    </Button>
                    <Button onClick={() => handleContentGen("문자/카톡 스크립트")} variant="outline" className="h-16 bg-white border-slate-200 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 text-slate-600 font-bold text-base shadow-sm hover:shadow transition-all">
                        💬 문자/카톡 스크립트
                    </Button>
                    <Button onClick={() => handleContentGen("쇼츠 영상 대본")} variant="outline" className="h-16 bg-white border-slate-200 hover:border-red-400 hover:bg-red-50 hover:text-red-700 text-slate-600 font-bold text-base shadow-sm hover:shadow transition-all">
                        🎬 쇼츠 영상 대본
                    </Button>
                    <Button onClick={() => handleContentGen("블로그 글 구조")} variant="outline" className="h-16 bg-white border-slate-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-slate-600 font-bold text-base shadow-sm hover:shadow transition-all">
                        📝 블로그 글 구조
                    </Button>
                </div>
            </div>

            {/* 4. 퍼널 현황 요약 */}
            <div>
                <h2 className="font-bold mb-5 text-xl text-slate-900 flex items-center justify-between">
                    퍼널 현황 - 실시간
                    <Button variant="ghost" asChild className="text-indigo-600 font-bold hover:bg-indigo-50">
                        <Link href="/marketing/crm">전체 보기 &rarr;</Link>
                    </Button>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <Link href="/marketing/crm" className="block">
                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer group">
                            <CardContent className="py-6 text-center">
                                <div className="text-slate-500 font-bold mb-2 group-hover:text-indigo-600">유입</div>
                                <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">12</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/marketing/crm" className="block">
                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer group">
                            <CardContent className="py-6 text-center">
                                <div className="text-slate-500 font-bold mb-2 group-hover:text-indigo-600">상담중</div>
                                <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">5</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/marketing/crm" className="block">
                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer group">
                            <CardContent className="py-6 text-center">
                                <div className="text-slate-500 font-bold mb-2 group-hover:text-indigo-600">실측완료</div>
                                <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">3</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/marketing/crm" className="block">
                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer group">
                            <CardContent className="py-6 text-center">
                                <div className="text-slate-500 font-bold mb-2 group-hover:text-indigo-600">결제대기</div>
                                <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">2</div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function MarketingHomePage() {
    return (
        <ManageLayout>
            <MarketingHomeContent />
        </ManageLayout>
    );
}
