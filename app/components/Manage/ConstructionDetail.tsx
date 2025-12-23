import React, { useState, useEffect } from "react";
import { Order } from "@/app/lib/store";
import { useGlobalStore } from "@/app/lib/store-context";
import { Camera, AlertTriangle, FileText, CheckCircle, Save, ArrowLeft, Upload } from "lucide-react";

interface ConstructionDetailProps {
    orderId: string;
    onBack: () => void;
}

export default function ConstructionDetail({ orderId, onBack }: ConstructionDetailProps) {
    const { orders, updateOrder, customers } = useGlobalStore();
    const [order, setOrder] = useState<Order | null>(null);

    // Form States
    const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
    const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [issues, setIssues] = useState("");

    useEffect(() => {
        const found = orders.find(o => o.id === orderId);
        if (found) {
            setOrder(found);
            // Load existing data
            setBeforePhotos(found.beforeInstallFiles || []);
            setAfterPhotos(found.afterInstallFiles || found.installFiles || []);
            setNotes(found.installMemo || "");
            // Merge issues into notes for now as we only added one field
        }
    }, [orderId, orders]);

    if (!order) return <div>Loading...</div>;

    const customer = customers.find(c => c.id === order.customerId);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after") => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            // Mock read file
            files.forEach(file => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    if (type === "before") setBeforePhotos(prev => [...prev, reader.result as string]);
                    else setAfterPhotos(prev => [...prev, reader.result as string]);
                };
            });
        }
    };

    const handleSave = () => {
        // combine notes and issues
        const combinedMemo = `${notes}\n\n[이슈사항]\n${issues}`;

        updateOrder(orderId, {
            beforeInstallFiles: beforePhotos,
            afterInstallFiles: afterPhotos,
            installFiles: afterPhotos, // Legacy sync
            installMemo: combinedMemo,
            status: "INSTALLED", // Use valid enum status
            installDate: new Date().toISOString().split("T")[0]
        });
        alert("시공 기록이 저장되었습니다.");
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            👷 시공 관리 리포트
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {customer?.name} 고객님 | {order.items[0].category} 현장
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition shadow-lg shadow-indigo-900/50"
                >
                    <Save size={18} />
                    기록 저장 및 완료
                </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Photos */}
                <div className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Camera size={18} className="text-indigo-600" />
                            시공 전 (Before)
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {beforePhotos.map((src, idx) => (
                                <img key={idx} src={src} className="w-full h-20 object-cover rounded-lg border border-slate-300" />
                            ))}
                            <label className="w-full h-20 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:text-indigo-500 text-slate-400 transition">
                                <Upload size={20} />
                                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, "before")} />
                            </label>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                        <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Camera size={18} className="text-indigo-600" />
                            시공 후 (After)
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {afterPhotos.map((src, idx) => (
                                <img key={idx} src={src} className="w-full h-20 object-cover rounded-lg border border-indigo-200" />
                            ))}
                            <label className="w-full h-20 bg-white border-2 border-dashed border-indigo-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-indigo-50 text-indigo-400 transition">
                                <Upload size={20} />
                                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, "after")} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right: Notes */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <FileText size={16} />
                            작업 특이사항 (메모)
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="예: 벽면 기울기가 심해 상부 마감재 추가 사용함."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            돌발 상황 / 이슈 기록
                        </label>
                        <textarea
                            value={issues}
                            onChange={e => setIssues(e.target.value)}
                            className="w-full h-32 p-4 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none placeholder-red-300"
                            placeholder="현장에서 발생한 예기치 못한 문제나 고객 요청사항을 기록하세요."
                        />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-1">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-900 text-sm">확인 사항</h4>
                            <ul className="text-xs text-blue-800 mt-1 list-disc pl-4 space-y-1">
                                <li>시공 완료 후 고객님께 사용법을 설명하셨나요?</li>
                                <li>주변 정돈 상태를 확인하셨나요?</li>
                                <li>철수 전 폐기물 처리를 확인해주세요.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
