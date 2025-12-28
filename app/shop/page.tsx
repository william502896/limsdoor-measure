"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Camera, ChevronRight, Globe, ShoppingBag, MessageCircle, Youtube, Instagram, Facebook } from "lucide-react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { useTheme } from "@/app/components/providers/ThemeProvider";
import { TRANSLATIONS, LANGUAGES, Language } from "@/app/lib/i18n";

// TikTok Icon Component (Shared style)
function TikTokIcon({ size = 20, className = "" }: { size?: number, className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.394 6.394 0 0 0-5.394 5.394 6.395 6.395 0 0 0 6.394 6.394 6.395 6.395 0 0 0 6.394-6.394v-6.165a8.32 8.32 0 0 0 4.847 1.428V6.687h-.008a4.792 4.792 0 0 1 .008-.001z" />
        </svg>
    );
}

export default function ShopLandingPage() {
    const supabase = useMemo(() => createSupabaseBrowser(), []);

    // Language State
    const [lang, setLang] = useState<Language>("ko");
    const [isLangOpen, setIsLangOpen] = useState(false);
    const t = TRANSLATIONS[lang];

    const changeLang = (l: Language) => {
        setLang(l);
        if (typeof window !== 'undefined') {
            localStorage.setItem("limsdoor_lang", l);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const saved = localStorage.getItem("limsdoor_lang") as Language;
        if (saved && TRANSLATIONS[saved]) {
            setLang(saved);
        } else {
            // Optional: Auto-detect
            // const browser = navigator.language.split('-')[0] as Language;
            // if (TRANSLATIONS[browser]) setLang(browser);
        }
    }, []);

    const [company, setCompany] = useState<{
        kakao?: string;
        homepages?: string[];
        malls?: string[];
        youtube?: string;
        tiktok?: string;
        instagram?: string;
        facebook?: string;
    } | null>(null);

    useEffect(() => {
        async function fetchCompanyInfo() {
            try {
                // 1. Try to get User's Company
                const { data: { user } } = await supabase.auth.getUser();
                let companyId = null;

                if (user) {
                    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
                    companyId = profile?.company_id;
                }

                // 2. Fallback to Cookie (for Demo or Guests with cookie)
                if (!companyId) {
                    const cookie = document.cookie.split('; ').find(row => row.startsWith('company_id='));
                    if (cookie) companyId = cookie.split('=')[1];
                }

                if (!companyId) return;
                if (companyId === 'demo') {
                    // Mock Data for Demo
                    setCompany({
                        kakao: "https://pf.kakao.com/_demo",
                        homepages: ["https://example.com"],
                        malls: ["https://smartstore.naver.com/demo"],
                        youtube: "https://youtube.com",
                        instagram: "https://instagram.com",
                        tiktok: "https://tiktok.com",
                        facebook: "https://facebook.com"
                    });
                    return;
                }

                // 3. Fetch Real Data
                const { data, error } = await supabase
                    .from('회사들')
                    .select('"카톡", "홈페이지", "쇼핑몰", "유튜브", "틱톡", "인스타그램", "페이스북"')
                    .eq('id', companyId)
                    .single();

                if (data) {
                    const companyData = data as any;
                    setCompany({
                        kakao: companyData['카톡'] || undefined,
                        homepages: companyData['홈페이지'] || [],
                        malls: companyData['쇼핑몰'] || [],
                        youtube: companyData['유튜브'],
                        tiktok: companyData['틱톡'],
                        instagram: companyData['인스타그램'],
                        facebook: companyData['페이스북']
                    });
                }
            } catch (e) {
                console.error("Shop Info Fetch Error", e);
            }
        }
        fetchCompanyInfo();
    }, []);

    const { theme } = useTheme();
    const defaultBg = "url('https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?q=80&w=2576&auto=format&fit=crop')";
    const activeBg = theme?.background?.appBgImageUrl ? `url('${theme.background.appBgImageUrl}')` : defaultBg;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden" onClick={() => isLangOpen && setIsLangOpen(false)}>
            {/* Background Effect: Dynamic or Default */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-500"
                style={{ backgroundImage: activeBg }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

            {/* Language Selector */}
            <div className="absolute top-6 right-6 z-30">
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsLangOpen(!isLangOpen); }}
                        className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full pl-3 pr-4 py-2 text-sm hover:bg-black/60 transition"
                    >
                        <span className="text-lg">{LANGUAGES.find(l => l.code === lang)?.flag}</span>
                        <span className="font-bold text-white/90">{LANGUAGES.find(l => l.code === lang)?.name}</span>
                        <Globe size={14} className="text-white/60 ml-1" />
                    </button>
                    {/* Dropdown */}
                    {isLangOpen && (
                        <div className="absolute right-0 top-full mt-2 w-40 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {LANGUAGES.map(l => (
                                <button
                                    key={l.code}
                                    onClick={() => { changeLang(l.code); setIsLangOpen(false); }}
                                    className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 hover:bg-white/10 transition ${lang === l.code ? 'text-white bg-white/5' : 'text-white/60'}`}
                                >
                                    <span className="text-lg">{l.flag}</span>
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
                <h1 className="text-5xl font-black tracking-tighter mb-2" style={{ fontFamily: 'var(--ui-font-heading)' }}>LIMSDOOR</h1>
                <p className="text-lg text-slate-300 font-medium mb-12">{t.subtitle}</p>

                <div className="w-full space-y-4">
                    <Link href="/shop/ar" className="group w-full flex items-center justify-between bg-white text-black p-5 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300"
                        style={{ borderRadius: 'var(--ui-btn-radius)' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                                <Camera size={24} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm text-slate-500 font-bold">BEST</div>
                                <div className="text-xl font-bold">{t.arBtn}</div>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-400 group-hover:text-black transition-colors" />
                    </Link>

                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/shop/portfolio" className="p-4 bg-slate-800/80 backdrop-blur rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition flex items-center justify-center">
                            {t.casesBtn}
                        </Link>
                        <Link href="/shop/my" className="p-4 bg-slate-800/80 backdrop-blur rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition flex items-center justify-center">
                            {t.quoteBtn}
                        </Link>
                    </div>

                    {/* --- Company Links --- */}
                    {company && (
                        <div className="pt-6 grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Kakao */}
                            <a
                                href={company.kakao || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full p-4 bg-[#FAE100] text-[#371D1E] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#FFEB3B] transition"
                            >
                                <MessageCircle size={20} fill="#371D1E" />
                                <span>{t.contactBtn}</span>
                            </a>

                            {/* SNS Grid */}
                            <div className="grid grid-cols-4 gap-2">
                                {company.youtube && (
                                    <a href={company.youtube} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-900/40 border border-red-500/30 text-red-100 hover:bg-red-800/60 transition">
                                        <Youtube size={20} />
                                        <span className="text-[10px] font-bold mt-1">{t.social.youtube}</span>
                                    </a>
                                )}
                                {company.homepages && company.homepages.length > 0 && (
                                    <a href={company.homepages[0]} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-300 hover:bg-slate-700 transition">
                                        <Globe size={20} />
                                        <span className="text-[10px] font-bold mt-1">{t.social.website}</span>
                                    </a>
                                )}
                                {company.malls && company.malls.length > 0 && (
                                    <a href={company.malls[0]} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-300 hover:bg-slate-700 transition">
                                        <ShoppingBag size={20} />
                                        <span className="text-[10px] font-bold mt-1">{t.social.mall}</span>
                                    </a>
                                )}
                                {company.instagram && (
                                    <a href={company.instagram} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-pink-900/40 border border-pink-500/30 text-pink-100 hover:bg-pink-800/60 transition">
                                        <Instagram size={20} />
                                        <span className="text-[10px] font-bold mt-1">{t.social.insta}</span>
                                    </a>
                                )}
                                {company.tiktok && (
                                    <a href={company.tiktok} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-300 hover:bg-slate-700 transition">
                                        <TikTokIcon size={20} />
                                        <span className="text-[10px] font-bold mt-1">{t.social.tiktok}</span>
                                    </a>
                                )}
                                {company.facebook && (
                                    <a href={company.facebook} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-900/40 border border-blue-500/30 text-blue-100 hover:bg-blue-800/60 transition">
                                        <Facebook size={20} />
                                        <span className="text-[10px] font-bold mt-1">{t.social.facebook}</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-6 text-xs text-slate-500">
                ⓒ 2025 LIMSDOOR Corp.
            </div>
        </div>
    );
}
