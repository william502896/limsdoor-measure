"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Calculator, TrendingUp, AlertTriangle, Truck,
    CheckCircle, Car, Building, Users, CreditCard,
    Sparkles, Calendar, Clock, ShieldCheck,
    Signal, Settings, Plus, Trash2, Wallet, Briefcase, MessageSquare
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

// --- Types & Constants ---

type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'electric' | 'hydrogen';
type BusinessType = 'individual' | 'corporate' | 'tax_exempt' | 'simplified';
type OneOffCategory = 'tool' | 'material' | 'etc';

// Chat Types
type Message = { role: 'user' | 'assistant', content: string };

const FUEL_PRICES: Record<FuelType, { label: string, price: number }> = {
    gasoline: { label: "휘발유", price: 1650 },
    diesel: { label: "경유", price: 1550 },
    lpg: { label: "LPG", price: 970 },
    electric: { label: "전기 (급속)", price: 350 },
    hydrogen: { label: "수소", price: 9000 },
};

type VariableCosts = {
    revenue: number;
    oemCost: number;
    materials: number;
    laborLeader: number;
    freight: number;
    fuel: number;
    fuelType: FuelType;
    selectedVehicleId?: string;
    toll: number;
    marketing: number;
};

type FixedCosts = {
    rent: number;
    adminSalary: number;
    communication: number;
    vehicleInstallment: number;
    vehicleInsurance: number;
    vehicleMaintenance: number;
    fines: number;
};

type AssetAccount = { id: string, bank: string, number: string, alias: string };
type AssetCard = { id: string, company: string, number: string, alias: string };
type AssetVehicle = { id: string, model: string, number: string, fuelType: FuelType, alias?: string };
type OneOffExpense = { id: string, name: string, category: OneOffCategory, amount: number };

const TAX_CALENDAR = [
    { date: "2024-01-25", title: "부가가치세 확정신고", type: "vat" },
    { date: "2024-05-31", title: "종합소득세 확정신고", type: "income" },
    { date: "2024-07-25", title: "부가가치세 1기 확정", type: "vat" },
    { date: "2024-11-30", title: "종합소득세 중간예납", type: "income" },
];

// --- Component ---

export default function CostManagementPage() {
    // State: Business Profile & Assets
    const [showSettings, setShowSettings] = useState(false);
    const [businessType, setBusinessType] = useState<BusinessType>('individual');
    const [profileId, setProfileId] = useState<string | null>(null);

    // Assets
    const [accounts, setAccounts] = useState<AssetAccount[]>([]);
    const [cards, setCards] = useState<AssetCard[]>([]);
    const [vehicles, setVehicles] = useState<AssetVehicle[]>([]);

    // State: Inputs
    const [salesCount, setSalesCount] = useState<number>(5);
    const [isRural, setIsRural] = useState<boolean>(false);

    const [variable, setVariable] = useState<VariableCosts>({
        revenue: 2500000,
        oemCost: 1100000,
        materials: 50000,
        laborLeader: 350000,
        freight: 45000,
        fuel: 30000,
        fuelType: 'diesel',
        selectedVehicleId: undefined,
        toll: 0,
        marketing: 100000
    });

    const [fixed, setFixed] = useState<FixedCosts>({
        rent: 1500000,
        adminSalary: 3000000,
        communication: 150000,
        vehicleInstallment: 550000,
        vehicleInsurance: 120000,
        vehicleMaintenance: 100000,
        fines: 0
    });

    // One-off Expenses
    const [oneOffExpenses, setOneOffExpenses] = useState<OneOffExpense[]>([
        { id: '1', name: '마끼다 임팩 드릴 세트', category: 'tool', amount: 250000 }
    ]);

    // AI Chat State
    const [showAiChat, setShowAiChat] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Initial Data Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. Fetch Profile (Limit 1 for now)
            const { data: profileData } = await supabase
                .from('business_profiles')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (profileData) {
                setProfileId(profileData.id);
                setBusinessType(profileData.business_type as BusinessType);

                // 2. Fetch Assets
                const { data: vData } = await supabase.from('assets_vehicles').select('*').eq('profile_id', profileData.id);
                const { data: aData } = await supabase.from('assets_accounts').select('*').eq('profile_id', profileData.id);
                const { data: cData } = await supabase.from('assets_cards').select('*').eq('profile_id', profileData.id);

                if (vData) setVehicles(vData.map((v: any) => ({
                    id: v.id, model: v.model, number: v.number, fuelType: v.fuel_type as FuelType, alias: v.alias
                })));
                if (aData) setAccounts(aData.map((a: any) => ({
                    id: a.id, bank: a.bank_name, number: a.account_number, alias: a.alias || ''
                })));
                if (cData) setCards(cData.map((c: any) => ({
                    id: c.id, company: c.card_company, number: c.card_number_last4, alias: c.alias || ''
                })));
            }
        } catch (e) {
            console.error("Error loading data:", e);
        }
    };

    const saveSettings = async () => {
        try {
            // 1. Upsert Profile
            let pid = profileId;

            if (!pid) {
                const { data: newProfile, error } = await supabase
                    .from('business_profiles')
                    .insert({ business_type: businessType })
                    .select()
                    .single();
                if (error) throw error;
                pid = newProfile.id;
            } else {
                const { error } = await supabase
                    .from('business_profiles')
                    .update({ business_type: businessType })
                    .eq('id', pid);
                if (error) throw error;
            }

            setProfileId(pid);
            if (!pid) return;

            // 2. Sync Assets
            await supabase.from('assets_vehicles').delete().eq('profile_id', pid);
            await supabase.from('assets_accounts').delete().eq('profile_id', pid);
            await supabase.from('assets_cards').delete().eq('profile_id', pid);

            if (vehicles.length > 0) {
                await supabase.from('assets_vehicles').insert(vehicles.map(v => ({
                    profile_id: pid, model: v.model, number: v.number, fuel_type: v.fuelType, alias: v.alias || v.model
                })));
            }
            if (accounts.length > 0) {
                await supabase.from('assets_accounts').insert(accounts.map(a => ({
                    profile_id: pid, bank_name: a.bank, account_number: a.number, alias: a.alias
                })));
            }
            if (cards.length > 0) {
                await supabase.from('assets_cards').insert(cards.map(c => ({
                    profile_id: pid, card_company: c.company, card_number_last4: c.number, alias: c.alias
                })));
            }

            alert("설정이 저장되었습니다.");
            setShowSettings(false);
            loadData();
        } catch (e: any) {
            alert("저장 실패: " + e.message);
        }
    };

    // Effect: Rural Mode Logic
    useEffect(() => {
        const baseFuel = 30000;
        if (isRural) {
            setVariable(prev => ({ ...prev, toll: 15000, fuel: baseFuel * 2 }));
        } else {
            setVariable(prev => ({ ...prev, toll: 0, fuel: baseFuel }));
        }
    }, [isRural]);

    // Effect: Update fuel type
    useEffect(() => {
        if (variable.selectedVehicleId) {
            const vehicle = vehicles.find(v => v.id === variable.selectedVehicleId);
            if (vehicle) {
                setVariable(prev => ({ ...prev, fuelType: vehicle.fuelType }));
            }
        }
    }, [variable.selectedVehicleId, vehicles]);

    // --- Calculations ---

    const totalVariableCostPerUnit = useMemo(() => {
        return variable.oemCost + variable.materials + variable.laborLeader +
            variable.freight + variable.fuel + variable.toll + variable.marketing;
    }, [variable]);

    const contributionMargin = useMemo(() => {
        return variable.revenue - totalVariableCostPerUnit;
    }, [variable.revenue, totalVariableCostPerUnit]);

    const totalFixedCost = useMemo(() => {
        return fixed.rent + fixed.adminSalary + fixed.communication +
            fixed.vehicleInstallment + fixed.vehicleInsurance +
            fixed.vehicleMaintenance + fixed.fines;
    }, [fixed]);

    // Total One-off Expenses
    const totalOneOffCost = useMemo(() => {
        return oneOffExpenses.reduce((sum, item) => sum + item.amount, 0);
    }, [oneOffExpenses]);

    const monthlyRevenue = variable.revenue * salesCount;
    const monthlyNetProfit = (contributionMargin * salesCount) - totalFixedCost - totalOneOffCost;

    const bepUnits = useMemo(() => {
        return contributionMargin > 0 ? Math.ceil(totalFixedCost / contributionMargin) : 9999;
    }, [totalFixedCost, contributionMargin]);

    const bepProgress = Math.min((salesCount / bepUnits) * 100, 100);

    // Tax Calculations
    const monthlyDeductibleForVat =
        (variable.oemCost + variable.materials + variable.freight + variable.fuel + variable.marketing) * salesCount +
        fixed.rent + fixed.vehicleMaintenance + fixed.communication +
        totalOneOffCost;

    let estimatedVat = 0;
    if (businessType === 'tax_exempt') {
        estimatedVat = 0;
    } else if (businessType === 'simplified') {
        estimatedVat = monthlyRevenue * 0.03;
    } else {
        estimatedVat = Math.max(0, (monthlyRevenue - monthlyDeductibleForVat) * 0.1);
    }

    const totalDeductibleExpenses =
        totalVariableCostPerUnit * salesCount +
        (totalFixedCost - fixed.fines) +
        totalOneOffCost;

    const taxableIncome = monthlyRevenue - totalDeductibleExpenses;
    const annualTaxableIncome = taxableIncome * 12;

    let estimatedMonthlyIncomeTax = 0;

    if (businessType === 'corporate') {
        estimatedMonthlyIncomeTax = Math.max(0, taxableIncome * 0.09);
    } else {
        let rate = 0.06;
        if (annualTaxableIncome > 14000000) rate = 0.15;
        if (annualTaxableIncome > 50000000) rate = 0.24;
        if (annualTaxableIncome > 88000000) rate = 0.35;
        estimatedMonthlyIncomeTax = Math.max(0, taxableIncome * rate);
    }

    // Helpers
    const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
    const handleVarChange = (key: keyof VariableCosts, val: string) => setVariable(prev => ({ ...prev, [key]: Number(val) || 0 }));
    const handleFixedChange = (key: keyof FixedCosts, val: string) => setFixed(prev => ({ ...prev, [key]: Number(val) || 0 }));

    const getDday = (targetDate: string) => {
        const today = new Date();
        const target = new Date(targetDate);
        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const upcomingTax = TAX_CALENDAR.sort((a, b) => getDday(a.date) - getDday(b.date)).find(t => getDday(t.date) >= 0);

    // One-Off Handlers
    const addOneOff = () => {
        setOneOffExpenses(prev => [...prev, { id: crypto.randomUUID(), name: '', category: 'tool', amount: 0 }]);
    };
    const updateOneOff = (id: string, field: keyof OneOffExpense, val: string | number) => {
        setOneOffExpenses(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
    };
    const removeOneOff = (id: string) => {
        setOneOffExpenses(prev => prev.filter(item => item.id !== id));
    };

    // Asset Helpers
    const addAccount = () => setAccounts([...accounts, { id: crypto.randomUUID(), bank: '', number: '', alias: '' }]);
    const addCard = () => setCards([...cards, { id: crypto.randomUUID(), company: '', number: '', alias: '' }]);
    const addVehicle = () => setVehicles([...vehicles, { id: crypto.randomUUID(), model: '', number: '', fuelType: 'diesel' }]);

    const removeAsset = (setter: any, list: any[], id: string) => setter(list.filter(item => item.id !== id));
    const updateAsset = (setter: any, list: any[], id: string, field: string, value: string) => {
        setter(list.map(item => item.id === id ? { ...item, [field]: value } : item));
    }

    // --- AI Chat Logic ---
    const toggleAiChat = () => {
        if (!showAiChat && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: `안녕하세요 사장님! LIMS 전문 세무 비서입니다. \n현재 매출 ${formatCurrency(monthlyRevenue)}, 순이익 ${formatCurrency(monthlyNetProfit)}으로 파악됩니다. \n절세나 비용 처리에 대해 궁금하신 점을 물어보세요!`
            }]);
        }
        setShowAiChat(!showAiChat);
    };

    const sendMessage = async () => {
        if (!input.trim() || isAiLoading) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput("");
        setIsAiLoading(true);

        try {
            // Context to send to AI
            const context = {
                businessType,
                salesCount,
                monthlyRevenue,
                monthlyNetProfit,
                estimatedVat,
                variableCosts: variable,
                fixedCosts: fixed,
                oneOffExpenses,
                assets: { vehicles, accounts, cards }
            };

            const res = await fetch('/api/ai/cost-expert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, context })
            });
            const data = await res.json();

            if (res.ok && data.status === 'ok') {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
            } else {
                // Fixed: Check data.error.message
                const errorDetail = data.error?.message || data.message || "알 수 없는 오류";
                setMessages(prev => [...prev, { role: 'assistant', content: `죄송합니다, AI 연결에 문제가 발생했습니다.\n(상세 원인: ${errorDetail})` }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "네트워크 오류가 발생했습니다." }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans relative">
            {/* ... Existing UI ... */}

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Calculator className="text-indigo-600" /> 통합 수익 & 세무 관리 (AI Expert)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        경비 인정 여부 자동 판별 및 실시간 모니터링
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium shadow-sm transition"
                    >
                        <Settings size={16} /> 사업자/자산 설정
                    </button>
                    <button
                        onClick={saveSettings}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-md transition"
                    >
                        <CheckCircle size={16} /> 설정 저장
                    </button>
                </div>
            </div>

            {/* Dashboard Cards A (Profit & Tax) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 1. Profit Monitor */}
                <div className={`p-6 rounded-2xl shadow-sm border bg-white border-slate-100`}>
                    <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-1">
                        <TrendingUp size={14} /> 월간 순이익 ({businessType === 'corporate' ? '법인' : '개인'})
                    </div>
                    <div className="flex justify-between items-end">
                        <div className={`text-3xl font-bold ${monthlyNetProfit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            {formatCurrency(monthlyNetProfit)}
                        </div>
                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            마진율 {variable.revenue > 0 ? ((monthlyNetProfit / monthlyRevenue) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                    <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${bepProgress}%` }}></div>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                        <span>BEP 달성률</span>
                        <span>{bepProgress.toFixed(0)}%</span>
                    </div>
                </div>

                {/* 2. Tax Monitor */}
                {businessType !== 'tax_exempt' ? (
                    <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CreditCard size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-1">
                                <ShieldCheck size={14} /> 납부 예상 부가세 ({businessType === 'simplified' ? '간이' : '일반'})
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {formatCurrency(estimatedVat)}
                            </div>
                            <div className="text-xs text-slate-400 mb-4">
                                * {businessType === 'simplified' ? '업종별 부가율 적용됨' : '비공제 항목(과태료 등) 자동 제외됨'}
                            </div>
                            {businessType !== 'simplified' && (
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-slate-800 rounded-lg p-2 border border-slate-700">
                                        <span className="block text-[10px] text-slate-500">매출세액</span>
                                        <span className="text-xs font-bold">{formatCurrency(monthlyRevenue * 0.1)}</span>
                                    </div>
                                    <div className="flex-1 bg-slate-800 rounded-lg p-2 border border-slate-700">
                                        <span className="block text-[10px] text-green-500">매입공제</span>
                                        <span className="text-xs font-bold text-green-400">-{formatCurrency(monthlyDeductibleForVat * 0.1)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-slate-100 text-slate-500 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                        <Settings size={32} className="mb-2 opacity-50" />
                        <div className="font-bold">면세사업자 모드</div>
                        <div className="text-xs">부가세 신고 대상이 아닙니다.</div>
                    </div>
                )}

                {/* 3. Tax Calendar */}
                <div className="p-6 bg-indigo-600 text-white rounded-2xl shadow-lg border border-indigo-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Calendar size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm font-bold text-indigo-200 mb-4 flex items-center gap-1">
                            <Clock size={14} /> 주요 세무 일정
                        </div>
                        {upcomingTax ? (
                            <div>
                                <div className="text-5xl font-bold mb-2">
                                    D-{getDday(upcomingTax.date)}
                                </div>
                                <div className="text-lg font-bold">{upcomingTax.title}</div>
                                <div className="text-sm text-indigo-200 mt-1">납부기한: {upcomingTax.date}</div>

                                {getDday(upcomingTax.date) <= 30 && (
                                    <div className="mt-4 bg-white/20 backdrop-blur rounded-lg p-2 text-xs flex items-center gap-2">
                                        <AlertTriangle size={12} className="text-yellow-300" />
                                        <span>자금 확보가 필요한 시기입니다.</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-indigo-200">올해 예정된 주요 신고가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inputs & One-off */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input Columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* ... (Variable & Fixed Sections are SAME as before) ... */}

                    {/* Variable Costs Input */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Calculator size={18} /> 변동비 (건별 발생)
                            </h3>
                            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle size={10} /> 경비 인정(AI)
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <InputGroup label="소비자 최종 판매가 (매출)" value={variable.revenue} onChange={(v) => handleVarChange('revenue', v)} highlight isDeductible />
                            <div className="h-px bg-slate-100 my-4" />
                            <InputGroup label="제품 발주비 (OEM)" value={variable.oemCost} onChange={(v) => handleVarChange('oemCost', v)} isDeductible />
                            <InputGroup label="부자재비 (실리콘/폼)" value={variable.materials} onChange={(v) => handleVarChange('materials', v)} isDeductible />

                            {/* Fuel Selector */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <Truck size={12} /> 차량 선택 & 유류비
                                    </label>
                                    <span className="text-[10px] text-indigo-500 font-bold">{FUEL_PRICES[variable.fuelType].label} {FUEL_PRICES[variable.fuelType].price}원/L</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                    {vehicles.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setVariable(prev => ({ ...prev, selectedVehicleId: v.id }))}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition flex flex-col items-start min-w-[100px]
                                                ${variable.selectedVehicleId === v.id
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                                        >
                                            <span className="truncate w-full">{v.alias || v.model}</span>
                                            <span className="opacity-70 text-[9px]">{v.number}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                    {Object.entries(FUEL_PRICES).map(([key, info]) => (
                                        <button
                                            key={key}
                                            onClick={() => setVariable(prev => ({ ...prev, fuelType: key as FuelType, selectedVehicleId: undefined }))}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition whitespace-nowrap
                                                ${variable.fuelType === key && !variable.selectedVehicleId
                                                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                                        >
                                            {info.label} (직접선택)
                                        </button>
                                    ))}
                                </div>
                                <InputGroup
                                    label="이동 유류비 (왕복)"
                                    value={variable.fuel}
                                    onChange={(v) => handleVarChange('fuel', v)}
                                    warn={isRural}
                                    subText={isRural ? "지방 모드: 거리 기반 할증 적용됨" : undefined}
                                    sm
                                    isDeductible
                                />
                            </div>
                            <InputGroup label="시공 팀장 공임 (3.3%)" value={variable.laborLeader} onChange={(v) => handleVarChange('laborLeader', v)} isDeductible isWarning subText="부가세 공제 제외 (소득세 경비만 인정)" />
                            <InputGroup label="화물/용달비" value={variable.freight} onChange={(v) => handleVarChange('freight', v)} isDeductible />
                        </div>
                    </div>

                    {/* Fixed Costs Input */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Building size={18} /> 월간 고정비
                        </h3>
                        <div className="space-y-4">
                            <InputGroup label="사무실 임대료 + 공과금" icon={<Building size={14} />} value={fixed.rent} onChange={(v) => handleFixedChange('rent', v)} isDeductible />
                            <InputGroup label="통신비 (인터넷/핸드폰)" icon={<Signal size={14} />} value={fixed.communication} onChange={(v) => handleFixedChange('communication', v)} isDeductible />
                            <InputGroup label="관리자 급여" icon={<Users size={14} />} value={fixed.adminSalary} onChange={(v) => handleFixedChange('adminSalary', v)} isDeductible />

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">
                                    <Car size={12} /> 차량 유지비
                                </div>
                                <div className="space-y-3">
                                    <InputGroup label="할부 원리금" value={fixed.vehicleInstallment} onChange={(v) => handleFixedChange('vehicleInstallment', v)} sm isDeductible />
                                    <InputGroup label="보험/세금 (월할)" value={fixed.vehicleInsurance} onChange={(v) => handleFixedChange('vehicleInsurance', v)} sm isDeductible />
                                    <InputGroup label="정비 적립금" value={fixed.vehicleMaintenance} onChange={(v) => handleFixedChange('vehicleMaintenance', v)} sm isDeductible />
                                </div>
                            </div>

                            <div className="p-4 bg-red-50 rounded-xl border border-red-100 animate-in fade-in">
                                <div className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                                    <AlertTriangle size={12} /> 경비 불인정 항목 (주의)
                                </div>
                                <InputGroup
                                    label="과태료/벌금/범칙금"
                                    value={fixed.fines}
                                    onChange={(v) => handleFixedChange('fines', v)}
                                    sm notDeductible
                                    subText="세금 계산 시 비용으로 인정되지 않습니다."
                                />
                            </div>
                        </div>
                    </div>

                    {/* One-off Expenses */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Wallet size={18} /> 비정기 지출 / 자산 매입
                            </h3>
                            <button onClick={addOneOff} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1">
                                <Plus size={12} /> 항목 추가
                            </button>
                        </div>
                        <div className="space-y-3">
                            {oneOffExpenses.map((item) => (
                                <div key={item.id} className="flex gap-2 items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <select
                                        className="text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none"
                                        value={item.category}
                                        onChange={(e) => updateOneOff(item.id, 'category', e.target.value)}
                                    >
                                        <option value="tool">공구/기계 (자산)</option>
                                        <option value="material">부자재 (대량)</option>
                                        <option value="etc">기타 경비</option>
                                    </select>
                                    <input
                                        className="flex-1 text-sm bg-transparent border-b border-slate-200 px-1 py-1 focus:border-indigo-500 outline-none"
                                        placeholder="항목명 (예: 마끼다 드릴)"
                                        value={item.name}
                                        onChange={(e) => updateOneOff(item.id, 'name', e.target.value)}
                                    />
                                    <div className="relative w-28">
                                        <input
                                            type="number"
                                            className="w-full text-right text-sm bg-white border border-slate-200 rounded px-2 py-1.5 outline-none font-mono"
                                            value={item.amount || ''}
                                            onChange={(e) => updateOneOff(item.id, 'amount', Number(e.target.value))}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">원</span>
                                    </div>
                                    <button onClick={() => removeOneOff(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {oneOffExpenses.length === 0 && (
                                <div className="text-center py-4 text-xs text-slate-400">
                                    추가된 내역이 없습니다. (공구, 자재 등 입력)
                                </div>
                            )}
                            <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-500 font-bold">합계 (공제 대상)</span>
                                <span className="text-sm font-bold text-indigo-600">{formatCurrency(totalOneOffCost)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI & Settings */}
                <div className="space-y-6">
                    {/* Tax Saving Insights */}
                    <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Sparkles size={18} /> AI 절세 가이드
                        </h3>
                        {fixed.fines > 0 && (
                            <div className="bg-red-100 p-3 rounded-lg border border-red-200 mb-3 flex gap-2 items-start">
                                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={14} />
                                <div className="text-xs text-red-800 font-bold">
                                    불필요한 세금 발생 경고<br />
                                    <span className="font-medium">과태료는 비용 처리가 안 되어, 내야 할 세금이 늘어납니다.</span>
                                </div>
                            </div>
                        )}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 text-sm shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <span className="font-bold text-indigo-700 block mb-1">📋 경비 인정 Tip</span>
                            <ul className="text-slate-600 text-xs space-y-1 mt-2 list-disc pl-4">
                                <li>통신비(본인 명의)는 100% 비용 처리 가능</li>
                                <li><strong>공구/기계 구입비</strong>도 100% 매입세액 공제</li>
                                <li>차량 정비비, 유류비 누락 주의</li>
                                <li>경조사비 청첩장 (건당 20만원 한도)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI CHAT BUTTON & WINDOW */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
                {showAiChat && (
                    <div className="w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in slide-in-from-bottom-5">
                        <div className="p-4 bg-indigo-600 text-white rounded-t-2xl flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold">
                                <Sparkles size={16} /> 세무/비용 전담 비서
                            </div>
                            <button onClick={toggleAiChat} className="text-indigo-200 hover:text-white">
                                <Trash2 size={16} className="rotate-45" /> {/* Close Icon substitute */}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isAiLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl rounded-tl-none shadow-sm text-xs text-slate-400">
                                        답변 작성 중...
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-white border-t border-slate-100 rounded-b-2xl">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                                    placeholder="궁금한 점을 물어보세요..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isAiLoading}
                                    className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Signal size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={toggleAiChat}
                    className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center gap-2"
                >
                    <Sparkles size={24} />
                    {!showAiChat && <span className="font-bold pr-2">세무 비서 호출</span>}
                </button>
            </div>

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="text-indigo-600" />
                                사업자 및 자산 설정
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                                닫기
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Briefcase size={16} /> 사업자 유형 선택
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'individual', label: '일반과세자', desc: '표준 세율' },
                                        { id: 'simplified', label: '간이과세자', desc: '저율 부가세' },
                                        { id: 'corporate', label: '법인사업자', desc: '법인세 적용' },
                                        { id: 'tax_exempt', label: '면세사업자', desc: '부가세 없음' },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setBusinessType(type.id as BusinessType)}
                                            className={`p-3 rounded-xl border text-left transition
                                                ${businessType === type.id
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <div className="font-bold text-sm">{type.label}</div>
                                            <div className={`text-[10px] mt-1 ${businessType === type.id ? 'text-indigo-200' : 'text-slate-400'}`}>{type.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            <section>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Truck size={16} /> 업무용 차량 등록
                                    </h3>
                                    <button onClick={addVehicle} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded font-bold hover:bg-indigo-100 flex items-center gap-1">
                                        <Plus size={12} /> 차량 추가
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {vehicles.map((v) => (
                                        <div key={v.id} className="flex gap-2 items-center">
                                            <input
                                                className="flex-1 text-sm border-slate-200 rounded px-2 py-1.5 bg-slate-50"
                                                placeholder="차량 모델 (예: 포터II)"
                                                value={v.model}
                                                onChange={(e) => updateAsset(setVehicles, vehicles, v.id, 'model', e.target.value)}
                                            />
                                            <input
                                                className="w-24 text-sm border-slate-200 rounded px-2 py-1.5 bg-slate-50"
                                                placeholder="번호"
                                                value={v.number}
                                                onChange={(e) => updateAsset(setVehicles, vehicles, v.id, 'number', e.target.value)}
                                            />
                                            <select
                                                className="w-24 text-sm border-slate-200 rounded px-2 py-1.5 bg-slate-50"
                                                value={v.fuelType}
                                                onChange={(e) => updateAsset(setVehicles, vehicles, v.id, 'fuelType', e.target.value)}
                                            >
                                                {Object.entries(FUEL_PRICES).map(([k, val]) => (
                                                    <option key={k} value={k}>{val.label}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => removeAsset(setVehicles, vehicles, v.id)} className="p-2 text-slate-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <Wallet size={16} /> 사업용 계좌
                                        </h3>
                                        <button onClick={addAccount} className="text-xs bg-slate-50 text-slate-600 px-2 py-1.5 rounded font-bold hover:bg-slate-100 flex items-center gap-1">
                                            <Plus size={12} /> 추가
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {accounts.map((acc) => (
                                            <div key={acc.id} className="flex gap-2 items-center p-2 border border-slate-100 rounded-lg">
                                                <div className="flex-1 space-y-1">
                                                    <input
                                                        className="w-full text-xs font-bold border-none p-0 bg-transparent focus:ring-0 placeholder:text-slate-300"
                                                        placeholder="별칭 (예: 메인통장)"
                                                        value={acc.alias}
                                                        onChange={(e) => updateAsset(setAccounts, accounts, acc.id, 'alias', e.target.value)}
                                                    />
                                                    <div className="flex gap-1">
                                                        <input
                                                            className="flex-1 text-xs border-none p-0 bg-transparent focus:ring-0 text-slate-500 placeholder:text-slate-300"
                                                            placeholder="은행명"
                                                            value={acc.bank}
                                                            onChange={(e) => updateAsset(setAccounts, accounts, acc.id, 'bank', e.target.value)}
                                                        />
                                                        <input
                                                            className="flex-[2] text-xs border-none p-0 bg-transparent focus:ring-0 text-slate-500 placeholder:text-slate-300"
                                                            placeholder="계좌번호"
                                                            value={acc.number}
                                                            onChange={(e) => updateAsset(setAccounts, accounts, acc.id, 'number', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => removeAsset(setAccounts, accounts, acc.id)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <CreditCard size={16} /> 사업용 카드
                                        </h3>
                                        <button onClick={addCard} className="text-xs bg-slate-50 text-slate-600 px-2 py-1.5 rounded font-bold hover:bg-slate-100 flex items-center gap-1">
                                            <Plus size={12} /> 추가
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {cards.map((card) => (
                                            <div key={card.id} className="flex gap-2 items-center p-2 border border-slate-100 rounded-lg">
                                                <div className="flex-1 space-y-1">
                                                    <input
                                                        className="w-full text-xs font-bold border-none p-0 bg-transparent focus:ring-0 placeholder:text-slate-300"
                                                        placeholder="카드 별칭"
                                                        value={card.alias}
                                                        onChange={(e) => updateAsset(setCards, cards, card.id, 'alias', e.target.value)}
                                                    />
                                                    <div className="flex gap-1">
                                                        <input
                                                            className="flex-1 text-xs border-none p-0 bg-transparent focus:ring-0 text-slate-500 placeholder:text-slate-300"
                                                            placeholder="카드사"
                                                            value={card.company}
                                                            onChange={(e) => updateAsset(setCards, cards, card.id, 'company', e.target.value)}
                                                        />
                                                        <input
                                                            className="flex-[2] text-xs border-none p-0 bg-transparent focus:ring-0 text-slate-500 placeholder:text-slate-300"
                                                            placeholder="카드번호 4자리"
                                                            value={card.number}
                                                            onChange={(e) => updateAsset(setCards, cards, card.id, 'number', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => removeAsset(setCards, cards, card.id)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={saveSettings}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md"
                            >
                                설정 저장 (Cloud)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-components
function InputGroup({
    label, value, onChange, icon, highlight, warn, disabled, subText, sm, isDeductible, notDeductible, isWarning
}: {
    label: string, value: number, onChange: (v: string) => void,
    icon?: React.ReactNode, highlight?: boolean, warn?: boolean, disabled?: boolean, subText?: string, sm?: boolean,
    isDeductible?: boolean, notDeductible?: boolean, isWarning?: boolean
}) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className={`block ${sm ? "text-xs" : "text-sm"} font-medium text-slate-600 flex items-center gap-1`}>
                    {icon} {label}
                    {isDeductible && <CheckCircle size={10} className="text-green-500 ml-1" />}
                    {notDeductible && <span className="text-[10px] text-red-500 font-bold ml-1 bg-red-50 px-1 rounded">불인정</span>}
                </label>
                {isWarning && <AlertTriangle size={12} className="text-orange-400" />}
            </div>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₩</div>
                <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`
                        w-full pl-8 pr-4 py-2 border rounded-lg text-right font-mono transition outline-none
                        ${sm ? "text-sm" : ""}
                        ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white"}
                        ${highlight ? "border-indigo-300 text-indigo-700 font-bold bg-indigo-50/50 focus:ring-2 focus:ring-indigo-200" : "border-slate-200 text-slate-700 hover:border-slate-300 focus:border-indigo-500"}
                        ${warn ? "border-orange-300 bg-orange-50 text-orange-800" : ""}
                        ${notDeductible ? "border-red-200 bg-red-50/30 text-red-900 focus:border-red-400" : ""}
                    `}
                    placeholder="0"
                />
            </div>
            {subText && <div className={`text-[10px] mt-1 ${notDeductible ? "text-red-500 font-medium" : "text-orange-500"}`}>{subText}</div>}
        </div>
    );
}
