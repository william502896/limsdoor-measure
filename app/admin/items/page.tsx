"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { Item } from "@/app/lib/admin/types";
import { Search, Plus, Edit, X, Save, Box, Upload, Camera, AlertTriangle, Loader2, CheckCircle, Trash2 } from "lucide-react";

// Extended Item type for local usage if not in shared types yet
interface ExtendedItem extends Item {
    supplier?: string;
    cost?: number; // Purchase Price
}

export default function ItemsPage() {
    const [items, setItems] = useState<ExtendedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Modal Tabs
    const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");

    // Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Warning State
    const [priceWarning, setPriceWarning] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<ExtendedItem>>({
        unit: 'EA',
        category: 'door',
        supplier: '',
        cost: 0
    });

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("items")
            .select("*")
            .order("category", { ascending: true })
            .order("name", { ascending: true });

        if (!error) {
            setItems(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleOpenModal = (item?: ExtendedItem) => {
        if (item) {
            setEditingId(item.id);
            setFormData(item);
            setActiveTab("manual");
        } else {
            setEditingId(null);
            setFormData({ name: '', unit: 'EA', category: 'door', supplier: '', cost: 0 });
            setActiveTab("manual");
        }
        setSelectedImage(null);
        setPriceWarning(null);
        setIsModalOpen(true);
    };

    // --- OCR / Upload Logic ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setSelectedImage(ev.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyzeInvoice = async () => {
        if (!selectedImage) return alert("이미지를 선택해주세요.");
        setIsAnalyzing(true);

        try {
            const response = await fetch("/api/admin/scan-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: selectedImage }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Analysis failed");

            // Populate form with OCR result
            setFormData(prev => ({
                ...prev,
                name: result.item_name || prev.name,
                supplier: result.supplier || prev.supplier,
                cost: result.unit_price || prev.cost,
                unit: result.unit || prev.unit || 'EA',
                // Keep category manual or guess it
            }));

            setActiveTab("manual"); // Switch to manual tab to review
            alert("이미지 인식 완료! 입력된 데이터를 확인해주세요.");

        } catch (e: any) {
            alert("OCR 분석 실패: " + e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const checkForPriceChange = () => {
        if (!formData.supplier || !formData.name || !formData.cost) return null;

        // Find existing item with same supplier & name
        const existing = items.find(i =>
            i.supplier === formData.supplier &&
            i.name === formData.name &&
            i.id !== editingId // Exclude self if editing
        );

        if (existing && existing.cost !== formData.cost) {
            const diff = (formData.cost || 0) - (existing.cost || 0);
            return {
                prev: existing.cost,
                curr: formData.cost,
                diff,
                message: `동일 품목(${existing.name})의 기존 단가(${existing.cost?.toLocaleString()}원)와 다릅니다. (${diff > 0 ? "+" : ""}${diff.toLocaleString()}원 변동)`
            };
        }
        return null;
    };

    const handleSave = async () => {
        if (!formData.name) return alert("품목명은 필수입니다.");

        // Price Check Logic
        const warning = checkForPriceChange();
        if (warning && !priceWarning) {
            // First time showing warning
            setPriceWarning(warning.message);
            return; // Stop save, ask for confirmation
        }

        const payload = { ...formData };
        delete payload.id; // Don't update ID

        let error;
        if (editingId) {
            const { error: e } = await supabase.from("items").update(payload).eq("id", editingId);
            error = e;
        } else {
            const { error: e } = await supabase.from("items").insert([payload]);
            error = e;
        }

        if (error) {
            alert("저장 실패: " + error.message);
        } else {
            setIsModalOpen(false);
            fetchItems();
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("정말 이 품목을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.")) {
            const { error } = await supabase.from("items").delete().eq("id", id);
            if (error) {
                alert("삭제 실패: " + error.message);
            } else {
                fetchItems();
            }
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">품목/자재 관리 (매입)</h1>
                    <p className="text-sm text-slate-500">매입 단가 및 자재 품목 데이터베이스</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                    <Plus size={18} />
                    신규 품목
                </button>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-3">카테고리</th>
                                <th className="px-6 py-3">공급처</th>
                                <th className="px-6 py-3">품목명</th>
                                <th className="px-6 py-3">단위</th>
                                <th className="px-6 py-3 text-right">매입단가</th>
                                <th className="px-6 py-3 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">데이터가 없습니다.</td></tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{item.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{item.supplier || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                                        <td className="px-6 py-4 font-mono">{item.unit}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                                            {item.cost ? `${item.cost.toLocaleString()}원` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-indigo-600 transition">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg">{editingId ? '품목 수정' : '신규 품목 등록'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>

                        {/* Tabs (Only for New Items) */}
                        {!editingId && (
                            <div className="flex border-b">
                                <button
                                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                                    onClick={() => setActiveTab('manual')}
                                >
                                    <Edit size={16} /> 수동 입력
                                </button>
                                <button
                                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                                    onClick={() => setActiveTab('upload')}
                                >
                                    <Upload size={16} /> 명세서/영수증 업로드
                                </button>
                            </div>
                        )}

                        {/* Body */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {activeTab === 'upload' && !editingId ? (
                                <div className="space-y-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
                                    >
                                        {selectedImage ? (
                                            <img src={selectedImage} alt="Preview" className="max-h-48 rounded shadow-sm" />
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <Camera size={32} className="text-slate-400 group-hover:text-indigo-500" />
                                                </div>
                                                <p className="text-slate-600 font-bold mb-1">이미지 업로드 또는 촬영</p>
                                                <p className="text-xs text-slate-400">거래명세서나 영수증을 올려주세요</p>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                        />
                                    </div>

                                    {selectedImage && (
                                        <button
                                            onClick={handleAnalyzeInvoice}
                                            disabled={isAnalyzing}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isAnalyzing ? <><Loader2 className="animate-spin" /> AI 분석중...</> : "AI 텍스트 인식 시작"}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Warning Banner */}
                                    {priceWarning && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
                                            <AlertTriangle className="shrink-0" size={20} />
                                            <div>
                                                <div className="font-bold mb-1">단가 변동 감지</div>
                                                {priceWarning}
                                                <div className="mt-2 text-xs font-bold text-amber-600">계속 저장하시겠습니까?</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">카테고리</label>
                                            <select
                                                className="w-full p-2 border rounded-lg bg-white"
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option value="door">도어 (완제품)</option>
                                                <option value="glass">유리</option>
                                                <option value="frame">프레임/자재</option>
                                                <option value="hardware">하드웨어/부속</option>
                                                <option value="labor">시공/노임</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">공급처</label>
                                            <input
                                                className="w-full p-2 border rounded-lg"
                                                value={formData.supplier || ''}
                                                onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                                placeholder="예: 예림임업"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">품목명 <span className="text-red-500">*</span></label>
                                        <input className="w-full p-2 border rounded-lg" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="예: 3연동 100바 화이트" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">매입단가</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded-lg"
                                                value={formData.cost || 0}
                                                onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">단위</label>
                                            <select
                                                className="w-full p-2 border rounded-lg bg-white"
                                                value={formData.unit}
                                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            >
                                                <option value="EA">EA (개)</option>
                                                <option value="SET">SET (세트)</option>
                                                <option value="m2">m² (헤베)</option>
                                                <option value="box">BOX (박스)</option>
                                                <option value="py">PY (평)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {activeTab === 'manual' && (
                            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">취소</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                                    <Save size={16} />
                                    {priceWarning ? "확인 및 저장" : "저장"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
