"use client";

import React, { useState } from 'react';
import { createSupabaseBrowser } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CompanyOnboarding() {
    const supabase = createSupabaseBrowser();
    const router = useRouter();
    const [form, setForm] = useState({ name: '', business_number: '', phone: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("로그인이 필요합니다.");
            router.push('/login');
            return;
        }

        // 0. Get Module from LocalStorage
        const savedModule = localStorage.getItem("limsdoor_business_module") || "DOOR";

        // 1. Create Company
        const { data: company, error: cErr } = await supabase
            .from('companies')
            .insert({
                company_name: form.name,
                biz_number: form.business_number,
                biz_type: "",
                biz_item: "",
                module: savedModule
            })
            .select()
            .single();

        if (cErr) {
            alert("회사 생성 실패: " + cErr.message);
            setLoading(false);
            return;
        }

        // 2. Link Profile (Critical Step requested)
        const { error: pErr } = await supabase
            .from('profiles')
            .update({
                company_id: company.id,
                name: '대표관리자' // Update name if needed
            })
            .eq('id', user.id);

        if (pErr) {
            alert("프로필 연결 실패: " + pErr.message);
            setLoading(false);
            return;
        }

        /* Legacy Member logic - Optional to keep or remove. User didn't mention it, but safe to keep if other parts use it. */
        /*
        const { error: mErr } = await supabase
            .from('company_members')
            .insert({
                company_id: company.id,
                user_id: user.id,
                role: 'admin',
                approved: true
            });
        */

        alert("회사 등록이 완료되었습니다!");
        router.push('/'); // Go to Main
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">새 회사 등록</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">회사명</label>
                        <input
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">사업자 번호</label>
                        <input
                            className="w-full border p-2 rounded"
                            value={form.business_number}
                            onChange={e => setForm({ ...form, business_number: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">대표 번호</label>
                        <input
                            className="w-full border p-2 rounded"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "등록 중..." : "등록 및 시작하기"}
                    </button>
                </form>
            </div>
        </div>
    );
}
