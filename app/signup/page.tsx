"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/app/lib/supabaseClient";

export default function SignUpPage() {
    const router = useRouter();
    const supabase = createSupabaseBrowser();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [agree, setAgree] = useState(false);

    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [doneMsg, setDoneMsg] = useState<string | null>(null);

    const pwScore = useMemo(() => scorePassword(password), [password]);
    const pwInfo = useMemo(() => passwordLabel(pwScore), [pwScore]);

    const canSubmit = useMemo(() => {
        return (
            validateEmail(email) &&
            password.length >= 8 &&
            password === confirmPassword &&
            inviteCode.trim().length >= 4 &&
            agree &&
            !loading
        );
    }, [email, password, confirmPassword, agree, inviteCode, loading]);

    function scorePassword(pw: string) {
        let score = 0;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score;
    }

    function passwordLabel(score: number) {
        if (score <= 1) return { text: "매우 약함", hint: "길이 늘리고(10자+), 숫자/특수문자/대문자를 섞어주세요." };
        if (score === 2) return { text: "약함", hint: "숫자 + 특수문자 조합을 추천합니다." };
        if (score === 3) return { text: "보통", hint: "대문자 또는 특수문자 하나 더 넣으면 좋아요." };
        if (score === 4) return { text: "강함", hint: "좋습니다." };
        return { text: "매우 강함", hint: "완벽합니다." };
    }

    function validateEmail(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setFieldError(name: string, msg?: string) {
        setErrors((prev: any) => ({ ...prev, [name]: msg }));
    }

    function validateAll(): boolean {
        const next: any = {};

        if (!email.trim()) next.email = "이메일을 입력해주세요.";
        else if (!validateEmail(email.trim())) next.email = "이메일 형식이 올바르지 않습니다.";

        if (!password) next.password = "비밀번호를 입력해주세요.";
        else if (password.length < 8) next.password = "비밀번호는 8자 이상이어야 합니다.";
        else if (pwScore <= 1) next.password = "비밀번호가 너무 약합니다. (10자+, 숫자/특수문자/대문자 조합 권장)";

        if (!confirmPassword) next.confirmPassword = "비밀번호 확인을 입력해주세요.";
        else if (password !== confirmPassword) next.confirmPassword = "비밀번호가 서로 일치하지 않습니다.";

        if (!inviteCode.trim()) next.inviteCode = "초대코드를 입력해주세요.";

        if (!agree) next.agree = "약관 동의가 필요합니다.";

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setDoneMsg(null);
        setFieldError("general", undefined);

        if (!validateAll()) return;

        try {
            setLoading(true);

            const redirectTo =
                typeof window !== "undefined"
                    ? `${window.location.origin}/auth/callback`
                    : undefined;

            // 1. Attempt Sign Up First (creates Auth User)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    emailRedirectTo: redirectTo,
                },
            });

            if (authError) {
                const msg = authError.message?.toLowerCase() ?? "";
                if (msg.includes("already registered") || msg.includes("user already")) {
                    setFieldError("general", "이미 가입된 이메일입니다. 로그인해주세요.");
                } else if (msg.includes("password")) {
                    setFieldError("general", "비밀번호 정책에 맞지 않습니다. 더 강한 비밀번호로 설정해주세요.");
                } else {
                    setFieldError("general", `회원가입 실패: ${authError.message}`);
                }
                setLoading(false);
                return;
            }

            // 2. If Sign Up Succeeded, Consume Invite Code (Atomic)
            const cons = await fetch("/api/auth/invite/consume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: inviteCode.trim() }),
            });
            const consJson = await cons.json();

            if (!consJson.ok) {
                // Critical Issue: User created but code failed.
                // In a real production app, we would call an admin API to rollback/delete the user.
                // For MVP, we show a crucial error.
                setFieldError("general", `가입은 되었으나 초대코드 처리에 실패했습니다: ${consJson.error}. 관리자에게 문의해주세요.`);
                setLoading(false);
                return;
            }

            setDoneMsg(
                "회원가입과 초대코드 확인이 완료되었습니다. 이메일 인증 후 로그인해주세요."
            );

            setTimeout(() => router.push("/onboarding/company"), 1500); // Direct to onboarding
        } catch (err: any) {
            setFieldError("general", "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-neutral-200 p-6">
                <div className="mb-6 text-center text-black">
                    <h1 className="text-xl font-semibold">회원가입</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        회사 등록(onboarding)은 가입 후 진행됩니다.
                    </p>
                </div>

                {errors.general && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {errors.general}
                    </div>
                )}

                {doneMsg && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                        {doneMsg}
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4 text-black">
                    <div>
                        <label className="text-sm font-medium">이메일</label>
                        <input
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setFieldError("email", undefined);
                            }}
                            type="email"
                            placeholder="name@example.com"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
                            autoComplete="email"
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium">초대코드 (MVP)</label>
                        <input
                            value={inviteCode}
                            onChange={(e) => {
                                setInviteCode(e.target.value);
                                if (errors.inviteCode) setFieldError("inviteCode", undefined);
                            }}
                            type="text"
                            placeholder="예: LIMS-MVP-2026"
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
                        />
                        <p className="mt-1 text-xs text-neutral-500">초대코드가 있어야 가입할 수 있습니다.</p>
                        {errors.inviteCode && <p className="mt-1 text-xs text-red-600">{errors.inviteCode}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium">비밀번호</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setFieldError("password", undefined);
                                }}
                                type={showPw ? "text" : "password"}
                                placeholder="8자 이상 (권장: 10자+, 조합)"
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                            >
                                {showPw ? "숨김" : "보기"}
                            </button>
                        </div>

                        <div className="mt-2 text-xs text-neutral-600 flex items-center justify-between">
                            <span>강도: <b>{pwInfo.text}</b></span>
                            <span className="text-neutral-500">점수 {pwScore}/5</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">{pwInfo.hint}</p>

                        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium">비밀번호 확인</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errors.confirmPassword) setFieldError("confirmPassword", undefined);
                                }}
                                type={showConfirmPw ? "text" : "password"}
                                placeholder="비밀번호를 한 번 더 입력"
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPw((v) => !v)}
                                className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                            >
                                {showConfirmPw ? "숨김" : "보기"}
                            </button>
                        </div>

                        {password && confirmPassword && password !== confirmPassword && (
                            <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
                        )}
                        {errors.confirmPassword && (
                            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <div className="flex items-start gap-2">
                        <input
                            id="agree"
                            type="checkbox"
                            checked={agree}
                            onChange={(e) => {
                                setAgree(e.target.checked);
                                if (errors.agree) setFieldError("agree", undefined);
                            }}
                            className="mt-1 h-4 w-4"
                        />
                        <label htmlFor="agree" className="text-sm text-neutral-700">
                            이용약관 및 개인정보 처리방침에 동의합니다.
                            <span className="block text-xs text-neutral-500">
                                (MVP 테스트 중이며, 운영 콘솔에서 비정상 사용은 제한될 수 있습니다.)
                            </span>
                        </label>
                    </div>
                    {errors.agree && <p className="text-xs text-red-600">{errors.agree}</p>}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`w-full rounded-lg py-2 font-medium transition
              ${canSubmit ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-neutral-200 text-neutral-500 cursor-not-allowed"}`}
                    >
                        {loading ? "가입 처리 중..." : "가입하기"}
                    </button>

                    <p className="text-center text-sm text-neutral-600">
                        이미 계정이 있으신가요?{" "}
                        <Link href="/login" className="text-blue-600 hover:underline">
                            로그인
                        </Link>
                    </p>

                    <div className="pt-3 text-xs text-neutral-500">
                        가입 후 메일 인증이 필요한 설정이라면, 인증 전에는 일부 기능이 제한될 수 있습니다.
                    </div>
                </form>
            </div>
        </div>
    );
}
