"use client";

import React from "react";
import DaumPostcodeEmbed from "react-daum-postcode";
import { X } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: any) => void;
}

export default function AddressSearchModal({ isOpen, onClose, onComplete }: Props) {
    if (!isOpen) return null;

    const handleComplete = (data: any) => {
        onComplete(data);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">주소 검색</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>
                <div className="h-[500px]">
                    <DaumPostcodeEmbed
                        onComplete={handleComplete}
                        style={{ width: "100%", height: "100%" }}
                        autoClose
                    />
                </div>
            </div>
        </div>
    );
}
