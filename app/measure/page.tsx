"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ruler, ShoppingBag, Youtube, Home, Search, Bluetooth, Instagram, MessageCircle, MoreHorizontal, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FieldLandingPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<any>(null);

    // Fetch Settings on Mount
    useEffect(() => {
        fetch("/api/company/settings")
            .then(res => res.json())
            .then(res => {
                if (res.ok && res.data) {
                    setSettings(res.data);
                }
            })
            .catch(e => console.error("Failed to load settings", e));
    }, []);

    const openLink = (url: string | undefined, name: string) => {
        if (!url) {
            alert(`⚠️ [${name}] 링크가 설정되지 않았습니다.\n관리자 페이지 > 회사 설정에서 등록해주세요.`);
            return;
        }

        let targetUrl = url.trim();
        if (!targetUrl.startsWith("http")) {
            targetUrl = `https://${targetUrl}`;
        }
        window.open(targetUrl, "_blank");
    };

    // Style constants matching the app's dark theme
    const pageStyle: React.CSSProperties = {
        minHeight: "100vh",
        background: "#121212",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        textAlign: "center",
        position: "relative",
    };

    const bigBtnStyle: React.CSSProperties = {
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        color: "white",
        width: "100%",
        maxWidth: 320,
        padding: "20px",
        borderRadius: 24,
        fontSize: 18,
        fontWeight: 800,
        border: "none",
        boxShadow: "0 10px 25px rgba(79, 70, 229, 0.4)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        transition: "transform 0.2s, box-shadow 0.2s",
        textDecoration: "none",
        marginTop: 40,
        marginBottom: 60,
    };

    const iconBtnStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        color: "#888",
        fontSize: 12,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 10,
    };

    // Icon circle wrapper
    const iconCircle = (color: string) => ({
        width: 48, height: 48, borderRadius: "50%", background: "#1e1e1e",
        display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #333"
    });

    return (
        <div style={pageStyle}>
            {/* Admin Shortcut (Top Right) */}
            <div style={{ position: "absolute", top: 20, right: 20 }}>
                <Link href="/admin/settings" style={{ color: "#555", display: "flex", gap: 4, fontSize: 12 }}>
                    <Settings size={14} /> 설정
                </Link>
            </div>

            {/* Header / Title Area */}
            <div style={{ marginBottom: 10 }}>
                <div style={{
                    width: 64, h: 64, background: "#1e1e1e", borderRadius: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", border: "1px solid #333",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                }}>
                    <Ruler size={32} color="#818cf8" />
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, marginBottom: 8 }}>
                    {settings?.company_name || "현장실측"}
                </h1>
                <p style={{ fontSize: 15, color: "#888", maxWidth: 260, margin: "0 auto", lineHeight: 1.5 }}>
                    {settings?.ceo_name ? `${settings.ceo_name} 대표` : "LimsDoor Measure Platform"}<br />
                    정밀 시공을 위한 첫 걸음
                </p>
                {settings?.phone && (
                    <p style={{ fontSize: 13, color: "#555", marginTop: 8 }}>📞 {settings.phone}</p>
                )}
            </div>

            {/* Main Action */}
            <Link href="/field/new?from=measure" style={bigBtnStyle}>
                <span>실측 입력 시작하기</span>
                <span style={{ fontSize: 24 }}>🚀</span>
            </Link>

            {/* Footer / Social Links */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                width: "100%",
                maxWidth: 400,
                paddingTop: 30,
                borderTop: "1px solid rgba(255,255,255,0.1)"
            }}>
                <button style={iconBtnStyle} onClick={() => openLink(settings?.homepage_url, "홈페이지")}>
                    <div style={iconCircle("#10b981")}>
                        <Home size={20} color="#10b981" />
                    </div>
                    <span>홈페이지</span>
                </button>

                <button style={iconBtnStyle} onClick={() => openLink(settings?.shop_url, "자재몰")}>
                    <div style={iconCircle("#f59e0b")}>
                        <ShoppingBag size={20} color="#f59e0b" />
                    </div>
                    <span>자재몰</span>
                </button>

                <button style={iconBtnStyle} onClick={() => openLink(settings?.kakao_chat_url, "카톡상담")}>
                    <div style={iconCircle("#fee500")}>
                        <MessageCircle size={20} color="#fee500" />
                    </div>
                    <span>카톡상담</span>
                </button>

                <button style={iconBtnStyle} onClick={() => openLink(settings?.youtube_url, "유튜브")}>
                    <div style={iconCircle("#ef4444")}>
                        <Youtube size={20} color="#ef4444" />
                    </div>
                    <span>유튜브</span>
                </button>

                {/* 2nd Row if needed */}
                <button style={iconBtnStyle} onClick={() => openLink(settings?.instagram_url, "인스타")}>
                    <div style={iconCircle("#ec4899")}>
                        <Instagram size={20} color="#ec4899" />
                    </div>
                    <span>인스타</span>
                </button>

                <button style={iconBtnStyle}>
                    <div style={iconCircle("#3b82f6")}>
                        <Bluetooth size={20} color="#3b82f6" />
                    </div>
                    <span>기기연결</span>
                </button>
            </div>

            <div style={{ marginTop: 40, opacity: 0.4, fontSize: 11 }}>
                v2.6.0 {settings?.business_number ? `Biz: ${settings.business_number}` : ""}
            </div>
        </div>
    );
}
