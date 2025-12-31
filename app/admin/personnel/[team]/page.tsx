"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { Users, Plus, Phone, Search, MoreVertical, Edit, Trash2, Save, X, Camera, Upload, User, MapPin, Car } from "lucide-react";
import AddressSearchModal from "@/app/components/AddressSearchModal";

type Personnel = {
    id: string;
    "이름": string;
    "연락처": string;
    "직책": string;
    "팀": string;
    "입사일": string;
    "메모": string;
    "상태": string;
    // New Fields
    "주소"?: string;
    "상세주소"?: string;
    "우편번호"?: string;
    "결혼여부"?: boolean;
    "자녀유무"?: boolean;
    "취미"?: string;
    "비상연락망"?: string;
    "경력사항"?: string;
    "차량종류"?: string;
    "차량소유"?: boolean;
    "차량번호"?: string;
    "프로필이미지"?: string;
};

const TEAM_NAMES: Record<string, string> = {
    marketing: "마케팅",
    sales: "영업",
    management: "관리",
    planning: "기획",
    install: "시공",
    measure: "실측",
    as: "AS",
};

export default function PersonnelTeamPage() {
    const params = useParams();
    const router = useRouter();
    const teamSlug = params.team as string;
    const teamName = TEAM_NAMES[teamSlug];

    const [members, setMembers] = useState<Personnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Personnel>>({
        "상태": "재직",
        "직책": "사원",
        "결혼여부": false,
        "자녀유무": false,
        "차량소유": false
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Fetch members
    const fetchMembers = async () => {
        if (!teamName) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("인사")
                .select("*")
                .eq("팀", teamName)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching personnel:", error);
                // Fallback for demo if migration hasn't run
                const mockKey = `lims_mock_personnel_${teamName}`;
                const saved = localStorage.getItem(mockKey);
                if (saved) setMembers(JSON.parse(saved));
                else setMembers([]);
            } else {
                setMembers(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teamName) {
            fetchMembers();
        }
    }, [teamName]);

    // Handle Save
    const handleSave = async () => {
        if (!formData["이름"]) return alert("이름을 입력해주세요.");
        if (!teamName) return;

        const newMember = {
            ...formData,
            "팀": teamName,
            "이름": formData["이름"]!,
            "연락처": formData["연락처"] || "",
        };

        let success = false;

        // Try DB insert/update
        if (editingId) {
            const { error } = await supabase.from("인사").update(newMember).eq("id", editingId);
            if (!error) success = true;
            else console.error(error);
        } else {
            const { error } = await supabase.from("인사").insert([newMember]);
            if (!error) success = true;
            else console.error(error);
        }

        if (!success) {
            // LocalStorage Fallback
            console.warn("Using LocalStorage fallback due to DB error or missing columns");
            const mockKey = `lims_mock_personnel_${teamName}`;
            const existing = JSON.parse(localStorage.getItem(mockKey) || "[]");
            let updatedList;
            if (editingId) {
                updatedList = existing.map((m: any) => m.id === editingId ? { ...newMember, id: editingId } : m);
            } else {
                const toSave = { ...newMember, id: `local-${Date.now()}`, created_at: new Date().toISOString() };
                updatedList = [toSave, ...existing];
            }
            localStorage.setItem(mockKey, JSON.stringify(updatedList));
            // Update state locally to reflect immediate change
            if (editingId) {
                setMembers(prev => prev.map(m => m.id === editingId ? { ...m, ...newMember } as Personnel : m));
            } else {
                setMembers(prev => [{ ...newMember, id: `local-${Date.now()}` } as Personnel, ...prev]);
            }
        }

        // Refresh List (if DB worked, this will pull fresh data)
        if (success) fetchMembers();

        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({ "상태": "재직", "직책": "사원", "결혼여부": false, "자녀유무": false, "차량소유": false });
        setEditingId(null);
    };

    const handleEdit = (member: Personnel) => {
        setFormData(member);
        setEditingId(member.id);
        setIsModalOpen(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, "프로필이미지": reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    if (!teamName) {
        return <div className="p-8 text-center text-slate-500">존재하지 않는 팀입니다.</div>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-indigo-600" />
                        {teamName}팀 인원 관리
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {teamName}팀의 구성원을 등록하고 관리합니다.
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <Plus size={18} />
                    신규 인원 등록
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-slate-50 flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="이름, 연락처 검색..." />
                    </div>
                </div>

                <div className="overflow-auto flex-1 p-4 bg-slate-50/50">
                    {members.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 m-4">
                            <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={32} />
                            </div>
                            <h3 className="font-bold text-slate-600 mb-1">등록된 인원이 없습니다</h3>
                            <p className="text-slate-400 text-sm">신규 인원을 등록하여 관리해보세요.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {members.map((m, idx) => (
                                <div key={idx} className="bg-white border hover:border-indigo-400 rounded-xl p-5 shadow-sm transition group relative flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg overflow-hidden border border-slate-200">
                                                {m["프로필이미지"] ? (
                                                    <img src={m["프로필이미지"]} alt="profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    m["이름"]?.[0]
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-lg">{m["이름"]}</div>
                                                <div className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                                    {m["직책"] || "사원"}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleEdit(m)} className="text-slate-300 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-50 transition">
                                            <Edit size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Phone size={12} className="text-slate-400" />
                                            {m["연락처"] || "-"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={12} className="text-slate-400" />
                                            <span className="truncate">{m["주소"] || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Car size={12} className="text-slate-400" />
                                            <span>{m["차량종류"] || "미보유"} {m["차량번호"] && `(${m["차량번호"]})`}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t flex justify-between items-center text-xs mt-auto">
                                        <span className={`px-2 py-0.5 rounded-full font-bold border ${m["상태"] === "퇴사" ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
                                            {m["상태"]}
                                        </span>
                                        <span className="text-slate-400 font-mono text-[10px]">
                                            입사: {m["입사일"] || "-"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <User size={20} className="text-indigo-600" />
                                {editingId ? '인원 정보 수정' : '신규 인원 등록'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="flex flex-col md:flex-row gap-8">
                                {/* Left Column: Profile Image */}
                                <div className="flex flex-col items-center gap-4 w-full md:w-48 shrink-0">
                                    <div className="w-full aspect-[3/4] bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                        {formData["프로필이미지"] ? (
                                            <img src={formData["프로필이미지"]} alt="profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <User size={48} className="mx-auto mb-2 opacity-50" />
                                                <span className="text-xs">사진 등록</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center cursor-pointer transition">
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            <div className="bg-white/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition transform scale-90 group-hover:scale-100">
                                                <Camera size={20} className="text-slate-700" />
                                            </div>
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center">
                                        증명사진 권장<br />(클릭하여 업로드)
                                    </p>
                                </div>

                                {/* Right Column: Form Fields */}
                                <div className="flex-1 space-y-6">
                                    {/* Section 1: Basic Info */}
                                    <section>
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b pb-1">
                                            기본 정보 <span className="text-xs font-normal text-red-500">* 필수</span>
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="form-label">이름 <span className="text-red-500">*</span></label>
                                                <input className="form-input" value={formData["이름"] || ''} onChange={e => setFormData({ ...formData, "이름": e.target.value })} placeholder="홍길동" />
                                            </div>
                                            <div>
                                                <label className="form-label">연락처</label>
                                                <input className="form-input" value={formData["연락처"] || ''} onChange={e => setFormData({ ...formData, "연락처": e.target.value })} placeholder="010-0000-0000" />
                                            </div>
                                            <div>
                                                <label className="form-label">입사일</label>
                                                <input type="date" className="form-input" value={formData["입사일"] || ''} onChange={e => setFormData({ ...formData, "입사일": e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">직책</label>
                                                <select className="form-input" value={formData["직책"]} onChange={e => setFormData({ ...formData, "직책": e.target.value })}>
                                                    <option value="팀장">팀장</option>
                                                    <option value="실장">실장</option>
                                                    <option value="대리">대리</option>
                                                    <option value="사원">사원</option>
                                                    <option value="일용직">일용직</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">재직 상태</label>
                                                <select className="form-input" value={formData["상태"]} onChange={e => setFormData({ ...formData, "상태": e.target.value })}>
                                                    <option value="재직">재직</option>
                                                    <option value="휴직">휴직</option>
                                                    <option value="퇴사">퇴사</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Personal & Contact */}
                                    <section>
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-1 mt-6">인적 사항 및 주소</h4>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="form-label">주소</label>
                                                    <div className="flex gap-2">
                                                        <input className="form-input flex-1" value={formData["주소"] || ''} readOnly placeholder="주소 검색 버튼을 눌러주세요" />
                                                        <button onClick={() => setAddressModalOpen(true)} className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-200 transition">
                                                            주소 검색
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="form-label">상세 주소</label>
                                                    <input className="form-input" value={formData["상세주소"] || ''} onChange={e => setFormData({ ...formData, "상세주소": e.target.value })} placeholder="동/호수 입력" />
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="form-label">비상연락망</label>
                                                    <input className="form-input" value={formData["비상연락망"] || ''} onChange={e => setFormData({ ...formData, "비상연락망": e.target.value })} placeholder="가족 등 비상시 연락처" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="married" className="accent-indigo-600 w-4 h-4" checked={formData["결혼여부"]} onChange={e => setFormData({ ...formData, "결혼여부": e.target.checked })} />
                                                    <label htmlFor="married" className="text-sm text-slate-600 font-bold select-none cursor-pointer">기혼</label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="children" className="accent-indigo-600 w-4 h-4" checked={formData["자녀유무"]} onChange={e => setFormData({ ...formData, "자녀유무": e.target.checked })} />
                                                    <label htmlFor="children" className="text-sm text-slate-600 font-bold select-none cursor-pointer">자녀 있음</label>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label">취미 / 특기</label>
                                                <input className="form-input" value={formData["취미"] || ''} onChange={e => setFormData({ ...formData, "취미": e.target.value })} placeholder="예: 축구, 등산, 독서" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 3: Vehicle & Career */}
                                    <section>
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-1 mt-6">차량 및 경력</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="carOwned" className="accent-indigo-600 w-4 h-4" checked={formData["차량소유"]} onChange={e => setFormData({ ...formData, "차량소유": e.target.checked })} />
                                                    <label htmlFor="carOwned" className="text-sm text-slate-600 font-bold select-none cursor-pointer flex items-center gap-1"><Car size={14} /> 자차 보유</label>
                                                </div>
                                                {formData["차량소유"] && (
                                                    <div className="flex gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                                        <input className="form-input flex-1" value={formData["차량종류"] || ''} onChange={e => setFormData({ ...formData, "차량종류": e.target.value })} placeholder="차종 (예: 포터2)" />
                                                        <input className="form-input flex-1" value={formData["차량번호"] || ''} onChange={e => setFormData({ ...formData, "차량번호": e.target.value })} placeholder="12가 3456" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="form-label">경력 사항</label>
                                                <textarea
                                                    className="form-input h-20 resize-none"
                                                    value={formData["경력사항"] || ''}
                                                    onChange={e => setFormData({ ...formData, "경력사항": e.target.value })}
                                                    placeholder="주요 경력 및 자격증 요약"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">관리자 메모</label>
                                                <textarea
                                                    className="form-input h-20 resize-none bg-yellow-50/50 focus:bg-white"
                                                    value={formData["메모"] || ''}
                                                    onChange={e => setFormData({ ...formData, "메모": e.target.value })}
                                                    placeholder="내부 관리용 특이사항"
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition">취소</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition flex items-center gap-2">
                                <Save size={18} /> 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddressSearchModal
                isOpen={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onComplete={(data) => setFormData({ ...formData, "주소": data.address, "우편번호": data.zonecode })}
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
