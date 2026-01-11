"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Ruler,
    Hammer,
    Calendar,
    Image as ImageIcon,
    Clock,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import LauncherChatWidget from './Launcher/LauncherChatWidget';
import { useGlobalStore } from '../lib/store-context';

export default function Launcher() {
    const { settings } = useGlobalStore();
    const [portfolioUrl, setPortfolioUrl] = React.useState<string>('/portfolio');
    const [googlePhotosUrl, setGooglePhotosUrl] = React.useState<string>('');

    useEffect(() => {
        // Fetch real portfolio URL
        async function fetchPortfolio() {
            try {
                const res = await fetch("/api/company/settings");
                if (res.ok) {
                    const json = await res.json();
                    if (json.data?.portfolio_url) {
                        setPortfolioUrl(json.data.portfolio_url);
                    }
                    if (json.data?.google_photos_url) {
                        setGooglePhotosUrl(json.data.google_photos_url);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch portfolio settings", e);
            }
        }
        fetchPortfolio();
    }, []);

    // Guard against hydration mismatch or undefined settings
    if (!settings) return null;

    const { homeLayout, company } = settings;

    const modules = [
        {
            id: 'manage',
            title: '통합관리',
            desc: '매출/고객/계약/AS 한눈에 관리',
            icon: LayoutDashboard,
            href: '/manage',
            color: 'bg-indigo-600',
            bg: 'bg-indigo-50',
            text: 'text-indigo-600'
        },
        {
            id: 'field',
            title: '실측',
            desc: '현장 실측 입력 · 전송 · 서명',
            icon: Ruler,
            href: '/field/new',
            color: 'bg-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-600'
        },
        {
            id: 'install',
            title: '시공관리',
            desc: '시공 진행 · 자재 · AS 처리',
            icon: Hammer,
            href: '/install',
            color: 'bg-orange-600',
            bg: 'bg-orange-50',
            text: 'text-orange-600'
        },
        {
            id: 'schedule',
            title: '스케줄관리',
            desc: '입금 · 시공 일정 캘린더',
            icon: Calendar,
            href: '/schedule',
            color: 'bg-green-600',
            bg: 'bg-green-50',
            text: 'text-green-600'
        },
        {
            id: 'portfolio',
            title: '포트폴리오',
            desc: '시공 사례 · 사진 · 후기 정리',
            icon: ImageIcon,
            href: portfolioUrl,
            color: 'bg-pink-600',
            bg: 'bg-pink-50',
            text: 'text-pink-600'
        },
        {
            id: 'google_photos',
            title: '구글 사진첩',
            desc: '현장 시공 사진 아카이브',
            icon: ImageIcon,
            href: googlePhotosUrl || '#',
            color: 'bg-blue-600',
            bg: 'bg-blue-50',
            text: 'text-blue-600'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">

            <div className={`w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start animate-in slide-in-from-bottom-4 duration-500`}>

                {/* Left Column: Chat Widget & Info */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    {homeLayout.showLogo && (
                        <div className="text-left space-y-2 mb-4">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{company.name}</h1>
                            <p className="text-slate-500 font-medium">{company.contact || "Anytime, Anywhere system"}</p>

                            <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-500 transition py-2">
                                ⚙ 화면 설정
                            </Link>
                        </div>
                    )}

                    {homeLayout.showChat && <LauncherChatWidget />}

                    {/* Recent Activity Mini-Card */}
                    {homeLayout.showRecent && (
                        <div className="bg-white/60 p-4 rounded-xl border border-slate-200 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 font-bold">
                                <Clock size={14} />
                                최근 작업 이어하기
                            </div>
                            <div className="space-y-2">
                                <Link href="/field/new" className="block w-full text-left px-3 py-2 bg-white/80 hover:bg-white rounded-lg text-xs font-bold text-slate-700 transition border border-transparent hover:border-blue-200">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full inline-block mr-2"></span>
                                    홍길동 고객님 견적 (작성중)
                                </Link>
                                <Link href="/schedule" className="block w-full text-left px-3 py-2 bg-white/80 hover:bg-white rounded-lg text-xs font-bold text-slate-700 transition border border-transparent hover:border-green-200">
                                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
                                    1/15 서초동 시공 스케줄
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Module Grid */}
                <div className={`w-full lg:w-2/3 grid gap-5 ${homeLayout.cardSize === 'large' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {modules.map((m) => {
                        const Icon = m.icon;
                        return (
                            <Link
                                href={m.href}
                                target={m.id === 'portfolio' || m.id === 'google_photos' ? '_blank' : undefined}
                                key={m.id}
                                className={`group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between 
                                    ${homeLayout.cardSize === 'large' ? 'min-h-[200px]' : 'min-h-[160px]'}`}
                            >
                                <div>
                                    <div className={`w-12 h-12 ${m.bg} ${m.text} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon size={24} strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {m.title}
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                        {m.desc}
                                    </p>
                                </div>
                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                    <ArrowRight className="text-slate-300" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="mt-12 text-center text-xs text-slate-400 font-medium">
                © 2025 {company.name}. All rights reserved.
            </div>
        </div>
    );
}
