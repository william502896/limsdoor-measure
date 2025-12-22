"use client";

import { useState, useEffect } from "react";

type VirtualPreviewModalProps = {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string; // The uploaded site photo
    doorOptions: {
        category: string;
        type: string;
        glass?: string;
        color?: string;
    };
};

export default function VirtualPreviewModal({ isOpen, onClose, imageSrc, doorOptions }: VirtualPreviewModalProps) {
    const [step, setStep] = useState<"loading" | "result">("loading");
    const [resultData, setResultData] = useState<any>(null);
    const [viewMode, setViewMode] = useState<"original" | "preview">("preview");

    useEffect(() => {
        if (isOpen && imageSrc) {
            setStep("loading");
            // Call API
            fetch("/api/ai/virtual-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: imageSrc,
                    options: doorOptions
                })
            })
                .then(res => res.json())
                .then(data => {
                    setResultData(data);
                    setStep("result");
                })
                .catch(err => {
                    alert("가상 시공 생성 실패");
                    onClose();
                });
        }
    }, [isOpen, imageSrc]);

    if (!isOpen) return null;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <h3 style={{ margin: 0 }}>✨ AI 가상 시공 미리보기</h3>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>

                {/* Content */}
                <div style={contentStyle}>
                    {step === "loading" && (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                            <div className="spinner" style={spinnerStyle}></div>
                            <p style={{ marginTop: 20, color: "#555" }}>
                                고객님의 현장에<br />
                                <b>{doorOptions.category} ({doorOptions.type})</b>을(를)<br />
                                설치하고 있습니다...
                            </p>
                            <p style={{ fontSize: 12, color: "#999" }}>약 5~10초 소요됩니다.</p>
                        </div>
                    )}

                    {step === "result" && resultData && (
                        <div style={{ width: "100%" }}>
                            {/* Toggle */}
                            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 15 }}>
                                <button
                                    onClick={() => setViewMode("original")}
                                    style={viewMode === "original" ? activeTabStyle : tabStyle}
                                >
                                    원본 (Before)
                                </button>
                                <button
                                    onClick={() => setViewMode("preview")}
                                    style={viewMode === "preview" ? activeTabStyle : tabStyle}
                                >
                                    가상시공 (After)
                                </button>
                            </div>

                            {/* Image View */}
                            <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", background: "#eee", borderRadius: 8, overflow: "hidden" }}>
                                <img
                                    src={viewMode === "original" ? resultData.previewImages.original : resultData.previewImages.installedPreview}
                                    alt="Preview"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />

                                {/* Overlay Tag */}
                                {viewMode === "preview" && (
                                    <div style={aiTagStyle}>AI Generated Preview</div>
                                )}
                            </div>

                            <p style={{ fontSize: 13, color: "#666", marginTop: 15, lineHeight: 1.4 }}>
                                {resultData.description}
                            </p>
                            <p style={{ fontSize: 11, color: "#999", marginTop: 5 }}>
                                * {resultData.customerGuide}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === "result" && (
                    <div style={footerStyle}>
                        <button onClick={onClose} style={secondaryBtnStyle}>닫기</button>
                        <button onClick={() => alert("이미지가 갤러리에 저장되었습니다.")} style={primaryBtnStyle}>이미지 저장</button>
                    </div>
                )}
            </div>
            <style jsx>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// Styles
const overlayStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20
};

const modalStyle: React.CSSProperties = {
    width: "100%", maxWidth: "400px", background: "#fff", borderRadius: 16,
    overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh"
};

const headerStyle: React.CSSProperties = {
    padding: "16px 20px", borderBottom: "1px solid #eee",
    display: "flex", justifyContent: "space-between", alignItems: "center"
};

const closeBtnStyle: React.CSSProperties = {
    background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999"
};

const contentStyle: React.CSSProperties = {
    padding: 20, overflowY: "auto", flex: 1
};

const footerStyle: React.CSSProperties = {
    padding: 15, borderTop: "1px solid #eee", display: "flex", gap: 10
};

const spinnerStyle: React.CSSProperties = {
    width: 40, height: 40, border: "4px solid #ddd", borderTop: "4px solid #3b82f6",
    borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite"
};

const tabStyle: React.CSSProperties = {
    padding: "8px 16px", borderRadius: 20, border: "1px solid #ddd",
    background: "#fff", color: "#666", fontSize: 13, cursor: "pointer"
};

const activeTabStyle: React.CSSProperties = {
    ...tabStyle, background: "#3b82f6", color: "#fff", borderColor: "#3b82f6", fontWeight: "bold"
};

const aiTagStyle: React.CSSProperties = {
    position: "absolute", top: 10, right: 10,
    background: "rgba(0,0,0,0.6)", color: "#fff",
    fontSize: 10, padding: "4px 8px", borderRadius: 4
};

const primaryBtnStyle: React.CSSProperties = {
    flex: 1, padding: 12, borderRadius: 8, background: "#3b82f6", color: "#fff",
    border: "none", fontWeight: "bold", cursor: "pointer"
};

const secondaryBtnStyle: React.CSSProperties = {
    flex: 1, padding: 12, borderRadius: 8, background: "#f3f4f6", color: "#333",
    border: "none", fontWeight: "bold", cursor: "pointer"
};
