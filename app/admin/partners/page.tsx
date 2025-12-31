"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { Partner } from "@/app/lib/admin/types";
import {
    Search, Plus, Edit, MoreVertical, X, Save,
    User, Phone, Mail, FileText, Upload, Camera,
    Image as ImageIcon, Loader2, Trash2, Building
} from "lucide-react";
import AddressSearchModal from "@/app/components/AddressSearchModal";

// --- Extended Types (Local) ---
type PartnerExtended = Partner & {
    ceo_name?: string;
    email?: string;
    fax?: string;
    homepage?: string;
    industry?: string;
    sector?: string;
    biz_license_url?: string;
};

type PartnerStaff = {
    id?: string;
    partner_id?: string;
    name: string;
    position: string;
    mobile: string;
    email: string;
    note: string;
    is_primary: boolean;
};

type PartnerAttachment = {
    id: string;
    file_type: 'biz_card' | 'business_license' | 'bank_book' | 'contract' | 'etc';
    file_url: string;
    description: string;
    created_at: string;
};

export default function PartnersPage() {
    const [partners, setPartners] = useState<PartnerExtended[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [addressModalOpen, setAddressModalOpen] = useState(false);

    // OCR & Loading State
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    // Selection Modal State
    const [sourceSelectTarget, setSourceSelectTarget] = useState<'biz_card' | 'business_license' | null>(null);

    // Form State
    const [activeTab, setActiveTab] = useState<'basic' | 'staff' | 'files'>('basic');
    const [formData, setFormData] = useState<Partial<PartnerExtended>>({
        type: 'both',
        status: 'active'
    });

    // Sub-data State (Only loaded when editing)
    const [staffList, setStaffList] = useState<PartnerStaff[]>([]);
    const [fileList, setFileList] = useState<PartnerAttachment[]>([]);

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPartners(data || []);
        } catch (error) {
            console.error("Error fetching partners:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetailData = async (partnerId: string) => {
        const { data: sData } = await supabase.from('partner_staff').select('*').eq('partner_id', partnerId);
        if (sData) setStaffList(sData);

        const { data: fData } = await supabase.from('partner_attachments').select('*').eq('partner_id', partnerId);
        if (fData) setFileList(fData);
    };

    const handleOpenModal = (partner?: PartnerExtended) => {
        if (partner) {
            setEditingId(partner.id);
            setFormData(partner);
            fetchDetailData(partner.id);
        } else {
            setEditingId(null);
            setFormData({ type: 'both', status: 'active' });
            setStaffList([]);
            setFileList([]);
        }
        setActiveTab('basic');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return alert("거래처명은 필수입니다.");

        try {
            let pid = editingId;
            let error;

            // 1. Save Partner Basic Info
            if (pid) {
                const { error: e } = await supabase.from("partners").update(formData).eq("id", pid);
                error = e;
            } else {
                const { data, error: e } = await supabase.from("partners").insert([formData]).select().single();
                error = e;
                if (data) pid = data.id;
            }

            if (error) throw error;
            if (!pid) throw new Error("Partner ID missing");

            alert("기본 정보가 저장되었습니다.");
            setIsModalOpen(false);
            fetchPartners();

        } catch (e: any) {
            alert("저장 실패: " + e.message);
        }
    };

    // --- OCR Logic ---
    const handleSourceSelect = (target: 'biz_card' | 'business_license') => {
        setSourceSelectTarget(target);
    };

    const triggerFileInput = (mode: 'camera' | 'file') => {
        if (!sourceSelectTarget) return;
        const inputId = `input-${sourceSelectTarget}-${mode}`;
        const input = document.getElementById(inputId);
        if (input) {
            input.click();
        } else {
            console.error("Input not found:", inputId);
        }
        setSourceSelectTarget(null);
    };

    const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'biz_card' | 'business_license') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsOcrLoading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;

                const fd = new FormData();
                fd.append("file", file);

                const res = await fetch("/api/ocr/business-card", { method: "POST", body: fd });
                const json = await res.json();

                if (!res.ok) throw new Error(json.error?.message || "OCR Failed");

                const extracted = json.data;
                if (extracted) {
                    setFormData(prev => ({
                        ...prev,
                        name: extracted.company_name || prev.name,
                        contact_name: extracted.ceo_name || extracted.name || prev.contact_name,
                        contact_phone: extracted.mobile || prev.contact_phone,
                        business_number: extracted.business_number || extracted.biz_number || prev.business_number,
                        address: extracted.address || prev.address,
                        email: extracted.email || prev.email,
                        fax: extracted.fax || prev.fax,
                        homepage: extracted.homepage || prev.homepage,
                        ceo_name: extracted.ceo_name || prev.ceo_name,
                        industry: extracted.industry || prev.industry,
                        sector: extracted.sector || prev.sector,
                        biz_license_url: type === 'business_license' ? base64 : prev.biz_license_url
                    }));

                    if (editingId) {
                        const newFile = {
                            partner_id: editingId,
                            file_type: type,
                            file_url: base64,
                            description: type === 'business_license' ? '사업자등록증 (AI Scan)' : '명함 (AI Scan)',
                        };
                        const { data, error } = await supabase.from('partner_attachments').insert(newFile).select().single();
                        if (!error && data) {
                            setFileList(prev => [data, ...prev]);
                            alert(`${type === 'business_license' ? '사업자등록증' : '명함'} 인식 및 저장이 완료되었습니다.`);
                        }
                    } else {
                        alert(`[${extracted.company_name}] 정보가 인식되었습니다.\n저장 시 파일도 함께 등록하려면 먼저 '기본정보 저장'을 해주세요.`);
                    }
                }
            };
        } catch (e: any) {
            alert("인식 실패: " + e.message);
        } finally {
            setIsOcrLoading(false);
            e.target.value = "";
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'etc') => {
        if (!editingId) return alert("파일을 저장하려면 먼저 기본 정보를 저장해주세요.");
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;
            const newFile = {
                partner_id: editingId,
                file_type: type,
                file_url: base64,
                description: file.name
            };
            const { data, error } = await supabase.from('partner_attachments').insert(newFile).select().single();
            if (error) return alert("업로드 실패: " + error.message);
            setFileList(prev => [data, ...prev]);
        };
        e.target.value = "";
    };

    const deleteFile = async (id: string) => {
        if (!confirm("파일을 삭제하시겠습니까?")) return;
        await supabase.from('partner_attachments').delete().eq('id', id);
        setFileList(prev => prev.filter(f => f.id !== id));
    };

    // --- Detail Handlers ---
    const addStaff = async () => {
        if (!editingId) return alert("먼저 기본 정보를 저장해주세요.");
        const newStaff: Partial<PartnerStaff> = {
            partner_id: editingId, name: '신규 담당자', mobile: '', position: '', is_primary: false
        };
        const { data, error } = await supabase.from('partner_staff').insert(newStaff).select().single();
        if (error) return alert(error.message);
        setStaffList([...staffList, data]);
    };

    const updateStaff = async (id: string, field: string, val: any) => {
        setStaffList(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
        await supabase.from('partner_staff').update({ [field]: val }).eq('id', id);
    };

    const deleteStaff = async (id: string) => {
        if (!confirm("삭제하시겠습니까?")) return;
        await supabase.from('partner_staff').delete().eq('id', id);
        setStaffList(prev => prev.filter(s => s.id !== id));
    };

    // --- Render ---

    return (
        <div className="space-y-6 h-full flex flex-col p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building className="text-indigo-600" /> 거래처 관리
                    </h1>
                    <p className="text-sm text-slate-500">매입/매출처 등록 및 담당자, 서류 통합 관리</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-bold"
                >
                    <Plus size={18} />
                    신규 거래처
                </button>
            </div>

            {/* Hidden Inputs for Selection Logic */}
            <input id="input-business_license-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleOcrUpload(e, 'business_license')} />
            <input id="input-business_license-file" type="file" accept="image/*" className="hidden" onChange={(e) => handleOcrUpload(e, 'business_license')} />
            <input id="input-biz_card-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleOcrUpload(e, 'biz_card')} />
            <input id="input-biz_card-file" type="file" accept="image/*" className="hidden" onChange={(e) => handleOcrUpload(e, 'biz_card')} />

            {/* Source Selection Modal */}
            {sourceSelectTarget && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">
                                {sourceSelectTarget === 'business_license' ? '사업자등록증 인식' : '명함 인식'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">업로드 방식을 선택해주세요.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => triggerFileInput('camera')} className="flex flex-col items-center gap-3 p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition group">
                                <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition">
                                    <Camera size={32} className="text-slate-700 group-hover:text-indigo-600" />
                                </div>
                                <span className="font-bold text-sm">카메라 촬영</span>
                            </button>
                            <button onClick={() => triggerFileInput('file')} className="flex flex-col items-center gap-3 p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition group">
                                <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition">
                                    <ImageIcon size={32} className="text-slate-700 group-hover:text-indigo-600" />
                                </div>
                                <span className="font-bold text-sm">파일 선택</span>
                            </button>
                        </div>
                        <button onClick={() => setSourceSelectTarget(null)} className="w-full mt-6 py-3 text-slate-400 font-bold hover:text-slate-600">취소</button>
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-4">업체명/유형</th>
                                <th className="px-6 py-4">대표자/연락처</th>
                                <th className="px-6 py-4">사업자번호</th>
                                <th className="px-6 py-4">주요 담당자</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">데이터를 불러오는 중입니다...</td></tr>
                            ) : partners.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">등록된 거래처가 없습니다.</td></tr>
                            ) : (
                                partners.map(p => (
                                    <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-base mb-1">{p.name}</div>
                                            <div className="flex gap-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${p.type === 'supplier' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        p.type === 'customer' ? 'bg-green-50 text-green-600 border-green-200' :
                                                            'bg-purple-50 text-purple-600 border-purple-200'
                                                    }`}>
                                                    {p.type === 'supplier' ? '매입처' : p.type === 'customer' ? '매출처' : '공통'}
                                                </span>
                                                {p.industry && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{p.industry}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900">{p.ceo_name || '-'}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{p.email || p.contact_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{p.business_number || '-'}</td>
                                        <td className="px-6 py-4">
                                            {p.contact_name ? (
                                                <div className="flex items-center gap-1.5">
                                                    <User size={14} className="text-slate-400" />
                                                    <span>{p.contact_name}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenModal(p)}
                                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-lg text-xs font-bold transition"
                                            >
                                                상세/수정
                                            </button>
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
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">
                                    {editingId ? '거래처 정보 수정' : '신규 거래처 등록'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">명함이나 사업자등록증을 업로드하세요.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSourceSelect('business_license')}
                                    className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                                    disabled={isOcrLoading}
                                >
                                    {isOcrLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                    <span>등록증 인식</span>
                                </button>
                                <button
                                    onClick={() => handleSourceSelect('biz_card')}
                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2 shadow-sm"
                                    disabled={isOcrLoading}
                                >
                                    {isOcrLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                    <span>명함 인식</span>
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex border-b text-sm font-bold bg-white sticky top-0 z-10">
                            <button
                                onClick={() => setActiveTab('basic')}
                                className={`flex-1 py-3 border-b-2 transition ${activeTab === 'basic' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                기본 정보
                            </button>
                            <button
                                onClick={() => {
                                    if (!editingId) return alert("기본 정보를 먼저 저장해야 합니다.");
                                    setActiveTab('staff');
                                }}
                                className={`flex-1 py-3 border-b-2 transition ${activeTab === 'staff' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                담당자 목록 {staffList.length > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 rounded-full ml-1">{staffList.length}</span>}
                            </button>
                            <button
                                onClick={() => {
                                    if (!editingId) return alert("기본 정보를 먼저 저장해야 합니다.");
                                    setActiveTab('files');
                                }}
                                className={`flex-1 py-3 border-b-2 transition ${activeTab === 'files' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                첨부 파일 {fileList.length > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 rounded-full ml-1">{fileList.length}</span>}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {activeTab === 'basic' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">거래처 유형</label>
                                            <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                                                {['supplier', 'customer', 'both'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setFormData({ ...formData, type: t as any })}
                                                        className={`flex-1 py-1.5 text-sm rounded-md font-bold transition ${formData.type === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        {t === 'supplier' ? '매입처' : t === 'customer' ? '매출처' : '매입/매출 공통'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label">거래처명 (상호) <span className="text-red-500">*</span></label>
                                            <input className="form-input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="(주)태양유리" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label">대표자명</label>
                                            <input className="form-input" value={formData.ceo_name || ''} onChange={e => setFormData({ ...formData, ceo_name: e.target.value })} placeholder="홍길동" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label">사업자등록번호</label>
                                            <input className="form-input" value={formData.business_number || ''} onChange={e => setFormData({ ...formData, business_number: e.target.value })} placeholder="000-00-00000" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label">업태 / 종목</label>
                                            <div className="flex gap-2">
                                                <input className="form-input flex-1" value={formData.industry || ''} onChange={e => setFormData({ ...formData, industry: e.target.value })} placeholder="업태" />
                                                <input className="form-input flex-1" value={formData.sector || ''} onChange={e => setFormData({ ...formData, sector: e.target.value })} placeholder="종목" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-200 my-2" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="form-label">대표 이메일</label>
                                            <input className="form-input" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@example.com" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label">대표 팩스</label>
                                            <input className="form-input" value={formData.fax || ''} onChange={e => setFormData({ ...formData, fax: e.target.value })} placeholder="02-1234-5678" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="form-label">사업장 주소</label>
                                            <div className="flex gap-2">
                                                <input className="form-input flex-1" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="주소 검색 또는 직접 입력" />
                                                <button onClick={() => setAddressModalOpen(true)} className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-200 text-sm">
                                                    주소검색
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-200 my-2" />
                                    <div>
                                        <label className="form-label">특이사항 (Memo)</label>
                                        <textarea
                                            className="form-input h-24 resize-none"
                                            value={formData.memo || ''}
                                            onChange={e => setFormData({ ...formData, memo: e.target.value })}
                                            placeholder="결제일, 배송 특이사항 등 메모"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'staff' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-500">담당자 목록</span>
                                        <button onClick={addStaff} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100">
                                            + 담당자 추가
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {staffList.map(staff => (
                                            <div key={staff.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 group relative">
                                                <button onClick={() => deleteStaff(staff.id!)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">성명</label>
                                                        <input
                                                            className="w-full text-sm font-bold border-b border-transparent focus:border-indigo-500 outline-none pb-1"
                                                            value={staff.name}
                                                            onChange={e => updateStaff(staff.id!, 'name', e.target.value)}
                                                            placeholder="이름 입력"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">직급/부서</label>
                                                        <input
                                                            className="w-full text-sm border-b border-transparent focus:border-indigo-500 outline-none pb-1"
                                                            value={staff.position}
                                                            onChange={e => updateStaff(staff.id!, 'position', e.target.value)}
                                                            placeholder="직급 입력"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">휴대폰</label>
                                                        <input
                                                            className="w-full text-sm font-mono border-b border-transparent focus:border-indigo-500 outline-none pb-1"
                                                            value={staff.mobile}
                                                            onChange={e => updateStaff(staff.id!, 'mobile', e.target.value)}
                                                            placeholder="010-0000-0000"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">이메일</label>
                                                        <input
                                                            className="w-full text-sm font-mono border-b border-transparent focus:border-indigo-500 outline-none pb-1"
                                                            value={staff.email}
                                                            onChange={e => updateStaff(staff.id!, 'email', e.target.value)}
                                                            placeholder="user@example.com"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {staffList.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">등록된 담당자가 없습니다.</div>}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-500">첨부 파일 목록</span>
                                        <label className="cursor-pointer text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1">
                                            <Upload size={12} /> 파일 추가
                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'etc')} />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {fileList.map((file) => (
                                            <div key={file.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative group hover:border-indigo-300 transition">
                                                <button onClick={() => deleteFile(file.id)} className="absolute top-2 right-2 p-1 bg-white/50 hover:bg-red-50 hover:text-red-500 rounded text-slate-400 opacity-0 group-hover:opacity-100 transition">
                                                    <Trash2 size={14} />
                                                </button>
                                                <div className="aspect-video bg-slate-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                                                    {file.file_url.startsWith('data:image') ? (
                                                        <img src={file.file_url} className="w-full h-full object-cover" alt="preview" />
                                                    ) : (
                                                        <FileText className="text-slate-300" size={32} />
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-indigo-600 uppercase mb-0.5">{file.file_type}</span>
                                                        <div className="text-xs font-bold text-slate-700 truncate w-32">{file.description || '첨부파일'}</div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">{new Date(file.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {fileList.length === 0 && (
                                        <div className="text-center py-20 bg-slate-50/50 rounded-xl border-dashed border-2 border-slate-200">
                                            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                                            <p className="text-xs text-slate-400">등록된 서류가 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">취소</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-md">
                                <Save size={18} />
                                기본정보 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setFormData({ ...formData, address: data.address })}
            />

            <style jsx>{`
                .form-label {
                    @apply block text-xs font-bold text-slate-500 mb-1.5;
                }
                .form-input {
                    @apply w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition;
                }
            `}</style>
        </div>
    );
}
