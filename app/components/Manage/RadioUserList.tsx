"use client";

import React, { useState, useEffect } from "react";
import { Search, Radio, Check, X, Ban, User, RefreshCw, Plus } from "lucide-react";

interface RadioUser {
    id: string;
    phone: string;
    name: string;
    role: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
    created_at: string;
}

export default function RadioUserList() {
    const [users, setUsers] = useState<RadioUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState("");

    // Registration Modal State
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        name: "",
        phone: "",
        role: "field"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/radio-users", {
                headers: {
                    "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || ""
                }
            });
            const data = await res.json();
            if (data.ok) {
                setUsers(data.users);
            } else {
                console.error(data.error);
                // Improved error message
                if (data.error === "UNAUTHORIZED") {
                    alert("🔒 관리자 인증이 필요합니다.\n\n대시보드에서 [설정 아이콘]을 클릭하여 1티어 관리자로 로그인 후 다시 시도해주세요.");
                } else {
                    alert("리스트 불러오기 실패: " + data.error);
                }
            }
        } catch (e) {
            console.error("Failed to fetch radio users", e);
            alert("리스트 로드 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    const updateUserStatus = async (id: string, status: string) => {
        if (!confirm(`사용자 상태를 ${status}(으)로 변경하시겠습니까?`)) return;

        try {
            const res = await fetch("/api/admin/radio-users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || ""
                },
                body: JSON.stringify({ id, status }),
            });
            const data = await res.json();
            if (data.ok) {
                setUsers(prev => prev.map(u => u.id === id ? { ...u, status: status as any } : u));
            } else {
                alert("업데이트 실패: " + data.error);
            }
        } catch (e) {
            alert("오류가 발생했습니다.");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/radio/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerForm),
            });
            const data = await res.json();
            if (data.ok) {
                alert("사용자가 등록되었습니다.");
                setIsRegisterOpen(false);
                setRegisterForm({ name: "", phone: "", role: "field" });
                fetchUsers(); // Refresh list
            } else {
                alert("등록 실패: " + data.error);
            }
        } catch (err) {
            alert("등록 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filtered = users.filter(u =>
        u.name.includes(term) || u.phone.includes(term)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "APPROVED": return "bg-green-100 text-green-700";
            case "PENDING": return "bg-yellow-100 text-yellow-700";
            case "BLOCKED": return "bg-slate-100 text-slate-500 line-through";
            case "REJECTED": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 flex flex-col h-[700px] relative">

            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Radio size={24} className="text-indigo-600" />
                        무전기 사용자 관리
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        무전기 앱 사용자 승인 및 관리 ({users.length}명)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        // Button changed to light style with black text as requested
                        className="flex items-center gap-2 px-3 py-2 bg-white text-black border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
                    >
                        <Plus size={16} />
                        사용자 등록
                    </button>
                    <button
                        onClick={fetchUsers}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="이름, 전화번호 검색..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                        value={term}
                        onChange={e => setTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex justify-center items-center h-40 text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        데이터가 없습니다.
                    </div>
                ) : (
                    filtered.map(user => (
                        <div
                            key={user.id}
                            className={`group p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between ${user.status === 'BLOCKED' ? 'opacity-60 bg-slate-50' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {user.name.slice(0, 1)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                        {user.name}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(user.status)}`}>
                                            {user.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-gray-500 text-sm mt-0.5 gap-3">
                                        <span className="flex items-center gap-1"><User size={12} /> {user.role}</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{user.phone}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        가입: {new Date(user.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                {user.status === "PENDING" && (
                                    <>
                                        <button
                                            onClick={() => updateUserStatus(user.id, "APPROVED")}
                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition"
                                            title="승인"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => updateUserStatus(user.id, "REJECTED")}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition"
                                            title="거절"
                                        >
                                            <X size={18} />
                                        </button>
                                    </>
                                )}

                                {user.status === "APPROVED" && (
                                    <button
                                        onClick={() => updateUserStatus(user.id, "BLOCKED")}
                                        className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 border border-slate-200 hover:text-red-500 transition"
                                        title="차단"
                                    >
                                        <Ban size={18} />
                                    </button>
                                )}

                                {(user.status === "BLOCKED" || user.status === "REJECTED") && (
                                    <button
                                        onClick={() => updateUserStatus(user.id, "APPROVED")}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition"
                                        title="재승인"
                                    >
                                        <Check size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Registration Modal Overlay */}
            {isRegisterOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">사용자 수동 등록</h3>
                            <button onClick={() => setIsRegisterOpen(false)} className="p-2 -mr-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">이름</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-indigo-500 text-gray-900 placeholder:text-gray-400"
                                    placeholder="홍길동"
                                    value={registerForm.name}
                                    onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">전화번호</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-indigo-500 text-gray-900 placeholder:text-gray-400"
                                    placeholder="010-1234-5678"
                                    value={registerForm.phone}
                                    onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">역할</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-indigo-500 text-gray-900"
                                    value={registerForm.role}
                                    onChange={e => setRegisterForm({ ...registerForm, role: e.target.value })}
                                >
                                    <option value="field">실측기사 (Field)</option>
                                    <option value="install">시공기사 (Installer)</option>
                                    <option value="admin">관리자 (Admin)</option>
                                    <option value="customer">고객 (Customer)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                            >
                                {isSubmitting ? "등록 중..." : "등록하기"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
