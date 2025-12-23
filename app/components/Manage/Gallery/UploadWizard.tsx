import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';

interface UploadWizardProps {
    onUpload: (files: string[]) => void;
    onCancel: () => void;
}

export default function UploadWizard({ onUpload, onCancel }: UploadWizardProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);

            // Create previews
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);

        const newPreviews = [...previews];
        URL.revokeObjectURL(newPreviews[index]); // cleanup
        newPreviews.splice(index, 1);
        setPreviews(newPreviews);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);

        // Simulate upload delay and multiple file processing
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Convert to Base64 (Mocking upload)
            const base64Files = await Promise.all(selectedFiles.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
            }));

            onUpload(base64Files);
        } catch (error) {
            console.error("Upload failed", error);
            alert("사진 처리에 실패했습니다.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Upload size={20} className="text-indigo-600" />
                새 앨범 업로드
            </h3>

            {/* Drop Zone / Trigger */}
            <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors mb-6"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                    <ImageIcon className="text-indigo-500" size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700">시공 사진을 여기에 놓거나 클릭하세요</p>
                <p className="text-xs text-slate-500 mt-1">4장 이상 권장 (JPG, PNG)</p>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
            </div>

            {/* Previews */}
            {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {previews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group shadow-sm">
                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <div
                        className="aspect-square rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="text-3xl text-slate-300 font-light">+</span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    disabled={isUploading}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
                >
                    취소
                </button>
                <button
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0 || isUploading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isUploading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            업로드 중...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={16} />
                            사진 저장
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
