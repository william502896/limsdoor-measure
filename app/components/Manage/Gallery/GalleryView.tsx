import React, { useState } from 'react';
import { useGlobalStore } from '@/app/lib/store-context';
import { Plus, Image as ImageIcon, Trash2, ExternalLink, Cloud } from 'lucide-react';
import { Order } from '@/app/lib/store';

// Adapter type for the view
interface Album {
    id: string;
    title: string;
    date: string;
    photos: string[];
    synced: boolean;
}

export default function GalleryView() {
    const { orders } = useGlobalStore();
    const [isUploading, setIsUploading] = useState(false);

    // Derive albums from Orders that have install files
    const albums: Album[] = orders
        .filter(o => (o.installFiles && o.installFiles.length > 0) || (o.afterInstallFiles && o.afterInstallFiles.length > 0))
        .map(o => ({
            id: o.id,
            title: `${o.items[0]?.category || '시공'} - ${o.items[0]?.detail || ''}`,
            date: o.installDate || o.createdAt.split("T")[0],
            // Merge legacy installFiles and new afterInstallFiles, removing duplicates
            photos: Array.from(new Set([...(o.afterInstallFiles || []), ...o.installFiles])),
            synced: !!o.items[0]?.category // Mock sync status
        }));

    return (
        <div className="space-y-6">
            {/* Gallery Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="text-indigo-600" />
                        시공 포트폴리오
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">시공 완료된 현장 사진(Order)을 자동으로 불러옵니다.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-50 transition shadow-sm">
                        <Cloud size={18} className="text-blue-500" />
                        Google Drive 열기
                    </button>
                    {/* Upload feature disabled in view-only mode for now, as it requires linking to an order */}
                </div>
            </div>

            {/* Album Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.length > 0 ? (
                    albums.map((album) => (
                        <div key={album.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                            {/* Cover Image (Collage) */}
                            <div className="h-48 bg-slate-100 relative grid grid-cols-2 gap-px">
                                {album.photos.slice(0, 4).map((photo, idx) => (
                                    <div key={idx} className="relative w-full h-full overflow-hidden">
                                        <img src={photo} alt={`photo-${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                    </div>
                                ))}
                                {album.photos.length === 0 && <div className="col-span-2 flex items-center justify-center text-slate-400">No Photos</div>}
                                {/* Overlay for count */}
                                {album.photos.length > 4 && (
                                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-2 py-1 m-1 rounded font-bold">
                                        +{album.photos.length - 4}
                                    </div>
                                )}
                            </div>

                            {/* Album Info */}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{album.title}</h3>
                                    <div className="flex gap-1">
                                        {album.synced && (
                                            <div className="text-blue-500 bg-blue-50 p-1 rounded-md" title="주문 연동됨">
                                                <Cloud size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-slate-500 flex justify-between items-center">
                                    <span>{album.date}</span>
                                    <span>{album.photos.length}장의 사진</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ImageIcon size={40} className="opacity-20" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">등록된 시공 완료 사진이 없습니다.</p>
                        <p className="text-sm mt-1">Install App에서 시공 완료 사진을 등록하면 이곳에 표시됩니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
