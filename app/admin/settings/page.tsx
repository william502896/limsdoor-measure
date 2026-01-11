"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Save, Link as LinkIcon, Globe, ShoppingBag, Youtube, MessageCircle, Instagram, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Types ---
type CompanySettings = {
    company_name: string;
    ceo_name: string;
    business_number: string;
    address: string;
    phone: string;
    email: string;
    homepage_url?: string;
    shop_url?: string;
    youtube_url?: string;
    tiktok_url?: string;
    instagram_url?: string;
    threads_url?: string;
    facebook_url?: string;
    kakao_chat_url?: string;
    kakao_channel_id?: string;
    portfolio_url?: string;
    google_photos_url?: string;
};

// --- Sub Components (Defined Outside to prevent re-mount focus loss) ---
const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
        <Icon size={18} className="text-indigo-600" />
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
    </div>
);

const InputField = ({ label, name, type = "text", placeholder, icon: Icon, value, onChange }: any) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
        <div className="relative">
            {Icon && <div className="absolute left-3 top-2.5 text-slate-400"><Icon size={16} /></div>}
            <input
                type={type}
                name={name}
                value={value || ""}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${Icon ? "pl-9" : ""}`}
            />
        </div>
    </div>
);

export default function AdminSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CompanySettings>({
        company_name: "", ceo_name: "", business_number: "", address: "", phone: "", email: ""
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/company/settings");
            const json = await res.json();
            if (res.ok && json.data) {
                setForm(json.data);
            } else if (!res.ok) {
                console.error("Load failed", json.error);
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch("/api/company/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (res.ok) {
                alert("✅ 설정이 저장되었습니다.");
            } else {
                alert(`❌ 저장 실패: ${json.error}`);
            }
        } catch (e) {
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/manage" className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-black text-slate-900">회사 설정</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-lg disabled:opacity-50"
                >
                    {saving ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                    저장하기
                </button>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Basic Info */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <SectionTitle icon={Building2} title="기본 정보" />
                    <InputField label="회사명 (브랜드)" name="company_name" value={form.company_name} onChange={handleChange} placeholder="예: 림스도어" />
                    <InputField label="대표자명" name="ceo_name" value={form.ceo_name} onChange={handleChange} placeholder="대표자 성명" />
                    <InputField label="사업자등록번호" name="business_number" value={form.business_number} onChange={handleChange} placeholder="000-00-00000" />
                    <InputField label="주소" name="address" value={form.address} onChange={handleChange} placeholder="사업장 주소" />
                    <InputField label="대표 전화번호" name="phone" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" />
                    <InputField label="이메일" name="email" value={form.email} onChange={handleChange} placeholder="contact@example.com" />
                </div>

                {/* Right Column: Links */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <SectionTitle icon={LinkIcon} title="소셜 & 링크 연결" />

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-xs text-blue-700 leading-relaxed">
                        <span className="font-bold">💡 Tip:</span> 링크 입력 시 <code>https://</code>를 포함한 전체 주소를 입력해주세요.
                    </div>

                    <InputField label="공식 홈페이지" name="homepage_url" icon={Globe} value={form.homepage_url} onChange={handleChange} placeholder="https://..." />
                    <InputField label="포트폴리오 주소" name="portfolio_url" icon={ImageIcon} value={form.portfolio_url} onChange={handleChange} placeholder="https://..." />
                    <InputField label="구글 사진첩 주소" name="google_photos_url" icon={ImageIcon} value={form.google_photos_url} onChange={handleChange} placeholder="https://photos.google.com/..." />
                    <InputField label="자재 쇼핑몰 (스토어)" name="shop_url" icon={ShoppingBag} value={form.shop_url} onChange={handleChange} placeholder="https://..." />
                    <InputField label="카카오톡 상담 링크" name="kakao_chat_url" icon={MessageCircle} value={form.kakao_chat_url} onChange={handleChange} placeholder="https://open.kakao.com/..." />
                    <InputField label="유튜브 채널" name="youtube_url" icon={Youtube} value={form.youtube_url} onChange={handleChange} placeholder="https://youtube.com/..." />
                    <InputField label="인스타그램" name="instagram_url" icon={Instagram} value={form.instagram_url} onChange={handleChange} placeholder="https://instagram.com/..." />
                    <InputField label="틱톡 (TikTok)" name="tiktok_url" value={form.tiktok_url} onChange={handleChange} placeholder="https://tiktok.com/..." />
                    <InputField label="페이스북" name="facebook_url" value={form.facebook_url} onChange={handleChange} placeholder="https://facebook.com/..." />

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 mb-2 font-bold">기타 설정</p>
                        <InputField label="카카오 채널 ID (알림톡용)" name="kakao_channel_id" value={form.kakao_channel_id} onChange={handleChange} placeholder="@채널아이디" />
                    </div>
                </div>
            </div>
        </div>
    );
}
