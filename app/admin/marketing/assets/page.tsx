"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import {
    Layout, Image as ImageIcon, Upload, Search, Filter,
    Trash2, MoreVertical, Tag, FileText, CheckCircle, X
} from "lucide-react";

type Asset = {
    id: string;
    name: string;
    category: "logo" | "product" | "banner" | "video" | "font" | "ar_door" | "etc";
    file_url: string;
    tags: string;
    size_bytes: number;
    created_at: string;
    metadata?: {
        category?: string;
        frame?: string;
        glass?: string;
        [key: string]: any;
    };
};

export default function MarketingAssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState("all");
    const [uploading, setUploading] = useState(false);

    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AR Door Metadata State
    const [arMeta, setArMeta] = useState({
        category: "3연동",
        frame: "블랙",
        glass: "투명강화"
    });

    const [showArForm, setShowArForm] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("marketing_assets")
            .select("*")
            .order("created_at", { ascending: false });

        if (data) {
            setAssets(data);
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `assets/${fileName}`;

        try {
            // 1. Upload
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("public")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Public URL
            const { data: { publicUrl } } = supabase.storage
                .from("public")
                .getPublicUrl(filePath);

            // 3. Insert
            // Check if it's AR upload mode
            const isAr = showArForm;
            const category = isAr ? 'ar_door' : determineCategory(file.type);
            const metadata = isAr ? arMeta : {};

            const { error: dbError } = await supabase
                .from("marketing_assets")
                .insert({
                    name: file.name,
                    category,
                    file_url: publicUrl,
                    size_bytes: file.size,
                    mime_type: file.type,
                    tags: isAr ? "ar_door" : "upload",
                    metadata // Save specific AR text
                });

            if (dbError) throw dbError;

            alert("업로드 완료!");
            fetchAssets();
            setShowArForm(false); // Reset

        } catch (error: any) {
            console.error("Upload Error:", error);
            alert("업로드 실패: " + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: string, url: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        await supabase.from("marketing_assets").delete().eq("id", id);
        fetchAssets();
    };

    const determineCategory = (mime: string) => {
        if (mime.startsWith("image/")) return "product";
        if (mime.startsWith("video/")) return "video";
        return "etc";
    };

    // Filter Logic
    const filteredAssets = filterCategory === "all"
        ? assets
        : assets.filter(a => a.category === filterCategory);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Layout className="text-pink-600" /> 브랜드 자산 센터 (Assets)
            </h1>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex gap-2 flex-wrap">
                    {["all", "logo", "product", "ar_door", "banner", "font"].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors
                                ${filterCategory === cat
                                    ? "bg-slate-900 text-white"
                                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}
                            `}
                        >
                            {cat === "ar_door" ? "AR 도어" : (cat === "all" ? "전체" : cat)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* AR Upload Toggle */}
                    {filterCategory === 'ar_door' && (
                        <div className="flex items-center gap-2 mr-4 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                            <span className="text-xs font-bold text-indigo-800">AR 설정:</span>
                            <select className="text-xs p-1" value={arMeta.category} onChange={e => setArMeta({ ...arMeta, category: e.target.value })}>
                                <option value="3연동">3연동</option>
                                <option value="원슬라이딩">원슬라이딩</option>
                                <option value="스윙">스윙</option>
                                <option value="파티션">파티션</option>
                            </select>
                            <select className="text-xs p-1" value={arMeta.frame} onChange={e => setArMeta({ ...arMeta, frame: e.target.value })}>
                                <option value="블랙">블랙</option>
                                <option value="화이트">화이트</option>
                                <option value="브론즈">브론즈</option>
                                <option value="실버">실버</option>
                            </select>
                            <select className="text-xs p-1" value={arMeta.glass} onChange={e => setArMeta({ ...arMeta, glass: e.target.value })}>
                                <option value="투명강화">투명</option>
                                <option value="샤틴">샤틴</option>
                                <option value="브론즈">브론즈</option>
                                <option value="다크">다크</option>
                            </select>
                            <button onClick={() => setShowArForm(true)} className={`text-xs px-2 py-1 rounded bg-indigo-600 text-white`}>
                                설정됨
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*"
                    />
                    <button
                        onClick={() => {
                            if (filterCategory === 'ar_door') setShowArForm(true);
                            fileInputRef.current?.click()
                        }}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors disabled:opacity-50"
                    >
                        {uploading ? (
                            <>⏳ 업로드 중...</>
                        ) : (
                            <>
                                <Upload size={18} />
                                {filterCategory === 'ar_door' ? "AR 도어 업로드" : "업로드"}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Upload Area (Dropzone placeholder or visual cue) */}
            {assets.length === 0 && !loading && (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 mb-8 bg-slate-50">
                    <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-bold text-slate-600">등록된 자산이 없습니다.</p>
                    <p className="text-sm">우측 상단 '업로드' 버튼을 눌러 로고나 제품 사진을 등록하세요.</p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredAssets.map(asset => (
                    <div key={asset.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                        {/* Preview */}
                        <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            {asset.category === 'video' ? (
                                <div className="text-slate-400 flex flex-col items-center">
                                    <FileText size={32} />
                                    <span className="text-xs mt-1">Video</span>
                                </div>
                            ) : (
                                <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            )}

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button className="p-2 bg-white rounded-full text-slate-900 hover:bg-slate-100" title="미리보기">
                                    <Search size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(asset.id, asset.file_url)}
                                    className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                                    title="삭제"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <div className="flex justify-between items-start mb-1">
                                <div className={`text-xs font-bold uppercase tracking-tighter border px-1.5 rounded 
                                    ${asset.category === 'ar_door' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {asset.category === 'ar_door' ? 'AR' : asset.category}
                                </div>
                                <button className="text-slate-400 hover:text-slate-600">
                                    <MoreVertical size={14} />
                                </button>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 truncate mb-1" title={asset.name}>
                                {asset.name}
                            </h3>
                            {asset.category === 'ar_door' && asset.metadata ? (
                                <div className="text-[10px] text-indigo-600 font-medium">
                                    {asset.metadata.category} / {asset.metadata.frame}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Tag size={10} />
                                    <span>{asset.tags || "Untagged"}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
