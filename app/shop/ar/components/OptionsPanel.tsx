"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Download, Share2, MessageSquare, Check, Layers } from "lucide-react";

type DoorCategory = "3연동" | "원슬라이딩" | "스윙" | "호폐" | "파티션";
type FrameColor = "블랙" | "화이트" | "브론즈" | "실버";
type GlassType = "투명강화" | "샤틴" | "다크" | "브론즈" | "플루트" | "특수";

type DoorAsset = {
    id: string;
    label: string;
    src: string;
    category: DoorCategory;
    frame: FrameColor;
    glass: GlassType;
};

type OptionsPanelProps = {
    doors: DoorAsset[];
    // Filter State
    selCategory: DoorCategory;
    setSelCategory: (v: DoorCategory) => void;
    selFrame: FrameColor;
    setSelFrame: (v: FrameColor) => void;
    selGlass: GlassType;
    setSelGlass: (v: GlassType) => void;

    // Selection
    doorId: string;
    setDoorId: (v: string) => void;

    // Opacity
    opacity: number;
    setOpacity: (v: number) => void;

    // Actions
    onDownload: () => void;
    onUpload: () => void;
    onShare: () => void;
    onSms: () => void;

    // Status
    isUploading: boolean;
    uploadedUrl: string;
    estimateId: string;
    setEstimateId: (v: string) => void;

    // Filter Logic pass-through implies parent handles filtering, 
    // but here we just need the filtered list or valid options.
    // For simplicity, we just take all doors and let parent pass filtered list? 
    // Or we keep filter UI here. Let's keep filter UI here.
    filteredDoors: DoorAsset[];
};

export default function OptionsPanel({
    doors,
    selCategory, setSelCategory,
    selFrame, setSelFrame,
    selGlass, setSelGlass,
    doorId, setDoorId,
    opacity, setOpacity,
    onDownload,
    onUpload,
    onShare,
    onSms,
    isUploading,
    uploadedUrl,
    estimateId,
    setEstimateId,
    filteredDoors,
}: OptionsPanelProps) {

    const [isExpanded, setIsExpanded] = useState(true); // For mobile toggle

    // Helper for styled selects
    const SelectBox = ({ label, value, onChange, options }: { label: string, value: string, onChange: (v: any) => void, options: string[] }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-12 pl-4 pr-10 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none appearance-none transition-all shadow-sm"
                >
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Mobile Header Toggle */}
            <div
                className="md:hidden flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 cursor-pointer active:bg-slate-100"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Layers size={18} className="text-indigo-600" />
                    옵션 설정
                </span>
                <span className="text-slate-400">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </span>
            </div>

            <div className={`p-5 space-y-8 overflow-y-auto ${isExpanded ? 'block' : 'hidden md:block'}`}>

                {/* 1. Filter Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-black text-slate-800">1. 도어 필터</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded">Step 1</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <SelectBox
                            label="도어 타입"
                            value={selCategory}
                            onChange={setSelCategory}
                            options={["3연동", "원슬라이딩", "스윙", "호폐", "파티션"]}
                        />
                        <SelectBox
                            label="프레임 컬러"
                            value={selFrame}
                            onChange={setSelFrame}
                            options={["블랙", "화이트", "브론즈", "실버"]}
                        />
                        <SelectBox
                            label="유리 종류"
                            value={selGlass}
                            onChange={setSelGlass}
                            options={["투명강화", "샤틴", "다크", "브론즈", "플루트", "특수"]}
                        />
                    </div>
                </section>

                <hr className="border-dashed border-slate-200" />

                {/* 2. Selection & Opacity */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-black text-slate-800">2. 디자인 선택 & 조정</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-pink-50 text-pink-600 font-bold rounded">Step 2</span>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                            디자인 모델 ({filteredDoors.length})
                        </label>
                        <div className="relative">
                            <select
                                value={doorId}
                                onChange={(e) => setDoorId(e.target.value)}
                                className="w-full h-12 pl-4 pr-10 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none appearance-none transition-all shadow-sm"
                            >
                                {filteredDoors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">투명도 조정</label>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {Math.round(opacity * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0.2}
                            max={1}
                            step={0.05}
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                </section>

                {/* Download Button (Sticky in Mobile Options?) */}
                <div className="sticky bottom-0 bg-white pt-4 pb-2 z-10 border-t border-slate-100">
                    <button
                        onClick={onDownload}
                        className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={20} />
                        합성 결과 다운로드
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                        * 갤러리에 저장됩니다
                    </p>
                </div>

                <hr className="border-dashed border-slate-200" />

                {/* 3. Share Section */}
                <section className="space-y-4 pb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-black text-slate-800">3. 공유하기 (선택)</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold rounded">Step 3</span>
                    </div>

                    <div className="space-y-3">
                        <input
                            value={estimateId}
                            onChange={(e) => setEstimateId(e.target.value)}
                            placeholder="실측/견적 ID (예: 20260101-001)"
                            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={onUpload}
                                disabled={isUploading}
                                className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${isUploading ? 'bg-slate-100 text-slate-400 border-transparent' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                            >
                                {isUploading ? '업로드 중...' : '1. 업로드'}
                            </button>
                            <button
                                onClick={onShare}
                                disabled={!uploadedUrl}
                                className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${!uploadedUrl ? 'bg-slate-100 text-slate-400 border-transparent' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                            >
                                <Share2 size={16} /> 2. 공유
                            </button>
                        </div>
                        <button
                            onClick={onSms}
                            disabled={!uploadedUrl}
                            className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${!uploadedUrl ? 'bg-slate-100 text-slate-400 border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <MessageSquare size={16} /> URL 문자 전송
                        </button>
                    </div>

                    {uploadedUrl && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 mb-1">업로드 URL</p>
                            <p className="text-xs text-indigo-600 truncate underline cursor-pointer" onClick={() => {
                                navigator.clipboard.writeText(uploadedUrl);
                                alert("링크 복사 완료!");
                            }}>
                                {uploadedUrl}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
