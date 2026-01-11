"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Check, Image as ImageIcon, FileText, Smartphone, Layout, ArrowLeft, Loader2, Sparkles, X, Wand2, Grid } from "lucide-react";
import LandingCopyGenerator from "@/app/components/landing/LandingCopyGenerator";
import { supabase } from "@/app/lib/supabase";

type LandingMode = "LEAD" | "CONSULT" | "CLOSE";

import { Suspense } from "react";

function CreateLandingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const adminKey = searchParams.get("key") || "";

    // Default mode from URL, fallback to LEAD
    const initialMode = (searchParams.get("mode") as LandingMode) || "LEAD";

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // AI Generation States
    const [genLoading, setGenLoading] = useState(false);

    // Asset Picker State
    const [assets, setAssets] = useState<any[]>([]);
    const [assetsLoading, setAssetsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        landing_mode: initialMode,
        title: "",
        sub_copy: "",
        goal_type: "PDF", // PDF | RSVP | MEASURE | EVENT
        main_image_url: "",
        hero_image_url: "",
        icon_image_urls: [] as string[],

        // Mode Specific CTA Fields
        cta_text: "무료 다운로드",
        cta_action: "DOWNLOAD", // DOWNLOAD | LINK | SUBMIT
        cta_target_url: "",

        // Data Collection
        collect_name: true,
        collect_phone: true,

        // Consult Mode
        consult_type: [] as string[], // VISIT, CALL

        // Close Mode
        payment_options: [] as string[], // DEPOSIT, FULL

        connected_message_type: "", // SMS | KAKAO
        connected_template_id: "",
    });

    const [imgSource, setImgSource] = useState<"UPLOAD" | "AI" | "ASSET">("AI"); // Default to AI

    async function fetchAssets() {
        if (assets.length > 0) return; // Cache
        setAssetsLoading(true);
        const { data } = await supabase.from("marketing_assets").select("*").order("created_at", { ascending: false });
        if (data) setAssets(data);
        setAssetsLoading(false);
    }

    useEffect(() => {
        if (imgSource === "ASSET") fetchAssets();
    }, [imgSource]);

    // Initialize defaults based on mode if empty
    useEffect(() => {
        if (!formData.title) {
            if (initialMode === "LEAD") {
                setFormData(prev => ({
                    ...prev,
                    title: "중문 설치 전 꼭 확인해야 할 7가지",
                    sub_copy: "실측 전 이것 모르면 비용이 2배로 듭니다.",
                    cta_text: "무료 가이드북 받기",
                    goal_type: "PDF"
                }));
            } else if (initialMode === "CONSULT") {
                setFormData(prev => ({
                    ...prev,
                    title: "우리 집에 딱 맞는 중문, 전문가 무료 상담",
                    sub_copy: "현장 환경에 따라 가격·시공 방식이 달라집니다. 정확한 견적을 받아보세요.",
                    cta_text: "무료 상담 예약하기",
                    goal_type: "RSVP",
                    consult_type: ["VISIT", "CALL"]
                }));
            } else if (initialMode === "CLOSE") {
                setFormData(prev => ({
                    ...prev,
                    title: "실측 완료, 이제 시공 일정만 확정하세요",
                    sub_copy: "최종 비용은 확정되었으며 추가 비용은 없습니다. 원하는 날짜를 선점하세요.",
                    cta_text: "일정 확정 및 결제하기",
                    goal_type: "MEASURE",
                    payment_options: ["DEPOSIT", "FULL"]
                }));
            }
        }
    }, [initialMode]);

    const steps = [
        { num: 1, label: "기본 정보" },
        { num: 2, label: "자료/이미지" },
        { num: 3, label: "CTA 설정" },
        { num: 4, label: "메시지 연결" },
    ];

    async function submit() {
        if (!formData.title) return alert("제목을 입력해주세요.");
        setLoading(true);
        try {
            // Priority: hero_image_url > main_image_url
            const payload = {
                ...formData,
                main_image_url: formData.hero_image_url || formData.main_image_url
            };

            const res = await fetch(`/api/admin/marketing/landings?key=${encodeURIComponent(adminKey)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            alert("랜딩페이지가 생성되었습니다.");
            router.push(`/admin/marketing/landings?key=${adminKey}`);
        } catch (e: any) {
            alert(e.message);
            setLoading(false);
        }
    }


    async function generateImage(kind: "HERO" | "ICONS") {
        setGenLoading(true);
        try {
            const res = await fetch("/api/marketing/landing-images/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: formData.landing_mode,
                    kind,
                    title: formData.title
                })
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            if (kind === "HERO") {
                setFormData(prev => ({ ...prev, hero_image_url: json.url }));
            } else {
                setFormData(prev => ({ ...prev, icon_image_urls: [json.url] }));
            }
        } catch (e: any) {
            alert(`이미지 생성 실패: ${e.message}`);
        } finally {
            setGenLoading(false);
        }
    }

    const Input = (props: any) => (
        <input
            {...props}
            className={`w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition ${props.className}`}
        />
    );

    const Label = ({ children }: any) => <label className="block text-sm font-bold text-slate-700 mb-1.5">{children}</label>;

    const ModeBadge = () => {
        const map = {
            LEAD: { label: "신규 고객 유입", color: "bg-indigo-100 text-indigo-700" },
            CONSULT: { label: "상담·실측 전환", color: "bg-violet-100 text-violet-700" },
            CLOSE: { label: "계약·결제 마무리", color: "bg-pink-100 text-pink-700" }
        };
        const info = map[initialMode];
        return <span className={`px-2 py-1 rounded text-xs font-bold ${info.color}`}>{info.label} 모드</span>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-lg font-bold text-slate-900">새 랜딩페이지 만들기</h1>
                            <ModeBadge />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {steps.map(s => (
                        <div key={s.num} className={`flex items-center gap-2 ${s.num === step ? "text-indigo-600 font-bold" : "text-slate-400 text-sm"}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${s.num === step ? "border-indigo-600 bg-indigo-50" : "border-slate-300"}`}>
                                {s.num < step ? <Check size={12} /> : s.num}
                            </div>
                            <span className="hidden sm:inline">{s.label}</span>
                            {s.num < 4 && <ChevronRight size={14} className="text-slate-300" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold mb-6">
                            {initialMode === "LEAD" && "신뢰를 주는 첫 인사를 건네보세요."}
                            {initialMode === "CONSULT" && "행동을 유도하는 메시지를 작성하세요."}
                            {initialMode === "CLOSE" && "고객의 불안을 없애고 결제를 확정하세요."}
                        </h2>

                        <div className="mb-8">
                            <LandingCopyGenerator
                                mode={initialMode}
                                industry="B2B 인테리어 중문 시공"
                                onPick={({ title, subtitle, ctaText, messageTemplate }: { title: string, subtitle: string, ctaText: string, messageTemplate: string }) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        title,
                                        sub_copy: subtitle,
                                        cta_text: ctaText,
                                        // Store message template for step 4 or future use
                                        connected_template_id: messageTemplate // Just temporarily storing here or log it
                                    }));
                                    // Maybe flash a success toast?
                                }}
                            />
                        </div>
                        <div className="space-y-6">
                            <div>
                                <Label>랜딩페이지 제목</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
                                />
                                <p className="text-xs text-slate-400 mt-1">고객이 가장 먼저 보게 될 헤드라인입니다.</p>
                            </div>
                            <div>
                                <Label>서브 카피 (설명)</Label>
                                <textarea
                                    className="w-full p-3 rounded-xl border border-slate-200 h-24 focus:outline-none focus:border-indigo-500 transition resize-none"
                                    value={formData.sub_copy}
                                    onChange={(e) => setFormData({ ...formData, sub_copy: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>목적 (Mode 고정)</Label>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm">
                                    {initialMode === "LEAD" && "📝 신규 고객 유입 (LEAD)"}
                                    {initialMode === "CONSULT" && "🤝 상담·실측 전환 (CONSULT)"}
                                    {initialMode === "CLOSE" && "💰 계약·결제 마무리 (CLOSE)"}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Assets (AI Integration) */}
                {step === 2 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold mb-6">시각 자료 설정</h2>

                        {/* Tab Switch */}
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                            <button
                                onClick={() => setImgSource("AI")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${imgSource === "AI" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <Sparkles size={16} /> AI 자동 생성
                            </button>
                            <button
                                onClick={() => setImgSource("ASSET")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${imgSource === "ASSET" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <Grid size={16} /> 브랜드 자산
                            </button>
                            <button
                                onClick={() => setImgSource("UPLOAD")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${imgSource === "UPLOAD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <ImageIcon size={16} /> 직접 업로드
                            </button>
                        </div>

                        {imgSource === "ASSET" && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                <h3 className="font-bold text-slate-800 mb-4">등록된 브랜드 자산 선택</h3>
                                {assetsLoading ? (
                                    <div className="py-10 text-center text-slate-400">자산을 불러오는 중...</div>
                                ) : assets.length === 0 ? (
                                    <div className="py-10 text-center text-slate-400 text-sm">
                                        등록된 자산이 없습니다.<br />
                                        '마케팅 &gt; 브랜드 자산' 메뉴에서 이미지를 등록해주세요.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {assets.map(asset => (
                                            <div
                                                key={asset.id}
                                                onClick={() => setFormData(prev => ({ ...prev, main_image_url: asset.file_url, hero_image_url: asset.file_url }))}
                                                className={`group relative aspect-square bg-white rounded-xl border-2 cursor-pointer overflow-hidden transition-all
                                                    ${formData.main_image_url === asset.file_url ? "border-indigo-600 ring-2 ring-indigo-100" : "border-transparent hover:border-slate-300"}
                                                `}
                                            >
                                                {asset.category === 'video' ? (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">Video</div>
                                                ) : (
                                                    <img src={asset.file_url} className="w-full h-full object-cover" />
                                                )}

                                                {formData.main_image_url === asset.file_url && (
                                                    <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                                        <div className="bg-indigo-600 text-white rounded-full p-1"><Check size={16} /></div>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition">
                                                    {asset.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {imgSource === "AI" ? (
                            <div className="space-y-8">
                                {/* Hero Gen */}
                                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800">히어로 이미지 (Hero)</h3>
                                            <p className="text-sm text-slate-500">랜딩 최상단에 들어갈 고화질 배경입니다.</p>
                                        </div>
                                        <button
                                            onClick={() => generateImage("HERO")}
                                            disabled={genLoading}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {genLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            이미지 생성하기
                                        </button>
                                    </div>

                                    {formData.hero_image_url ? (
                                        <div className="relative rounded-xl overflow-hidden border border-indigo-200 shadow-md group">
                                            <img src={formData.hero_image_url} alt="Generated Hero" className="w-full h-48 object-cover" />
                                            <button
                                                onClick={() => setFormData({ ...formData, hero_image_url: "" })}
                                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-600 transition"
                                            >
                                                <X size={14} />
                                            </button>
                                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">AI Generated</div>
                                        </div>
                                    ) : (
                                        <div className="h-48 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 bg-slate-100/50">
                                            <span>이미지가 생성되면 여기에 표시됩니다</span>
                                        </div>
                                    )}
                                </div>

                                {/* Icon Gen */}
                                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800">아이콘 세트</h3>
                                            <p className="text-sm text-slate-500">신뢰감을 주는 아이콘 세트입니다.</p>
                                        </div>
                                        <button
                                            onClick={() => generateImage("ICONS")}
                                            disabled={genLoading}
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {genLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            아이콘 생성
                                        </button>
                                    </div>
                                    {formData.icon_image_urls.length > 0 ? (
                                        <div className="relative rounded-xl overflow-hidden border border-indigo-200 shadow-md group">
                                            <img src={formData.icon_image_urls[0]} alt="Generated Icon" className="w-full h-32 object-cover" />
                                            <button
                                                onClick={() => setFormData({ ...formData, icon_image_urls: [] })}
                                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-600 transition"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 bg-slate-100/50">
                                            <span>아이콘이 생성되면 여기에 표시됩니다</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:bg-slate-50 transition cursor-pointer group">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-100 transition">
                                        <ImageIcon size={32} className="text-slate-400 group-hover:text-indigo-500" />
                                    </div>
                                    <h3 className="font-bold text-slate-700">메인 이미지 업로드</h3>
                                    <p className="text-sm text-slate-400 mt-1">또는 PDF 파일을 여기에 드래그하세요</p>
                                    <div className="mt-4 inline-block px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600">파일 선택</div>
                                </div>
                                <div>
                                    <Label>메인 이미지 URL (직접 입력)</Label>
                                    <Input
                                        placeholder="https://..."
                                        value={formData.main_image_url}
                                        onChange={(e: any) => setFormData({ ...formData, main_image_url: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: CTA (Mode Specific) */}
                {step === 3 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold mb-6">
                            {initialMode === "LEAD" && "자료 제공 및 고객 정보 수집"}
                            {initialMode === "CONSULT" && "상담 예약 및 방문 일정"}
                            {initialMode === "CLOSE" && "최종 결제 및 일정 확정"}
                        </h2>

                        <div className="space-y-6">
                            {/* ALL MODES: CTA Text */}
                            <div>
                                <Label>버튼 문구</Label>
                                <Input
                                    value={formData.cta_text}
                                    onChange={(e: any) => setFormData({ ...formData, cta_text: e.target.value })}
                                />
                            </div>

                            {/* LEAD MODE: Collection */}
                            {initialMode === "LEAD" && (
                                <div>
                                    <Label>수집할 고객 정보</Label>
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.collect_name} onChange={e => setFormData({ ...formData, collect_name: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                                            <span className="text-slate-700">이름</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.collect_phone} onChange={e => setFormData({ ...formData, collect_phone: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                                            <span className="text-slate-700">전화번호 연락처</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">자료 발송을 위해 이름과 연락처는 필수입니다.</p>
                                </div>
                            )}

                            {/* CONSULT MODE: Consult Type */}
                            {initialMode === "CONSULT" && (
                                <div>
                                    <Label>상담 방식 제공</Label>
                                    <div className="flex gap-3 mt-2">
                                        {["VISIT", "CALL"].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    const newTypes = formData.consult_type.includes(type)
                                                        ? formData.consult_type.filter(t => t !== type)
                                                        : [...formData.consult_type, type];
                                                    setFormData({ ...formData, consult_type: newTypes });
                                                }}
                                                className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm ${formData.consult_type.includes(type) ? "bg-violet-600 text-white border-violet-600" : "bg-white border-slate-200 text-slate-600"}`}
                                            >
                                                {type === "VISIT" ? "🏠 방문 실측" : "📞 전화 상담"}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">고객이 원하는 상담 방식을 선택하게 합니다.</p>
                                </div>
                            )}

                            {/* CLOSE MODE: Payment */}
                            {initialMode === "CLOSE" && (
                                <div>
                                    <Label>결제 방식 제공</Label>
                                    <div className="flex gap-3 mt-2">
                                        {["DEPOSIT", "FULL"].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    const newTypes = formData.payment_options.includes(type)
                                                        ? formData.payment_options.filter(t => t !== type)
                                                        : [...formData.payment_options, type];
                                                    setFormData({ ...formData, payment_options: newTypes });
                                                }}
                                                className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm ${formData.payment_options.includes(type) ? "bg-pink-600 text-white border-pink-600" : "bg-white border-slate-200 text-slate-600"}`}
                                            >
                                                {type === "DEPOSIT" ? "💵 계약금 결제" : "💳 전액 카드결제"}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">안전결제(에스크로) 링크가 자동으로 생성됩니다.</p>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Step 4: Message Integration */}
                {step === 4 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold mb-6">메시지 자동 연결 (선택)</h2>
                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 flex gap-4 mb-6">
                            <div className="bg-white p-2 rounded-lg h-fit shadow-sm text-indigo-600">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-indigo-900 text-sm">랜딩 URL이 포함된 메시지를 바로 준비합니다.</p>
                                <p className="text-xs text-indigo-700/80 mt-1">캠페인 생성 시 이 랜딩페이지를 불러와 바로 발송할 수 있습니다.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <Label>연결할 채널</Label>
                                <div className="flex gap-3">
                                    {["SMS", "KAKAO"].map(ch => (
                                        <button
                                            key={ch}
                                            onClick={() => setFormData({ ...formData, connected_message_type: formData.connected_message_type === ch ? "" : ch })}
                                            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm ${formData.connected_message_type === ch ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600"}`}
                                        >
                                            {ch === "SMS" ? "문자 (LMS)" : "알림톡 / 친구톡"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="mt-8 flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition"
                        >
                            이전
                        </button>
                    ) : <div></div>}

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg transition flex items-center gap-2"
                        >
                            다음 단계 <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={submit}
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg transition"
                        >
                            {loading ? "생성 중..." : "랜딩페이지 완성하기"}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}

export default function CreateLandingPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading Generator...</div>}>
            <CreateLandingContent />
        </Suspense>
    );
}
