import React, { useState, useEffect, useRef } from 'react';
import { useGlobalStore } from '@/app/lib/store-context';
import { Plus, Image as ImageIcon, Trash2, ExternalLink, Cloud, Upload, Loader2, X, Camera } from 'lucide-react';
import { Order } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';

// Adapter type for the view
interface Album {
    id: string;
    title: string;
    date: string;
    photos: string[];
    synced: boolean;
    isManual?: boolean;
}

export default function GalleryView() {
    const { orders } = useGlobalStore();
    const [isUploading, setIsUploading] = useState(false);
    const [manualAssets, setManualAssets] = useState<any[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false); // NEW Modal State

    // Two Refs for different inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchManualAssets();
    }, []);

    const fetchManualAssets = async () => {
        const { data } = await supabase
            .from("marketing_assets")
            .select("*")
            .eq("category", "portfolio")
            .order("created_at", { ascending: false });

        if (data) setManualAssets(data);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setShowUploadModal(false); // Close modal first
        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fileExt = file.name.split('.').pop();
                const fileName = `portfolio/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                // 1. Upload
                const { error: uploadError } = await supabase.storage
                    .from("public") // Using public bucket
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // 2. Get URL
                const { data: { publicUrl } } = supabase.storage
                    .from("public")
                    .getPublicUrl(fileName);

                // 3. Insert DB
                await supabase.from("marketing_assets").insert({
                    name: file.name,
                    category: "portfolio",
                    file_url: publicUrl,
                    size_bytes: file.size,
                    mime_type: file.type,
                    tags: "portfolio-upload"
                });
            }
            alert("업로드가 완료되었습니다.");
            fetchManualAssets();
        } catch (error: any) {
            console.error(error);
            alert("업로드 실패: " + error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (cameraInputRef.current) cameraInputRef.current.value = "";
        }
    };

    const handleDeleteAsset = async (id: string) => {
        if (!confirm("삭제하시겠습니까?")) return;
        await supabase.from("marketing_assets").delete().eq("id", id);
        fetchManualAssets();
    };

    // Derive albums from Orders
    const orderAlbums: Album[] = orders
        .filter(o => (o.installFiles && o.installFiles.length > 0) || (o.afterInstallFiles && o.afterInstallFiles.length > 0))
        .map(o => ({
            id: o.id,
            title: `${o.items[0]?.category || '시공'} - ${o.items[0]?.detail || ''}`,
            date: o.installDate || o.createdAt.split("T")[0],
            photos: Array.from(new Set([...(o.afterInstallFiles || []), ...o.installFiles])),
            synced: !!o.items[0]?.category
        }));

    return (
        <div className="space-y-8 relative">
            {/* Header with Upload */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="text-indigo-600" />
                        시공 포트폴리오
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">현장 사진을 업로드하고 통합 관리합니다.</p>
                </div>
                <div className="flex gap-3">
                    {/* Hidden Inputs */}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment" // Camera Trigger
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={() => setShowUploadModal(true)}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        사진 직접 업로드
                    </button>
                    {/* <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-50 transition shadow-sm">
                        <Cloud size={18} className="text-blue-500" />
                        Drive
                    </button> */}
                </div>
            </div>

            {/* Upload Source Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-6 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-slate-800">업로드 방식 선택</h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-50 border-2 border-blue-100 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition group"
                            >
                                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Camera size={24} />
                                </div>
                                <span className="font-bold text-slate-700">카메라 촬영</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border-2 border-slate-100 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition group"
                            >
                                <div className="w-12 h-12 bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <ImageIcon size={24} />
                                </div>
                                <span className="font-bold text-slate-700">앨범 선택</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Section 1: Direct Uploads (Marketing Assets) */}
            {manualAssets.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                        직접 업로드된 포트폴리오
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {manualAssets.map(asset => (
                            <div key={asset.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                                <img src={asset.file_url} className="w-full h-full object-cover" alt={asset.name} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <button
                                        onClick={() => handleDeleteAsset(asset.id)}
                                        className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-white"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs truncate">
                                    {asset.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 2: Order Linked Albums */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-slate-400 rounded-full"></span>
                    주문 연동 (자동 생성)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orderAlbums.length > 0 ? (
                        orderAlbums.map((album) => (
                            <div key={album.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="h-48 bg-slate-100 relative grid grid-cols-2 gap-px">
                                    {album.photos.slice(0, 4).map((photo, idx) => (
                                        <div key={idx} className="relative w-full h-full overflow-hidden">
                                            <img src={photo} alt={`photo-${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                        </div>
                                    ))}
                                    {album.photos.length === 0 && <div className="col-span-2 flex items-center justify-center text-slate-400">No Photos</div>}
                                    {album.photos.length > 4 && (
                                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-2 py-1 m-1 rounded font-bold">
                                            +{album.photos.length - 4}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{album.title}</h3>
                                        {album.synced && <div className="text-blue-500 bg-blue-50 p-1 rounded-md"><Cloud size={14} /></div>}
                                    </div>
                                    <div className="text-sm text-slate-500 flex justify-between items-center">
                                        <span>{album.date}</span>
                                        <span>{album.photos.length}장의 사진</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-10 text-center text-slate-400">
                            연동된 주문 데이터가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
