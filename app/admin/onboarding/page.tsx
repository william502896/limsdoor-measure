"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressSearchModal from "@/app/components/AddressSearchModal";
import { useDemoLimit } from "@/app/hooks/useDemoLimit";

type PersonRow = { name: string; phone?: string; note?: string };

export default function AdminOnboardingPage() {
    const router = useRouter();

    // Safety Force: Handle missing Env Vars gracefully
    const supabase = useMemo(() => {
        try {
            return createSupabaseBrowser();
        } catch (e) {
            console.error(e);
            return null;
        }
    }, []);

    const [step, setStep] = useState<"LANDING" | "FORM">("LANDING");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // --- Configuration Error View ---
    if (!supabase) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <div className="bg-white text-red-600 p-8 rounded-2xl max-w-lg text-center shadow-2xl border border-red-100">
                    <h2 className="text-2xl font-black mb-4">⚙️ Configuration Error</h2>
                    <p className="text-base mb-8 text-slate-600">
                        Supabase connection failed. Below is the current environment status.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-xl text-left text-sm font-mono mb-8 border border-slate-200">
                        <div className="flex justify-between mb-2">
                            <span className="font-bold text-slate-500">URL:</span>
                            <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Loaded" : "❌ Missing"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold text-slate-500">ANON_KEY:</span>
                            <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Loaded" : "❌ Missing"}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500">
                        If you added variables to Vercel, please <strong className="text-indigo-600">Redeploy</strong> to apply them.
                    </p>
                </div>
            </div>
        );
    }

    // 회사 기본정보
    const [currentStep, setCurrentStep] = useState(1);

    // Registration Type: 'company' | 'measurer' | 'installer' | 'staff'
    const [registerType, setRegisterType] = useState<"company" | "measurer" | "installer" | "staff">("company");

    // Company Data
    const [businessNumber, setBusinessNumber] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [fax, setFax] = useState("");
    const [kakao, setKakao] = useState("");

    // Social Media
    const [youtube, setYoutube] = useState("");
    const [tiktok, setTiktok] = useState("");
    const [instagram, setInstagram] = useState("");
    const [facebook, setFacebook] = useState("");

    // Dynamic URLs (Max 5)
    const [homepages, setHomepages] = useState<string[]>([""]);
    const [mallUrls, setMallUrls] = useState<string[]>([""]);

    // 로고
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [logoUploading, setLogoUploading] = useState(false);

    // 대표(OWNER) 정보
    const [ownerName, setOwnerName] = useState("");
    const [ownerJobTitle, setOwnerJobTitle] = useState("");
    const [ownerPhone, setOwnerPhone] = useState("");

    // Tier 1 Admin Password
    const [masterPassword, setMasterPassword] = useState("0000");

    // 반복 입력 (Legacy - kept for Company type)
    const [measurers, setMeasurers] = useState<PersonRow[]>([{ name: "", phone: "", note: "" }]);
    const [installers, setInstallers] = useState<PersonRow[]>([{ name: "", phone: "", note: "" }]);

    // Personnel Registration Data
    const [personName, setPersonName] = useState("");
    const [personPhone, setPersonPhone] = useState("");
    const [personTeam, setPersonTeam] = useState("시공");

    // Address Modal
    const [addressModalOpen, setAddressModalOpen] = useState(false);

    // Demo Limits
    const { isDevMode, toggleDevMode } = useDemoLimit();
    const [registeredCompany, setRegisteredCompany] = useState<{ name: string, logo: string } | null>(null);

    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        async function checkStatus() {
            const { data: { user } } = await supabase!.auth.getUser();
            if (user) {
                const { data: profile } = await supabase!.from("프로필").select("company_id").eq("id", user.id).single();
                if (profile?.company_id) {
                    setRegisteredCompany({ name: "등록된 회사", logo: "" });
                }
            }
        }
        checkStatus();
    }, [supabase]);

    // --- Actions ---
    function handlePreview() {
        setIsRedirecting(true);
        // Cookies
        document.cookie = "onboarded=1; path=/";
        document.cookie = "company_id=demo; path=/";

        // Wait for animation then reload
        setTimeout(() => {
            window.location.href = "/admin";
        }, 800);
    }

    if (isRedirecting) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-300">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                <h2 className="text-2xl font-bold mb-2">통합 대시보드 환경 설정 중...</h2>
                <p className="text-slate-400">잠시만 기다려주세요. 자동으로 새로고침 됩니다.</p>
            </div>
        );
    }

    if (registeredCompany) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-32 h-32 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-2xl mb-8 animate-in zoom-in duration-500">
                    L
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">이미 등록된 사용자입니다</h1>
                <p className="text-slate-500 mb-8">관리자 대시보드로 이동하거나, 관리자 메뉴에서 사용 해제를 할 수 있습니다.</p>

                <button
                    onClick={() => router.push('/admin')}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1"
                >
                    대시보드 바로가기
                </button>
            </div>
        );
    }

    // --- Form Logic ---
    async function uploadLogo(file: File) {
        setLogoUploading(true);
        setErr(null);
        try {
            const form = new FormData();
            form.append("file", file);

            const res = await fetch("/api/admin/logo/upload", { method: "POST", body: form });
            const json = await res.json();
            if (!res.ok || !json.ok) throw new Error(json.error || "UPLOAD_FAILED");
            setLogoUrl(json.url);
        } catch (e: any) {
            setErr(e?.message || "로고 업로드 실패");
        } finally {
            setLogoUploading(false);
        }
    }

    function updateUrl(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) {
        setter(prev => prev.map((u, i) => i === idx ? val : u));
    }
    function addUrl(setter: React.Dispatch<React.SetStateAction<string[]>>) {
        setter(prev => {
            if (prev.length >= 5) return prev;
            return [...prev, ""];
        });
    }
    function removeUrl(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) {
        setter(prev => prev.filter((_, i) => i !== idx));
    }

    function updateRow(setter: React.Dispatch<React.SetStateAction<PersonRow[]>>, idx: number, key: keyof PersonRow, val: string) {
        setter((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
    }
    function addRow(setter: React.Dispatch<React.SetStateAction<PersonRow[]>>) {
        setter((prev) => [...prev, { name: "", phone: "", note: "" }]);
    }
    function removeRow(setter: React.Dispatch<React.SetStateAction<PersonRow[]>>, idx: number) {
        setter((prev) => prev.filter((_, i) => i !== idx));
    }



    // Helper for Personnel Submit
    async function handleSubmitPersonnel() {
        if (!personName || !personPhone) return alert("필수 정보를 입력해주세요.");

        setLoading(true);
        try {
            let team = "기타";
            if (registerType === "measurer") team = "실측";
            if (registerType === "installer") team = "시공";

            const { error } = await supabase!.from("인사").insert([
                {
                    "이름": personName,
                    "연락처": personPhone,
                    "팀": team,
                    "상태": "승인대기",
                    "메모": "사용자 직접 등록",
                    "직책": "사원"
                }
            ]);

            if (error) {
                console.error(error);
                // Fallback for demo
                const mockKey = `lims_mock_personnel_pending`;
                const existing = JSON.parse(localStorage.getItem(mockKey) || "[]");
                const toSave = { "이름": personName, "연락처": personPhone, "팀": team, "상태": "승인대기" };
                localStorage.setItem(mockKey, JSON.stringify([...existing, toSave]));
            }

            alert("등록 요청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.");
            router.push("/admin");
        } catch (e) {
            console.error(e);
            alert("오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }

    async function onSubmit() {
        if (registerType !== "company") {
            await handleSubmitPersonnel();
            return;
        }

        if (!supabase) return;
        setLoading(true);
        setErr(null);
        try {
            // Validate Master Password
            if (masterPassword.length < 4) {
                if (masterPassword !== "0000" && masterPassword.length < 6) {
                    throw new Error("1티어 관리자 비밀번호는 기본값(0000) 또는 6자리 이상으로 설정해야 합니다.");
                }
            }
            if (masterPassword.length === 0) throw new Error("1티어 관리자 비밀번호를 입력해주세요.");

            if (!businessNumber.trim() || !companyName.trim() || !ownerName.trim()) {
                throw new Error("필수 항목(사업자번호/회사명/대표자명)을 입력해주세요.");
            }

            // 1. Check Auth (Sign Up if needed)
            const { data: authData } = await supabase.auth.getUser();
            let user = authData.user;

            if (!user) {
                // Not logged in -> Attempt Sign Up / Sign In
                if (!email.trim()) throw new Error("로그인되어 있지 않습니다. 이메일을 입력하여 회원가입을 진행해주세요.");

                // Try Sign Up
                const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: masterPassword, // Use Master Password as Account Password
                    options: {
                        data: {
                            full_name: ownerName,
                        }
                    }
                });

                if (signUpErr) {
                    // Try Sign In if Sign Up failed (maybe existing user)
                    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                        email: email.trim(),
                        password: masterPassword
                    });
                    if (signInErr) {
                        // Original signup error is more relevant usually
                        throw new Error(`회원가입/로그인 실패: ${signUpErr.message}`);
                    }
                    user = signInData.user;
                } else {
                    user = signUpData.user;
                }
            }

            if (!user) throw new Error("사용자 인증에 실패했습니다.");

            // Filter empty URLs
            const validHomepages = homepages.map(u => u.trim()).filter(u => u.length > 0);
            const validMalls = mallUrls.map(u => u.trim()).filter(u => u.length > 0);

            const res = await fetch("/api/admin/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_user_id: user.id,
                    business_number: businessNumber.trim(),
                    company_name: companyName.trim(),
                    address: address.trim() || undefined,
                    email: email.trim() || undefined,
                    fax: fax.trim() || undefined,
                    kakao: kakao.trim() || undefined,
                    youtube: youtube.trim() || undefined,
                    tiktok: tiktok.trim() || undefined,
                    instagram: instagram.trim() || undefined,
                    facebook: facebook.trim() || undefined,
                    logo_url: logoUrl || undefined,
                    homepage_urls: validHomepages.length > 0 ? validHomepages : undefined,
                    shopping_mall_urls: validMalls.length > 0 ? validMalls : undefined,
                    owner_name: ownerName.trim(),
                    owner_job_title: ownerJobTitle.trim() || undefined,
                    owner_phone: ownerPhone.trim() || undefined,
                    master_password: masterPassword,
                    measurers,
                    installers,
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.ok) throw new Error(json.error || "ONBOARDING_FAILED");

            router.replace("/admin");
            router.refresh();
        } catch (e: any) {
            console.error(e);
            setErr(e?.message || "등록 실패");
        } finally {
            setLoading(false);
        }
    }

    // --- Main Wrapper with White Fox Background ---
    return (
        <div className="min-h-screen relative bg-cover bg-center font-sans text-slate-800" style={{ backgroundImage: "url('/white-fox-bg.png')" }}>
            {/* Overlay for Readability */}
            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-0" />

            <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-4">

                {/* Header / Logo Area */}
                <div className="mb-12 text-center relative">
                    <Link href="/admin/onboarding" className="inline-block group cursor-pointer">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter mb-3 group-hover:text-indigo-600 transition-colors drop-shadow-sm">
                            LIMSDOOR ADMIN
                        </h1>
                        <p className="text-lg text-slate-600 font-medium group-hover:text-indigo-500 transition-colors">
                            사용 등록을 통해 관리자 기능을 시작하세요.
                        </p>
                    </Link>

                    {/* Developer Mode Toggle */}
                    <div className="absolute top-0 right-0 md:right-[-100px] flex flex-col items-center">
                        <button
                            onClick={toggleDevMode}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                ${isDevMode ? "bg-indigo-600" : "bg-slate-200"}
                            `}
                        >
                            <span className="sr-only">Enable Developer Mode</span>
                            <span
                                className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                    ${isDevMode ? "translate-x-6" : "translate-x-1"}
                                `}
                            />
                        </button>
                        <span className="text-[10px] font-bold mt-1 text-slate-400 uppercase tracking-widest">Dev Mode</span>
                    </div>
                </div>

                {/* --- LANDING VIEW --- */}
                {step === "LANDING" ? (
                    <div className="w-full max-w-4xl flex flex-col gap-8 px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                            {/* Preview Card */}
                            <div
                                onClick={handlePreview}
                                className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-xl hover:shadow-2xl hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center group"
                            >
                                <div className="w-20 h-20 bg-indigo-100/50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                                    👀
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">미리 써보기</h2>
                                <p className="text-slate-600 font-medium leading-relaxed">
                                    등록 없이 가상 데이터로<br />관리자 기능을 체험합니다.
                                </p>
                            </div>

                            {/* Registration Card */}
                            <div
                                onClick={() => setStep("FORM")}
                                className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-indigo-100 shadow-xl hover:shadow-2xl hover:bg-white hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center group ring-4 ring-transparent hover:ring-indigo-100"
                            >
                                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                                    📝
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">사용 등록</h2>
                                <p className="text-slate-600 font-medium leading-relaxed">
                                    사업자 정보 및 직원을<br />등록하고 시작합니다.
                                </p>
                            </div>
                        </div>

                        {/* Demo Apps Section */}
                        <div className="bg-white/40 backdrop-blur-md rounded-3xl p-6 border border-white/40 shadow-lg">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center opacity-80">데모 앱 체험하기 (등록 없이 체험)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Link href="/field/new" className="bg-white/60 hover:bg-white p-4 rounded-2xl border border-white/50 transition-all hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        📐
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">실측 앱</div>
                                        <div className="text-xs text-slate-500">현장 실측 시뮬레이션</div>
                                    </div>
                                </Link>
                                <Link href="/consumer/request" className="bg-white/60 hover:bg-white p-4 rounded-2xl border border-white/50 transition-all hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        👤
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-slate-800 group-hover:text-pink-600 transition-colors">고객 앱</div>
                                        <div className="text-xs text-slate-500">견적 요청 및 AR</div>
                                    </div>
                                </Link>
                                <Link href="/install" className="bg-white/60 hover:bg-white p-4 rounded-2xl border border-white/50 transition-all hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        🔨
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">시공 앱</div>
                                        <div className="text-xs text-slate-500">시공 일정 및 완료</div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- FORM VIEW --- */
                    <div className="w-full max-w-3xl bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 p-6 md:p-10 animate-in slide-in-from-bottom-5 fade-in duration-500">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-200/60 pb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">사용 등록</h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">
                                    {registerType === "company" ? "등록 후 데이터가 0부터 누적됩니다." : "전문 파트너 등록 신청"}
                                </p>
                            </div>
                            <button
                                onClick={() => setStep("LANDING")}
                                className="text-sm font-bold text-slate-400 hover:text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                            >
                                ← 뒤로가기
                            </button>
                        </div>

                        {err && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-bold shadow-inner flex items-center gap-2">
                                ⚠️ {err}
                            </div>
                        )}

                        {/* Type Tabs */}
                        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                            <button
                                onClick={() => { setRegisterType("company"); setStep("FORM"); }}
                                className={`flex-1 py-3 text-sm font-bold rounded-lg transition ${registerType === "company" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                            >
                                🏢 업체 등록
                            </button>
                            <button
                                onClick={() => { setRegisterType("measurer"); setStep("FORM"); }}
                                className={`flex-1 py-3 text-sm font-bold rounded-lg transition ${registerType === "measurer" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                            >
                                📐 실측자
                            </button>
                            <button
                                onClick={() => { setRegisterType("installer"); setStep("FORM"); }}
                                className={`flex-1 py-3 text-sm font-bold rounded-lg transition ${registerType === "installer" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                            >
                                🔨 시공자
                            </button>
                        </div>

                        {registerType === "company" ? (
                            <div className="space-y-8">
                                {/* Section 1: Company Info */}
                                <section className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                        회사 정보
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="사업자등록번호 (필수)" value={businessNumber} onChange={setBusinessNumber} placeholder="예: 123-45-67890" />
                                        <Field label="회사명 (필수)" value={companyName} onChange={setCompanyName} placeholder="예: 림스도어" />

                                        {/* Address Field with Search */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">주소</label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
                                                    placeholder="도로명 주소"
                                                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-800 font-medium placeholder:text-slate-300 shadow-sm"
                                                />
                                                <button
                                                    onClick={() => setAddressModalOpen(true)}
                                                    className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition whitespace-nowrap"
                                                >
                                                    🔍 검색
                                                </button>
                                            </div>
                                        </div>

                                        <Field label="이메일" value={email} onChange={setEmail} placeholder="견적/명세서 발송용" />
                                        <Field label="팩스" value={fax} onChange={setFax} placeholder="선택" />
                                        <Field label="카톡 (채널 링크/ID)" value={kakao} onChange={setKakao} placeholder="예: http://pf.kakao.com/..." />
                                        <Field label="1티어 관리자 비밀번호" value={masterPassword} onChange={setMasterPassword} placeholder="6자리 이상 (기본: 0000)" type="password" />
                                    </div>

                                    {/* URLs */}
                                    <div className="mt-6 space-y-4">
                                        {/* Homepages */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">회사 홈페이지</label>
                                            <div className="space-y-2">
                                                {homepages.map((url, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            value={url}
                                                            onChange={e => updateUrl(setHomepages, idx, e.target.value)}
                                                            placeholder="https://..."
                                                            className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-800 font-medium placeholder:text-slate-300"
                                                        />
                                                        <button onClick={() => removeUrl(setHomepages, idx)} disabled={homepages.length <= 1} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30">✕</button>
                                                    </div>
                                                ))}
                                                {homepages.length < 5 && (
                                                    <button onClick={() => addUrl(setHomepages)} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">+ 추가</button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Malls */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">운영 쇼핑몰</label>
                                            <div className="space-y-2">
                                                {mallUrls.map((url, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            value={url}
                                                            onChange={e => updateUrl(setMallUrls, idx, e.target.value)}
                                                            placeholder="https://smartstore..."
                                                            className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-800 font-medium placeholder:text-slate-300"
                                                        />
                                                        <button onClick={() => removeUrl(setMallUrls, idx)} disabled={mallUrls.length <= 1} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30">✕</button>
                                                    </div>
                                                ))}
                                                {mallUrls.length < 5 && (
                                                    <button onClick={() => addUrl(setMallUrls)} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">+ 추가</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Owner Info */}
                                <section className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
                                        대표자(OWNER) 정보
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Field label="대표자명 (필수)" value={ownerName} onChange={setOwnerName} placeholder="예: 홍길동" />
                                        <Field label="직위" value={ownerJobTitle} onChange={setOwnerJobTitle} placeholder="예: 대표" />
                                        <Field label="연락처" value={ownerPhone} onChange={setOwnerPhone} placeholder="010-..." />
                                    </div>
                                </section>

                                {/* Section 3: Workers */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Measurers */}
                                    <section className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                                            실측자 등록
                                        </h3>
                                        <div className="space-y-3">
                                            {measurers.map((r, idx) => (
                                                <div key={idx} className="bg-white/60 p-3 rounded-xl border border-white/50 space-y-2">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <SimpleInput value={r.name} onChange={v => updateRow(setMeasurers, idx, "name", v)} placeholder="이름" />
                                                        <SimpleInput value={r.phone || ""} onChange={v => updateRow(setMeasurers, idx, "phone", v)} placeholder="연락처" />
                                                        <SimpleInput value={r.note || ""} onChange={v => updateRow(setMeasurers, idx, "note", v)} placeholder="메모" />
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button onClick={() => removeRow(setMeasurers, idx)} disabled={measurers.length <= 1} className="text-xs text-red-400 disabled:opacity-30">삭제</button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => addRow(setMeasurers)} className="w-full py-2 bg-white/50 hover:bg-white text-slate-500 font-bold rounded-lg text-sm transition-colors border border-slate-200">+ 추가</button>
                                        </div>
                                    </section>

                                    {/* Installers */}
                                    <section className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                                            시공자(설치기사) 등록
                                        </h3>
                                        <div className="space-y-3">
                                            {installers.map((r, idx) => (
                                                <div key={idx} className="bg-white/60 p-3 rounded-xl border border-white/50 space-y-2">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <SimpleInput value={r.name} onChange={v => updateRow(setInstallers, idx, "name", v)} placeholder="이름" />
                                                        <SimpleInput value={r.phone || ""} onChange={v => updateRow(setInstallers, idx, "phone", v)} placeholder="연락처" />
                                                        <SimpleInput value={r.note || ""} onChange={v => updateRow(setInstallers, idx, "note", v)} placeholder="메모" />
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button onClick={() => removeRow(setInstallers, idx)} disabled={installers.length <= 1} className="text-xs text-red-400 disabled:opacity-30">삭제</button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => addRow(setInstallers)} className="w-full py-2 bg-white/50 hover:bg-white text-slate-500 font-bold rounded-lg text-sm transition-colors border border-slate-200">+ 추가</button>
                                        </div>
                                    </section>
                                </div>

                                {/* Divider or Spacing */}
                                <div className="h-4" />
                            </div>
                        ) : (
                            /* Personnel Registration Form */
                            <div className="space-y-6 animate-in slide-in-from-right-10 fade-in duration-300">
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <h3 className="font-bold text-indigo-700 mb-1 flex items-center gap-2">
                                        {registerType === "measurer" ? "📐 실측자" : "🔨 시공자"} 등록 신청
                                    </h3>
                                    <p className="text-xs text-indigo-600">
                                        관리자의 승인 후 앱 로그인이 가능합니다. 본인의 실명을 입력해주세요.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">이름 (실명) <span className="text-red-500">*</span></label>
                                    <input
                                        value={personName}
                                        onChange={(e) => setPersonName(e.target.value)}
                                        placeholder="홍길동"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 font-bold placeholder:font-normal"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">휴대전화번호 <span className="text-red-500">*</span></label>
                                    <input
                                        value={personPhone}
                                        onChange={(e) => setPersonPhone(e.target.value)}
                                        type="tel"
                                        placeholder="010-0000-0000"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 font-bold placeholder:font-normal"
                                    />
                                </div>

                                <button
                                    onClick={onSubmit}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                >
                                    {loading ? "등록 요청 중..." : "등록 요청하기"}
                                </button>
                            </div>
                        )}

                        {/* Company Submit Button (Only for Company Type) */}
                        {registerType === "company" && (
                            <button
                                onClick={onSubmit}
                                disabled={loading}
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                            >
                                {loading ? "등록 처리 중..." : "등록 완료하고 시작하기 🚀"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setAddress(data.address)}
            />
        </div>
    );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1.5">{props.label}</span>
            <input
                type={props.type || "text"}
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                placeholder={props.placeholder}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-800 font-medium placeholder:text-slate-300 shadow-sm"
            />
        </label>
    );
}

function SimpleInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm text-slate-800 placeholder:text-slate-300"
        />
    );
}
